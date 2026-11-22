"""MCP server for PETSCII Graphics Lab projects: draw, animate, preview and export.

Tools change or export a project. Static catalogs (effects, machines, glyph families,
craft recipes, references) are MCP resources under petscii://, also readable with the
read_catalog tool for clients without resource support. Prompts describe whole workflows.
"""

from __future__ import annotations

import base64
import functools
import io
import json
import logging
import re
import sys
from pathlib import Path
from typing import Annotated, Any, Callable, Literal, Optional

# Allow running as `python src/server.py`
sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import CallToolResult, ImageContent, TextContent, ToolAnnotations
from pydantic import BaseModel, ConfigDict, Field, create_model

import craft
import drawing
import op_art
import pgl_export
import project_io
import rug_styles
import world_art
from machines import MACHINES as CHROME_MACHINES
from node_bridge import PGL_CLI, parse_json_stdout, run_node
from project_store import ProjectError
from render import render_screen

mcp = MCPServer("petscii-preview", version="0.4.0")
logger = logging.getLogger("petscii-preview")

# --- Enumerations from the editor's own modules (project-validation.js, machine-modes.js) ---

_LISTING = parse_json_stdout(run_node(PGL_CLI, ["list-effects"], check=False))
if not _LISTING.get("ok"):
    raise RuntimeError(f"petscii-preview could not read the editor's enumerations: {_LISTING.get('error')}")


def _choices(*values: Any) -> Any:
    """Literal type of the given values (flattened)."""
    flat: list[Any] = []
    for value in values:
        flat.extend(value if isinstance(value, (list, tuple)) else [value])
    return Literal.__getitem__(tuple(dict.fromkeys(flat)))


MachineId = _choices(list(_LISTING["machines"]))
CellShape = Literal["square", "crt"]
Symmetry = Literal["none", "horizontal", "vertical", "both"]
StillBackground = Literal["canvas", "white", "black", "transparent"]
RecipeId = _choices([recipe["id"] for recipe in op_art.list_op_art_recipes()["recipes"]])
CombinationId = _choices([combo["id"] for combo in rug_styles.list_style_combinations()["combinations"]])
DisplayPalette = _choices(_LISTING["displayPalettes"])


