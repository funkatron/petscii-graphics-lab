"""Gradients and lit shapes with cell-level ordered dithering.

Lessons from shading studies (see .cursor/skills/petscii-draw/SKILL.md):
- Shade by measured brightness: ramps run darkest → lightest ink of the machine's colour table.
- A cell shows one ink plus the shared background, so two non-background inks cannot blend
  inside a cell. Steps between ramp inks alternate whole cells in a Bayer pattern instead.
- The in-cell checker (102/230) only blends an ink with the background.
- Error diffusion looked like streaky static, so it is not used here.
"""

from __future__ import annotations

import math
from functools import lru_cache
from typing import Any

import drawing
from node_bridge import PGL_CLI, parse_json_stdout, run_node
from project_store import ProjectError

BAYER = {
    'bayer2': [[0, 2], [3, 1]],
    'bayer4': [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]],
}
DITHERS = ('bayer4', 'bayer2', 'checker', 'none')
DIRECTIONS = ('down', 'up', 'right', 'left', 'radial')
LIGHTS = {
    'top-left': (-0.55, -0.62, 0.56),
    'top': (0.0, -0.75, 0.66),
    'top-right': (0.55, -0.62, 0.56),
    'left': (-0.8, -0.15, 0.58),
    'right': (0.8, -0.15, 0.58),
    'front': (0.0, 0.0, 1.0),
}
SHAPES = ('sphere', 'cylinder')
SOLID, CHECKER_EVEN, CHECKER_ODD = 160, 102, 230
# Corner-sampled edge glyphs: the missing corner (or side) is the empty part of the cell.
TRIANGLE_MISSING = {'tl': 233, 'tr': 223, 'bl': 95, 'br': 105}

# Curated ramps (VIC inks, darkest first), from measured Pepto brightness.
VIC_RAMPS = {
    'grey': [0, 11, 12, 15, 1],
    'warm': [0, 9, 2, 8, 10, 7, 1],
    'cool': [0, 6, 4, 14, 3, 1],
    'green': [0, 11, 5, 13, 1],
    'sky': [6, 4, 8, 10, 7],
}
TED_HUES = ['white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow', 'orange', 'brown',
            'yellow-green', 'pink', 'blue-green', 'light-blue', 'dark-blue', 'light-green']


@lru_cache(maxsize=16)
def _luminance_table(machine: str, palette: str) -> tuple[dict[str, Any], ...]:
    result = parse_json_stdout(
        run_node(PGL_CLI, ['color-luminance', f'--machine={machine}', f'--palette={palette}'], check=False)
    )
    if not result.get('ok'):
        raise ProjectError(f'could not read colours for {machine}: {result.get("error")}')
    return tuple(result['inks'])


def color_ramps(machine: str = 'c64', palette: str = 'pepto') -> dict[str, Any]:
    """Inks sorted by measured brightness, plus suggested ramps (darkest first) for the machine."""
    inks = _luminance_table(machine, palette)
    by_luminance = sorted(inks, key=lambda item: (item['luminance'], item['ink']))
    if machine == 'plus4':
        ramps = {'grey': [0, 2, 4, 6, 8]}
        for hue, name in enumerate(TED_HUES[1:], start=2):
            base = 1 + (hue - 1) * 8
            ramps[name] = [0] + [base + lum for lum in (0, 2, 4, 6, 7)]
    elif machine == 'c128-80':
        ramps = {'grey': [0, 8, 7, 15], 'warm': [0, 4, 6, 12, 14, 15], 'cool': [0, 1, 9, 3, 11, 15],
                 'green': [0, 2, 10, 15]}
    else:
        ramps = {name: list(ramp) for name, ramp in VIC_RAMPS.items()}
    return {
        'ok': True,
        'machine': machine,
        'palette': palette,
        'by_luminance': [{'ink': i['ink'], 'name': i['name'], 'luminance': i['luminance']} for i in by_luminance],
        'ramps': ramps,
        'notes': [
            'Ramps run darkest to lightest; pass one to gradient_fill or shade_shape.',
            'A cell blends its ink only with the background. Steps between two inks alternate whole cells.',
            'Build your own ramp from by_luminance; names can mislead (C64 red is darker than purple).',
        ],
    }


