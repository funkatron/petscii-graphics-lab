"""MCP server: PGL project/export tools plus C64/C128/Plus-4 chrome previews."""

from __future__ import annotations

import base64
import io
import json
import sys
from pathlib import Path
from typing import Any

# Allow running as `python src/server.py`
sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.mcpserver import MCPServer

from color_anim import render_color_animation_gif
import drawing
import pgl_export
import project_io
from machines import MACHINES, get_machine
from render import render_mode_animation, render_screen, save_machine_stills

mcp = MCPServer("petscii-preview", version="0.2.0")


def _settings(animation: dict[str, Any] | None = None, settings_json: str | None = None) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    if animation:
        merged.update(animation)
    if settings_json:
        merged.update(json.loads(settings_json))
    return merged


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


@mcp.tool()
def render_color_animation(
    effect: str = "plus4-cycle",
    scale: int = 2,
    save_path: str | None = None,
    project_path: str | None = None,
    motion: str = "rotating-cube",
) -> dict:
    """
    Render a looping GIF of a PGL color animation on rotating-cube motion.

    Defaults to artwork from examples/golden-fuzzy-raven.json when present.
    C64 effects: color-cycle, color-wave, color-glow, raster-bars, plasma, bonfire
    Plus/4 TED twins: plus4-cycle, plus4-wave, plus4-glow, plus4-raster, plus4-plasma, plus4-bonfire
    """
    out = Path(save_path) if save_path else (
        Path(__file__).resolve().parents[1] / "out" / "examples" / f"{effect}.gif"
    )
    project = Path(project_path) if project_path else None
    path = render_color_animation_gif(
        effect,
        out,
        scale=scale,
        project_path=project,
        motion=motion,
    )
    return {
        "effect": effect,
        "motion": motion,
        "saved_to": str(path.resolve()),
        "project": str((project or Path(__file__).resolve().parents[1] / "examples" / "golden-fuzzy-raven.json").resolve()),
        "note": "Rotating-cube motion plus PGL color ramps; Plus/4 effects use TED palette RGB.",
    }


@mcp.tool()
def render_color_animation_set(
    scale: int = 2,
    out_dir: str | None = None,
    project_path: str | None = None,
    motion: str = "rotating-cube",
) -> dict:
    """Render C64 vs Plus/4 color-animation GIFs with rotating-cube motion from a PGL project."""
    directory = Path(out_dir) if out_dir else Path(__file__).resolve().parents[1] / "out" / "examples"
    project = Path(project_path) if project_path else None
    effects = [
        "color-cycle",
        "plus4-cycle",
        "color-wave",
        "plus4-wave",
        "plasma",
        "plus4-plasma",
        "color-glow",
        "plus4-glow",
        "raster-bars",
        "plus4-raster",
        "bonfire",
        "plus4-bonfire",
    ]
    written: list[str] = []
    for effect in effects:
        path = render_color_animation_gif(
            effect,
            directory / f"{effect}.gif",
            scale=scale,
            project_path=project,
            motion=motion,
        )
        written.append(str(path.resolve()))
    return {
        "gifs": written,
        "out_dir": str(directory.resolve()),
        "project": str((project or Path(__file__).resolve().parents[1] / "examples" / "golden-fuzzy-raven.json").resolve()),
        "motion": motion,
        "note": "Raven artwork: rotating-cube motion with C64 Pepto vs Plus/4 TED color ramps.",
    }


# --- Phase 1: project document + animation + exports ---


@mcp.tool()
def list_effects() -> dict:
    """List motion/color effects and animation enum values from the lab UI."""
    return project_io.list_effects()


@mcp.tool()
def validate_project(project_path: str | None = None) -> dict:
    """Validate a v3 PGL project JSON file."""
    return project_io.validate_project(project_path)


@mcp.tool()
def load_project(project_path: str | None = None) -> dict:
    """Load a v3 PGL project JSON (defaults to golden-fuzzy-raven example)."""
    return project_io.load_project(project_path)


@mcp.tool()
def save_project(data_json: str, save_path: str | None = None) -> dict:
    """Save a v3 PGL project JSON string to disk (workspace by default)."""
    return project_io.save_project(json.loads(data_json), save_path)


@mcp.tool()
def create_project(
    columns: int = 16,
    rows: int = 16,
    ink: int = 14,
    background: int = 0,
    name: str = "Untitled",
    save_path: str | None = None,
) -> dict:
    """Create a blank v3 PGL project (1–40 columns/rows)."""
    return project_io.create_project(columns, rows, ink, background, name, save_path)


