"""Compare MCP exports with the editor's own downloads, pixel for pixel and byte for byte.

Run from the repository root (needs the MCP venv, Node, and the pre-installed Playwright Chromium):

    agents/petscii-preview/.venv/bin/python agents/petscii-preview/smoke/editor_parity.py

Projects are built with the MCP drawing tools, then exported twice: once by the MCP and once by
index.html in Chromium (PNG at 16 px/cell, SVG, GIF, native PRG). Exit status 1 on any mismatch.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageSequence

AGENT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT / "src"))

import drawing  # noqa: E402
import pgl_export  # noqa: E402
from node_bridge import REPO_ROOT, find_node  # noqa: E402

# Bank-0 graphics, a bank-1 letter (300) and inverse glyphs, with several inks per machine.
STROKES = [
    (1, 1, 81), (2, 1, 160), (3, 1, 102), (4, 1, 77), (5, 1, 78),
    (1, 2, 300), (2, 2, 1), (3, 2, 209), (4, 2, 233), (5, 2, 95),
]
MACHINES = {
    # machine: (columns, background, inks)
    "c64": (12, 6, [1, 7, 14, 2]),
    "c128": (12, 11, [13, 1, 5, 10]),
    "c128-80": (16, 8, [10, 15, 3, 12]),
    "plus4": (12, 113, [0, 50, 82, 115]),
}
ANIMATIONS = {
    "c64": {"effect": "scroll-x", "colorEffect": "color-wave", "backgroundEffect": "field", "fieldRamp": "glow", "seconds": 1, "scale": 1},
    "plus4": {"effect": "none", "colorEffect": "plus4-cycle", "backgroundEffect": "none", "seconds": 1, "scale": 1},
    "c128-80": {"effect": "wave", "colorEffect": "none", "backgroundEffect": "none", "seconds": 1, "scale": 1},
}


def build(folder: Path, machine: str, palette: str | None) -> Path:
    columns, background, inks = MACHINES[machine]
    path = folder / f"{machine}-{palette or 'default'}.json"
    created = drawing.create_canvas(str(path), columns, 4, background=background, ink=inks[0], machine=machine)
    assert created["ok"], created
    cells = [{"x": x, "y": y, "glyph": g, "ink": inks[i % len(inks)]} for i, (x, y, g) in enumerate(STROKES)]
    assert drawing.paint_cells(str(path), cells)["ok"]
    data = json.loads(path.read_text())
    if palette:
        data["palette"] = palette
    if machine in ANIMATIONS:
        data["animation"] = {**data["animation"], **ANIMATIONS[machine]}
    path.write_text(json.dumps(data))
    return path


def svg_summary(text: str) -> dict:
    size = re.search(r'viewBox="0 0 (\d+) (\d+)"', text).groups()
    background = re.search(r'<rect width="100%" height="100%" fill="(#[0-9a-f]{6})"', text)
    # Editor: one <g fill transform> per cell; MCP: one <use fill transform> per cell.
    cells = sorted(re.findall(r'<(?:g|use)[^>]*fill="(#[0-9a-f]{6})"[^>]*transform="translate\(([\d.]+) ([\d.]+)\)', text))
    return {"size": size, "background": background and background.group(1), "cells": cells}


def timeline(path: Path) -> list[bytes]:
    """GIF as one picture per 10 ms. Pillow merges identical consecutive frames (adding their
    durations), so frame counts can differ while playback is identical; compare playback."""
    ticks: list[bytes] = []
    with Image.open(path) as gif:
        for frame in ImageSequence.Iterator(gif):
            picture = frame.convert("RGBA").tobytes()
            ticks.extend([picture] * round(frame.info.get("duration", 0) / 10))
    return ticks


def main() -> int:
    failures: list[str] = []
    notes: list[str] = []
    checks = 0
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(os.environ.get('PARITY_KEEP') or tmp)
        folder.mkdir(parents=True, exist_ok=True)
        cases = []
        local: dict[str, dict[str, Path]] = {}
        for machine in MACHINES:
            palettes = [None, "colodore"] if machine == "c64" else [None]
            for palette in palettes:
                for aspect in ("square", "crt"):
                    project = build(folder, machine, palette)
                    name = f"{project.stem}-{aspect}"
                    outputs = ["png", "svg"]
                    if aspect == "square":
                        outputs.append("prg")
                        if machine in ANIMATIONS and not palette:
                            outputs.append("gif")
                    mine = {
                        "png": pgl_export.render_still(str(project), 2, "canvas", str(folder / f"mcp-{name}.png"), "png", aspect)["saved_to"],
                        "svg": pgl_export.render_still(str(project), 1, "canvas", str(folder / f"mcp-{name}.svg"), "svg", aspect)["saved_to"],
                    }
                    if "prg" in outputs:
                        result = pgl_export.export_native(str(project), save_path=str(folder / f"mcp-{name}.prg"))
                        assert result["ok"], result
                        mine["prg"] = result["saved_to"]
                    if "gif" in outputs:
                        mine["gif"] = pgl_export.render_animation_gif(str(project), None, 1, str(folder / f"mcp-{name}.gif"), aspect)["saved_to"]
                    local[name] = {key: Path(value) for key, value in mine.items()}
                    cases.append({"name": name, "project": json.loads(project.read_text()), "cellAspect": aspect, "outputs": outputs})
        cases_path = folder / "cases.json"
        cases_path.write_text(json.dumps(cases))
        editor_dir = folder / "editor"
        run = subprocess.run(
            [find_node(), str(AGENT / "smoke" / "editor-parity.mjs"), str(cases_path), str(editor_dir)],
            cwd=REPO_ROOT, capture_output=True, text=True,
        )
        if run.returncode != 0:
            print(run.stdout, run.stderr)
            return 1
        for result in json.loads(run.stdout.strip().splitlines()[-1])["results"]:
            name = result["name"]
            for kind, editor_file in result["files"].items():
                checks += 1
                editor_path, mcp_path = Path(editor_file), local[name][kind]
                if kind == "png":
                    a = Image.open(editor_path).convert("RGBA")
                    b = Image.open(mcp_path).convert("RGBA")
                    if a.size != b.size or a.tobytes() != b.tobytes():
                        diff = sum(1 for p, q in zip(a.get_flattened_data(), b.get_flattened_data()) if p != q) if a.size == b.size else "size"
                        failures.append(f"{name}.png differs: editor {a.size} mcp {b.size} pixels {diff}")
                elif kind == "svg":
                    a, b = svg_summary(editor_path.read_text()), svg_summary(mcp_path.read_text())
                    if a != b:
                        failures.append(f"{name}.svg differs: editor {a['size']} {a['background']} {len(a['cells'])} cells; mcp {b['size']} {b['background']} {len(b['cells'])} cells")
                elif kind == "gif":
                    a, b = timeline(editor_path), timeline(mcp_path)
                    if len(a) != len(b):
                        failures.append(f"{name}.gif length differs: editor {len(a) * 10} ms, mcp {len(b) * 10} ms")
                    elif a != b:
                        bad = [i * 10 for i, (x, y) in enumerate(zip(a, b)) if x != y]
                        failures.append(f"{name}.gif pictures differ at {bad[:10]} ms")
                elif kind == "prg":
                    if editor_path.read_bytes() != mcp_path.read_bytes():
                        failures.append(f"{name}.prg differs: editor {editor_path.stat().st_size} bytes, mcp {mcp_path.stat().st_size} bytes")
    print(f"{checks} comparisons, {len(failures)} mismatches")
    for note in notes:
        print(" ·", note)
    for failure in failures:
        print(" -", failure)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