def _animation_model() -> type[BaseModel]:
    """Typed project.animation fields; the editor validator still checks cross-field rules."""
    L = _LISTING
    optional = lambda values, doc: (Optional[_choices(values)], Field(None, description=doc))  # noqa: E731
    fields: dict[str, Any] = {
        "effect": optional(L["motionEffects"], "Movement effect (same as motionEffect)."),
        "motionEffect": optional(L["motionEffects"], "Movement effect (alias of effect)."),
        "colorEffect": optional([c for c in L["colorEffects"] if c not in ("field", "plus4-field")], "Cell colour effect. plus4-* effects use TED colours."),
        "backgroundEffect": optional(L["backgroundEffects"], "Stepped backdrop: field (VIC) or plus4-field (TED)."),
        "seconds": optional(L["allowedSeconds"], "Loop duration in seconds."),
        "scale": optional(L["allowedScale"], "Export scale stored with the project (GIF/ZIP/video cell = 8×scale px)."),
        "background": optional(L["allowedBackgrounds"], "Animation export background."),
        "motionCycles": optional(L["animationCycles"], "Movement repeats per loop."),
        "colorCycles": optional(L["animationCycles"], "Colour repeats per loop."),
        "backgroundCycles": optional(L["animationCycles"], "Backdrop repeats per loop."),
        "fieldRamp": optional(L["fieldRamps"], "Backdrop colour ramp."),
        "fieldDirection": optional(L["fieldDirections"], "Backdrop ramp direction."),
        "fieldLead": optional(L["fieldLeads"], "Backdrop lead in steps."),
        "fieldBrightness": optional(L["waveAmplitudes"], "Backdrop brightness percent."),
        "scrollDirection": optional(L["colorWaveDirections"], "Scroll direction (allowed values depend on effect)."),
        "waveDirection": optional(L["colorWaveDirections"], "Movement wave direction."),
        "waveShape": optional(L["waveShapes"], "Movement waveform."),
        "waveAmplitude": optional(L["waveAmplitudes"], "Movement wave amplitude percent."),
        "waveLength": optional(L["waveLengths"], "Movement wavelength percent."),
        "colorWaveDirection": optional(L["colorWaveDirections"], "Colour wave direction."),
        "colorWaveShape": optional(L["waveShapes"], "Colour waveform."),
        "colorWaveAmplitude": optional(L["waveAmplitudes"], "Colour wave amplitude percent."),
        "colorWaveLength": optional(L["waveLengths"], "Colour wavelength percent."),
        "fieldWaveDirection": optional(L["colorWaveDirections"], "Backdrop wave direction."),
        "fieldWaveShape": optional(L["waveShapes"], "Backdrop waveform."),
        "fieldWaveAmplitude": optional(L["waveAmplitudes"], "Backdrop wave amplitude percent."),
        "fieldWaveLength": optional(L["waveLengths"], "Backdrop wavelength percent."),
        "wipePattern": optional(L["wipePatterns"], "Wipe intro pattern."),
        "depthTravel": optional(L["depthTravels"], "Depth effects: travel toward or away."),
        "depthWaveShape": optional(L["waveShapes"], "Depth effects: waveform."),
        "parallaxGroup": optional(L["parallaxGroups"], "Parallax layers by ink or glyph."),
        "parallaxSpread": optional(L["parallaxSpreads"], "Parallax speed spread."),
        "parallaxTravel": optional(L["parallaxTravels"], "Parallax layer direction."),
        "videoRepeats": (Optional[int], Field(None, ge=1, le=100, description="Video loops stored with the project.")),
    }
    for key, values in L["solidCamera"].items():
        fields[key] = optional(values, "Solid-motion camera setting.")
    return create_model(
        "AnimationSettings",
        __config__=ConfigDict(extra="forbid"),
        __doc__="Animation settings, same keys as project.animation. Omitted keys keep the project's values.",
        **fields,
    )


AnimationSettings = _animation_model()


class Colors(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ink: Optional[int] = Field(None, ge=0, le=120, description="Default ink (VIC/VDC 0–15, TED 0–120).")
    background: Optional[int] = Field(None, ge=0, le=120, description="Shared background colour.")


class ProjectPatch(BaseModel):
    """Fields to change. Resizing keeps overlapping cells; new cells are empty."""

    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = None
    palette: Optional[DisplayPalette] = Field(None, description="VIC display palette (C64 / C128 40-col).")
    colors: Optional[Colors] = None
    animation: Optional[AnimationSettings] = None
    columns: Optional[int] = Field(None, ge=1, le=80)
    rows: Optional[int] = Field(None, ge=1, le=40)
    grid: Optional[list[int | Literal[""]]] = Field(None, description="Row-major atlas glyph IDs 0–511, '' = empty.")
    cellColors: Optional[list[int]] = Field(None, description="Row-major ink per cell.")


class Cell(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x: int
    y: int
    glyph: Optional[int | Literal[""]] = Field(None, description="Atlas id 0–511; omit to use the brush.")
    ink: Optional[int] = Field(None, ge=0, le=120, description="Omit to use the brush ink.")


class Run(BaseModel):
    """Glyphs painted left to right from (x, y). null skips a cell; '' erases it."""

    model_config = ConfigDict(extra="forbid")
    x: int
    y: int
    glyphs: list[Optional[int | Literal[""]]]
    ink: Optional[int] = Field(None, ge=0, le=120)


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x: int
    y: int


def _settings(animation: BaseModel | None) -> dict[str, Any]:
    return animation.model_dump(exclude_none=True) if animation else {}


def _dump(items: list[BaseModel] | None) -> list[dict[str, Any]]:
    return [item.model_dump(exclude_none=True) for item in items or []]


# --- Tool registration, errors and previews ---

READ_ONLY = ToolAnnotations(readOnlyHint=True, openWorldHint=False)
EDIT = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False)
IDEMPOTENT_EDIT = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=True, openWorldHint=False)
OVERWRITE = ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=True, openWorldHint=False)
EXPORT = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=True, openWorldHint=False)


