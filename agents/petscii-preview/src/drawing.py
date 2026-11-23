"""Cell painting for PETSCII Graphics Lab project files."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from functools import lru_cache
from typing import Any

import op_art
import rug_styles
from node_bridge import PGL_CLI, WORKSPACE, parse_json_stdout, run_node
from project_store import ProjectError, atomic_save, load, session_dir

TOOL_STATE_NAME = 'tool-state.json'
HISTORY_NAME = 'history.json'
HISTORY_LIMIT = 60
SYMMETRY_MODES = ('none', 'horizontal', 'vertical', 'both')
MACHINES = ('c64', 'c128', 'c128-80', 'plus4')

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
    """Project path plus its brush-state and history sidecars (keyed by absolute path)."""
    path = resolve_project(project_path)
    folder = session_dir(path)
    return path, folder / TOOL_STATE_NAME, folder / HISTORY_NAME


def _load(path: Path) -> dict[str, Any]:
    return load(path)


def _write(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')


def save_project(data: dict[str, Any], save_path: str) -> dict[str, Any]:
    """Validate and atomically replace the project file; an invalid project is never written."""
    return atomic_save(data, Path(save_path).expanduser().resolve())


# --- argument checks (raise ProjectError before anything is changed) ---


def _int(value: Any, name: str) -> int:
    if isinstance(value, bool):
        raise ProjectError(f'{name} must be an integer, got {value!r}')
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and value.strip().lstrip('-').isdigit():
        return int(value)
    raise ProjectError(f'{name} must be an integer, got {value!r}')


def _glyph(value: Any) -> int | str:
    """An atlas glyph id 0–511, or '' for an empty cell."""
    if value == '' or value is None:
        return ''
    glyph = _int(value, 'glyph')
    if not 0 <= glyph <= 511:
        raise ProjectError(f'glyph must be an atlas id 0–511 (bank × 256 + screen code), got {glyph}')
    return glyph


def _ink(value: Any) -> int:
    ink = _int(value, 'ink')
    if ink < 0:
        raise ProjectError(f'ink must be a non-negative color number, got {ink}')
    return ink


def _symmetry(value: Any) -> str:
    if value not in SYMMETRY_MODES:
        raise ProjectError(f'symmetry must be one of {", ".join(SYMMETRY_MODES)}, got {value!r}')
    return value


@lru_cache(maxsize=4)
def _mirror_tables(machine: str) -> tuple[tuple[int, ...], tuple[int, ...]]:
    """Horizontal/vertical mirror partners from the editor's glyph-mirror.js (one rule for both)."""
    result = parse_json_stdout(run_node(PGL_CLI, ['mirror-tables', f'--machine={machine}'], check=False))
    if not result.get('ok'):
        raise ProjectError(f'could not build mirror tables: {result.get("error")}')
    return tuple(result['horizontal']), tuple(result['vertical'])


def mirror_glyph(glyph: Any, flip_x: bool, flip_y: bool, machine: str) -> Any:
    """Glyph for a reflected copy; empty cells and glyphs without a partner are unchanged."""
    if not isinstance(glyph, int) or isinstance(glyph, bool) or not (flip_x or flip_y):
        return glyph
    horizontal, vertical = _mirror_tables(machine)
    result = glyph
    if flip_x:
        if horizontal[result] < 0:
            return glyph
        result = horizontal[result]
    if flip_y:
        if vertical[result] < 0:
            return glyph
        result = vertical[result]
    return result


def _in_bounds(data: dict[str, Any], x: int, y: int) -> bool:
    return 0 <= x < data['columns'] and 0 <= y < data['rows']


def default_tool_state() -> dict[str, Any]:
    return {
        'glyph': 160, 'ink': 14, 'backgroundTarget': 'ink', 'symmetry': 'none', 'mirrorGlyphs': False,
        'selection': None,
    }


def get_tool_state(project_path: str | None = None) -> dict[str, Any]:
    _, state_path, _ = _session_paths(project_path)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    return state