def _ramp(data: dict[str, Any], ramp: list[Any] | None) -> list[int]:
    if not isinstance(ramp, list) or not ramp:
        raise ProjectError('ramp must be a non-empty list of ink numbers, darkest first')
    machine = data.get('machine', 'c64')
    count = len(_luminance_table(machine, data.get('palette') or 'pepto'))
    out = []
    for number, value in enumerate(ramp):
        ink = drawing._ink(value)
        if ink >= count:
            raise ProjectError(f'ramp[{number}] ink {ink} is outside the {machine} range 0–{count - 1}')
        out.append(ink)
    return out


def _choice(dither: str) -> str:
    if dither not in DITHERS:
        raise ProjectError(f'dither must be one of {", ".join(DITHERS)}, got {dither!r}')
    return dither


def _cell(ramp: list[int], s: float, x: int, y: int, dither: str, background: int) -> tuple[Any, int]:
    """Glyph and ink for brightness s (0..1 along the ramp) at cell (x, y)."""
    s = min(1.0, max(0.0, s))
    position = s * (len(ramp) - 1)
    if dither == 'checker':
        low = int(math.floor(position))
        high = min(len(ramp) - 1, low + 1)
        frac = position - low
        # In-cell checker only where one side of the step is the background.
        if ramp[low] == background and ramp[high] != background and 0.3 <= frac <= 0.7:
            return (CHECKER_EVEN if (x + y) % 2 == 0 else CHECKER_ODD), ramp[high]
        dither = 'bayer2'
    if dither in BAYER:
        matrix = BAYER[dither]
        size = len(matrix)
        threshold = (matrix[y % size][x % size] + 0.5) / (size * size)
        index = int(math.floor(position + threshold))
    else:
        index = int(round(position))
    ink = ramp[max(0, min(len(ramp) - 1, index))]
    return ('' if ink == background else SOLID), ink


def _put(data: dict[str, Any], x: int, y: int, glyph: Any, ink: int) -> int:
    index = y * data['columns'] + x
    if data['grid'][index] == glyph and data['cellColors'][index] == ink:
        return 0
    data['grid'][index] = glyph
    data['cellColors'][index] = ink
    return 1


def _region(data: dict[str, Any], x0: int, y0: int, x1: int, y1: int) -> tuple[int, int, int, int]:
    left, right = sorted((drawing._int(x0, 'x0'), drawing._int(x1, 'x1')))
    top, bottom = sorted((drawing._int(y0, 'y0'), drawing._int(y1, 'y1')))
    left, top = max(0, left), max(0, top)
    right, bottom = min(data['columns'] - 1, right), min(data['rows'] - 1, bottom)
    if left > right or top > bottom:
        raise ProjectError(f'region is outside the {data["columns"]}×{data["rows"]} canvas')
    return left, top, right, bottom


def gradient_fill(
    project_path: str | None,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    ramp: list[int],
    direction: str = 'down',
    dither: str = 'bayer4',
    center: tuple[float, float] | None = None,
    radius: float | None = None,
) -> dict[str, Any]:
    """Fill a rectangle with a ramp. ramp[0] is at the start (top for down, centre for radial)."""
    if direction not in DIRECTIONS:
        raise ProjectError(f'direction must be one of {", ".join(DIRECTIONS)}, got {direction!r}')
    dither = _choice(dither)

    def mutate(data, state):
        inks = _ramp(data, ramp)
        background = data.get('colors', {}).get('background', 0)
        left, top, right, bottom = _region(data, x0, y0, x1, y1)
        width, height = right - left + 1, bottom - top + 1
        cx, cy = center if center else (left + width / 2, top + height / 2)
        reach = radius or math.hypot(max(cx - left, right + 1 - cx), max(cy - top, bottom + 1 - cy))
        changed = 0
        for y in range(top, bottom + 1):
            for x in range(left, right + 1):
                if direction == 'down':
                    s = (y - top + 0.5) / height
                elif direction == 'up':
                    s = 1 - (y - top + 0.5) / height
                elif direction == 'right':
                    s = (x - left + 0.5) / width
                elif direction == 'left':
                    s = 1 - (x - left + 0.5) / width
                else:
                    s = math.hypot(x + 0.5 - cx, y + 0.5 - cy) / max(reach, 0.5)
                glyph, ink = _cell(inks, s, x, y, dither, background)
                changed += _put(data, x, y, glyph, ink)
        return {'changed': changed, 'region': [left, top, right, bottom], 'ramp': inks}

    return drawing._mutate(project_path, mutate)


