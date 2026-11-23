"""Paint a hand-authored tone map: one character per cell, mapped through a legend.

Portraits taught this: at 40×25 a face is about 18×22 cells, and computed lighting turns
into blobs. Typing the planes by hand (lit forehead, mid-tone band, shadow side, black
features) reads far better, which is how the reference PETSCII portraits are built.
"""

from __future__ import annotations

from typing import Any

import drawing
from project_store import ProjectError

SOLID = 160
# Outline smoothing for solid cells: the open corner (no neighbour on those two sides) is cut.
CORNER_CUTS = {
    ('up', 'left'): 233,
    ('up', 'right'): 223,
    ('down', 'left'): 95,
    ('down', 'right'): 105,
}


def _legend(legend: dict[str, Any] | None) -> dict[str, tuple[Any, int]]:
    if not isinstance(legend, dict) or not legend:
        raise ProjectError('legend must map single characters to {"ink": n} or {"ink": n, "glyph": id}')
    out = {}
    for key, value in legend.items():
        if not isinstance(key, str) or len(key) != 1:
            raise ProjectError(f'legend keys must be single characters, got {key!r}')
        if isinstance(value, int) and not isinstance(value, bool):
            value = {'ink': value}
        if not isinstance(value, dict) or 'ink' not in value:
            raise ProjectError(f'legend[{key!r}] needs an ink, for example {{"ink": 12}}')
        glyph = drawing._glyph(value.get('glyph', SOLID))
        out[key] = (glyph, drawing._ink(value['ink']))
    return out


def paint_tone_map(
    project_path: str | None,
    rows: list[str],
    legend: dict[str, Any],
    x: int = 0,
    y: int = 0,
    transparent: str = '.',
    smooth_edges: bool = False,
) -> dict[str, Any]:
    """Paint rows of legend characters at (x, y). transparent cells are left as they are."""
    if not isinstance(rows, list) or not rows or not all(isinstance(r, str) for r in rows):
        raise ProjectError('rows must be a non-empty list of strings')
    if len({len(r) for r in rows}) != 1:
        widths = sorted({len(r) for r in rows})
        raise ProjectError(f'every row must have the same width; got widths {widths}')
    if not isinstance(transparent, str) or len(transparent) != 1:
        raise ProjectError('transparent must be a single character')
    tones = _legend(legend)
    if transparent in tones:
        raise ProjectError(f'{transparent!r} is the transparent character and cannot be in the legend')
    unknown = sorted({ch for row in rows for ch in row if ch != transparent and ch not in tones})
    if unknown:
        raise ProjectError(f'characters not in the legend: {"".join(unknown)}')
    x0, y0 = drawing._int(x, 'x'), drawing._int(y, 'y')

    def mutate(data, state):
        columns, height = data['columns'], data['rows']
        if x0 < 0 or y0 < 0 or x0 + len(rows[0]) > columns or y0 + len(rows) > height:
            raise ProjectError(
                f'a {len(rows[0])}×{len(rows)} map at ({x0},{y0}) does not fit the {columns}×{height} canvas'
            )

        def filled(cx: int, cy: int) -> bool:
            return 0 <= cy < len(rows) and 0 <= cx < len(rows[0]) and rows[cy][cx] != transparent

        changed = 0
        for cy, row in enumerate(rows):
            for cx, ch in enumerate(row):
                if ch == transparent:
                    continue
                glyph, ink = tones[ch]
                if smooth_edges and glyph == SOLID:
                    open_sides = {side for side, (dx, dy) in
                                  {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}.items()
                                  if not filled(cx + dx, cy + dy)}
                    for (a, b), cut in CORNER_CUTS.items():
                        if open_sides == {a, b}:
                            glyph = cut
                index = (y0 + cy) * columns + (x0 + cx)
                if data['grid'][index] != glyph or data['cellColors'][index] != ink:
                    data['grid'][index] = glyph
                    data['cellColors'][index] = ink
                    changed += 1
        return {'changed': changed, 'size': [len(rows[0]), len(rows)]}

    return drawing._mutate(project_path, mutate)
