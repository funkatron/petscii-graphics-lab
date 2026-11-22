#!/usr/bin/env python3
"""Generate demo renders (not MCP tools): machine chrome stills, themed screens, colour-effect GIFs.

    agents/petscii-preview/.venv/bin/python agents/petscii-preview/generate_demos.py [--themes] [--colors]

Outputs land in agents/petscii-preview/out/.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

AGENT = Path(__file__).resolve().parent
sys.path.insert(0, str(AGENT / "src"))

import pgl_export  # noqa: E402
from render import render_mode_animation, render_screen, save_machine_stills  # noqa: E402

WORDMARK = AGENT / "examples" / "pgl-wordmark.json"
COLOR_EFFECTS = [
    "color-cycle", "plus4-cycle", "color-wave", "plus4-wave", "plasma", "plus4-plasma",
    "color-glow", "plus4-glow", "raster-bars", "plus4-raster", "bonfire", "plus4-bonfire",
]


def machine_stills(out: Path) -> list[Path]:
    """C64, C128 and Plus/4 boot screens plus a mode-switch GIF."""
    stills = save_machine_stills(out, scale=3)
    return [*stills, render_mode_animation(scale=2, out_path=out / "mode-switch.gif")]


def themed_screens(out: Path, scale: int = 3) -> list[Path]:
    """Themed machine-chrome screens (C64 synth panel, C128 card, Plus/4 paper READY)."""
    directory = out / "examples"
    directory.mkdir(parents=True, exist_ok=True)
    themes = [
        (
            "c64",
            "c64-synth-panel.png",
            [
                " {{#70}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#6e}}",
                " {{#5d}} C64 SYNTH PANEL {{#5d}}",
                " {{#5d}} WAVE   PULSE    {{#5d}}",
                " {{#5d}} CUTOFF ####.... {{#5d}}",
                " {{#5d}} RES    ##...... {{#5d}}",
                " {{#6d}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#7d}}",
            ],
        ),
        (
            "c128",
            "c128-40col-card.png",
            [
                " {{#70}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#6e}}",
                " {{#5d}} C128 40-COL MODE {{#5d}}",
                " {{#5d}} VIC-II TEXT GRID {{#5d}}",
                " {{#5d}} SAME C64 GLYPHS  {{#5d}}",
                " {{#6d}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#7d}}",
            ],
        ),
        (
            "plus4",
            "plus4-paper-ready.png",
            [
                " {{#70}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#6e}}",
                " {{#5d}} PLUS/4 TED PAPER {{#5d}}",
                " {{#5d}} BLACK ON GRAY    {{#5d}}",
                " {{#5d}} READY.           {{#5d}}",
                " {{#6d}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#40}}{{#7d}}",
            ],
        ),
    ]

    written: list[Path] = []
    for machine, filename, lines in themes:
        image = render_screen(machine, lines, scale=scale, include_banner=True, cursor=True)
        path = directory / filename
        image.save(path)
        written.append(path)
    written.append(render_mode_animation(scale=max(2, scale - 1), out_path=directory / "mode-switch.gif"))
    return written


def color_effect_set(out: Path, motion: str = "rotating-cube") -> list[Path]:
    """The wordmark example with each C64 colour effect and its Plus/4 TED twin."""
    directory = out / "examples"
    written = []
    for effect in COLOR_EFFECTS:
        result = pgl_export.render_animation_gif(
            str(WORDMARK), {"colorEffect": effect, "motionEffect": motion}, 2, str(directory / f"{effect}.gif")
        )
        written.append(Path(result["saved_to"]))
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--themes", action="store_true", help="also render themed chrome screens")
    parser.add_argument("--colors", action="store_true", help="also render the colour-effect GIF set")
    args = parser.parse_args()
    out = AGENT / "out"
    written = machine_stills(out)
    if args.themes:
        written += themed_screens(out)
    if args.colors:
        written += color_effect_set(out)
    print("Wrote:")
    for path in written:
        print(f"  {path}")


if __name__ == "__main__":
    main()
