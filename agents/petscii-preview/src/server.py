"""MCP server: render shared-glyph PETSCII previews for C64 / C128 / Plus-4."""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

# Allow running as `python src/server.py`
sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.mcpserver import MCPServer

from machines import MACHINES, get_machine
from render import render_mode_animation, render_screen, save_machine_stills

mcp = MCPServer("petscii-preview", version="0.1.0")


@mcp.tool()
def list_machines() -> dict:
    """List machine modes that share the C64 PETSCII glyph sheet."""
    return {
        machine_id: {
            "label": mode.label,
            "columns": mode.columns,
            "rows": mode.rows,
            "border": mode.border,
            "background": mode.background,
            "foreground": mode.foreground,
        }
        for machine_id, mode in MACHINES.items()
    }


@mcp.tool()
def render_petscii_screen(
    machine: str = "c64",
    lines: list[str] | None = None,
    include_banner: bool = True,
    scale: int = 3,
    cursor: bool = True,
    save_path: str | None = None,
) -> dict:
    """
    Render a PETSCII text screen for c64, c128, or plus4.

    All three modes use the same C64 glyph sheet; only chrome/palette change.
    Plain characters map to screen codes. Embed explicit codes as {{#70}} or {{112}}.
    Prefix ! inside braces for reverse video, e.g. {{!A}} or {{!#20}}.
    """
    mode = get_machine(machine)
    image = render_screen(
        mode,
        lines,
        scale=scale,
        include_banner=include_banner,
        cursor=cursor,
    )

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    png_bytes = buffer.getvalue()

    written = None
    if save_path:
        path = Path(save_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(png_bytes)
        written = str(path.resolve())

    return {
        "machine": mode.id,
        "label": mode.label,
        "width": image.width,
        "height": image.height,
        "saved_to": written,
        "png_base64": base64.b64encode(png_bytes).decode("ascii"),
    }


@mcp.tool()
def render_machine_comparison(
    scale: int = 2,
    out_dir: str | None = None,
) -> dict:
    """Write C64, C128, and Plus/4 demo stills plus a mode-switch GIF."""
    directory = Path(out_dir) if out_dir else Path(__file__).resolve().parents[1] / "out"
    stills = save_machine_stills(directory, scale=scale)
    gif = render_mode_animation(scale=scale, out_path=directory / "mode-switch.gif")
    return {
        "stills": [str(path) for path in stills],
        "animation": str(gif),
        "note": "Same glyphs; different border/background/foreground chrome.",
    }


@mcp.tool()
def render_themed_examples(
    scale: int = 3,
    out_dir: str | None = None,
) -> dict:
    """
    Render a small set of themed PETSCII screens plus a mode-switch GIF.

    Themes: C64 synth panel, C128 40-col card, Plus/4 paper READY, shared glyph note.
    """
    directory = Path(out_dir) if out_dir else Path(__file__).resolve().parents[1] / "out" / "examples"
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

    written: list[str] = []
    for machine, filename, lines in themes:
        image = render_screen(
            machine,
            lines,
            scale=scale,
            include_banner=True,
            cursor=True,
        )
        path = directory / filename
        image.save(path)
        written.append(str(path.resolve()))

    gif = render_mode_animation(scale=max(2, scale - 1), out_path=directory / "mode-switch.gif")
    written.append(str(gif.resolve()))

    return {
        "examples": written,
        "out_dir": str(directory.resolve()),
        "note": "Themed MCP examples: chrome differs, glyphs shared.",
    }


if __name__ == "__main__":
    mcp.run()