def _failure_message(result: dict[str, Any]) -> str:
    message = str(result.get("error") or "the operation failed")
    details = {key: value for key, value in result.items() if key not in ("ok", "error", "stderr", "preview_image")}
    if details:
        message += f" Details: {json.dumps(details, default=str)}"
    return message


def tool(annotations: ToolAnnotations, *, raw_ok: bool = False):
    """Register an MCP tool whose failures reach the client as `is_error` results.

    - ProjectError (bad input, missing file, invalid project) → its message.
    - Any other exception → logged with a traceback; the client gets type + message.
    - A returned {"ok": false, "error": ...} → an error result, unless `raw_ok` is set
      for tools where "not ok" is the answer (validate_project).
    """

    def decorate(fn: Callable[..., Any]):
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

        return mcp.tool(annotations=annotations)(wrapper)

    return decorate


def _png_content(image: Any) -> ImageContent:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return ImageContent(type="image", data=base64.b64encode(buffer.getvalue()).decode("ascii"), mimeType="image/png")


def _with_preview(result: dict[str, Any], preview: bool) -> CallToolResult:
    """JSON summary, plus a PNG preview the agent can look at without opening files."""
    if result.get("ok") is False:
        raise ToolError(_failure_message(result))
    image = result.pop("preview_image", None)
    content: list[Any] = [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
    if preview and image is not None:
        content.append(_png_content(image))
    return CallToolResult(content=content)


# --- Catalogs: MCP resources, and read_catalog for clients without resource support ---

CATALOG: list[tuple[str, str, Callable[..., Any]]] = []


def catalog(uri: str, description: str):
    """Register a petscii:// resource and make it reachable through read_catalog."""

    def decorate(fn: Callable[..., Any]):
        mcp.resource(uri, mime_type="application/json", description=description)(fn)
        pattern = "^" + re.sub(r"\\\{(\w+)\\\}", r"(?P<\1>[^/]+)", re.escape(uri)) + "$"
        CATALOG.append((uri, pattern, fn))
        return fn

    return decorate


@catalog("petscii://effects", "Animation enumerations the editor accepts: effects, ramps, waves, cycles, seconds, scales.")
def effects_catalog() -> dict:
    return {key: value for key, value in _LISTING.items() if key not in ("ok", "machines")}


@catalog("petscii://machines", "Machines: column limits, boot colours, ink range, glyph sheet, colour table; plus chrome previews.")
def machines_catalog() -> dict:
    chrome = {
        machine_id: {"label": mode.label, "columns": mode.columns, "rows": mode.rows}
        for machine_id, mode in CHROME_MACHINES.items()
    }
    return {
        "machines": _LISTING["machines"],
        "displayPalettes": _LISTING["displayPalettes"],
        "cellShapes": _LISTING["cellShapes"],
        "chrome": chrome,
        "note": "C64/C128 use the C64 glyph sheet; Plus/4 uses TED glyphs. Glyph IDs are bank × 256 + screen code.",
    }


@catalog("petscii://glyphs/families", "Atlas glyph IDs by role, plus shading ladder, outline and accent glyphs.")
def glyph_families_catalog() -> dict:
    families = drawing.glyph_families()
    families["shading_ladder"] = craft.SHADING_LADDER
    families["outline"] = craft.OUTLINE_GLYPHS
    families["accent_only_glyphs"] = craft.ACCENT_GLYPHS
    return families


@catalog("petscii://glyphs/shading-ladder/{background_ink}", "Brightness steps from solid 160 to quarter blocks on a background ink.")
def shading_ladder_catalog(background_ink: str) -> dict:
    return craft.shading_ladder(int(background_ink))


@catalog("petscii://op-art/recipes", "Op-art, Islamic girih, Hindu mandala and rug recipe catalog.")
def op_art_recipes_catalog() -> dict:
    return op_art.list_op_art_recipes()


@catalog("petscii://op-art/recipes/{recipe_id}", "Craft notes and animation_suggest for one op-art recipe.")
def op_art_recipe_catalog(recipe_id: str) -> dict:
    return op_art.op_art_recipe(recipe_id)


@catalog("petscii://world-art/{tradition}", "Craft study: islamic, hindu, rug, or all.")
def world_art_catalog(tradition: str) -> dict:
    return world_art.study_world_art(tradition)


@catalog("petscii://world-art/references/{tradition}", "Local study images and Commons URLs: islamic, hindu, rug, all, or a tag.")
def world_art_references_catalog(tradition: str) -> dict:
    return world_art.list_world_art_references(tradition)


@catalog("petscii://references/drawing", "Master PETSCII reference images with craft notes (all categories).")
def drawing_references_catalog() -> dict:
    return craft.list_drawing_references(None)


@catalog("petscii://references/drawing/{category}", "Reference images for one category: portrait, face, figure, animal, place, landscape, architecture, scene, panels, ui.")
def drawing_references_category_catalog(category: str) -> dict:
    return craft.list_drawing_references(category)


@catalog("petscii://rugs", "Oriental rug presets that layer border, field and medallion recipes.")
def rugs_catalog() -> dict:
    return rug_styles.list_style_combinations()


@catalog("petscii://rugs/{combination}", "Layer plan for one rug combination.")
def rug_catalog(combination: str) -> dict:
    return rug_styles.combine_styles(combination)


@tool(READ_ONLY)
def read_catalog(uri: str) -> dict:
    """
    Read a petscii:// catalog (same content as the MCP resource), for clients without resource support.

    URIs: petscii://effects, petscii://machines, petscii://glyphs/families,
    petscii://glyphs/shading-ladder/{background_ink}, petscii://op-art/recipes,
    petscii://op-art/recipes/{recipe_id}, petscii://world-art/{tradition},
    petscii://world-art/references/{tradition}, petscii://references/drawing,
    petscii://references/drawing/{category}, petscii://rugs, petscii://rugs/{combination}.
    """
    for _uri, pattern, fn in CATALOG:
        match = re.match(pattern, uri)
        if match:
            return fn(**match.groupdict())
    raise ProjectError(f"unknown catalog {uri!r}; known: {', '.join(entry[0] for entry in CATALOG)}")


# --- Project document ---


@tool(OVERWRITE)
def create_canvas(
    project_path: str,
    columns: int = 40,
    rows: int = 25,
    machine: Optional[MachineId] = None,
    background: Optional[int] = None,
    ink: Optional[int] = None,
    name: Optional[str] = None,
) -> dict:
    """
    Start a blank picture (replaces any file at project_path) and reset its brush and undo history.

    machine: c64, c128, c128-80 (up to 80 columns) or plus4; defaults to c128-80 above 40 columns,
    else c64. background/ink default to the machine's boot colours (see petscii://machines).
    Before painting, read petscii://references/drawing or call illustration_brief.
    """
    return drawing.create_canvas(project_path, columns, rows, background, ink, machine, name)


@tool(READ_ONLY, raw_ok=True)
def validate_project(project_path: str) -> dict:
    """Validate a project with the editor's rules. Returns ok:false with the reason for invalid files."""
    return project_io.validate_project(project_path)


@tool(READ_ONLY)
def load_project(project_path: str) -> dict:
    """Read a project's full JSON."""
    return project_io.load_project(project_path)


@tool(OVERWRITE)
def save_project(data: dict[str, Any], save_path: Optional[str] = None) -> dict:
    """Validate and atomically save a full project object (workspace/project.json by default)."""
    return project_io.save_project(data, save_path)


@tool(OVERWRITE)
def update_project(project_path: str, patch: ProjectPatch, save_path: Optional[str] = None) -> dict:
    """Change name, display palette, colours, animation, size, grid or cell colours. Not undoable with undo."""
    return project_io.update_project(project_path, patch.model_dump(exclude_none=True), save_path)


@tool(IDEMPOTENT_EDIT)
def copy_project_to_workspace(project_path: str, name: str = "session.json") -> dict:
    """Copy a project (for example one in examples/) into out/workspace/ so tools may change it."""
    return project_io.copy_project_to_workspace(project_path, name)


@tool(EXPORT)
def export_text_grid(project_path: str, include_colors: bool = True, out_path: Optional[str] = None) -> dict:
    """Write the editor's PETSCII-GLYPHS text grid (atlas glyph IDs in hex; TED inks use two digits)."""
    return project_io.export_text_grid(project_path, include_colors, out_path)


@tool(EDIT)
def import_text_grid(text_path: str, project_path: Optional[str] = None, out_path: Optional[str] = None) -> dict:
    """Read a PETSCII-GLYPHS text file into a v3 project (keeps machine, palette and animation of project_path)."""
    return project_io.import_text_grid(text_path, project_path, out_path)


# --- Drawing ---


@tool(IDEMPOTENT_EDIT)
def set_tool_state(
    project_path: str,
    glyph: Optional[int | Literal[""]] = None,
    ink: Optional[int] = None,
    symmetry: Optional[Symmetry] = None,
) -> dict:
    """Set the brush: glyph atlas id (160 = solid block), ink colour number, symmetry mode."""
    patch: dict[str, Any] = {}
    if glyph is not None:
        patch["glyph"] = glyph
    if ink is not None:
        patch["ink"] = ink
    if symmetry is not None:
        patch["symmetry"] = symmetry
    return drawing.set_tool_state(project_path, patch)


@tool(READ_ONLY)
def get_tool_state(project_path: str) -> dict:
    """Read the brush and selection for a project."""
    return drawing.get_tool_state(project_path)


@tool(READ_ONLY)
def read_grid(project_path: str, format: Literal["runs", "cells", "text"] = "runs") -> dict:
    """
    Read painted cells. runs (default): horizontal runs of one ink, the same shape paint_cells accepts;
    cells: one {x,y,glyph,ink} per cell; text: the editor's PETSCII-GLYPHS grid.
    """
    return drawing.read_grid(project_path, format)


@tool(EDIT)
def paint_cells(project_path: str, cells: Optional[list[Cell]] = None, runs: Optional[list[Run]] = None) -> dict:
    """
    Paint cells (one undo step). cells: [{x, y, glyph?, ink?}]; runs: [{x, y, glyphs: [...], ink?}]
    paints left to right (null skips a cell). Missing glyph/ink use the brush; symmetry applies.

    Work in passes (silhouette → light → focal → texture), then render_still and critique_drawing.
    Prefer checker 102 and diagonals 77/78 over sprinkling solids.
    """
    return drawing.paint_cells(project_path, _dump(cells), _dump(runs))


@tool(EDIT)
def erase_cells(project_path: str, cells: list[Point]) -> dict:
    """Clear cells back to empty (symmetry applies)."""
    return drawing.erase_cells(project_path, _dump(cells))


@tool(EDIT)
def fill(project_path: str, x: int, y: int) -> dict:
    """Flood-fill the region of identical glyph+ink at (x, y) with the brush."""
    return drawing.fill(project_path, x, y)


@tool(EDIT)
def draw_line(project_path: str, x0: int, y0: int, x1: int, y1: int) -> dict:
    """Draw a line of the brush glyph from (x0, y0) to (x1, y1)."""
    return drawing.draw_line(project_path, x0, y0, x1, y1)


@tool(EDIT)
def draw_rect(project_path: str, x0: int, y0: int, x1: int, y1: int, filled: bool = False) -> dict:
    """Draw a rectangle outline (or filled) with the brush."""
    return drawing.draw_rect(project_path, x0, y0, x1, y1, filled)


@tool(EDIT)
def place_text(project_path: str, text: str, x: int = 0, y: int = 0, ink: Optional[int] = None) -> dict:
    """Type C64 text from (x, y) like the editor's Text tool (A–Z, a–z, 0–9, C64 punctuation; newlines wrap)."""
    return drawing.place_text(project_path, text, x, y, ink)


@tool(IDEMPOTENT_EDIT)
def select_rect(project_path: str, x0: int, y0: int, x1: int, y1: int) -> dict:
    """Select a rectangle (clipped to the canvas)."""
    return drawing.select_rect(project_path, x0, y0, x1, y1)


@tool(IDEMPOTENT_EDIT)
def deselect(project_path: str) -> dict:
    """Clear the selection."""
    return drawing.deselect(project_path)


@tool(EDIT)
def move_selection(project_path: str, dx: int, dy: int) -> dict:
    """Move the selected cells by (dx, dy), clearing where they were."""
    return drawing.move_selection(project_path, dx, dy)


@tool(EDIT)
def duplicate_selection(project_path: str, dx: int = 1, dy: int = 0) -> dict:
    """Copy the selected cells to an offset of (dx, dy)."""
    return drawing.duplicate_selection(project_path, dx, dy)


@tool(EDIT)
def delete_selection(project_path: str) -> dict:
    """Erase the selected cells."""
    return drawing.delete_selection(project_path)


@tool(ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=True, openWorldHint=False))
def clear_drawing(project_path: str) -> dict:
    """Erase every cell (one undo step)."""
    return drawing.clear_drawing(project_path)


