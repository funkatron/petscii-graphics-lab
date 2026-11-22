"""Still, animation, native and binary exports for PGL projects.

Colours, glyph sheet, frame timing and backdrop mattes come from the Node render plan
(`pgl_cli.mjs render-plan`, which reuses the editor's modules). This file only rasterizes,
so MCP output follows the same rules as the editor's Download panel.
"""

from __future__ import annotations

import io
import json
import shutil
import subprocess
import tempfile
import zipfile
from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

from glyphs import load_glyph_rows
from node_bridge import PGL_CLI, ensure_workspace, parse_json_stdout, resolve_project, run_node
from project_store import ProjectError, load, write_target

CELL_SHAPES = ("square", "crt")
STILL_BACKGROUNDS = ("canvas", "white", "black", "transparent")
# Editor ZIP manifest names for the colour table a frame was drawn with.
COLOR_PALETTE_TAGS = {"ted": "ted-pal", "vdc": "vdc-pal"}


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    raw = value.removeprefix("#")
    return tuple(int(raw[i : i + 2], 16) for i in (0, 2, 4))


def load_project_data(project_path: str | None) -> tuple[Path, dict]:
    path = resolve_project(project_path)
    return path, load(path)


def _check_choice(value: str, allowed: tuple[str, ...], name: str) -> str:
    if value not in allowed:
        raise ProjectError(f"{name} must be one of {', '.join(allowed)}, got {value!r}")
    return value


def _check_scale(scale: int) -> int:
    if isinstance(scale, bool) or not isinstance(scale, int) or not 1 <= scale <= 16:
        raise ProjectError(f"scale must be an integer from 1 to 16, got {scale!r}")
    return scale


def render_plan(
    project_path: str | None,
    mode: str = "still",
    settings: dict[str, Any] | None = None,
    cell_shape: str = "square",
) -> dict[str, Any]:
    """Run the Node render plan and return it (frames, colour table, glyph sheet, cell shape)."""
    _check_choice(cell_shape, CELL_SHAPES, "cell_shape")
    path = resolve_project(project_path)
    if not path.is_file():
        raise ProjectError(f"project not found: {path}")
    with tempfile.TemporaryDirectory(dir=ensure_workspace()) as tmp:
        out = Path(tmp) / "plan.json"
        args = ["render-plan", f"--project={path}", f"--mode={mode}", f"--cell-shape={cell_shape}", f"--out={out}"]
        if settings:
            args.append(f"--settings={json.dumps(settings)}")
        summary = parse_json_stdout(run_node(PGL_CLI, args, check=False))
        if not summary.get("ok"):
            raise ProjectError(summary.get("error", "render plan failed"))
        plan = json.loads(out.read_text(encoding="utf-8"))
    plan["project"] = str(path)
    plan["rgb"] = [hex_to_rgb(color) for color in plan["colors"]]
    return plan


def cell_size(plan: dict[str, Any], scale: int) -> tuple[int, int]:
    """Editor exportCellSize(): square 8×scale; CRT unitW×scale by unitH×scale."""
    return plan["cell"]["unitW"] * scale, plan["cell"]["unitH"] * scale


