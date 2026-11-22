"""MCP server: PGL project/export tools plus C64/C128/Plus-4 chrome previews."""

from __future__ import annotations

import base64
import functools
import io
import json
import logging
import sys
from pathlib import Path
from typing import Any

# Allow running as `python src/server.py`
sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

from color_anim import render_color_animation_gif
import craft
import drawing
import op_art
import world_art
import rug_styles
import pgl_export
import project_io
from machines import MACHINES, get_machine
from project_store import ProjectError, parse_json_arg
from render import render_mode_animation, render_screen, save_machine_stills

mcp = MCPServer("petscii-preview", version="0.3.0")
logger = logging.getLogger("petscii-preview")


def _failure_message(result: dict[str, Any]) -> str:
    message = str(result.get("error") or "the operation failed")
    details = {key: value for key, value in result.items() if key not in ("ok", "error", "stderr")}
    if details:
        message += f" Details: {json.dumps(details, default=str)}"
    return message


def tool(*, raw_ok: bool = False, **kwargs: Any):
    """Register an MCP tool whose failures reach the client as `is_error` results.

    - ProjectError (bad input, missing file, invalid project) → its message.
    - Any other exception → logged with a traceback; the client gets type + message.
    - A returned {"ok": false, "error": ...} → an error result, unless `raw_ok` is set
      for tools where "not ok" is the answer (validate_project).
    """

    def decorate(fn):
        @functools.wraps(fn)
        def wrapper(*args: Any, **inner: Any):
            try:
                result = fn(*args, **inner)
            except ToolError:
                raise
            except ProjectError as error:
                raise ToolError(str(error)) from error
            except Exception as error:  # noqa: BLE001 - surface the reason to the agent
                logger.exception("tool %s crashed", fn.__name__)
                raise ToolError(f"{type(error).__name__}: {error}") from error
            if not raw_ok and isinstance(result, dict) and result.get("ok") is False:
                raise ToolError(_failure_message(result))
            return result

        return mcp.tool(**kwargs)(wrapper)

    return decorate


def _settings(animation: dict[str, Any] | None = None, settings_json: str | None = None) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    if animation:
        merged.update(animation)
    if settings_json:
        parsed = parse_json_arg(settings_json, "settings_json")
        if not isinstance(parsed, dict):
            raise ProjectError("settings_json must be a JSON object")
        merged.update(parsed)
    return merged


@tool()
def list_machines() -> dict:
    """List machine chrome modes (C64/C128 use the C64 glyph sheet; Plus/4 uses TED glyphs)."""
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


@tool()
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

    C64 and C128 use the C64 glyph sheet; Plus/4 uses the TED glyph sheet.
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


@tool()
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
        "note": "C64/C128 share the C64 glyph sheet; Plus/4 uses TED glyphs.",
    }


@tool()
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


