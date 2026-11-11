#!/usr/bin/env python3
"""Render exploratory PGL project JSON files to PNG using built-in glyphs."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SRC = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(SRC))

from glyphs import load_glyph_banks  # noqa: E402

# Pepto PAL from c64-colors.js
PEPTO = [
    (0x00, 0x00, 0x00),
    (0xFF, 0xFF, 0xFF),
    (0x68, 0x37, 0x2B),
    (0x70, 0xA4, 0xB2),
    (0x6F, 0x3D, 0x86),
    (0x58, 0x8D, 0x43),
    (0x35, 0x28, 0x79),
    (0xB8, 0xC7, 0x6F),
    (0x6F, 0x4F, 0x25),
    (0x43, 0x39, 0x00),
    (0x9A, 0x67, 0x59),
    (0x44, 0x44, 0x44),
    (0x6C, 0x6C, 0x6C),
    (0x9A, 0xD2, 0x84),
    (0x6C, 0x5E, 0xB5),
    (0x95, 0x95, 0x95),
]


def render_project(path: Path, scale: int = 4) -> Image.Image:
    data = json.loads(path.read_text(encoding="utf-8"))
    columns = data["columns"]
    rows = data["rows"]
    grid = data["grid"]
    bg_index = data.get("colors", {}).get("background", 6)
    default_ink = data.get("colors", {}).get("ink", 14)
    cell_colors = data.get("cellColors") or [default_ink] * len(grid)
    banks = load_glyph_banks()

    img = Image.new("RGB", (columns * 8 * scale, rows * 8 * scale), PEPTO[bg_index])
    draw = ImageDraw.Draw(img)

    for i, glyph_id in enumerate(grid):
        if glyph_id == "" or glyph_id is None:
            continue
        bank = glyph_id // 256
        code = glyph_id % 256
        ink = cell_colors[i] if i < len(cell_colors) else default_ink
        color = PEPTO[ink]
        x = (i % columns) * 8 * scale
        y = (i // columns) * 8 * scale
        for px, py in banks[bank][code]:
            x0 = x + px * scale
            y0 = y + py * scale
            draw.rectangle([x0, y0, x0 + scale - 1, y0 + scale - 1], fill=color)
    return img


def main() -> None:
    examples = Path(__file__).resolve().parent / "examples"
    out = examples / "png"
    out.mkdir(parents=True, exist_ok=True)
    for path in sorted(examples.glob("*.json")):
        img = render_project(path)
        dest = out / f"{path.stem}.png"
        img.save(dest)
        print(dest)


if __name__ == "__main__":
    main()
