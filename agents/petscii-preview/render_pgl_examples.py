#!/usr/bin/env python3
"""Render every example project in examples/ to PNG with the MCP exporter (machine glyphs and colours).

    agents/petscii-preview/.venv/bin/python agents/petscii-preview/render_pgl_examples.py

Outputs land in agents/petscii-preview/out/examples-png/ (examples/ itself is read-only to tools).
"""

from __future__ import annotations

import sys
from pathlib import Path

AGENT = Path(__file__).resolve().parent
sys.path.insert(0, str(AGENT / "src"))

import pgl_export  # noqa: E402


def main() -> None:
    out = AGENT / "out" / "examples-png"
    for path in sorted((AGENT / "examples").glob("*.json")):
        result = pgl_export.render_still(str(path), 4, "canvas", str(out / f"{path.stem}.png"))
        print(result["saved_to"])


if __name__ == "__main__":
    main()