@lru_cache(maxsize=4096)
def _glyph_mask(sheet: str, glyph: int, cell_w: int, cell_h: int) -> Image.Image:
    """Glyph as an 'L' mask, nearest-sampled to the cell like the editor's tileFor()."""
    rows = load_glyph_rows(sheet)[glyph]
    mask = Image.new("L", (cell_w, cell_h), 0)
    pixels = mask.load()
    for y in range(cell_h):
        bits = rows[y * 8 // cell_h]
        for x in range(cell_w):
            if bits & (0x80 >> (x * 8 // cell_w)):
                pixels[x, y] = 255
    return mask


def rasterize_frame(
    plan: dict[str, Any],
    frame: dict[str, Any],
    scale: int,
    background: tuple[int, int, int] | None,
) -> Image.Image:
    """Draw one frame. `background` None means transparent where no backdrop matte applies."""
    cell_w, cell_h = cell_size(plan, scale)
    columns, rows = plan["columns"], plan["rows"]
    rgb = plan["rgb"]
    matte = frame.get("matte")
    mode = "RGBA" if background is None and not matte else "RGB"
    fill = (0, 0, 0, 0) if mode == "RGBA" else (background or (0, 0, 0))
    image = Image.new(mode, (columns * cell_w, rows * cell_h), fill)
    for index, glyph in enumerate(frame["cells"]):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        if matte:
            image.paste(rgb[matte[index]], (x, y, x + cell_w, y + cell_h))
        if glyph == "" or glyph is None:
            continue
        color = rgb[frame["inks"][index]]
        image.paste(
            color if mode == "RGB" else (*color, 255),
            (x, y),
            _glyph_mask(plan["glyphSheet"], int(glyph), cell_w, cell_h),
        )
    return image


def _frame_background(plan: dict[str, Any], frame: dict[str, Any]) -> tuple[int, int, int] | None:
    """Editor animationRaster(): white, transparent, or the frame's background index."""
    mode = plan["backgroundMode"]
    if mode == "white":
        return (255, 255, 255)
    if mode == "transparent":
        return None
    return plan["rgb"][frame["background"]]


def _still_background(plan: dict[str, Any], background: str) -> tuple[int, int, int] | None:
    if background == "transparent":
        return None
    if background == "white":
        return (255, 255, 255)
    if background == "black":
        return (0, 0, 0)
    return plan["rgb"][plan["projectBackground"]]


PREVIEW_MAX_WIDTH = 640


def fit_preview(image: Image.Image, max_width: int = PREVIEW_MAX_WIDTH) -> Image.Image:
    """Whole-number nearest-neighbour scale so glyph pixels stay crisp; never wider than max_width."""
    image = image.convert("RGBA") if image.mode == "RGBA" else image.convert("RGB")
    if image.width > max_width:
        factor = -(-image.width // max_width)
        return image.resize((image.width // factor, image.height // factor), Image.NEAREST)
    factor = max(1, min(4, max_width // image.width))
    return image.resize((image.width * factor, image.height * factor), Image.NEAREST) if factor > 1 else image


def frame_sheet(plan: dict[str, Any], frames: list[Image.Image], count: int = 4) -> Image.Image:
    """Evenly spaced frames in a 2-column sheet, each labelled with its frame number and time."""
    picks = sorted({round(i * (len(frames) - 1) / max(1, count - 1)) for i in range(count)}) if frames else []
    tiles = [fit_preview(frames[i].convert("RGB"), PREVIEW_MAX_WIDTH // 2) for i in picks]
    width, height = tiles[0].size
    label = 14
    columns = 2 if len(tiles) > 1 else 1
    rows = -(-len(tiles) // columns)
    sheet = Image.new("RGB", (columns * width + (columns + 1) * 6, rows * (height + label) + (rows + 1) * 6), (32, 32, 36))
    draw = ImageDraw.Draw(sheet)
    for slot, (index, tile) in enumerate(zip(picks, tiles)):
        x = 6 + (slot % columns) * (width + 6)
        y = 6 + (slot // columns) * (height + label + 6)
        frame = plan["frames"][index]
        draw.text((x, y), f"frame {index + 1}/{len(frames)} · {frame['startMs']} ms", fill=(225, 225, 225))
        sheet.paste(tile, (x, y + label))
    return sheet


def _hex(color: tuple[int, int, int]) -> str:
    return "#%02x%02x%02x" % color


def render_still(
    project_path: str | None = None,
    scale: int = 4,
    background: str = "canvas",
    save_path: str | None = None,
    fmt: str = "png",
    cell_shape: str = "square",
) -> dict:
    _check_choice(fmt, ("png", "svg"), "fmt")
    _check_choice(background, STILL_BACKGROUNDS, "background")
    _check_scale(scale)
    plan = render_plan(project_path, "still", None, cell_shape)
    path = Path(plan["project"])
    out = write_target(save_path, f"{path.stem}-still.{fmt}")
    out.parent.mkdir(parents=True, exist_ok=True)
    bg = _still_background(plan, background)
    if fmt == "svg":
        svg, width, height = make_svg(plan, bg)
        out.write_text(svg, encoding="utf-8")
        image = rasterize_frame(plan, plan["frames"][0], 2, bg)
    else:
        image = rasterize_frame(plan, plan["frames"][0], scale, bg)
        image.save(out)
        width, height = image.size
    return {
        "preview_image": fit_preview(image),
        "ok": True,
        "saved_to": str(out),
        "width": width,
        "height": height,
        "format": fmt,
        "machine": plan["machine"],
        "colorTable": plan["table"],
        "glyphSheet": plan["glyphSheet"],
        "cellShape": plan["cell"]["id"],
        "project": str(path),
    }


def _glyph_path(rows: bytes) -> str:
    """Vector outline of one 8×8 glyph: horizontal runs merged, identical runs stacked into rectangles."""
    spans: dict[tuple[int, int], list[int]] = {}
    for y in range(8):
        x = 0
        while x < 8:
            if rows[y] & (0x80 >> x):
                start = x
                while x < 8 and rows[y] & (0x80 >> x):
                    x += 1
                spans.setdefault((start, x - start), []).append(y)
            else:
                x += 1
    parts: list[str] = []
    for (start, width), ys in sorted(spans.items(), key=lambda item: (item[1][0], item[0][0])):
        top = ys[0]
        for index, y in enumerate(ys):
            last = index == len(ys) - 1
            if last or ys[index + 1] != y + 1:
                parts.append(f"M{start} {top}h{width}v{y - top + 1}h-{width}z")
                if not last:
                    top = ys[index + 1]
    return "".join(parts)


def make_svg(plan: dict[str, Any], background: tuple[int, int, int] | None) -> tuple[str, int, int]:
    """Editor makeSvg(): 2× export cells (16 px square, 10×12 VIC/TED CRT, 10×24 VDC CRT), real paths."""
    cell_w, cell_h = cell_size(plan, 2)
    columns, rows = plan["columns"], plan["rows"]
    width, height = columns * cell_w, rows * cell_h
    glyph_rows = load_glyph_rows(plan["glyphSheet"])
    frame = plan["frames"][0]
    symbols: dict[int, str] = {}
    uses: list[str] = []
    for index, glyph in enumerate(frame["cells"]):
        if glyph == "" or glyph is None:
            continue
        glyph = int(glyph)
        if glyph not in symbols:
            symbols[glyph] = _glyph_path(glyph_rows[glyph])
        if not symbols[glyph]:
            continue
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        fill = _hex(plan["rgb"][frame["inks"][index]])
        uses.append(
            f'<use href="#g{glyph}" fill="{fill}" transform="translate({x} {y}) scale({cell_w / 8:g} {cell_h / 8:g})"/>'
        )
    defs = "".join(f'<path id="g{glyph}" d="{d}"/>' for glyph, d in sorted(symbols.items()) if d)
    bg = f'<rect width="100%" height="100%" fill="{_hex(background)}"/>' if background else ""
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" '
        f'shape-rendering="crispEdges"><defs>{defs}</defs>{bg}{"".join(uses)}</svg>\n'
    )
    return svg, width, height


def plan_animation(project_path: str | None = None, settings: dict[str, Any] | None = None) -> dict:
    path = resolve_project(project_path)
    args = ["plan", f"--project={path}"]
    if settings:
        args.append(f"--settings={json.dumps(settings)}")
    return parse_json_stdout(run_node(PGL_CLI, args, check=False))


def _animation_frames(plan: dict[str, Any], scale: int) -> list[Image.Image]:
    return [rasterize_frame(plan, frame, scale, _frame_background(plan, frame)) for frame in plan["frames"]]


def _summary(plan: dict[str, Any], out: Path) -> dict[str, Any]:
    return {
        "ok": True,
        "saved_to": str(out),
        "frameCount": plan["frameCount"],
        "seconds": plan["seconds"],
        "machine": plan["machine"],
        "colorTable": plan["table"],
        "cellShape": plan["cell"]["id"],
        "motionEffect": plan["motionEffect"],
        "colorEffect": plan["colorEffect"],
        "backgroundEffect": plan["backgroundEffect"],
        "project": plan["project"],
    }


def render_animation_gif(
    project_path: str | None = None,
    settings: dict[str, Any] | None = None,
    scale: int = 2,
    save_path: str | None = None,
    cell_shape: str = "square",
) -> dict:
    _check_scale(scale)
    plan = render_plan(project_path, "animation", settings, cell_shape)
    stem = Path(plan["project"]).stem
    out = write_target(save_path, f"{stem}-{plan['motionEffect']}-{plan['colorEffect']}.gif")
    out.parent.mkdir(parents=True, exist_ok=True)
    frames = _animation_frames(plan, scale)
    transparent = plan["backgroundMode"] == "transparent"
    frames[0].save(
        out,
        save_all=True,
        append_images=frames[1:],
        duration=[frame["durationMs"] for frame in plan["frames"]],
        loop=0,
        optimize=False,
        disposal=2 if transparent else 0,
    )
    result = _summary(plan, out)
    result["width"], result["height"] = frames[0].size
    result["preview_image"] = frame_sheet(plan, frames)
    return result


def _color_palette_tag(plan: dict[str, Any]) -> str:
    return COLOR_PALETTE_TAGS.get(plan["table"], "pepto-pal")


def export_png_frames_zip(
    project_path: str | None = None,
    settings: dict[str, Any] | None = None,
    scale: int = 2,
    save_path: str | None = None,
    cell_shape: str = "square",
) -> dict:
    _check_scale(scale)
    plan = render_plan(project_path, "animation", settings, cell_shape)
    project = Path(plan["project"])
    out = write_target(save_path, f"{project.stem}-frames.zip")
    out.parent.mkdir(parents=True, exist_ok=True)
    cell_w, cell_h = cell_size(plan, scale)
    project_data = load(project)
    manifest_frames = []
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for frame, image in zip(plan["frames"], _animation_frames(plan, scale)):
            name = f"frames/frame-{frame['index'] + 1:04d}.png"
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            archive.writestr(name, buffer.getvalue())
            manifest_frames.append({"file": name, "startMs": frame["startMs"], "durationMs": frame["durationMs"]})
        manifest = {
            "format": "petscii-animation-frames",
            "version": 2,
            "effect": plan["motionEffect"],
            "colorEffect": plan["colorEffect"],
            "backgroundEffect": plan["backgroundEffect"],
            "width": plan["columns"] * cell_w,
            "height": plan["rows"] * cell_h,
            "columns": plan["columns"],
            "rows": plan["rows"],
            "pixelsPerCell": cell_w if cell_w == cell_h else {"width": cell_w, "height": cell_h},
            "glyphEncoding": "c64-atlas-id",
            "background": plan["backgroundMode"],
            "colorPalette": _color_palette_tag(plan),
            **({} if plan["table"] in ("ted", "vdc") else {"displayPalette": plan["palette"]}),
            "machine": plan["machine"],
            "loop": True,
            "durationMs": int(plan["seconds"] * 1000),
            "sourceProject": "project.json",
            "frames": manifest_frames,
        }
        archive.writestr("timing.json", f"{json.dumps(manifest, indent=2)}\n")
        archive.writestr("project.json", f"{json.dumps(project_data, indent=2)}\n")
    result = _summary(plan, out)
    result["width"], result["height"] = manifest["width"], manifest["height"]
    return result


def export_native(
    project_path: str | None = None,
    mode: str = "still",
    format: str = "prg",
    repetitions: int = 1,
    settings: dict[str, Any] | None = None,
    allow_timing_overrun: bool = False,
    save_path: str | None = None,
) -> dict:
    """PRG or D64 for the project's machine: C64, C128 40-col, C128 80-col (VDC) or Plus/4 (TED)."""
    path, data = load_project_data(project_path)
    _check_choice(mode, ("still", "animation"), "mode")
    _check_choice(format, ("prg", "d64"), "format")
    if isinstance(repetitions, bool) or not isinstance(repetitions, int) or not 0 <= repetitions <= 100:
        raise ProjectError("repetitions must be a whole number from 0 to 100 (0 loops forever)")
    machine = data.get("machine", "c64")
    out = write_target(save_path, f"{path.stem}-{machine}-{mode}.{format}")
    args = [
        "export-native",
        f"--project={path}",
        f"--out={out}",
        f"--mode={mode}",
        f"--format={format}",
        f"--repetitions={repetitions}",
    ]
    if allow_timing_overrun:
        args.append("--allow-timing-overrun=1")
    if settings:
        args.append(f"--settings={json.dumps(settings)}")
    payload = parse_json_stdout(run_node(PGL_CLI, args, check=False))
    if payload.get("ok"):
        payload["saved_to"] = str(out)
    return payload


def export_glyph_bin(project_path: str | None = None, save_path: str | None = None) -> dict:
    """Atlas glyph IDs (bank × 256 + screen code), 16-bit little-endian; FFFF = empty. Not PETSCII bytes."""
    path, data = load_project_data(project_path)
    out = write_target(save_path, f"{path.stem}-glyph-ids.bin")
    out.parent.mkdir(parents=True, exist_ok=True)
    raw = bytearray()
    for glyph in data["grid"]:
        value = 0xFFFF if glyph == "" or glyph is None else int(glyph)
        raw += value.to_bytes(2, "little")
    out.write_bytes(raw)
    return {"ok": True, "saved_to": str(out), "bytes": len(raw), "encoding": "c64-atlas-id-u16le", "project": str(path)}


def export_color_ram_bin(project_path: str | None = None, save_path: str | None = None) -> dict:
    """One VIC colour index per cell, row-major (VIC machines only, as in the editor)."""
    path, data = load_project_data(project_path)
    machine = data.get("machine", "c64")
    if machine not in ("c64", "c128"):
        raise ProjectError(
            f"Color RAM export is only available for VIC machines (C64 / C128 40-col); this project is {machine!r}"
        )
    out = write_target(save_path, f"{path.stem}-color-ram.bin")
    out.parent.mkdir(parents=True, exist_ok=True)
    ink = data.get("colors", {}).get("ink", 14)
    colors = data.get("cellColors") or [ink] * len(data["grid"])
    raw = bytes(int(value) & 0xFF for value in colors)
    out.write_bytes(raw)
    return {"ok": True, "saved_to": str(out), "bytes": len(raw), "project": str(path)}


def _even_pad(image: Image.Image) -> Image.Image:
    """H.264/VP9 yuv420p need even width and height."""
    width, height = image.size
    if width % 2 == 0 and height % 2 == 0:
        return image
    canvas = Image.new(image.mode, (width + width % 2, height + height % 2), (0, 0, 0))
    canvas.paste(image, (0, 0))
    return canvas


def export_video(
    project_path: str | None = None,
    settings: dict[str, Any] | None = None,
    scale: int = 2,
    format: str = "mp4",
    save_path: str | None = None,
    repetitions: int = 1,
    cell_shape: str = "square",
) -> dict:
    """MP4/WebM with each frame at its exact start time and duration (like the editor's WebCodecs export)."""
    _check_choice(format, ("mp4", "webm"), "format")
    _check_scale(scale)
    if isinstance(repetitions, bool) or not isinstance(repetitions, int) or not 1 <= repetitions <= 100:
        raise ProjectError("repetitions must be a whole number of loops from 1 to 100")
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise ProjectError("ffmpeg not found on PATH. Install ffmpeg to export MP4/WebM.")
    plan = render_plan(project_path, "animation", settings, cell_shape)
    stem = Path(plan["project"]).stem
    out = write_target(save_path, f"{stem}-{plan['motionEffect']}-{plan['colorEffect']}.{format}")
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=ensure_workspace()) as tmp:
        folder = Path(tmp)
        entries: list[str] = []
        for frame, image in zip(plan["frames"], _animation_frames(plan, scale)):
            name = f"frame-{frame['index'] + 1:05d}.png"
            # Video has no alpha: transparent backgrounds render black, as in the editor.
            _even_pad(image.convert("RGB")).save(folder / name)
            entries.append(f"file '{name}'\nduration {frame['durationMs'] / 1000:.3f}\n")
        # The concat demuxer drops the last entry's duration unless that file is listed again.
        listing = "".join(entries) * repetitions + entries[-1].split("\n")[0] + "\n"
        (folder / "frames.txt").write_text(listing, encoding="utf-8")
        if format == "webm":
            codec = ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-row-mt", "1", "-pix_fmt", "yuv420p"]
        else:
            codec = [
                "-c:v", "libx264", "-preset", "medium", "-tune", "animation", "-crf", "17",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            ]
        command = [
            ffmpeg, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "frames.txt",
            "-fps_mode", "vfr", *codec, str(out),
        ]
        result = subprocess.run(command, capture_output=True, text=True, cwd=folder)
    if result.returncode != 0:
        raise ProjectError(f"ffmpeg failed: {(result.stderr or '').strip()[-800:]}")
    summary = _summary(plan, out)
    summary.update({"format": format, "repetitions": repetitions, "bytes": out.stat().st_size})
    return summary
