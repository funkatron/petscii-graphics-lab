"""Oriental rug layout and multi-tradition style combinations for PETSCII."""

from __future__ import annotations

from typing import Any

import op_art

# Named compositions: border + field + center (+ optional corners).
STYLE_COMBINATIONS: dict[str, dict[str, Any]] = {
    "ardabil-medallion": {
        "title": "Ardabil-style: lattice field + toranj medallion",
        "study": [
            "Ardabil Carpet (V&A): huge field, central medallion, nested borders, lamp niches.",
            "Field = repeating herati-ish strapwork; toranj is circular focal.",
            "Four border bands in real rugs → here: one dense frame + inner guard row.",
        ],
        "layers": [
            {"role": "field", "recipe": "islamic-girih-8"},
            {"role": "border", "recipe": "islamic-interlace", "margin": 3},
            {"role": "medallion", "recipe": "mandala-lotus", "x0": 12, "y0": 7, "x1": 27, "y1": 17},
        ],
        "palette_hint": "Deep blue field (7), red border (2), cream/cyan accent (1/3) — Ardabil glaze read.",
        "reference_ids": ["ardabil-carpet"],
        "animation_suggest": {
            "effect": "none",
            "colorEffect": "color-glow",
            "backgroundEffect": "field",
            "fieldRamp": "glow",
            "seconds": 4,
            "colorCycles": 1,
            "backgroundCycles": 2,
        },
    },
    "konya-gul": {
        "title": "Anatolian gül repeat (Memling rose)",
        "study": [
            "Konya carpets: stacked octagonal gül, earth reds and browns.",
            "Each gül is a medallion in a lattice — repeat with period, not one giant center.",
        ],
        "layers": [
            {"role": "field", "recipe": "rug-gul-repeat"},
            {"role": "border", "recipe": "vertical-bars", "margin": 2},
        ],
        "palette_hint": "Brown (9), light red (10), dark ground (0) — tribal earth.",
        "reference_ids": ["konya-memling-gul"],
        "animation_suggest": {
            "effect": "scroll-y",
            "scrollDirection": "down",
            "colorEffect": "none",
            "seconds": 3,
            "motionCycles": 1,
        },
    },
    "garden-charbagh": {
        "title": "Persian garden carpet (chahar bagh)",
        "study": [
            "Isfahan garden carpets: water channels cross at center, four planted quadrants.",
            "PETSCII: orthogonal canal lines + different weave per quadrant.",
        ],
        "layers": [
            {"role": "field", "recipe": "rug-charbagh"},
            {"role": "border", "recipe": "arabesque-band", "margin": 3},
        ],
        "palette_hint": "Green quadrants (5/13), cyan water (3), earth border (9/8).",
        "reference_ids": ["isfahan-garden-carpet"],
        "animation_suggest": {
            "effect": "none",
            "colorEffect": "color-wave",
            "colorWaveDirection": "up",
            "seconds": 3,
        },
    },
    "indo-persian-fusion": {
        "title": "Indo-Persian fusion: girih + mandala + kolam corners",
        "study": [
            "Combine Islamic field, Hindu central lotus, kolam dots in spandrel corners.",
            "Real workshop history: Mughal carpets braid Persian and Indian floral geometry.",
        ],
        "layers": [
            {"role": "field", "recipe": "diagonal-weave"},
            {"role": "border", "recipe": "arabesque-band", "margin": 3},
            {"role": "medallion", "recipe": "yantra-triangles", "x0": 13, "y0": 8, "x1": 26, "y1": 16},
            {"role": "corners", "recipe": "kolam-pulli", "corners": True, "corner_size": 6},
        ],
        "palette_hint": "Limit to 4 inks: blue field, saffron medallion, white accent, black ground.",
        "reference_ids": ["ardabil-carpet", "sri-yantra-johari", "kolam-32-dots"],
        "animation_suggest": {
            "effect": "parallax",
            "parallaxGroup": "ink",
            "parallaxSpread": 1,
            "parallaxTravel": "opposite",
            "scrollDirection": "left",
            "colorEffect": "color-cycle",
            "colorCycles": 2,
            "seconds": 4,
        },
    },
    "kilim-band-stack": {
        "title": "Caucasian kilim band stack",
        "study": [
            "Flatweave kilims: horizontal stripes, serrated joins, no pile texture.",
            "Stack recipes per horizontal band — each band one glyph family.",
        ],
        "layers": [{"role": "field", "recipe": "rug-kilim-bands"}],
        "palette_hint": "Bold reds, ivory, black — alternate every 3–4 rows.",
        "reference_ids": [],
        "animation_suggest": {
            "effect": "fld-blinds",
            "fldBlindsHeight": 3,
            "fldBlindsWavelength": 6,
            "colorEffect": "none",
            "seconds": 2,
        },
    },
}


