"""Op-art and abstract PETSCII: recipes, procedural fills, animation pairings."""

from __future__ import annotations

import math
from typing import Any

# C64 line glyphs (horizontal / vertical) — parallax moiré pair per editor help.
GLYPH_HLINE = 67
GLYPH_VLINE = 68

OP_ART_PASSES = [
    {
        "pass": 1,
        "name": "lattice",
        "action": "Cover the canvas with one period (P×P) tile. Use two glyphs or two inks, not six.",
    },
    {
        "pass": 2,
        "name": "counter-lattice",
        "action": "Add a second grid offset by P//2 or P//2+1. Moiré lives in the mismatch.",
    },
    {
        "pass": 3,
        "name": "focal-break",
        "action": "One rupture: invert a disk, swap inks in a bar, or insert a solid 160 cross.",
    },
    {
        "pass": 4,
        "name": "motion",
        "action": "Stack color + backdrop + slow parallax or wave. Preview render_animation.",
    },
    {
        "pass": 5,
        "name": "review",
        "action": "render_still, critique_drawing(style='op-art'), render_animation if animated.",
    },
]

OP_ART_RECIPES: dict[str, dict[str, Any]] = {
    "line-moire": {
        "title": "Crossed line moiré",
        "artists": "Bridget Riley line fields; Vasarely grid beats",
        "glyphs": [GLYPH_HLINE, GLYPH_VLINE],
        "inks": [1, 3],
        "period": 2,
        "craft": [
            "Horizontal lines on even rows, vertical on odd — or two inks on a full grid.",
            "Animate: movement parallax, parallaxGroup glyph, spread 1, travel opposite.",
            "Static: offset the second layer one cell — beat frequency comes from Δ period.",
        ],
        "animation_suggest": {
            "effect": "parallax",
            "parallaxGroup": "glyph",
            "parallaxSpread": 1,
            "parallaxTravel": "opposite",
            "scrollDirection": "right",
            "colorEffect": "none",
            "backgroundEffect": "none",
            "seconds": 3,
            "motionCycles": 1,
        },
    },
    "diagonal-weave": {
        "title": "Twill diagonal weave",
        "artists": "Anni Albers textile logic on an 8×8 cell",
        "glyphs": [77, 78],
        "inks": [7, 8],
        "period": 1,
        "craft": [
            "Alternate 77 and 78 on (x+y)%2. Whole canvas, one switch per row.",
            "Add a second ink on every third row for depth without new glyphs.",
            "color-wave horizontal + scroll-x slowly = shimmering op band.",
        ],
        "animation_suggest": {
            "effect": "scroll-x",
            "colorEffect": "color-wave",
            "colorWaveDirection": "right",
            "backgroundEffect": "field",
            "fieldRamp": "raster-bars",
            "seconds": 2,
            "motionCycles": 1,
            "colorCycles": 2,
            "backgroundCycles": 1,
        },
    },
    "nested-squares": {
        "title": "Nested square tunnel",
        "artists": "Victor Vasarely concentric targets",
        "glyphs": [160, 102],
        "inks": [1, 12],
        "period": 0,
        "craft": [
            "Draw concentric rects; alternate solid and checker each ring.",
            "Keep rings an even count so the center resolves to one cell.",
            "Ripple or zoom-lite: effect ripple with low amplitude.",
        ],
        "animation_suggest": {
            "effect": "ripple",
            "colorEffect": "inverse",
            "backgroundEffect": "none",
            "seconds": 2,
            "motionCycles": 2,
        },
    },
    "vertical-bars": {
        "title": "Riley-style vertical bars",
        "artists": "Bridget Riley — high contrast stripe fields",
        "glyphs": [160],
        "inks": [1, 0],
        "period": 3,
        "craft": [
            "Bars width 2–4 cells; period 6–8 for strong motion sickness (on purpose).",
            "Break symmetry once: widen one bar or slip phase by +1 column at mid-canvas.",
            "fld-blinds + scroll-y exaggerates the illusion.",
        ],
        "animation_suggest": {
            "effect": "fld-blinds",
            "fldBlindsHeight": 4,
            "fldBlindsWavelength": 8,
            "colorEffect": "color-cycle",
            "backgroundEffect": "none",
            "seconds": 2,
            "motionCycles": 1,
            "colorCycles": 4,
        },
    },
    "ring-bands": {
        "title": "Radial band illusion",
        "artists": "Op-art target; Escher circle limits",
        "glyphs": [102, 160, 127],
        "inks": [1, 3, 7],
        "period": 0,
        "craft": [
            "Bands from center: cycle glyph ladder every ring (solid → checker → diagonal split).",
            "Use odd ring count so the core is a deliberate focal dot.",
            "wave on a filled disk reads as pulsing tunnel.",
        ],
        "animation_suggest": {
            "effect": "wave",
            "waveAmplitude": 35,
            "colorEffect": "plasma",
            "backgroundEffect": "field",
            "fieldRamp": "plasma",
            "seconds": 3,
        },
    },
    "triangle-tessellation": {
        "title": "Triangle checker tessellation",
        "artists": "Penrose-like zigzag without aperiodic math",
        "glyphs": [95, 105],
        "inks": [5, 13],
        "period": 2,
        "craft": [
            "95 and 105 on a checkerboard — chirality flips each column.",
            "One wrong triangle in the center is the 'pop' focal point.",
            "Stay at two inks until the tessellation reads; then add one accent column.",
        ],
        "animation_suggest": {
            "effect": "column-wave",
            "colorEffect": "none",
            "backgroundEffect": "field",
            "fieldRamp": "wave",
            "seconds": 2,
        },
    },
    "plasma-field": {
        "title": "Minimal mark, maximal color plasma",
        "artists": "Demoscene color field; no figurative subject",
        "glyphs": [102],
        "inks": [6],
        "period": 4,
        "craft": [
            "Sparse checker 102 at period 4 — ink density low so color does the work.",
            "Stack backgroundEffect field plasma + colorEffect plasma at different cycles.",
            "80-column canvas multiplies horizontal wave complexity.",
        ],
        "animation_suggest": {
            "effect": "none",
            "colorEffect": "plasma",
            "backgroundEffect": "field",
            "fieldRamp": "plasma",
            "colorCycles": 2,
            "backgroundCycles": 3,
            "seconds": 4,
        },
    },
    "dual-checker": {
        "title": "Ink parallax chessboard",
        "artists": "Lab help: two inks + parallax = chessboard motion",
        "glyphs": [160],
        "inks": [1, 7],
        "period": 1,
        "craft": [
            "Checkerboard fill (x+y)%2 with two inks, glyph solid.",
            "parallaxGroup ink, spread 1, travel opposite — classic lab moiré.",
            "No extra glyphs until the motion reads in preview.",
        ],
        "animation_suggest": {
            "effect": "parallax",
            "parallaxGroup": "ink",
            "parallaxSpread": 1,
            "parallaxTravel": "opposite",
            "scrollDirection": "down",
            "colorEffect": "none",
            "seconds": 2,
        },
    },
    "islamic-girih-8": {
        "title": "Eight-fold girih star lattice",
        "artists": "Alhambra / Iranian girih tile work",
        "glyphs": [77, 78, 102, 160],
        "inks": [1, 7],
        "period": 4,
        "craft": [
            "Period-4 strapwork: star nodes on lattice crossings, checker interiors.",
            "Keep bilateral symmetry; gold/white on blue reads as traditional glaze.",
            "Do not add figures — the star field is the whole subject.",
        ],
        "animation_suggest": {
            "effect": "scroll-x",
            "scrollDirection": "left",
            "colorEffect": "color-glow",
            "backgroundEffect": "field",
            "fieldRamp": "glow",
            "seconds": 4,
            "motionCycles": 1,
            "colorCycles": 1,
            "backgroundCycles": 2,
        },
    },
    "islamic-interlace": {
        "title": "Interlaced diagonal strapwork",
        "artists": "Mamluk Qur'an borders; Ottoman tile interlace",
        "glyphs": [77, 78],
        "inks": [1, 3],
        "period": 2,
        "craft": [
            "Same twill as diagonal-weave but period-2 ink bands mimic over-under weave.",
            "Frame with stamp_border glyph 160 in accent ink.",
        ],
        "animation_suggest": {
            "effect": "parallax",
            "parallaxGroup": "glyph",
            "parallaxSpread": 1,
            "parallaxTravel": "same",
            "scrollDirection": "up",
            "colorEffect": "none",
            "seconds": 3,
        },
    },
    "arabesque-band": {
        "title": "Arabesque border bands",
        "artists": "Maghrebi manuscript margins",
        "glyphs": [95, 105, 102, 160],
        "inks": [8, 1],
        "period": 3,
        "craft": [
            "Dense triangle chevrons in top and bottom quartile rows; calm center field.",
            "Chevrons alternate 95/105 along X — rhythm like vine tendrils on a grid.",
            "Optional place_text calligraphy in center with single ink.",
        ],
        "animation_suggest": {
            "effect": "none",
            "colorEffect": "color-wave",
            "colorWaveDirection": "up",
            "backgroundEffect": "field",
            "fieldRamp": "wave",
            "seconds": 3,
        },
    },
    "mandala-lotus": {
        "title": "Lotus mandala rings",
        "artists": "Hindu / Buddhist thangka mandala layout",
        "glyphs": [126, 123, 160, 102],
        "inks": [8, 2, 1],
        "period": 0,
        "craft": [
            "Eight petal sectors from center; bindu is one white solid at hub.",
            "Outer ring quarter-blocks; inner petals checker — saffron + white typical.",
            "Perfect radial balance; one petal may hold accent red for festival.",
        ],
        "animation_suggest": {
            "effect": "ripple",
            "colorEffect": "color-cycle",
            "backgroundEffect": "field",
            "fieldRamp": "bonfire",
            "seconds": 4,
            "motionCycles": 1,
            "colorCycles": 2,
        },
    },
    "yantra-triangles": {
        "title": "Nested yantra triangles",
        "artists": "Sri Yantra–style (simplified bindu)",
        "glyphs": [95, 105, 160],
        "inks": [2, 8],
        "period": 0,
        "craft": [
            "Up triangles 95 below center row, down triangles 105 above — nested V shapes.",
            "Odd count of nested levels; center cell is bindu (solid white).",
            "Symmetry left-right; no text inside yantra proper.",
        ],
        "animation_suggest": {
            "effect": "none",
            "colorEffect": "color-glow",
            "backgroundEffect": "none",
            "seconds": 3,
            "colorCycles": 1,
        },
    },
    "kolam-pulli": {
        "title": "Kolam dot grid (pulli)",
        "artists": "Tamil kolam; South Indian rangoli",
        "glyphs": [111, 67, 68],
        "inks": [1, 8],
        "period": 4,
        "craft": [
            "Dots on lattice period; orthogonal connectors — not a solid fill.",
            "Lines loop mentally: connect dots in one continuous path when extending by hand.",
            "Festival version: swap ink to marigold; keep most cells empty.",
        ],
        "animation_suggest": {
            "effect": "none",
            "colorEffect": "color-glow",
            "seconds": 2,
        },
    },
    "rug-gul-repeat": {
        "title": "Repeating gül (octagon) lattice",
        "artists": "Anatolian / Turkmen tribal gül",
        "glyphs": [160, 102, 127],
        "inks": [10, 9],
        "period": 5,
        "craft": [
            "Each period block is a small ring target — not one central toranj.",
            "Stagger every other row by half period for brick repeat.",
        ],
        "animation_suggest": {
            "effect": "scroll-y",
            "scrollDirection": "down",
            "colorEffect": "none",
            "seconds": 3,
        },
    },
    "rug-charbagh": {
        "title": "Chahar bagh garden cross",
        "artists": "Isfahan garden carpet",
        "glyphs": [67, 68, 77, 78],
        "inks": [5, 3],
        "period": 0,
        "craft": [
            "Canal cross through center; quadrants alternate diagonal weave direction.",
            "Borders added in combined styles, not this stamp alone.",
        ],
        "animation_suggest": {
            "effect": "none",
            "colorEffect": "color-wave",
            "seconds": 3,
        },
    },
    "rug-kilim-bands": {
        "title": "Kilim horizontal band stack",
        "artists": "Caucasian flatweave",
        "glyphs": [77, 78, 160, 102],
        "inks": [2, 1, 9],
        "period": 0,
        "craft": [
            "Each horizontal band = one glyph + one ink; serrated join via triangle every 6 columns.",
            "Do not add pile texture — bands stay flat and crisp.",
        ],
        "animation_suggest": {
            "effect": "fld-blinds",
            "fldBlindsHeight": 2,
            "seconds": 2,
        },
    },
}