@tool(EDIT)
def recolor_drawing(project_path: str, ink: int) -> dict:
    """Give every painted cell one ink and make it the default ink."""
    return drawing.recolor_drawing(project_path, ink)


@tool(EDIT)
def stamp_border(project_path: str) -> dict:
    """Paint the canvas edge with the brush."""
    return drawing.stamp_border(project_path)


@tool(EDIT)
def stamp_checkerboard(project_path: str) -> dict:
    """Paint every other cell with the brush."""
    return drawing.stamp_checkerboard(project_path)


@tool(EDIT)
def stamp_op_art(
    project_path: str,
    recipe: RecipeId,
    period: Optional[int] = None,
    ink_a: Optional[int] = None,
    ink_b: Optional[int] = None,
) -> dict:
    """
    Fill the canvas with a recipe lattice (pass 1); craft notes at petscii://op-art/recipes/{recipe}.
    Returns animation_suggest to pass to update_project as patch.animation.
    """
    return drawing.stamp_op_art(project_path, recipe, period=period, ink_a=ink_a, ink_b=ink_b)


@tool(EDIT)
def stamp_combined_style(
    project_path: str,
    combination: CombinationId,
    period: Optional[int] = None,
    ink_a: Optional[int] = None,
    ink_b: Optional[int] = None,
) -> dict:
    """Paint a layered rug (field, border, medallion, corners); layer plan at petscii://rugs/{combination}."""
    return drawing.stamp_combined_style(project_path, combination, period=period, ink_a=ink_a, ink_b=ink_b)