def set_tool_state(project_path: str | None, patch: dict[str, Any]) -> dict[str, Any]:
    clean = dict(patch)
    if 'glyph' in clean:
        clean['glyph'] = _glyph(clean['glyph'])
    if 'ink' in clean:
        clean['ink'] = _ink(clean['ink'])
    if 'symmetry' in clean:
        clean['symmetry'] = _symmetry(clean['symmetry'])
    if 'mirrorGlyphs' in clean and not isinstance(clean['mirrorGlyphs'], bool):
        raise ProjectError(f'mirrorGlyphs must be true or false, got {clean["mirrorGlyphs"]!r}')
    _, state_path, _ = _session_paths(project_path)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    state.update(clean)
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
    if len(hist['undo']) > HISTORY_LIMIT:
        hist['undo'] = hist['undo'][-HISTORY_LIMIT:]
    hist['redo'] = []
    _write(history_path, hist)


SNAPSHOT_KEYS = ('columns', 'rows', 'grid', 'cellColors', 'colors', 'animation', 'name', 'drawingReplay')


def _snapshot(data: dict[str, Any]) -> dict[str, Any]:
    return {key: json.loads(json.dumps(data.get(key))) for key in SNAPSHOT_KEYS if key in data}


def _apply_snapshot(data: dict[str, Any], snap: dict[str, Any]) -> None:
    for key in SNAPSHOT_KEYS:
        if key in snap:
            data[key] = snap[key]


REPLAY_EVENT_LIMIT = 20000


def _reset_replay(data: dict[str, Any]) -> None:
    """Editor resetReplay(): empty base, then one event per painted cell in index order."""
    events = []
    event_colors = []
    for index, glyph in enumerate(data['grid']):
        if glyph != '':
            events.append([index, glyph])
            event_colors.append(data['cellColors'][index])
    data['drawingReplay'] = {
        'base': [''] * len(data['grid']),
        'events': events,
        'baseColors': list(data['cellColors']),
        'eventColors': event_colors,
    }


def _record_replay(data: dict[str, Any], before: dict[str, Any] | None) -> None:
    """Editor recordCell(): append one [index, glyph] event per changed cell, in edit order.

    Reveal/draw-on animations replay these events, so the order an agent paints in is kept.
    Whole-canvas changes (no `before`, or a different size) reset the replay instead.
    """
    replay = data.get('drawingReplay')
    if (
        before is None
        or not isinstance(replay, dict)
        or len(before.get('grid', [])) != len(data['grid'])
        or len(replay.get('base', [])) != len(data['grid'])
    ):
        _reset_replay(data)
        return
    count = len(data['grid'])
    events = replay.setdefault('events', [])
    replay.setdefault('baseColors', list(before['cellColors']))
    event_colors = replay.setdefault('eventColors', [data.get('colors', {}).get('ink', 14)] * len(events))
    for index in range(count):
        if data['grid'][index] != before['grid'][index] or data['cellColors'][index] != before['cellColors'][index]:
            events.append([index, data['grid'][index]])
            event_colors.append(data['cellColors'][index])
    if len(events) > REPLAY_EVENT_LIMIT:
        _reset_replay(data)


def _symmetry_points(x: int, y: int, columns: int, rows: int, mode: str) -> list[tuple[int, int, bool, bool]]:
    """Points as (x, y, flip_x, flip_y), matching pointer-stroke.js symmetryCopies()."""
    points = [(x, y, False, False)]
    if mode in ('horizontal', 'both'):
        points.append((columns - 1 - x, y, True, False))
    if mode in ('vertical', 'both'):
        points.append((x, rows - 1 - y, False, True))
    if mode == 'both':
        points.append((columns - 1 - x, rows - 1 - y, True, True))
    return points


def _paint_point(
    data: dict[str, Any], x: int, y: int, glyph: Any, ink: int, symmetry: str, mirror: bool = False
) -> int:
    columns = data['columns']
    rows = data['rows']
    machine = data.get('machine', 'c64')
    changed = 0
    for px, py, flip_x, flip_y in _symmetry_points(x, y, columns, rows, symmetry):
        if px < 0 or py < 0 or px >= columns or py >= rows:
            continue
        index = py * columns + px
        copy = mirror_glyph(glyph, flip_x, flip_y, machine) if mirror else glyph
        if data['grid'][index] == copy and data['cellColors'][index] == ink:
            continue
        data['grid'][index] = copy
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
    """Apply one undoable edit.

    The mutator returns {'changed': n, ...} or raises ProjectError. Nothing is saved and
    no undo step is recorded when nothing changed or the result fails validation.
    """
    path, state_path, history_path = _session_paths(project_path)
    data = _load(path)
    _ensure_inks(data)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    before = _snapshot(data)
    result = mutator(data, state)
    reset_replay = result.pop('reset_replay', False)
    out = {'ok': True, 'project': str(path)}
    out.update(result)
    if not result.get('changed'):
        return out
    _record_replay(data, None if reset_replay else before)
    save = save_project(data, str(path))
    if not save.get('ok'):
        return save
    _push_history(history_path, before)
    return out