@tool()
def render_color_animation(
    effect: str = "plus4-cycle",
    scale: int = 2,
    save_path: str | None = None,
    project_path: str | None = None,
    motion: str = "rotating-cube",
) -> dict:
    """
    Render a looping GIF of a PGL color animation on rotating-cube motion.

    Defaults to artwork from examples/pgl-wordmark.json when present.
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
        "project": str((project or Path(__file__).resolve().parents[1] / "examples" / "pgl-wordmark.json").resolve()),
        "note": "Rotating-cube motion plus PGL color ramps; Plus/4 effects use TED palette RGB.",
    }


@tool()
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
        "project": str((project or Path(__file__).resolve().parents[1] / "examples" / "pgl-wordmark.json").resolve()),
        "motion": motion,
        "note": "Raven artwork: rotating-cube motion with C64 Pepto vs Plus/4 TED color ramps.",
    }


# --- Phase 1: project document + animation + exports ---


@tool()
def list_effects() -> dict:
    """List motion, color, and backdrop effects plus animation enum values from the lab UI."""
    return project_io.list_effects()


@tool(raw_ok=True)
def validate_project(project_path: str | None = None) -> dict:
    """Validate a v3 PGL project JSON file."""
    return project_io.validate_project(project_path)


@tool()
def load_project(project_path: str | None = None) -> dict:
    """Load a v3 PGL project JSON (defaults to the wordmark example)."""
    return project_io.load_project(project_path)


@tool()
def save_project(data_json: str, save_path: str | None = None) -> dict:
    """Save a v3 PGL project JSON string to disk (workspace by default)."""
    return project_io.save_project(parse_json_arg(data_json, "data_json"), save_path)


@tool()
def create_project(
    columns: int = 16,
    rows: int = 16,
    ink: int = 14,
    background: int = 0,
    name: str = "Untitled",
    save_path: str | None = None,
    machine: str = "c64",
) -> dict:
    """Create a blank v3 PGL project. machine: c64, c128, c128-80 (up to 80 columns), plus4. Rows 1–40."""
    return project_io.create_project(columns, rows, ink, background, name, save_path, machine)


@tool()
def update_project(
    project_path: str,
    patch_json: str,
    save_path: str | None = None,
) -> dict:
    """
    Patch a project. patch_json may include name, colors, animation, columns, rows,
    grid, and cellColors. Resize keeps overlapping cells.
    """
    return project_io.update_project(project_path, parse_json_arg(patch_json, "patch_json"), save_path)


@tool()
def copy_project_to_workspace(
    project_path: str | None = None,
    name: str = "session.json",
) -> dict:
    """Copy a project into agents/petscii-preview/out/workspace for drawing/export sessions."""
    return project_io.copy_project_to_workspace(project_path, name)


@tool()
def export_text_grid(
    project_path: str | None = None,
    include_colors: bool = True,
    out_path: str | None = None,
) -> dict:
    """Export a PETSCII-GLYPHS text grid from a project."""
    return project_io.export_text_grid(project_path, include_colors, out_path)


@tool()
def import_text_grid(
    text_path: str,
    project_path: str | None = None,
    out_path: str | None = None,
) -> dict:
    """Import a PETSCII-GLYPHS text file into a v3 project JSON."""
    return project_io.import_text_grid(text_path, project_path, out_path)


@tool()
def plan_animation(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
) -> dict:
    """Return animation frame count and readiness warning for stacked motion, color, and backdrop."""
    return pgl_export.plan_animation(project_path, _settings(animation, settings_json))


@tool()
def render_still(
    project_path: str | None = None,
    scale: int = 4,
    background: str = "canvas",
    save_path: str | None = None,
    fmt: str = "png",
    cell_shape: str = "square",
) -> dict:
    """
    Render a project still as PNG or SVG (fmt=png|svg). background: canvas|white|black|transparent.

    Glyphs and colours follow the project's machine (C64/C128: C64 glyphs + display palette;
    Plus/4: TED glyphs + TED colours; C128 80-col: VDC RGBI). cell_shape: square or crt
    (CRT proportion: 5∶6 VIC/TED, 5∶12 VDC). scale is pixels per glyph pixel.
    """
    return pgl_export.render_still(project_path, scale, background, save_path, fmt, cell_shape)


@tool()
def render_animation(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    scale: int = 2,
    save_path: str | None = None,
    cell_shape: str = "square",
) -> dict:
    """
    Render movement, cell color, and backdrop together as a GIF.

    Frame timing, colours and backdrop mattes match the editor's GIF download. If the
    settings are too fast to render without aliasing, the call fails with the warning;
    call plan_animation for a suggested loop duration. cell_shape: square or crt.

    Pass animation settings as an object (same keys as project.animation) or settings_json.
    Use motionEffect/effect, colorEffect, and backgroundEffect (not colorEffect: field for
    new backdrop ramps).
    """
    return pgl_export.render_animation_gif(
        project_path,
        _settings(animation, settings_json),
        scale=scale,
        save_path=save_path,
        cell_shape=cell_shape,
    )


@tool()
def export_png(
    project_path: str | None = None,
    scale: int = 4,
    background: str = "canvas",
    save_path: str | None = None,
    cell_shape: str = "square",
) -> dict:
    """Export a still PNG of the project (machine glyphs/colours; cell_shape square or crt)."""
    return pgl_export.render_still(project_path, scale, background, save_path, "png", cell_shape)


@tool()
def export_svg(
    project_path: str | None = None,
    background: str = "canvas",
    save_path: str | None = None,
    cell_shape: str = "square",
) -> dict:
    """Export a still SVG of the project: one vector path per glyph shape, reused per cell."""
    return pgl_export.render_still(project_path, 1, background, save_path, "svg", cell_shape)


@tool()
def export_gif(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    scale: int = 2,
    save_path: str | None = None,
    cell_shape: str = "square",
) -> dict:
    """Export an animated GIF (alias of render_animation)."""
    return pgl_export.render_animation_gif(
        project_path,
        _settings(animation, settings_json),
        scale=scale,
        save_path=save_path,
        cell_shape=cell_shape,
    )


@tool()
def export_png_frames_zip(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    scale: int = 2,
    save_path: str | None = None,
    cell_shape: str = "square",
) -> dict:
    """Export a ZIP of PNG animation frames plus timing.json (editor manifest v2) and project.json."""
    return pgl_export.export_png_frames_zip(
        project_path,
        _settings(animation, settings_json),
        scale=scale,
        save_path=save_path,
        cell_shape=cell_shape,
    )


@tool()
def export_native(
    project_path: str | None = None,
    mode: str = "still",
    format: str = "prg",
    repetitions: int = 1,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    allow_timing_overrun: bool = False,
    save_path: str | None = None,
) -> dict:
    """
    Export a native .prg or .d64 for the project's machine (mode=still|animation).

    C64 and C128 40-col use the VIC player, C128 80-col the VDC player, Plus/4 the TED player —
    the same exporters as the editor's Download panel. repetitions 0–100 (0 loops forever).
    """
    return pgl_export.export_native(
        project_path,
        mode=mode,
        format=format,
        repetitions=repetitions,
        settings=_settings(animation, settings_json),
        allow_timing_overrun=allow_timing_overrun,
        save_path=save_path,
    )


@tool()
def export_glyph_bin(project_path: str | None = None, save_path: str | None = None) -> dict:
    """Glyph atlas IDs (bank × 256 + screen code) as 16-bit little-endian; FFFF = empty. Not PETSCII bytes."""
    return pgl_export.export_glyph_bin(project_path, save_path)


@tool()
def export_color_ram_bin(project_path: str | None = None, save_path: str | None = None) -> dict:
    """Color RAM: one VIC colour index byte per cell, row-major. C64 / C128 40-col projects only."""
    return pgl_export.export_color_ram_bin(project_path, save_path)


@tool()
def export_video(
    project_path: str | None = None,
    animation: dict[str, Any] | None = None,
    settings_json: str | None = None,
    scale: int = 2,
    format: str = "mp4",
    repetitions: int = 1,
    save_path: str | None = None,
    cell_shape: str = "square",
) -> dict:
    """
    Export MP4 or WebM via ffmpeg (not browser WebCodecs), 1–100 complete loops.

    Each frame keeps its exact start time and duration (variable frame rate), as in the editor.
    Requires ffmpeg on PATH.
    """
    return pgl_export.export_video(
        project_path,
        _settings(animation, settings_json),
        scale=scale,
        format=format,
        save_path=save_path,
        repetitions=repetitions,
        cell_shape=cell_shape,
    )


# --- Phase 2: drawing tools ---


@tool()
def set_tool_state(
    project_path: str,
    glyph: int | None = None,
    ink: int | None = None,
    symmetry: str | None = None,
) -> dict:
    """Set the brush. glyph is an atlas id (160 is solid). ink is a color number. symmetry is none, horizontal, vertical, or both."""
    patch: dict[str, Any] = {}
    if glyph is not None:
        patch["glyph"] = glyph
    if ink is not None:
        patch["ink"] = ink
    if symmetry is not None:
        patch["symmetry"] = symmetry
    return drawing.set_tool_state(project_path, patch)


@tool()
def get_tool_state(project_path: str) -> dict:
    """Read current brush/selection state for a project session."""
    return drawing.get_tool_state(project_path)


@tool()
def paint_cells(project_path: str, cells: list[dict]) -> dict:
    """
    Paint cells in batches. Each cell is {x, y, glyph?, ink?}; missing fields use the brush.

    Work in passes (silhouette → light → focal → texture). After texture, call render_still
    and critique_drawing. Prefer checker 102 and diagonals 77/78 over sprinkling solids.
    """
    return drawing.paint_cells(project_path, cells)


@tool()
def erase_cells(project_path: str, cells: list[dict]) -> dict:
    """Clear cells back to empty. Each cell is {x, y}."""
    return drawing.erase_cells(project_path, cells)


@tool()
def fill(project_path: str, x: int, y: int) -> dict:
    """Flood-fill from (x,y) with the current glyph/ink."""
    return drawing.fill(project_path, x, y)


@tool()
def draw_line(project_path: str, x0: int, y0: int, x1: int, y1: int) -> dict:
    """Draw a glyph line from (x0,y0) to (x1,y1)."""
    return drawing.draw_line(project_path, x0, y0, x1, y1)


@tool()
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


@tool()
def place_text(
    project_path: str,
    text: str,
    x: int = 0,
    y: int = 0,
    ink: int | None = None,
) -> dict:
    """Place typed C64 text starting at (x,y)."""
    return drawing.place_text(project_path, text, x, y, ink)


@tool()
def select_rect(project_path: str, x0: int, y0: int, x1: int, y1: int) -> dict:
    """Select a rectangular region."""
    return drawing.select_rect(project_path, x0, y0, x1, y1)


@tool()
def deselect(project_path: str) -> dict:
    """Clear the current selection."""
    return drawing.deselect(project_path)


@tool()
def move_selection(project_path: str, dx: int, dy: int) -> dict:
    """Move the selection by (dx,dy), clearing the old cells."""
    return drawing.move_selection(project_path, dx, dy)


@tool()
def duplicate_selection(project_path: str, dx: int = 1, dy: int = 0) -> dict:
    """Duplicate the selection offset by (dx,dy)."""
    return drawing.duplicate_selection(project_path, dx, dy)


@tool()
def delete_selection(project_path: str) -> dict:
    """Delete glyphs inside the selection."""
    return drawing.delete_selection(project_path)


@tool()
def clear_drawing(project_path: str) -> dict:
    """Clear the entire drawing."""
    return drawing.clear_drawing(project_path)


@tool()
def recolor_drawing(project_path: str, ink: int) -> dict:
    """Recolor all painted cells to ink and set the brush ink."""
    return drawing.recolor_drawing(project_path, ink)


@tool()
def stamp_border(project_path: str) -> dict:
    """Stamp a border using the current glyph/ink."""
    return drawing.stamp_border(project_path)


@tool()
def stamp_checkerboard(project_path: str) -> dict:
    """Stamp a checkerboard using the current glyph/ink."""
    return drawing.stamp_checkerboard(project_path)


@tool()
def undo(project_path: str) -> dict:
    """Undo the last drawing mutation."""
    return drawing.undo(project_path)


@tool()
def redo(project_path: str) -> dict:
    """Redo the last undone drawing mutation."""
    return drawing.redo(project_path)


@tool()
def create_canvas(
    project_path: str,
    columns: int = 40,
    rows: int = 25,
    background: int = 0,
    ink: int = 1,
    machine: str | None = None,
) -> dict:
    """
    Start a blank PETSCII picture (40×25 or 80×25).

    machine: c64, c128, c128-80, or plus4. Defaults to c128-80 for more than 40 columns, else c64.

    Before painting: list_drawing_references or illustration_brief for the subject.
    Study the reference JPG/PNG paths in agents/petscii-preview/examples/ — do not trace.
    """
    return drawing.create_canvas(project_path, columns, rows, background, ink, machine)


@tool()
def glyph_families() -> dict:
    """Atlas ids by role, plus a shading ladder for fill (160, 102, 77/78, halves, quarters)."""
    families = drawing.glyph_families()
    families["shading_ladder"] = craft.SHADING_LADDER
    families["outline"] = craft.OUTLINE_GLYPHS
    families["accent_only_glyphs"] = craft.ACCENT_GLYPHS
    return families


@tool()
def read_grid(project_path: str) -> dict:
    """Read occupied cells. Empty cells are omitted."""
    return drawing.read_grid(project_path)


@tool()
def list_drawing_references(category: str | None = None) -> dict:
    """
  Gallery craft notes for master PETSCII art in agents/petscii-preview/examples/.

  category: portrait, face, figure, animal, place, landscape, architecture, scene, panels, ui.
  Open the returned paths and study lighting and glyph texture before painting.
  """
    return craft.list_drawing_references(category)


@tool()
def shading_ladder(background_ink: int = 0) -> dict:
    """Brightness steps from solid 160 down to quarter blocks on a given screen background ink."""
    return craft.shading_ladder(background_ink)


@tool()
def illustration_brief(subject: str) -> dict:
    """
    Plan a picture: inferred category, palette hint, layout, reference ids, pass order, tool sequence.

    Example subjects: "tiger in profile", "noir city portrait", "haunted house at night".
    """
    return craft.illustration_brief(subject)


@tool()
def critique_drawing(project_path: str, style: str = "auto") -> dict:
    """
    Heuristic review vs reference-artist habits: coverage, ink count, texture pass, focal band.

    style: auto, illustration, op-art (abstract/geometric). Run after each pass and after render_still.
    """
    return craft.critique_drawing(project_path, style=style)


@tool()
def list_op_art_recipes() -> dict:
    """Op-art / abstract recipe catalog (Riley bars, Vasarely targets, moiré lines, plasma fields)."""
    return op_art.list_op_art_recipes()


@tool()
def op_art_recipe(recipe_id: str) -> dict:
    """
    Full craft notes + animation_suggest for one recipe.

    recipe_id: line-moire, diagonal-weave, nested-squares, vertical-bars, ring-bands,
    triangle-tessellation, plasma-field, dual-checker,
    islamic-girih-8, islamic-interlace, arabesque-band,
    mandala-lotus, yantra-triangles, kolam-pulli.
    """
    return op_art.op_art_recipe(recipe_id)


@tool()
def study_world_art(tradition: str = "all") -> dict:
    """
    Craft study for Islamic geometric / arabesque and Hindu mandala-yantra-kolam traditions.

    tradition: islamic, hindu, or all. Pair with stamp_op_art recipes from the study notes.
    """
    return world_art.study_world_art(tradition)


@tool()
def list_style_combinations() -> dict:
    """Oriental rug presets that layer Islamic, Hindu, and kilim recipes (border + field + medallion)."""
    return rug_styles.list_style_combinations()


@tool()
def combine_styles(combination: str) -> dict:
    """
    Layer plan for a multi-tradition carpet.

    combination: ardabil-medallion, konya-gul, garden-charbagh, indo-persian-fusion, kilim-band-stack.
    """
    return rug_styles.combine_styles(combination)


@tool()
def stamp_combined_style(
    project_path: str,
    combination: str,
    period: int | None = None,
    ink_a: int | None = None,
    ink_b: int | None = None,
) -> dict:
    """
    Paint a merged carpet: field, border, medallion, and optional corner layers.

    Call combine_styles first; then update_project with animation_suggest.
    """
    return drawing.stamp_combined_style(
        project_path, combination, period=period, ink_a=ink_a, ink_b=ink_b
    )


@tool()
def list_world_art_references(tradition: str | None = None) -> dict:
    """
    Local study images under examples/world-art/ plus Wikimedia Commons page URLs.

    tradition: islamic, hindu, all, or a tag (girih, yantra, kolam). Read images before painting.
    """
    return world_art.list_world_art_references(tradition)


@tool()
def stamp_op_art(
    project_path: str,
    recipe: str,
    period: int | None = None,
    ink_a: int | None = None,
    ink_b: int | None = None,
) -> dict:
    """
    Fill the canvas with an op-art lattice (pass 1).

    Returns animation_suggest when applicable — pass to update_project on animation.
    Add focal breaks with paint_cells, then render_animation or export_gif.
    """
    return drawing.stamp_op_art(project_path, recipe, period=period, ink_a=ink_a, ink_b=ink_b)


if __name__ == "__main__":
    mcp.run()