def list_op_art_recipes() -> dict[str, Any]:
    return {
        "ok": True,
        "passes": OP_ART_PASSES,
        "recipes": [
            {
                "id": key,
                "title": spec["title"],
                "artists": spec["artists"],
                "glyphs": spec["glyphs"],
                "inks": spec["inks"],
            }
            for key, spec in OP_ART_RECIPES.items()
        ],
        "note": "Read petscii://op-art/recipes/{id} for craft + animation_suggest. stamp_op_art paints the lattice.",
    }


def op_art_recipe(recipe_id: str) -> dict[str, Any]:
    key = recipe_id.strip().lower().replace(" ", "-")
    spec = OP_ART_RECIPES.get(key)
    if not spec:
        return {"ok": False, "error": f"unknown recipe {recipe_id!r}", "known": list(OP_ART_RECIPES)}
    return {"ok": True, "id": key, **spec, "passes": OP_ART_PASSES}


def _clamp_int(value: Any, default: int, low: int, high: int) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, n))


def generate_pattern_cells(
    recipe_id: str,
    columns: int,
    rows: int,
    *,
    period: int | None = None,
    ink_a: int | None = None,
    ink_b: int | None = None,
) -> dict[str, Any]:
    """Return a cell list for paint_cells / stamp_op_art."""
    key = recipe_id.strip().lower().replace(" ", "-")
    spec = OP_ART_RECIPES.get(key)
    if not spec:
        return {"ok": False, "error": f"unknown recipe {recipe_id!r}"}

    glyphs = spec["glyphs"]
    inks = spec["inks"]
    a_ink = _clamp_int(ink_a, inks[0] if inks else 1, 0, 15)
    b_ink = _clamp_int(ink_b, inks[1] if len(inks) > 1 else a_ink, 0, 15)
    p = _clamp_int(period, spec.get("period") or 2, 1, 12)

    cells: list[dict[str, int]] = []

    if key == "line-moire":
        for y in range(rows):
            for x in range(columns):
                if y % 2 == 0:
                    cells.append({"x": x, "y": y, "glyph": glyphs[0], "ink": a_ink})
                else:
                    cells.append({"x": x, "y": y, "glyph": glyphs[1], "ink": b_ink})

    elif key == "diagonal-weave":
        for y in range(rows):
            for x in range(columns):
                glyph = glyphs[(x + y) % 2]
                ink = a_ink if (x // p) % 2 == 0 else b_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "nested-squares":
        cx, cy = (columns - 1) / 2, (rows - 1) / 2
        max_r = int(min(columns, rows) // 2)
        painted: set[tuple[int, int]] = set()
        for ring in range(max_r, 0, -1):
            glyph = glyphs[ring % 2]
            ink = a_ink if ring % 2 else b_ink
            for x in range(int(cx - ring), int(cx + ring) + 1):
                for y in range(int(cy - ring), int(cy + ring) + 1):
                    if x < 0 or y < 0 or x >= columns or y >= rows:
                        continue
                    on_edge = (
                        x == int(cx - ring)
                        or x == int(cx + ring)
                        or y == int(cy - ring)
                        or y == int(cy + ring)
                    )
                    if not on_edge:
                        continue
                    if (x, y) in painted:
                        continue
                    painted.add((x, y))
                    cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})
        if not cells:
            cells.append({"x": columns // 2, "y": rows // 2, "glyph": glyphs[0], "ink": a_ink})

    elif key == "vertical-bars":
        for y in range(rows):
            for x in range(columns):
                phase = (x // p) % 2
                cells.append({"x": x, "y": y, "glyph": glyphs[0], "ink": a_ink if phase == 0 else b_ink})

    elif key == "ring-bands":
        cx, cy = (columns - 1) / 2, (rows - 1) / 2
        max_d = math.hypot(cx, cy)
        for y in range(rows):
            for x in range(columns):
                d = math.hypot(x - cx, y - cy)
                band = int(d / max(max_d / 8, 1))
                glyph = glyphs[band % len(glyphs)]
                ink = a_ink if band % 2 == 0 else b_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "triangle-tessellation":
        for y in range(rows):
            for x in range(columns):
                glyph = glyphs[(x + (y // p)) % 2]
                ink = a_ink if (x + y) % 2 == 0 else b_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "plasma-field":
        for y in range(rows):
            for x in range(columns):
                if (x % p == 0) and (y % p == 0):
                    cells.append({"x": x, "y": y, "glyph": glyphs[0], "ink": a_ink})

    elif key == "dual-checker":
        for y in range(rows):
            for x in range(columns):
                ink = a_ink if (x + y) % 2 == 0 else b_ink
                cells.append({"x": x, "y": y, "glyph": glyphs[0], "ink": ink})

    elif key == "islamic-girih-8":
        for y in range(rows):
            for x in range(columns):
                gx, gy = x % p, y % p
                on_cross = gx == p // 2 or gy == p // 2
                in_star = 1 <= gx <= 2 and 1 <= gy <= 2
                if on_cross:
                    glyph = 160
                    ink = a_ink
                elif in_star:
                    glyph = 102
                    ink = b_ink
                elif (gx + gy) % 2 == 0:
                    glyph = 77
                    ink = a_ink
                else:
                    glyph = 78
                    ink = b_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "islamic-interlace":
        for y in range(rows):
            for x in range(columns):
                glyph = glyphs[(x // p + y // p) % 2]
                ink = a_ink if (x + y) % 2 == 0 else b_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "arabesque-band":
        band_rows = max(3, rows // 5)
        for y in range(rows):
            in_band = y < band_rows or y >= rows - band_rows
            for x in range(columns):
                if not in_band:
                    if (x + y) % (p * 2) == 0:
                        cells.append({"x": x, "y": y, "glyph": 102, "ink": b_ink})
                    continue
                chev = glyphs[(x // p) % 2]
                ink = a_ink if y < band_rows else b_ink
                cells.append({"x": x, "y": y, "glyph": chev, "ink": ink})

    elif key == "mandala-lotus":
        cx, cy = (columns - 1) / 2.0, (rows - 1) / 2.0
        petals = 8
        for y in range(rows):
            for x in range(columns):
                dx, dy = x - cx, y - cy
                angle = math.atan2(dy, dx)
                sector = int((angle + math.pi) / (2 * math.pi) * petals) % petals
                dist = math.hypot(dx, dy)
                if dist < 1.2:
                    cells.append({"x": x, "y": y, "glyph": 160, "ink": 1})
                    continue
                ring = int(dist / max(min(columns, rows) / 14, 1))
                glyph = glyphs[ring % len(glyphs)]
                ink = a_ink if sector % 2 == 0 else b_ink
                if ring == 0:
                    glyph = 102
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "yantra-triangles":
        cx = columns // 2
        cy = rows // 2
        max_w = columns // 2 - 1
        for y in range(rows):
            for x in range(columns):
                dist_y = abs(y - cy)
                half = max(0, max_w - dist_y)
                if half == 0 and (x != cx or y != cy):
                    continue
                if x < cx - half or x > cx + half:
                    continue
                if x == cx and y == cy:
                    cells.append({"x": x, "y": y, "glyph": 160, "ink": 1})
                    continue
                on_edge = x == cx - half or x == cx + half
                if on_edge:
                    glyph = 95 if y > cy else 105
                    ink = a_ink if y > cy else b_ink
                else:
                    glyph = 102
                    ink = b_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "kolam-pulli":
        dotted: set[tuple[int, int]] = set()
        for y in range(0, rows, p):
            for x in range(0, columns, p):
                dotted.add((x, y))
        for y in range(rows):
            for x in range(columns):
                if (x, y) in dotted:
                    cells.append({"x": x, "y": y, "glyph": 111, "ink": a_ink})
                    continue
                if x % p == 0 and y % p != 0 and (y // p) % 2 == 0:
                    cells.append({"x": x, "y": y, "glyph": 68, "ink": b_ink})
                elif y % p == 0 and x % p != 0 and (x // p) % 2 == 0:
                    cells.append({"x": x, "y": y, "glyph": 67, "ink": b_ink})

    elif key == "rug-gul-repeat":
        period_px = max(4, p)
        for y in range(rows):
            for x in range(columns):
                bx = (x + (period_px // 2 if (y // period_px) % 2 else 0)) % period_px
                by = y % period_px
                cx, cy = period_px // 2, period_px // 2
                dist = abs(bx - cx) + abs(by - cy)
                if dist <= 1:
                    glyph, ink = 160, a_ink
                elif dist == 2:
                    glyph, ink = 127, b_ink
                else:
                    glyph, ink = 102, b_ink if (x // period_px + y // period_px) % 2 else a_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "rug-charbagh":
        mid_x, mid_y = columns // 2, rows // 2
        for y in range(rows):
            for x in range(columns):
                if x == mid_x:
                    cells.append({"x": x, "y": y, "glyph": 68, "ink": 3})
                    continue
                if y == mid_y:
                    cells.append({"x": x, "y": y, "glyph": 67, "ink": 3})
                    continue
                quadrant = (1 if x > mid_x else 0) + (2 if y > mid_y else 0)
                glyph = 77 if quadrant in (0, 3) else 78
                ink = a_ink if quadrant in (0, 1) else b_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    elif key == "rug-kilim-bands":
        band_h = 3
        for y in range(rows):
            band = y // band_h
            for x in range(columns):
                if band % 4 == 0:
                    glyph, ink = 160, a_ink
                elif band % 4 == 1:
                    glyph, ink = 77, b_ink
                elif band % 4 == 2:
                    glyph, ink = 78, a_ink
                else:
                    if x % 6 == 0:
                        glyph, ink = 95, b_ink
                    else:
                        glyph, ink = 102, b_ink
                cells.append({"x": x, "y": y, "glyph": glyph, "ink": ink})

    else:
        return {"ok": False, "error": f"no generator for {key}"}

    return {
        "ok": True,
        "recipe": key,
        "columns": columns,
        "rows": rows,
        "cell_count": len(cells),
        "cells": cells,
        "animation_suggest": spec.get("animation_suggest"),
    }


def critique_op_art(
    grid: list[str],
    cell_colors: list[int],
    columns: int,
    rows: int,
) -> dict[str, Any]:
    """Heuristic review for abstract / op-art pieces."""
    cells = len(grid)
    occupied = sum(1 for g in grid if g != "")
    coverage = occupied / cells if cells else 0.0

    glyph_hist: dict[str, int] = {}
    ink_hist: dict[int, int] = {}
    for idx, glyph in enumerate(grid):
        if glyph == "":
            continue
        glyph_hist[glyph] = glyph_hist.get(glyph, 0) + 1
        if idx < len(cell_colors):
            ink_hist[int(cell_colors[idx])] = ink_hist.get(int(cell_colors[idx]), 0) + 1

    unique_glyphs = len(glyph_hist)
    unique_inks = len(ink_hist)

    issues: list[dict[str, str]] = []
    next_steps: list[str] = []

    kolam_like = glyph_hist.get("111", 0) + glyph_hist.get(67, 0) + glyph_hist.get(68, 0)
    sparse_by_design = occupied > 10 and kolam_like >= occupied * 0.5 and coverage < 0.45

    if coverage < 0.45 and not sparse_by_design:
        issues.append(
            {
                "code": "thin_field",
                "message": "Op-art fields usually cover most of the canvas — sparse marks read as draft noise.",
            }
        )
        next_steps.append("Fill with stamp_op_art or a full lattice before adding a focal break.")
    elif sparse_by_design:
        next_steps.append("Kolam-style: extend loops between pulli dots with draw_line; keep center empty.")

    if unique_glyphs > 6:
        issues.append(
            {
                "code": "glyph_soup",
                "message": f"{unique_glyphs} different glyphs — op-art needs 1–3 glyphs in a rigid period.",
            }
        )
        next_steps.append("Pick one recipe from petscii://op-art/recipes; reduce to its glyph list.")

    if unique_inks > 4:
        issues.append(
            {
                "code": "ink_noise",
                "message": f"{unique_inks} inks — keep two structural inks plus one accent for motion.",
            }
        )
        next_steps.append("Recolor to two inks; move complexity into animation stacks.")

    if unique_glyphs >= 2 and occupied > 20:
        top = max(glyph_hist.values())
        if top / occupied < 0.35:
            issues.append(
                {
                    "code": "no_dominant_period",
                    "message": "No dominant glyph — the lattice period is unclear.",
                }
            )
            next_steps.append("Regenerate with stamp_op_art; add counter-lattice offset by exactly half a period.")

    score = max(0, 100 - len(issues) * 18)

    return {
        "style": "op-art",
        "score": score,
        "stats": {
            "coverage": round(coverage, 3),
            "unique_glyphs": unique_glyphs,
            "unique_inks": unique_inks,
            "top_glyphs": sorted(glyph_hist.items(), key=lambda x: -x[1])[:6],
        },
        "issues": issues,
        "next_steps": next_steps or ["update_project(patch={animation: animation_suggest}), then render_animation."],
        "study": [
            "Riley: high-contrast bars, one deliberate symmetry break.",
            "Vasarely: concentric geometry, alternating solid/checker rings.",
            "Islamic girih: period-4 stars, interlace diagonals, no figurative center.",
            "Hindu mandala: radial petals, bindu center, kolam negative space.",
            "Demoscene: minimal glyphs, stacked plasma + parallax cycles.",
        ],
    }