def _edge_glyph(inside, x: int, y: int) -> Any:
    tl, tr, bl, br = inside(x, y), inside(x + 1, y), inside(x, y + 1), inside(x + 1, y + 1)
    count = tl + tr + bl + br
    if count == 4:
        return SOLID
    if count == 3:
        missing = 'tl' if not tl else 'tr' if not tr else 'bl' if not bl else 'br'
        return TRIANGLE_MISSING[missing]
    if count == 2:
        if tl and tr:
            return 226
        if bl and br:
            return 98
        if tl and bl:
            return 97
        if tr and br:
            return 225
        return SOLID if inside(x + 0.5, y + 0.5) else None
    # A single corner inside would be a quadrant spike; leave it out.
    return None


def shade_shape(
    project_path: str | None,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    ramp: list[int],
    shape: str = 'sphere',
    light: str = 'top-left',
    specular: bool = True,
    bounce: bool = True,
    smooth_edges: bool = True,
    ambient: float = 0.08,
) -> dict[str, Any]:
    """A lit sphere (ellipse outline) or upright cylinder (rectangle) shaded along the ramp."""
    if shape not in SHAPES:
        raise ProjectError(f'shape must be one of {", ".join(SHAPES)}, got {shape!r}')
    if light not in LIGHTS:
        raise ProjectError(f'light must be one of {", ".join(LIGHTS)}, got {light!r}')
    if not (rx > 0 and ry > 0):
        raise ProjectError('rx and ry must be greater than 0')
    lx, ly, lz = LIGHTS[light]
    norm = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / norm, ly / norm, lz / norm

    def mutate(data, state):
        inks = _ramp(data, ramp)
        # The lightest ink is saved for the one specular cell; the body shades with the rest.
        body = inks[:-1] if specular and len(inks) > 1 else inks
        background = data.get('colors', {}).get('background', 0)
        columns, rows = data['columns'], data['rows']
        if shape == 'sphere':
            def inside(px, py):
                return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1
        else:
            def inside(px, py):
                return abs(px - cx) <= rx and abs(py - cy) <= ry
        changed = 0
        best = (-1.0, None)
        for y in range(max(0, int(cy - ry) - 1), min(rows, int(cy + ry) + 2)):
            for x in range(max(0, int(cx - rx) - 1), min(columns, int(cx + rx) + 2)):
                # A cylinder's sides follow the grid already; corner sampling would add half-block seams.
                if smooth_edges and shape == 'sphere':
                    glyph = _edge_glyph(inside, x, y)
                else:
                    glyph = SOLID if inside(x + 0.5, y + 0.5) else None
                if glyph is None:
                    continue
                dx = max(-1.0, min(1.0, (x + 0.5 - cx) / rx))
                dy = max(-1.0, min(1.0, (y + 0.5 - cy) / ry)) if shape == 'sphere' else 0.0
                dz = math.sqrt(max(0.0, 1 - dx * dx - dy * dy))
                diffuse = max(0.0, dx * lx + dy * ly + dz * lz)
                s = ambient + (1 - ambient) * 0.92 * diffuse ** 1.2
                if bounce:
                    rim_y = (y + 0.5 - cy) / ry
                    s += 0.22 * max(0.0, rim_y) * (1 - dz)  # light reflected up from below
                highlight = max(0.0, 2 * diffuse * dz - lz) ** 20 if specular else 0.0
                if highlight > best[0]:
                    best = (highlight, (x, y, glyph))
                _, ink = _cell(body, s, x, y, 'bayer2', background)
                # Shapes are opaque: a background-coloured step is solid paint, so whatever is behind stays hidden.
                changed += _put(data, x, y, glyph, ink)
        if specular and best[1] and best[0] > 0.3:
            x, y, glyph = best[1]
            changed += _put(data, x, y, glyph, inks[-1])
        return {'changed': changed, 'ramp': inks}

    return drawing._mutate(project_path, mutate)