@mcp.tool()
def update_project(
    project_path: str,
    patch_json: str,
    save_path: str | None = None,
) -> dict:
    """
    Patch a project. patch_json may include name, colors, animation, columns, rows,
    grid, and cellColors. Resize keeps overlapping cells.
    """
    return project_io.update_project(project_path, json.loads(patch_json), save_path)


@mcp.tool()
def copy_project_to_workspace(
    project_path: str | None = None,
    name: str = "session.json",
) -> dict:
    """Copy a project into agents/petscii-preview/out/workspace for drawing/export sessions."""
    return project_io.copy_project_to_workspace(project_path, name)


@mcp.tool()
def export_text_grid(
    project_path: str | None = None,
    include_colors: bool = True,
    out_path: str | None = None,
) -> dict:
    """Export a PETSCII-GLYPHS text grid from a project."""
    return project_io.export_text_grid(project_path, include_colors, out_path)


@mcp.tool()
def import_text_grid(
    text_path: str,
    project_path: str | None = None,
    out_path: str | None = None,
) -> dict:
    """Import a PETSCII-GLYPHS text file into a v3 project JSON."""
    return project_io.import_text_grid(text_path, project_path, out_path)


@mcp.tool()
def plan_animation(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
) -> dict:
    """Return animation frame count and readiness warning for motion/color settings."""
    return pgl_export.plan_animation(project_path, _settings(animation, settings_json))


@mcp.tool()
def render_still(
    project_path: str | None = None,
    scale: int = 4,
    background: str = "canvas",
    save_path: str | None = None,
    fmt: str = "png",
) -> dict:
    """Render a project still as PNG or SVG (fmt=png|svg). background: canvas|white|black|transparent."""
    return pgl_export.render_still(project_path, scale, background, save_path, fmt)


@mcp.tool()
def render_animation(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    scale: int = 2,
    save_path: str | None = None,
) -> dict:
    """
    Render any motion × color animation as a GIF.

    Pass animation settings as an object (same keys as project.animation) or settings_json.
    Use motionEffect/effect and colorEffect overrides as needed.
    """
    return pgl_export.render_animation_gif(
        project_path,
        _settings(animation, settings_json),
        scale=scale,
        save_path=save_path,
    )


@mcp.tool()
def export_png(
    project_path: str | None = None,
    scale: int = 4,
    background: str = "canvas",
    save_path: str | None = None,
) -> dict:
    """Export a still PNG of the project."""
    return pgl_export.render_still(project_path, scale, background, save_path, "png")


@mcp.tool()
def export_svg(
    project_path: str | None = None,
    background: str = "canvas",
    save_path: str | None = None,
) -> dict:
    """Export a still SVG of the project."""
    return pgl_export.render_still(project_path, 1, background, save_path, "svg")


@mcp.tool()
def export_gif(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    scale: int = 2,
    save_path: str | None = None,
) -> dict:
    """Export an animated GIF (alias of render_animation)."""
    return pgl_export.render_animation_gif(
        project_path,
        _settings(animation, settings_json),
        scale=scale,
        save_path=save_path,
    )


@mcp.tool()
def export_png_frames_zip(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    scale: int = 2,
    save_path: str | None = None,
) -> dict:
    """Export a ZIP of PNG animation frames plus timing.json and project.json."""
    return pgl_export.export_png_frames_zip(
        project_path,
        _settings(animation, settings_json),
        scale=scale,
        save_path=save_path,
    )


@mcp.tool()
def export_c64(
    project_path: str | None = None,
    mode: str = "still",
    format: str = "prg",
    repetitions: int = 1,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    allow_timing_overrun: bool = False,
    save_path: str | None = None,
) -> dict:
    """Export a C64 .prg or .d64 (mode=still|animation)."""
    return pgl_export.export_c64(
        project_path,
        mode=mode,
        format=format,
        repetitions=repetitions,
        settings=_settings(animation, settings_json),
        allow_timing_overrun=allow_timing_overrun,
        save_path=save_path,
    )


@mcp.tool()
def export_glyph_bin(project_path: str | None = None, save_path: str | None = None) -> dict:
    """Download glyph IDs as 16-bit little-endian binary (FFFF = empty)."""
    return pgl_export.export_glyph_bin(project_path, save_path)


@mcp.tool()
def export_color_ram_bin(project_path: str | None = None, save_path: str | None = None) -> dict:
    """Download color RAM as one palette index byte per cell."""
    return pgl_export.export_color_ram_bin(project_path, save_path)