@tool(EDIT)
def undo(project_path: str) -> dict:
    """Undo the last drawing change (up to 60 steps)."""
    return drawing.undo(project_path)


@tool(EDIT)
def redo(project_path: str) -> dict:
    """Redo the last undone drawing change."""
    return drawing.redo(project_path)


# --- Craft ---


@tool(READ_ONLY)
def illustration_brief(subject: str) -> dict:
    """
    Plan a picture: inferred category, palette hint, layout, references, pass order and tool sequence.
    Example subjects: "tiger in profile", "noir city portrait", "Bridget Riley bars", "Persian rug".
    """
    return craft.illustration_brief(subject)


@tool(READ_ONLY)
def critique_drawing(project_path: str, style: Literal["auto", "illustration", "op-art"] = "auto") -> dict:
    """Heuristic review (coverage, ink count, texture, focal band). Run after each pass and render_still."""
    return craft.critique_drawing(project_path, style=style)


# --- Render and export ---


@tool(READ_ONLY)
def plan_animation(project_path: str, animation: Optional[AnimationSettings] = None) -> dict:
    """Frame count and readiness for the settings; suggestedSeconds when they are too fast to render cleanly."""
    return pgl_export.plan_animation(project_path, _settings(animation))


@tool(EXPORT)
def render_still(
    project_path: str,
    fmt: Literal["png", "svg"] = "png",
    scale: Annotated[int, Field(ge=1, le=16, description="Pixels per glyph pixel (PNG).")] = 4,
    background: StillBackground = "canvas",
    cell_shape: CellShape = "square",
    save_path: Optional[str] = None,
    preview: bool = True,
) -> CallToolResult:
    """
    Save a still PNG or SVG and return a preview image to look at.

    Glyphs and colours follow the project's machine (C64/C128: C64 glyphs and display palette;
    Plus/4: TED glyphs and colours; C128 80-col: VDC RGBI). cell_shape crt uses CRT proportion
    (5∶6 VIC/TED, 5∶12 VDC). SVG uses one vector path per glyph shape.
    """
    result = pgl_export.render_still(project_path, scale, background, save_path, fmt, cell_shape)
    return _with_preview(result, preview)