def expand_runs(runs: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Horizontal runs → cells. A run is {x, y, glyphs: [id | '' | null, ...], ink?}; null skips a cell."""
    cells: list[dict[str, Any]] = []
    for number, run in enumerate(runs or []):
        if not isinstance(run, dict) or not isinstance(run.get('glyphs'), list) or 'x' not in run or 'y' not in run:
            raise ProjectError(f'runs[{number}] must be an object with x, y and a glyphs list')
        x = _int(run['x'], f'runs[{number}].x')
        y = _int(run['y'], f'runs[{number}].y')
        for offset, glyph in enumerate(run['glyphs']):
            if glyph is None:
                continue
            cell = {'x': x + offset, 'y': y, 'glyph': glyph}
            if run.get('ink') is not None:
                cell['ink'] = run['ink']
            cells.append(cell)
    return cells


def paint_cells(
    project_path: str | None,
    cells: list[dict[str, Any]] | None = None,
    runs: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """cells: [{x,y,glyph?,ink?}, ...]; runs: [{x,y,glyphs:[...],ink?}, ...] (one undo step for both)."""
    cells = list(cells or []) + expand_runs(runs)

    def mutate(data, state):
        planned = []
        for number, cell in enumerate(cells or []):
            if not isinstance(cell, dict) or 'x' not in cell or 'y' not in cell:
                raise ProjectError(f'cells[{number}] must be an object with x and y')
            x = _int(cell['x'], f'cells[{number}].x')
            y = _int(cell['y'], f'cells[{number}].y')
            if not _in_bounds(data, x, y):
                raise ProjectError(
                    f'cells[{number}] ({x},{y}) is outside the {data["columns"]}×{data["rows"]} canvas'
                )
            glyph = _glyph(cell.get('glyph', state['glyph']))
            ink = _ink(cell.get('ink', state['ink']))
            planned.append((x, y, glyph, ink))
        changed = 0
        for x, y, glyph, ink in planned:
            changed += _paint_point(
                data, x, y, glyph, ink, state.get('symmetry', 'none'), state.get('mirrorGlyphs', False)
            )
        return {'changed': changed}

    return _mutate(project_path, mutate)


def erase_cells(project_path: str | None, cells: list[dict[str, Any]] | None) -> dict[str, Any]:
    def mutate(data, state):
        ink = data.get('colors', {}).get('ink', state['ink'])
        planned = []
        for number, cell in enumerate(cells or []):
            if not isinstance(cell, dict) or 'x' not in cell or 'y' not in cell:
                raise ProjectError(f'cells[{number}] must be an object with x and y')
            x = _int(cell['x'], f'cells[{number}].x')
            y = _int(cell['y'], f'cells[{number}].y')
            if not _in_bounds(data, x, y):
                raise ProjectError(
                    f'cells[{number}] ({x},{y}) is outside the {data["columns"]}×{data["rows"]} canvas'
                )
            planned.append((x, y))
        changed = 0
        for x, y in planned:
            changed += _paint_point(data, x, y, '', ink, state.get('symmetry', 'none'))
        return {'changed': changed}

    return _mutate(project_path, mutate)


def fill(project_path: str | None, x: int, y: int) -> dict[str, Any]:
    def mutate(data, state):
        columns = data['columns']
        rows = data['rows']
        if not _in_bounds(data, x, y):
            raise ProjectError(f'fill start ({x},{y}) is outside the {columns}×{rows} canvas')
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
        mirror = state.get('mirrorGlyphs', False)
        for step in range(steps + 1):
            x = round(x0 + (x1 - x0) * step / steps)
            y = round(y0 + (y1 - y0) * step / steps)
            changed += _paint_point(data, x, y, glyph, ink, symmetry, mirror)
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
        mirror = state.get('mirrorGlyphs', False)
        for y in range(top, bottom + 1):
            for x in range(left, right + 1):
                on_edge = x in (left, right) or y in (top, bottom)
                if filled or on_edge:
                    changed += _paint_point(data, x, y, glyph, ink, symmetry, mirror)
        return {'changed': changed}

    return _mutate(project_path, mutate)


def place_text(project_path: str | None, text: str, x: int, y: int, ink: int | None = None) -> dict[str, Any]:
    """Typed C64 text, planned by the editor's typed-text.js (same characters, wrapping and errors)."""
    path = resolve_project(project_path)
    data = _load(path)
    x = _int(x, 'x')
    y = _int(y, 'y')
    if not _in_bounds(data, x, y):
        raise ProjectError(f'text start ({x},{y}) is outside the {data["columns"]}×{data["rows"]} canvas')
    state = get_tool_state(project_path)
    brush = state['ink'] if ink is None else _ink(ink)
    encoded = base64.b64encode(text.encode('utf-8')).decode('ascii')
    planned = parse_json_stdout(run_node(
        PGL_CLI,
        ['plan-text', f'--project={path}', f'--x={x}', f'--y={y}', f'--ink={brush}', f'--text-b64={encoded}'],
        check=False,
    ))
    if not planned.get('ok'):
        raise ProjectError(planned.get('error', 'text could not be placed'))

    def mutate(data, state):
        changed = 0
        for index, (glyph, cell_ink) in enumerate(zip(planned['cells'], planned['inks'])):
            if data['grid'][index] != glyph or data['cellColors'][index] != cell_ink:
                data['grid'][index] = glyph
                data['cellColors'][index] = cell_ink
                changed += 1
        return {'changed': changed, 'characters': planned['count']}

    return _mutate(project_path, mutate)


def _clamp_selection(data: dict[str, Any], selection: dict[str, int] | None) -> dict[str, int] | None:
    """Clip a selection to the canvas; None when nothing of it remains."""
    if not selection:
        return None
    left = max(0, selection['x0'])
    top = max(0, selection['y0'])
    right = min(data['columns'] - 1, selection['x1'])
    bottom = min(data['rows'] - 1, selection['y1'])
    if left > right or top > bottom:
        return None
    return {'x0': left, 'y0': top, 'x1': right, 'y1': bottom}


def select_rect(project_path: str | None, x0: int, y0: int, x1: int, y1: int) -> dict[str, Any]:
    path = resolve_project(project_path)
    data = _load(path)
    left, right = sorted((_int(x0, 'x0'), _int(x1, 'x1')))
    top, bottom = sorted((_int(y0, 'y0'), _int(y1, 'y1')))
    selection = _clamp_selection(data, {'x0': left, 'y0': top, 'x1': right, 'y1': bottom})
    if selection is None:
        raise ProjectError(f'selection is entirely outside the {data["columns"]}×{data["rows"]} canvas')
    state = set_tool_state(project_path, {'selection': selection})
    return {'ok': True, 'selection': state['selection']}


def deselect(project_path: str | None = None) -> dict[str, Any]:
    set_tool_state(project_path, {'selection': None})
    return {'ok': True, 'selection': None}


def _require_selection(data: dict[str, Any], state: dict[str, Any]) -> dict[str, int]:
    selection = _clamp_selection(data, state.get('selection'))
    if selection is None:
        raise ProjectError('no selection: call select_rect first')
    return selection


def _selection_cells(data: dict[str, Any], selection: dict[str, int]) -> list[tuple[int, int, Any, int]]:
    cells = []
    for y in range(selection['y0'], selection['y1'] + 1):
        for x in range(selection['x0'], selection['x1'] + 1):
            index = y * data['columns'] + x
            cells.append((x, y, data['grid'][index], data['cellColors'][index]))
    return cells


def move_selection(project_path: str | None, dx: int, dy: int) -> dict[str, Any]:
    def mutate(data, state):
        selection = _require_selection(data, state)
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

    dx = _int(dx, 'dx')
    dy = _int(dy, 'dy')
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
    dx = _int(dx, 'dx')
    dy = _int(dy, 'dy')

    def mutate(data, state):
        selection = _require_selection(data, state)
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
        selection = _require_selection(data, state)
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
        changed = sum(
            1 for glyph, cell_ink in zip(data['grid'], data['cellColors']) if glyph != '' or cell_ink != ink
        )
        data['grid'] = [''] * count
        data['cellColors'] = [ink] * count
        return {'changed': changed, 'reset_replay': True}

    return _mutate(project_path, mutate)


def recolor_drawing(project_path: str | None, ink: int) -> dict[str, Any]:
    ink = _ink(ink)

    def mutate(data, state):
        changed = 0
        for index, glyph in enumerate(data['grid']):
            if glyph == '' or data['cellColors'][index] == ink:
                continue
            data['cellColors'][index] = ink
            changed += 1
        colors = data.setdefault('colors', {})
        if colors.get('ink') != ink:
            colors['ink'] = ink
            changed = max(changed, 1)
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


def _recipe_inks_for_machine(data: dict[str, Any], cells: list[dict[str, Any]], explicit: set[int]) -> list[dict[str, Any]]:
    """Recipes are written in VIC ink numbers. Map every ink the caller did not pass to the
    project's machine (TED, VDC) with the editor's convertInk(); VIC projects are unchanged."""
    machine = data.get('machine', 'c64')
    if machine in ('c64', 'c128'):
        return cells
    defaults = sorted({cell['ink'] for cell in cells if 'ink' in cell and cell['ink'] not in explicit})
    if not defaults:
        return cells
    result = parse_json_stdout(run_node(
        PGL_CLI, ['convert-inks', f'--machine={machine}', f"--inks={','.join(map(str, defaults))}"], check=False,
    ))
    if not result.get('ok'):
        raise ProjectError(f"could not convert recipe inks for {machine}: {result.get('error')}")
    mapping = {int(key): value for key, value in result['inks'].items()}
    return [
        {**cell, 'ink': mapping.get(cell['ink'], cell['ink'])} if 'ink' in cell and cell['ink'] not in explicit else cell
        for cell in cells
    ]


def stamp_op_art(
    project_path: str | None,
    recipe: str,
    period: int | None = None,
    ink_a: int | None = None,
    ink_b: int | None = None,
) -> dict[str, Any]:
    """Paint a full-canvas op-art lattice from op_art.generate_pattern_cells."""
    path = resolve_project(project_path)
    if not path.is_file():
        return {'ok': False, 'error': f'project not found: {path}'}
    data = _load(path)
    generated = op_art.generate_pattern_cells(
        recipe,
        data['columns'],
        data['rows'],
        period=period,
        ink_a=ink_a,
        ink_b=ink_b,
    )
    if not generated.get('ok'):
        return generated
    explicit = {ink for ink in (ink_a, ink_b) if ink is not None}
    painted = paint_cells(project_path, _recipe_inks_for_machine(data, generated['cells'], explicit))
    painted['recipe'] = generated['recipe']
    painted['cell_count'] = generated['cell_count']
    if generated.get('animation_suggest'):
        painted['animation_suggest'] = generated['animation_suggest']
    return painted


def stamp_combined_style(
    project_path: str | None,
    combination: str,
    period: int | None = None,
    ink_a: int | None = None,
    ink_b: int | None = None,
) -> dict[str, Any]:
    """Merge layered rug / multi-tradition recipes onto one canvas."""
    path = resolve_project(project_path)
    if not path.is_file():
        return {"ok": False, "error": f"project not found: {path}"}
    data = _load(path)
    generated = rug_styles.generate_combined_cells(
        combination,
        data["columns"],
        data["rows"],
        period=period,
        ink_a=ink_a,
        ink_b=ink_b,
    )
    if not generated.get("ok"):
        return generated
    explicit = {ink for ink in (ink_a, ink_b) if ink is not None}
    painted = paint_cells(project_path, _recipe_inks_for_machine(data, generated["cells"], explicit))
    painted["combination"] = generated["combination"]
    painted["layers"] = generated.get("layers")
    painted["cell_count"] = generated["cell_count"]
    if generated.get("animation_suggest"):
        painted["animation_suggest"] = generated["animation_suggest"]
    if generated.get("palette_hint"):
        painted["palette_hint"] = generated["palette_hint"]
    if generated.get("study"):
        painted["study"] = generated["study"]
    return painted


def undo(project_path: str | None = None) -> dict[str, Any]:
    path, _, history_path = _session_paths(project_path)
    hist = _history(history_path)
    if not hist['undo']:
        return {'ok': False, 'error': 'nothing to undo'}
    data = _load(path)
    current = _snapshot(data)
    _apply_snapshot(data, hist['undo'][-1])
    saved = save_project(data, str(path))
    if not saved.get('ok'):
        return saved
    hist['undo'].pop()
    hist['redo'].append(current)
    _write(history_path, hist)
    saved['undone'] = True
    return saved


def redo(project_path: str | None = None) -> dict[str, Any]:
    path, _, history_path = _session_paths(project_path)
    hist = _history(history_path)
    if not hist['redo']:
        return {'ok': False, 'error': 'nothing to redo'}
    data = _load(path)
    current = _snapshot(data)
    _apply_snapshot(data, hist['redo'][-1])
    saved = save_project(data, str(path))
    if not saved.get('ok'):
        return saved
    hist['redo'].pop()
    hist['undo'].append(current)
    _write(history_path, hist)
    saved['redone'] = True
    return saved


def machine_info() -> dict[str, Any]:
    """Machine limits and boot colours from the editor's machine-modes.js (cached)."""
    global _MACHINE_INFO
    if _MACHINE_INFO is None:
        listing = parse_json_stdout(run_node(PGL_CLI, ['list-effects'], check=False))
        if not listing.get('ok'):
            raise ProjectError(f"could not read machine modes: {listing.get('error')}")
        _MACHINE_INFO = listing['machines']
    return _MACHINE_INFO


_MACHINE_INFO: dict[str, Any] | None = None


def create_canvas(
    project_path: str | None,
    columns: int = 40,
    rows: int = 25,
    background: int | None = None,
    ink: int | None = None,
    machine: str | None = None,
    name: str | None = None,
) -> dict[str, Any]:
    """Blank picture. Colours default to the machine's boot screen; 80 columns default to C128 80-col."""
    path = resolve_project(project_path)
    columns = _int(columns, 'columns')
    rows = _int(rows, 'rows')
    if machine is None:
        machine = 'c128-80' if columns > 40 else 'c64'
    if machine not in MACHINES:
        raise ProjectError(f'unknown machine {machine!r}; expected one of: {", ".join(MACHINES)}')
    info = machine_info()[machine]
    if not 1 <= columns <= info['maxColumns'] or not 1 <= rows <= info['maxRows']:
        raise ProjectError(
            f"{info['label']} canvases are 1–{info['maxColumns']} columns by 1–{info['maxRows']} rows; got {columns}×{rows}"
        )
    background = info['defaultBackground'] if background is None else _int(background, 'background')
    ink = info['defaultInk'] if ink is None else _int(ink, 'ink')
    count = columns * rows
    data = {
        'format': 'petscii-stencil-lab',
        'version': 3,
        'machine': machine,
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
        **({'name': name} if name else {}),
    }
    _reset_replay(data)
    saved = save_project(data, str(path))
    if not saved.get('ok'):
        return saved
    set_tool_state(str(path), {**default_tool_state(), 'ink': ink})
    _, _, history_path = _session_paths(str(path))
    _write(history_path, {'undo': [], 'redo': []})
    saved['machine'] = machine
    return saved


def _grid_runs(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Painted cells as horizontal runs of one ink: the same shape paint_cells(runs=...) accepts."""
    columns = data['columns']
    runs: list[dict[str, Any]] = []
    for y in range(data['rows']):
        x = 0
        while x < columns:
            index = y * columns + x
            if data['grid'][index] == '':
                x += 1
                continue
            ink = data['cellColors'][index]
            glyphs = []
            start = x
            while x < columns and data['grid'][y * columns + x] != '' and data['cellColors'][y * columns + x] == ink:
                glyphs.append(data['grid'][y * columns + x])
                x += 1
            runs.append({'x': start, 'y': y, 'ink': ink, 'glyphs': glyphs})
    return runs


def read_grid(project_path: str | None = None, format: str = 'runs') -> dict[str, Any]:
    """Painted cells as `runs` (compact, default), `cells` ({x,y,glyph,ink} each), or the editor's `text` grid."""
    if format not in ('runs', 'cells', 'text'):
        raise ProjectError(f"format must be runs, cells or text, got {format!r}")
    path = resolve_project(project_path)
    data = _load(path)
    columns = data['columns']
    summary = {
        'ok': True,
        'project': str(path),
        'machine': data.get('machine', 'c64'),
        'columns': columns,
        'rows': data['rows'],
        'colors': data.get('colors'),
        'painted': sum(1 for glyph in data['grid'] if glyph != ''),
    }
    if format == 'runs':
        return {**summary, 'runs': _grid_runs(data)}
    if format == 'text':
        result = parse_json_stdout(run_node(PGL_CLI, ['export-text-grid', f'--project={path}'], check=False))
        if not result.get('ok'):
            raise ProjectError(result.get('error', 'text grid failed'))
        return {**summary, 'encoding': 'PETSCII-GLYPHS text grid (atlas glyph IDs, not PETSCII bytes)', 'text': result['text']}
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
    return {**summary, 'occupied': occupied}


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