@mcp.tool()
def export_video(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    scale: int = 2,
    format: str = "mp4",
    repetitions: int = 1,
    save_path: str | None = None,
) -> dict:
    """
    Export MP4 or WebM via ffmpeg from PNG frames (not browser WebCodecs).
    Requires ffmpeg on PATH.
    """
    return pgl_export.export_video(
        project_path,
        _settings(animation, settings_json),
        scale=scale,
        format=format,
        save_path=save_path,
        repetitions=repetitions,
    )


# --- Phase 2: drawing tools ---


@mcp.tool()
def set_tool_state(project_path: str, patch_json: str) -> dict:
    """Set brush state: glyph, ink, symmetry (none|horizontal|vertical|both), selection."""
    return drawing.set_tool_state(project_path, json.loads(patch_json))


@mcp.tool()
def get_tool_state(project_path: str) -> dict:
    """Read current brush/selection state for a project session."""
    return drawing.get_tool_state(project_path)


@mcp.tool()
def paint_cells(project_path: str, cells_json: str) -> dict:
    """Paint cells. cells_json: [{x,y,glyph?,ink?}, ...]. Uses tool state defaults when omitted."""
    return drawing.paint_cells(project_path, json.loads(cells_json))


@mcp.tool()
def erase_cells(project_path: str, cells_json: str) -> dict:
    """Erase cells. cells_json: [{x,y}, ...]."""
    return drawing.erase_cells(project_path, json.loads(cells_json))


@mcp.tool()
def fill(project_path: str, x: int, y: int) -> dict:
    """Flood-fill from (x,y) with the current glyph/ink."""
    return drawing.fill(project_path, x, y)


@mcp.tool()
def draw_line(project_path: str, x0: int, y0: int, x1: int, y1: int) -> dict:
    """Draw a glyph line from (x0,y0) to (x1,y1)."""
    return drawing.draw_line(project_path, x0, y0, x1, y1)


@mcp.tool()
def draw_rect(
    project_path: str,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    filled: bool = False,
) -> dict:
    """Draw a rectangle (outline or filled)."""
    return drawing.draw_rect(project_path, x0, y0, x1, y1, filled)


@mcp.tool()
def place_text(
    project_path: str,
    text: str,
    x: int = 0,
    y: int = 0,
    ink: int | None = None,
) -> dict:
    """Place typed C64 text starting at (x,y)."""
    return drawing.place_text(project_path, text, x, y, ink)


@mcp.tool()
def select_rect(project_path: str, x0: int, y0: int, x1: int, y1: int) -> dict:
    """Select a rectangular region."""
    return drawing.select_rect(project_path, x0, y0, x1, y1)


@mcp.tool()
def deselect(project_path: str) -> dict:
    """Clear the current selection."""
    return drawing.deselect(project_path)


@mcp.tool()
def move_selection(project_path: str, dx: int, dy: int) -> dict:
    """Move the selection by (dx,dy), clearing the old cells."""
    return drawing.move_selection(project_path, dx, dy)


@mcp.tool()
def duplicate_selection(project_path: str, dx: int = 1, dy: int = 0) -> dict:
    """Duplicate the selection offset by (dx,dy)."""
    return drawing.duplicate_selection(project_path, dx, dy)


@mcp.tool()
def delete_selection(project_path: str) -> dict:
    """Delete glyphs inside the selection."""
    return drawing.delete_selection(project_path)


@mcp.tool()
def clear_drawing(project_path: str) -> dict:
    """Clear the entire drawing."""
    return drawing.clear_drawing(project_path)


@mcp.tool()
def recolor_drawing(project_path: str, ink: int) -> dict:
    """Recolor all painted cells to ink and set the brush ink."""
    return drawing.recolor_drawing(project_path, ink)


@mcp.tool()
def stamp_border(project_path: str) -> dict:
    """Stamp a border using the current glyph/ink."""
    return drawing.stamp_border(project_path)


@mcp.tool()
def stamp_checkerboard(project_path: str) -> dict:
    """Stamp a checkerboard using the current glyph/ink."""
    return drawing.stamp_checkerboard(project_path)


@mcp.tool()
def undo(project_path: str) -> dict:
    """Undo the last drawing mutation."""
    return drawing.undo(project_path)


@mcp.tool()
def redo(project_path: str) -> dict:
    """Redo the last undone drawing mutation."""
    return drawing.redo(project_path)


if __name__ == "__main__":
    mcp.run()