def _in_rect(x: int, y: int, x0: int, y0: int, x1: int, y1: int) -> bool:
    return x0 <= x <= x1 and y0 <= y <= y1


def _in_margin(x: int, y: int, columns: int, rows: int, margin: int) -> bool:
    return x < margin or y < margin or x >= columns - margin or y >= rows - margin


def _corner_rect(
    corner: str, columns: int, rows: int, size: int
) -> tuple[int, int, int, int]:
    if corner == "nw":
        return 0, 0, size - 1, size - 1
    if corner == "ne":
        return columns - size, 0, columns - 1, size - 1
    if corner == "sw":
        return 0, rows - size, size - 1, rows - 1
    return columns - size, rows - size, columns - 1, rows - 1


def _cells_by_region(
    cells: list[dict],
    *,
    columns: int,
    rows: int,
    margin: int | None = None,
    rect: tuple[int, int, int, int] | None = None,
    corners_only: bool = False,
    corner_size: int = 5,
) -> list[dict]:
    out: list[dict] = []
    for cell in cells:
        x, y = int(cell["x"]), int(cell["y"])
        if rect is not None:
            if _in_rect(x, y, rect[0], rect[1], rect[2], rect[3]):
                out.append(cell)
            continue
        if margin is not None and _in_margin(x, y, columns, rows, margin):
            out.append(cell)
            continue
        if corners_only:
            for name in ("nw", "ne", "sw", "se"):
                r = _corner_rect(name, columns, rows, corner_size)
                if _in_rect(x, y, r[0], r[1], r[2], r[3]):
                    out.append(cell)
                    break
    return out


def _merge_cells(layers: list[list[dict]]) -> list[dict]:
    merged: dict[tuple[int, int], dict] = {}
    for layer in layers:
        for cell in layer:
            merged[(int(cell["x"]), int(cell["y"]))] = cell
    return list(merged.values())


def list_style_combinations() -> dict[str, Any]:
    return {
        "ok": True,
        "combinations": [
            {"id": key, "title": spec["title"], "references": spec.get("reference_ids", [])}
            for key, spec in STYLE_COMBINATIONS.items()
        ],
        "combine_workflow": [
            "list_world_art_references('rug')",
            "combine_styles(combo_id) — read layers",
            "stamp_combined_style(project_path, combo_id)",
            "critique_drawing(style='op-art')",
        ],
        "rules": [
            "Paint field first, then border (overwrites edge), then medallion (overwrites center).",
            "Never mix more than three glyph families in one band.",
            "Each layer keeps its recipe inks — recolor whole canvas only after merge.",
        ],
    }


def combine_styles(combo_id: str) -> dict[str, Any]:
    key = combo_id.strip().lower().replace(" ", "-")
    spec = STYLE_COMBINATIONS.get(key)
    if not spec:
        return {"ok": False, "error": f"unknown combination {combo_id!r}", "known": list(STYLE_COMBINATIONS)}
    return {"ok": True, "id": key, **spec}


def generate_combined_cells(
    combo_id: str,
    columns: int,
    rows: int,
    *,
    period: int | None = None,
    ink_a: int | None = None,
    ink_b: int | None = None,
) -> dict[str, Any]:
    key = combo_id.strip().lower().replace(" ", "-")
    spec = STYLE_COMBINATIONS.get(key)
    if not spec:
        return {"ok": False, "error": f"unknown combination {combo_id!r}"}

    layer_cells: list[list[dict]] = []
    for layer in spec["layers"]:
        recipe = layer["recipe"]
        gen = op_art.generate_pattern_cells(
            recipe, columns, rows, period=period, ink_a=ink_a, ink_b=ink_b
        )
        if not gen.get("ok"):
            return gen
        cells = gen["cells"]
        margin = layer.get("margin")
        if margin is not None:
            cells = _cells_by_region(cells, columns=columns, rows=rows, margin=margin)
        elif layer.get("corners"):
            cells = _cells_by_region(
                cells,
                columns=columns,
                rows=rows,
                corners_only=True,
                corner_size=int(layer.get("corner_size", 5)),
            )
        elif all(k in layer for k in ("x0", "y0", "x1", "y1")):
            rect = (int(layer["x0"]), int(layer["y0"]), int(layer["x1"]), int(layer["y1"]))
            cells = _cells_by_region(cells, columns=columns, rows=rows, rect=rect)
        layer_cells.append(cells)

    merged = _merge_cells(layer_cells)
    return {
        "ok": True,
        "combination": key,
        "columns": columns,
        "rows": rows,
        "cell_count": len(merged),
        "cells": merged,
        "layers": [layer["recipe"] for layer in spec["layers"]],
        "animation_suggest": spec.get("animation_suggest"),
        "palette_hint": spec.get("palette_hint"),
        "study": spec.get("study"),
    }