@tool(EXPORT)
def render_animation(
    project_path: str,
    animation: Optional[AnimationSettings] = None,
    scale: Annotated[int, Field(ge=1, le=16)] = 2,
    cell_shape: CellShape = "square",
    save_path: Optional[str] = None,
    preview: bool = True,
) -> CallToolResult:
    """
    Save an animated GIF (movement × cell colour × backdrop) and return a 4-frame preview sheet.

    animation overrides project.animation for this render only (use update_project to keep it).
    Timing, colours and backdrops match the editor's GIF download. Too-fast settings fail with the
    warning; plan_animation suggests a loop duration.
    """
    result = pgl_export.render_animation_gif(project_path, _settings(animation), scale, save_path, cell_shape)
    return _with_preview(result, preview)


@tool(EXPORT)
def export_png_frames_zip(
    project_path: str,
    animation: Optional[AnimationSettings] = None,
    scale: Annotated[int, Field(ge=1, le=16)] = 2,
    cell_shape: CellShape = "square",
    save_path: Optional[str] = None,
) -> dict:
    """ZIP of PNG frames with timing.json (editor manifest v2) and project.json."""
    return pgl_export.export_png_frames_zip(project_path, _settings(animation), scale, save_path, cell_shape)


@tool(EXPORT)
def export_video(
    project_path: str,
    animation: Optional[AnimationSettings] = None,
    format: Literal["mp4", "webm"] = "mp4",
    repetitions: Annotated[int, Field(ge=1, le=100)] = 1,
    scale: Annotated[int, Field(ge=1, le=16)] = 2,
    cell_shape: CellShape = "square",
    save_path: Optional[str] = None,
) -> dict:
    """MP4 or WebM via ffmpeg with exact frame timing, 1–100 complete loops. Needs ffmpeg on PATH."""
    return pgl_export.export_video(
        project_path, _settings(animation), scale=scale, format=format, save_path=save_path,
        repetitions=repetitions, cell_shape=cell_shape,
    )


