"""Cell painting for PETSCII Graphics Lab project files."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from node_bridge import find_node

TOOL_STATE_NAME = 'tool-state.json'
HISTORY_NAME = 'history.json'
LAB_ROOT = Path(__file__).resolve().parents[3]
AGENT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = AGENT_ROOT / 'out' / 'workspace'

DEFAULT_ANIMATION = {
    'effect': 'none',
    'colorEffect': 'none',
    'seconds': 2,
    'scale': 2,
    'background': 'dark',
    'videoRepeats': 1,
}


def ensure_workspace() -> Path:
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    return WORKSPACE


def resolve_project(project_path: str | None) -> Path:
    if project_path and project_path != '-':
        return Path(project_path).expanduser().resolve()
    return ensure_workspace() / 'project.json'


def _session_paths(project_path: str | None) -> tuple[Path, Path, Path]:
    path = resolve_project(project_path)
    workspace = ensure_workspace()
    if path.parent == workspace:
        return path, workspace / TOOL_STATE_NAME, workspace / HISTORY_NAME
    stem = path.stem
    return path, workspace / f'{stem}-{TOOL_STATE_NAME}', workspace / f'{stem}-{HISTORY_NAME}'


def _load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding='utf-8'))


def _write(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')


def _validate(path: Path) -> dict[str, Any]:
    script = (
        "import {readFileSync} from 'node:fs';"
        "import {validateProject} from './project-validation.js';"
        "const data = JSON.parse(readFileSync(process.argv[1], 'utf8'));"
        "try { validateProject(data); console.log(JSON.stringify({ok:true})); }"
        "catch (error) { console.log(JSON.stringify({ok:false, error:String(error.message || error)})); }"
    )
    result = subprocess.run(
        [find_node(), '--input-type=module', '-e', script, str(path)],
        cwd=LAB_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    line = result.stdout.strip().splitlines()
    if not line:
        message = result.stderr.strip() or f'validation failed with code {result.returncode}'
        return {'ok': False, 'error': message}
    return json.loads(line[-1])


def save_project(data: dict[str, Any], save_path: str) -> dict[str, Any]:
    path = Path(save_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    check = _validate(path)
    if not check.get('ok'):
        return {'ok': False, 'error': check.get('error', 'validation failed'), 'project': str(path)}
    return {'ok': True, 'project': str(path)}


def default_tool_state() -> dict[str, Any]:
    return {'glyph': 160, 'ink': 14, 'backgroundTarget': 'ink', 'symmetry': 'none', 'selection': None}


def get_tool_state(project_path: str | None = None) -> dict[str, Any]:
    _, state_path, _ = _session_paths(project_path)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    return state


def set_tool_state(project_path: str | None, patch: dict[str, Any]) -> dict[str, Any]:
    _, state_path, _ = _session_paths(project_path)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    state.update(patch)
    _write(state_path, state)
    return state


def _history(history_path: Path) -> dict[str, list]:
    if not history_path.exists():
        return {'undo': [], 'redo': []}
    hist = _load(history_path)
    hist.setdefault('undo', [])
    hist.setdefault('redo', [])
    return hist


def _push_history(history_path: Path, snapshot: dict[str, Any]) -> None:
    hist = _history(history_path)
    hist['undo'].append(snapshot)
    if len(hist['undo']) > 60:
        hist['undo'] = hist['undo'][-60:]
    hist['redo'] = []
    _write(history_path, hist)


SNAPSHOT_KEYS = ('columns', 'rows', 'grid', 'cellColors', 'colors', 'animation', 'name', 'drawingReplay')


def _snapshot(data: dict[str, Any]) -> dict[str, Any]:
    return {key: json.loads(json.dumps(data.get(key))) for key in SNAPSHOT_KEYS if key in data}


def _apply_snapshot(data: dict[str, Any], snap: dict[str, Any]) -> None:
    for key in SNAPSHOT_KEYS:
        if key in snap:
            data[key] = snap[key]


def _sync_replay(data: dict[str, Any]) -> None:
    ink = data.get('colors', {}).get('ink', 14)
    replay = {'base': list(data['grid']), 'events': []}
    if any(color != ink for color in data['cellColors']):
        replay['baseColors'] = list(data['cellColors'])
    data['drawingReplay'] = replay


def _symmetry_points(x: int, y: int, columns: int, rows: int, mode: str) -> list[tuple[int, int]]:
    points = [(x, y)]
    if mode in ('horizontal', 'both'):
        points.append((columns - 1 - x, y))
    if mode in ('vertical', 'both'):
        points.append((x, rows - 1 - y))
    if mode == 'both':
        points.append((columns - 1 - x, rows - 1 - y))
    return points


def _paint_point(data: dict[str, Any], x: int, y: int, glyph: Any, ink: int, symmetry: str) -> int:
    columns = data['columns']
    rows = data['rows']
    changed = 0
    for px, py in _symmetry_points(x, y, columns, rows, symmetry):
        if px < 0 or py < 0 or px >= columns or py >= rows:
            continue
        index = py * columns + px
        if data['grid'][index] == glyph and data['cellColors'][index] == ink:
            continue
        data['grid'][index] = glyph
        data['cellColors'][index] = ink
        changed += 1
    return changed


def _ensure_inks(data: dict[str, Any]) -> None:
    colors = data.get('colors') or {}
    ink = colors.get('ink', 14)
    cell_count = data['columns'] * data['rows']
    if 'cellColors' not in data or len(data['cellColors']) != cell_count:
        data['cellColors'] = [ink] * cell_count


def _mutate(project_path: str | None, mutator) -> dict[str, Any]:
    path, state_path, history_path = _session_paths(project_path)
    data = _load(path)
    _ensure_inks(data)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    _push_history(history_path, _snapshot(data))
    result = mutator(data, state)
    _sync_replay(data)
    save = save_project(data, str(path))
    if not save.get('ok'):
        return save
    out = {'ok': True, 'project': str(path)}
    out.update(result)
    return out


def paint_cells(project_path: str | None, cells: list[dict[str, Any]] | None) -> dict[str, Any]:
    """cells: [{x,y,glyph?,ink?}, ...]"""

    def mutate(data, state):
        changed = 0
        for cell in cells or []:
            x = int(cell['x'])
            y = int(cell['y'])
            glyph = cell.get('glyph', state['glyph'])
            ink = int(cell.get('ink', state['ink']))
            changed += _paint_point(data, x, y, glyph, ink, state.get('symmetry', 'none'))
        return {'changed': changed}

    return _mutate(project_path, mutate)


def erase_cells(project_path: str | None, cells: list[dict[str, Any]] | None) -> dict[str, Any]:
    def mutate(data, state):
        changed = 0
        ink = data.get('colors', {}).get('ink', state['ink'])
        for cell in cells or []:
            changed += _paint_point(data, int(cell['x']), int(cell['y']), '', ink, state.get('symmetry', 'none'))
        return {'changed': changed}

    return _mutate(project_path, mutate)


def fill(project_path: str | None, x: int, y: int) -> dict[str, Any]:
    def mutate(data, state):
        columns = data['columns']
        rows = data['rows']
        if x < 0 or y < 0 or x >= columns or y >= rows:
            return {'changed': 0, 'error': 'out of bounds'}
        start = y * columns + x
        target_glyph = data['grid'][start]
        target_ink = data['cellColors'][start]
        new_glyph = state['glyph']
        new_ink = state['ink']
        if target_glyph == new_glyph and target_ink == new_ink:
            return {'changed': 0}
        stack = [(x, y)]
        seen: set[tuple[int, int]] = set()
        changed = 0
        while stack:
            cx, cy = stack.pop()
            if (cx, cy) in seen:
                continue
            if cx < 0 or cy < 0 or cx >= columns or cy >= rows:
                continue
            index = cy * columns + cx
            if data['grid'][index] != target_glyph or data['cellColors'][index] != target_ink:
                continue
            seen.add((cx, cy))
            data['grid'][index] = new_glyph
            data['cellColors'][index] = new_ink
            changed += 1
            stack.extend([(cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)])
        return {'changed': changed}

    return _mutate(project_path, mutate)


def draw_line(project_path: str | None, x0: int, y0: int, x1: int, y1: int) -> dict[str, Any]:
    def mutate(data, state):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        changed = 0
        glyph = state['glyph']
        ink = state['ink']
        symmetry = state.get('symmetry', 'none')
        for step in range(steps + 1):
            x = round(x0 + (x1 - x0) * step / steps)
            y = round(y0 + (y1 - y0) * step / steps)
            changed += _paint_point(data, x, y, glyph, ink, symmetry)
        return {'changed': changed}

    return _mutate(project_path, mutate)


def draw_rect(project_path: str | None, x0: int, y0: int, x1: int, y1: int, filled: bool = False) -> dict[str, Any]:
    def mutate(data, state):
        left, right = sorted((x0, x1))
        top, bottom = sorted((y0, y1))
        changed = 0
        glyph = state['glyph']
        ink = state['ink']
        symmetry = state.get('symmetry', 'none')
        for y in range(top, bottom + 1):
            for x in range(left, right + 1):
                on_edge = x in (left, right) or y in (top, bottom)
                if filled or on_edge:
                    changed += _paint_point(data, x, y, glyph, ink, symmetry)
        return {'changed': changed}

    return _mutate(project_path, mutate)


def typed_glyph(character: str) -> int | None:
    if not character:
        return None
    code = ord(character)
    if 65 <= code <= 90:
        return code - 64
    if 97 <= code <= 122:
        return 256 + code - 96
    if 32 <= code <= 63:
        return code
    if character == '@':
        return 0
    if character == '[':
        return 27
    if character == ']':
        return 29
    return None


def place_text(project_path: str | None, text: str, x: int, y: int, ink: int | None = None) -> dict[str, Any]:
    path, state_path, history_path = _session_paths(project_path)
    data = _load(path)
    _ensure_inks(data)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    brush = state['ink'] if ink is None else int(ink)
    columns = data['columns']
    rows = data['rows']
    planned = []
    column = x
    row = y
    for character in text.replace('\r\n', '\n').replace('\r', '\n'):
        if character == '\n':
            column = x
            row += 1
            continue
        glyph_id = typed_glyph(character)
        if glyph_id is None:
            return {'ok': False, 'error': f'Unsupported character: {character}. Use A–Z, a–z, 0–9 or C64 punctuation.'}
        if column >= columns:
            column = x
            row += 1
        if row >= rows:
            return {'ok': False, 'error': 'Text does not fit. Shorten it or start earlier.'}
        planned.append((column, row, glyph_id))
        column += 1
    _push_history(history_path, _snapshot(data))
    for column, row, glyph_id in planned:
        index = row * columns + column
        data['grid'][index] = glyph_id
        data['cellColors'][index] = brush
    _sync_replay(data)
    save = save_project(data, str(path))
    if not save.get('ok'):
        return save
    return {'ok': True, 'project': str(path), 'changed': len(planned)}


def select_rect(project_path: str | None, x0: int, y0: int, x1: int, y1: int) -> dict[str, Any]:
    left, right = sorted((int(x0), int(x1)))
    top, bottom = sorted((int(y0), int(y1)))
    state = set_tool_state(project_path, {'selection': {'x0': left, 'y0': top, 'x1': right, 'y1': bottom}})
    return {'ok': True, 'selection': state['selection']}


def deselect(project_path: str | None = None) -> dict[str, Any]:
    set_tool_state(project_path, {'selection': None})
    return {'ok': True, 'selection': None}


def _selection_cells(data: dict[str, Any], selection: dict[str, int]) -> list[tuple[int, int, Any, int]]:
    cells = []
    for y in range(selection['y0'], selection['y1'] + 1):
        for x in range(selection['x0'], selection['x1'] + 1):
            index = y * data['columns'] + x
            cells.append((x, y, data['grid'][index], data['cellColors'][index]))
    return cells


def move_selection(project_path: str | None, dx: int, dy: int) -> dict[str, Any]:
    def mutate(data, state):
        selection = state.get('selection')
        if not selection:
            return {'changed': 0, 'error': 'no selection'}
        cells = _selection_cells(data, selection)
        ink = data.get('colors', {}).get('ink', state['ink'])
        columns = data['columns']
        rows = data['rows']
        changed = 0
        for x, y, _, _ in cells:
            changed += _paint_point(data, x, y, '', ink, 'none')
        for x, y, glyph, cell_ink in cells:
            nx = x + dx
            ny = y + dy
            if 0 <= nx < columns and 0 <= ny < rows:
                changed += _paint_point(data, nx, ny, glyph, cell_ink, 'none')
        return {'changed': changed}

    selection = get_tool_state(project_path).get('selection')
    result = _mutate(project_path, mutate)
    if result.get('ok') and selection:
        set_tool_state(project_path, {
            'selection': {
                'x0': selection['x0'] + dx,
                'y0': selection['y0'] + dy,
                'x1': selection['x1'] + dx,
                'y1': selection['y1'] + dy,
            },
        })
    return result


def duplicate_selection(project_path: str | None, dx: int, dy: int) -> dict[str, Any]:
    def mutate(data, state):
        selection = state.get('selection')
        if not selection:
            return {'changed': 0, 'error': 'no selection'}
        cells = _selection_cells(data, selection)
        columns = data['columns']
        rows = data['rows']
        changed = 0
        for x, y, glyph, cell_ink in cells:
            nx = x + dx
            ny = y + dy
            if 0 <= nx < columns and 0 <= ny < rows:
                changed += _paint_point(data, nx, ny, glyph, cell_ink, 'none')
        return {'changed': changed}

    return _mutate(project_path, mutate)


def delete_selection(project_path: str | None) -> dict[str, Any]:
    def mutate(data, state):
        selection = state.get('selection')
        if not selection:
            return {'changed': 0, 'error': 'no selection'}
        ink = data.get('colors', {}).get('ink', state['ink'])
        changed = 0
        for x, y, _, _ in _selection_cells(data, selection):
            changed += _paint_point(data, x, y, '', ink, 'none')
        return {'changed': changed}

    return _mutate(project_path, mutate)


def clear_drawing(project_path: str | None) -> dict[str, Any]:
    def mutate(data, state):
        ink = data.get('colors', {}).get('ink', state['ink'])
        count = data['columns'] * data['rows']
        data['grid'] = [''] * count
        data['cellColors'] = [ink] * count
        return {'changed': count}

    return _mutate(project_path, mutate)


def recolor_drawing(project_path: str | None, ink: int) -> dict[str, Any]:
    def mutate(data, state):
        changed = 0
        for index, glyph in enumerate(data['grid']):
            if glyph == '':
                continue
            data['cellColors'][index] = ink
            changed += 1
        data.setdefault('colors', {})['ink'] = ink
        return {'changed': changed}

    return _mutate(project_path, mutate)


def stamp_border(project_path: str | None) -> dict[str, Any]:
    def mutate(data, state):
        columns = data['columns']
        rows = data['rows']
        glyph = state['glyph']
        ink = state['ink']
        changed = 0
        for x in range(columns):
            changed += _paint_point(data, x, 0, glyph, ink, 'none')
            changed += _paint_point(data, x, rows - 1, glyph, ink, 'none')
        for y in range(rows):
            changed += _paint_point(data, 0, y, glyph, ink, 'none')
            changed += _paint_point(data, columns - 1, y, glyph, ink, 'none')
        return {'changed': changed}

    return _mutate(project_path, mutate)


def stamp_checkerboard(project_path: str | None) -> dict[str, Any]:
    def mutate(data, state):
        columns = data['columns']
        rows = data['rows']
        glyph = state['glyph']
        ink = state['ink']
        changed = 0
        for y in range(rows):
            for x in range(columns):
                if (x + y) % 2 == 0:
                    changed += _paint_point(data, x, y, glyph, ink, 'none')
        return {'changed': changed}

    return _mutate(project_path, mutate)


def undo(project_path: str | None = None) -> dict[str, Any]:
    path, _, history_path = _session_paths(project_path)
    hist = _history(history_path)
    if not hist['undo']:
        return {'ok': False, 'error': 'nothing to undo'}
    data = _load(path)
    hist['redo'].append(_snapshot(data))
    snap = hist['undo'].pop()
    _apply_snapshot(data, snap)
    _write(history_path, hist)
    saved = save_project(data, str(path))
    saved['undone'] = True
    return saved


def redo(project_path: str | None = None) -> dict[str, Any]:
    path, _, history_path = _session_paths(project_path)
    hist = _history(history_path)
    if not hist['redo']:
        return {'ok': False, 'error': 'nothing to redo'}
    data = _load(path)
    hist['undo'].append(_snapshot(data))
    snap = hist['redo'].pop()
    _apply_snapshot(data, snap)
    _write(history_path, hist)
    saved = save_project(data, str(path))
    saved['redone'] = True
    return saved


def create_canvas(project_path: str | None, columns: int = 40, rows: int = 25, background: int = 0, ink: int = 1) -> dict[str, Any]:
    path = resolve_project(project_path)
    count = columns * rows
    data = {
        'format': 'petscii-stencil-lab',
        'version': 3,
        'machine': 'c64',
        'palette': 'pepto',
        'columns': columns,
        'rows': rows,
        'grid': [''] * count,
        'cellColors': [ink] * count,
        'selectedGlyph': 160,
        'eraser': False,
        'symmetry': 'none',
        'glyphSource': 'builtin',
        'colors': {'ink': ink, 'background': background},
        'animation': dict(DEFAULT_ANIMATION),
    }
    _sync_replay(data)
    set_tool_state(str(path), default_tool_state())
    _, _, history_path = _session_paths(str(path))
    _write(history_path, {'undo': [], 'redo': []})
    return save_project(data, str(path))


def read_grid(project_path: str | None = None) -> dict[str, Any]:
    path = resolve_project(project_path)
    data = _load(path)
    columns = data['columns']
    occupied = []
    for index, glyph in enumerate(data['grid']):
        if glyph == '':
            continue
        occupied.append({
            'x': index % columns,
            'y': index // columns,
            'glyph': glyph,
            'ink': data['cellColors'][index],
        })
    return {
        'ok': True,
        'project': str(path),
        'columns': columns,
        'rows': data['rows'],
        'colors': data.get('colors'),
        'occupied': occupied,
    }


GLYPH_FAMILIES = {
    'blocks': [32, 96, 97, 98, 99, 100, 101, 102, 103, 104, 106, 111, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127],
    'lines': [64, 66, 67, 68, 69, 70, 71, 72, 82, 91, 93, 107, 112, 113, 114, 115],
    'corners': [73, 74, 75, 76, 79, 80, 85, 108, 109, 110],
    'diagonals': [77, 78, 86, 92, 95, 105],
    'symbols': [65, 81, 83, 87, 88, 90, 94],
}


def glyph_families() -> dict[str, Any]:
    families = {}
    for name, codes in GLYPH_FAMILIES.items():
        families[name] = codes + [code + 128 for code in codes]
    return {
        'ok': True,
        'note': 'Atlas ids. Add 128 for the inverse of a bank-0 shape. Quarter-blocks and solid 160 are the usual pixel-style bricks.',
        'solid': 160,
        'families': families,
    }
