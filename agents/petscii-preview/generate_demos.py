#!/usr/bin/env python3
"""Generate authentic PETSCII machine-mode stills and animation."""

from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(SRC))

from render import render_mode_animation, save_machine_stills


def main() -> None:
    out = Path(__file__).resolve().parent / "out"
    stills = save_machine_stills(out, scale=3)
    gif = render_mode_animation(scale=2, out_path=out / "mode-switch.gif")
    print("Wrote:")
    for path in stills:
        print(f"  {path}")
    print(f"  {gif}")


if __name__ == "__main__":
    main()