@tool(EXPORT)
def export_native(
    project_path: str,
    mode: Literal["still", "animation"] = "still",
    format: Literal["prg", "d64"] = "prg",
    repetitions: Annotated[int, Field(ge=0, le=100, description="Animation loops; 0 loops until RUN/STOP.")] = 1,
    animation: Optional[AnimationSettings] = None,
    allow_timing_overrun: bool = False,
    save_path: Optional[str] = None,
) -> dict:
    """
    Native .prg or .d64 for the project's machine, using the editor's exporters: C64 and C128 40-col
    (VIC), C128 80-col (VDC), Plus/4 (TED).
    """
    return pgl_export.export_native(
        project_path, mode=mode, format=format, repetitions=repetitions, settings=_settings(animation),
        allow_timing_overrun=allow_timing_overrun, save_path=save_path,
    )


@tool(EXPORT)
def export_binary(
    project_path: str,
    kind: Literal["glyph-ids", "color-ram"],
    save_path: Optional[str] = None,
) -> dict:
    """
    Raw dumps. glyph-ids: atlas IDs (bank × 256 + screen code) as 16-bit little-endian, FFFF = empty —
    not PETSCII bytes. color-ram: one VIC colour index per cell (C64 / C128 40-col only).
    """
    if kind == "glyph-ids":
        return pgl_export.export_glyph_bin(project_path, save_path)
    return pgl_export.export_color_ram_bin(project_path, save_path)


@tool(EXPORT)
def render_petscii_screen(
    machine: Literal["c64", "c128", "plus4"] = "c64",
    lines: Optional[list[str]] = None,
    include_banner: bool = True,
    scale: Annotated[int, Field(ge=1, le=8)] = 3,
    cursor: bool = True,
    save_path: Optional[str] = None,
) -> CallToolResult:
    """
    Render a boot-style text screen with machine chrome and return it as an image.

    Plain characters map to screen codes; embed codes as {{#70}} or {{112}}; prefix ! for reverse
    video, e.g. {{!A}}. C64/C128 use C64 glyphs, Plus/4 uses TED glyphs.
    """
    image = render_screen(machine, lines, scale=scale, include_banner=include_banner, cursor=cursor)
    result: dict[str, Any] = {"ok": True, "machine": machine, "width": image.width, "height": image.height}
    if save_path:
        out = pgl_export.write_target(save_path, "screen.png")
        out.parent.mkdir(parents=True, exist_ok=True)
        image.save(out)
        result["saved_to"] = str(out)
    result["preview_image"] = image
    return _with_preview(result, True)


# --- Prompts ---


@mcp.prompt(title="Draw a PETSCII picture")
def draw_picture(subject: str, machine: str = "c64", project_path: str = "out/workspace/picture.json") -> str:
    """Step-by-step plan for drawing a subject with these tools."""
    brief = craft.illustration_brief(subject)
    return f"""Draw "{subject}" as PETSCII art for the {machine} with the petscii-preview tools.

1. Read the brief below, then petscii://references/drawing/{brief.get('inferred_category', 'scene')} and petscii://glyphs/families. Study the reference images; do not trace.
2. create_canvas(project_path="{project_path}", machine="{machine}"). Colours default to the machine's boot screen; read petscii://machines for ink ranges.
3. Paint in passes with paint_cells (prefer runs for rows): silhouette → light → focal → texture. Use set_tool_state for the brush and symmetry.
4. After each pass call render_still (look at the preview image) and critique_drawing. Use undo freely.
5. Optional: plan_animation, then render_animation with an animation object; update_project(patch={{"animation": ...}}) keeps it.
6. Export what the user asked for: render_still (PNG/SVG), render_animation (GIF), export_video, export_native (PRG/D64).

Brief:
{json.dumps(brief, indent=2, default=str)}
"""


@mcp.prompt(title="Make an op-art or pattern piece")
def op_art_piece(recipe: str, machine: str = "c64", project_path: str = "out/workspace/pattern.json") -> str:
    """Workflow for a recipe-based abstract, girih, mandala or rug piece."""
    return f"""Make a "{recipe}" pattern for the {machine}.

1. Read petscii://op-art/recipes/{recipe} (craft notes and animation_suggest). For rugs read petscii://rugs.
2. create_canvas(project_path="{project_path}", machine="{machine}").
3. stamp_op_art(recipe="{recipe}") — or stamp_combined_style for a rug — as pass 1.
4. Add one focal break with paint_cells, then render_still and critique_drawing(style="op-art").
5. update_project(patch={{"animation": <animation_suggest>}}), plan_animation, then render_animation.
"""


if __name__ == "__main__":
    mcp.run()
