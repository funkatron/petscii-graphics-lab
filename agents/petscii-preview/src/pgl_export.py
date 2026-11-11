"""Still/animation/binary exports for PGL projects (Pillow + Node bridges)."""

from __future__ import annotations

import json
import shutil
import subprocess
import zipfile
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

from glyphs import load_glyph_banks
from node_bridge import (
    EXPORT_ANIMATION,
    PGL_CLI,
    ensure_workspace,
    parse_json_stdout,
    resolve_project,
    run_node,
)

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


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    raw = value.removeprefix("#")
    return tuple(int(raw[i : i + 2], 16) for i in (0, 2, 4))


def load_project_data(project_path: str | None) -> tuple[Path, dict]:
    path = resolve_project(project_path)
    data = json.loads(path.read_text(encoding="utf-8"))
    return path, data


def background_rgb(data: dict, mode: str = "canvas") -> tuple[int, int, int] | None:
    if mode == "transparent":
        return None
    if mode == "white":
        return (255, 255, 255)
    if mode == "black":
        return (0, 0, 0)
    bg = data.get("colors", {}).get("background", 0)
    return PEPTO[bg]


def render_cells_image(
    cells: list,
    inks: list[int],
    columns: int,
    rows: int,
    palette: list[tuple[int, int, int]],
    background: tuple[int, int, int] | None,
    scale: int,
    banks: tuple,
) -> Image.Image:
    width = columns * 8 * scale
    height = rows * 8 * scale
    if background is None:
        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    else:
        img = Image.new("RGB", (width, height), background)
    draw = ImageDraw.Draw(img)
    for index, glyph_id in enumerate(cells):
        if glyph_id == "" or glyph_id is None:
            continue
        if isinstance(glyph_id, int) and glyph_id >= 256:
            bank = 1
            code = glyph_id - 256
        else:
            bank = 0
            code = int(glyph_id)
        ink = inks[index] if index < len(inks) else 14
        if ink < 0 or ink >= len(palette):
            continue
        color = palette[ink]
        if background is None:
            color = (*color, 255)
        x = (index % columns) * 8 * scale
        y = (index // columns) * 8 * scale
        for px, py in banks[bank][code]:
            x0 = x + px * scale
            y0 = y + py * scale
            draw.rectangle([x0, y0, x0 + scale - 1, y0 + scale - 1], fill=color)
    return img


def render_still(
    project_path: str | None = None,
    scale: int = 4,
    background: str = "canvas",
    save_path: str | None = None,
    fmt: str = "png",
) -> dict:
    path, data = load_project_data(project_path)
    columns = data["columns"]
    rows = data["rows"]
    ink = data.get("colors", {}).get("ink", 14)
    cells = data["grid"]
    inks = data.get("cellColors") or [ink] * len(cells)
    banks = load_glyph_banks()
    bg = background_rgb(data, background)
    img = render_cells_image(cells, inks, columns, rows, PEPTO, bg, scale, banks)

    workspace = ensure_workspace()
    if save_path:
        out = Path(save_path).expanduser().resolve()
    else:
        suffix = "svg" if fmt == "svg" else "png"
        out = workspace / f"{path.stem}-still.{suffix}"
    out.parent.mkdir(parents=True, exist_ok=True)

    if fmt == "svg":
        svg = make_svg(data, background)
        out.write_text(svg, encoding="utf-8")
    else:
        img.save(out)
    return {
        "ok": True,
        "saved_to": str(out),
        "width": columns * 8 * scale,
        "height": rows * 8 * scale,
        "format": fmt,
        "project": str(path),
    }


def make_svg(data: dict, background_mode: str = "canvas") -> str:
    columns = data["columns"]
    rows = data["rows"]
    ink_default = data.get("colors", {}).get("ink", 14)
    cells = data["grid"]
    inks = data.get("cellColors") or [ink_default] * len(cells)
    banks = load_glyph_banks()
    bg = background_rgb(data, background_mode)
    parts: list[str] = []
    width = columns * 16
    height = rows * 16
    if bg is not None:
        parts.append(f'<rect width="100%" height="100%" fill="#{bg[0]:02x}{bg[1]:02x}{bg[2]:02x}"/>')
    for index, glyph_id in enumerate(cells):
        if glyph_id == "" or glyph_id is None:
            continue
        if isinstance(glyph_id, int) and glyph_id >= 256:
            bank = 1
            code = glyph_id - 256
        else:
            bank = 0
            code = int(glyph_id)
        ink = inks[index]
        color = PEPTO[ink]
        fill = f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
        x = (index % columns) * 16
        y = (index // columns) * 16
        rects = "".join(
            f'<rect x="{px}" y="{py}" width="1" height="1"/>' for px, py in banks[bank][code]
        )
        parts.append(f'<g fill="{fill}" transform="translate({x} {y}) scale(2)">{rects}</g>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}">{"".join(parts)}</svg>\n'
    )


def export_frames_payload(
    project_path: str | None,
    settings: dict[str, Any] | None = None,
    out_json: Path | None = None,
) -> dict:
    path = resolve_project(project_path)
    workspace = ensure_workspace()
    payload_path = out_json or (workspace / f"{path.stem}.frames.json")
    args = [
        f"--project={path}",
        f"--out={payload_path}",
    ]
    if settings:
        args.append(f"--settings={json.dumps(settings)}")
    result = run_node(EXPORT_ANIMATION, args)
    summary = parse_json_stdout(result)
    data = json.loads(payload_path.read_text(encoding="utf-8"))
    summary["payload"] = data
    summary["payloadPath"] = str(payload_path)
    return summary


def plan_animation(project_path: str | None = None, settings: dict[str, Any] | None = None) -> dict:
    path = resolve_project(project_path)
    args = [f"--project={path}", "--plan-only"]
    if settings:
        args.append(f"--settings={json.dumps(settings)}")
    result = run_node(EXPORT_ANIMATION, args)
    return parse_json_stdout(result)


def _palette_from_payload(data: dict) -> list[tuple[int, int, int]]:
    return [hex_to_rgb(value) for value in data["palette"]]


def render_animation_gif(
    project_path: str | None = None,
    settings: dict[str, Any] | None = None,
    scale: int = 2,
    save_path: str | None = None,
) -> dict:
    summary = export_frames_payload(project_path, settings)
    data = summary["payload"]
    banks = load_glyph_banks()
    palette = _palette_from_payload(data)
    bg_mode = data.get("backgroundMode", "dark")
    if bg_mode == "transparent":
        background = None
    elif bg_mode == "white":
        background = (255, 255, 255)
    else:
        background = hex_to_rgb(data["background"])

    frames: list[Image.Image] = []
    durations: list[int] = []
    for frame in data["frames"]:
        img = render_cells_image(
            frame["cells"],
            frame["inks"],
            data["columns"],
            data["rows"],
            palette,
            background if background is not None else (0, 0, 0),
            scale,
            banks,
        )
        frames.append(img.convert("RGB"))
        durations.append(max(40, int(frame.get("durationMs", data.get("durationMs", 80)))))

    workspace = ensure_workspace()
    motion = data.get("motionEffect", "none")
    color = data.get("effect", "none")
    out = Path(save_path).expanduser().resolve() if save_path else (
        workspace / f"{Path(data['project']).stem}-{motion}-{color}.gif"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        out,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=False,
    )
    return {
        "ok": True,
        "saved_to": str(out),
        "frameCount": data["frameCount"],
        "seconds": data.get("seconds"),
        "motionEffect": motion,
        "colorEffect": color,
        "warning": data.get("warning", ""),
        "project": data.get("project"),
    }


def export_png_frames_zip(
    project_path: str | None = None,
    settings: dict[str, Any] | None = None,
    scale: int = 2,
    save_path: str | None = None,
) -> dict:
    summary = export_frames_payload(project_path, settings)
    data = summary["payload"]
    banks = load_glyph_banks()
    palette = _palette_from_payload(data)
    background = hex_to_rgb(data["background"])
    workspace = ensure_workspace()
    stem = Path(data["project"]).stem
    out = Path(save_path).expanduser().resolve() if save_path else (workspace / f"{stem}-frames.zip")
    out.parent.mkdir(parents=True, exist_ok=True)
    frame_dir = workspace / f"{stem}-frames-tmp"
    if frame_dir.exists():
        shutil.rmtree(frame_dir)
    frame_dir.mkdir(parents=True)

    manifest_frames = []
    for frame in data["frames"]:
        img = render_cells_image(
            frame["cells"],
            frame["inks"],
            data["columns"],
            data["rows"],
            palette,
            background,
            scale,
            banks,
        )
        name = f"frames/frame-{frame['index'] + 1:04d}.png"
        dest = frame_dir / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest)
        manifest_frames.append({
            "file": name,
            "startMs": frame["startMs"],
            "durationMs": frame["durationMs"],
        })

    manifest = {
        "format": "petscii-animation-frames",
        "version": 2,
        "effect": data.get("motionEffect"),
        "colorEffect": data.get("effect"),
        "width": data["columns"] * 8 * scale,
        "height": data["rows"] * 8 * scale,
        "columns": data["columns"],
        "rows": data["rows"],
        "loop": True,
        "durationMs": int(data.get("seconds", 2) * 1000),
        "frames": manifest_frames,
        "animation": data.get("animation"),
    }
    (frame_dir / "timing.json").write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    project_src = Path(data["project"])
    if project_src.exists():
        shutil.copy2(project_src, frame_dir / "project.json")

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in frame_dir.rglob("*"):
            if file_path.is_file():
                archive.write(file_path, file_path.relative_to(frame_dir).as_posix())
    shutil.rmtree(frame_dir)
    return {
        "ok": True,
        "saved_to": str(out),
        "frameCount": data["frameCount"],
        "project": data.get("project"),
    }


def export_c64(
    project_path: str | None = None,
    mode: str = "still",
    format: str = "prg",
    repetitions: int = 1,
    settings: dict[str, Any] | None = None,
    allow_timing_overrun: bool = False,
    save_path: str | None = None,
) -> dict:
    path = resolve_project(project_path)
    workspace = ensure_workspace()
    out = Path(save_path).expanduser().resolve() if save_path else (
        workspace / f"{path.stem}-{mode}.{format}"
    )
    args = [
        "export-c64",
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
    result = run_node(PGL_CLI, args, check=False)
    payload = parse_json_stdout(result)
    if not payload.get("ok"):
        return payload
    payload["saved_to"] = str(out)
    return payload


def export_glyph_bin(project_path: str | None = None, save_path: str | None = None) -> dict:
    path, data = load_project_data(project_path)
    workspace = ensure_workspace()
    out = Path(save_path).expanduser().resolve() if save_path else (
        workspace / f"{path.stem}-glyph-ids.bin"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    raw = bytearray()
    for glyph in data["grid"]:
        value = 0xFFFF if glyph == "" or glyph is None else int(glyph)
        raw.append(value & 0xFF)
        raw.append((value >> 8) & 0xFF)
    out.write_bytes(raw)
    return {"ok": True, "saved_to": str(out), "bytes": len(raw), "project": str(path)}


def export_color_ram_bin(project_path: str | None = None, save_path: str | None = None) -> dict:
    path, data = load_project_data(project_path)
    workspace = ensure_workspace()
    out = Path(save_path).expanduser().resolve() if save_path else (
        workspace / f"{path.stem}-color-ram.bin"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    ink = data.get("colors", {}).get("ink", 14)
    colors = data.get("cellColors") or [ink] * len(data["grid"])
    raw = bytes(int(value) & 0xFF for value in colors)
    out.write_bytes(raw)
    return {"ok": True, "saved_to": str(out), "bytes": len(raw), "project": str(path)}


def _even_pad(image: Image.Image) -> Image.Image:
    """H.264 yuv420p needs even width and height."""
    width, height = image.size
    pad_w = width % 2
    pad_h = height % 2
    if pad_w == 0 and pad_h == 0:
        return image
    canvas = Image.new(image.mode, (width + pad_w, height + pad_h), (0, 0, 0))
    canvas.paste(image, (0, 0))
    return canvas


def export_video(
    project_path: str | None = None,
    settings: dict[str, Any] | None = None,
    scale: int = 2,
    format: str = "mp4",
    save_path: str | None = None,
    repetitions: int = 1,
) -> dict:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return {
            "ok": False,
            "error": "ffmpeg not found on PATH. Install ffmpeg to export MP4/WebM.",
        }

    summary = export_frames_payload(project_path, settings)
    data = summary["payload"]
    banks = load_glyph_banks()
    palette = _palette_from_payload(data)
    background = hex_to_rgb(data["background"])
    workspace = ensure_workspace()
    stem = Path(data["project"]).stem
    frame_dir = workspace / f"{stem}-video-frames"
    if frame_dir.exists():
        shutil.rmtree(frame_dir)
    frame_dir.mkdir(parents=True)

    # Expand each animation frame into N copies so timing matches durationMs
    # while staying constant-frame-rate (most players choke on VFR mp4s).
    tick_ms = 40
    fps = 1000.0 / tick_ms
    written = 0
    source_frames = 0
    for _rep in range(max(1, repetitions)):
        for frame in data["frames"]:
            source_frames += 1
            img = render_cells_image(
                frame["cells"],
                frame["inks"],
                data["columns"],
                data["rows"],
                palette,
                background,
                scale,
                banks,
            )
            img = _even_pad(img.convert("RGB"))
            duration_ms = max(tick_ms, int(frame.get("durationMs", data.get("durationMs", 80))))
            copies = max(1, round(duration_ms / tick_ms))
            for _copy in range(copies):
                written += 1
                img.save(frame_dir / f"frame-{written:05d}.png")

    if written == 0:
        shutil.rmtree(frame_dir)
        return {"ok": False, "error": "no frames produced for video export"}

    out = Path(save_path).expanduser().resolve() if save_path else (
        workspace / f"{stem}-{data.get('motionEffect', 'none')}-{data.get('effect', 'none')}.{format}"
    )
    out.parent.mkdir(parents=True, exist_ok=True)

    if format == "webm":
        codec_args = [
            "-c:v", "libvpx-vp9",
            "-b:v", "0",
            "-crf", "30",
            "-row-mt", "1",
            "-pix_fmt", "yuv420p",
        ]
    else:
        codec_args = [
            "-c:v", "libx264",
            "-preset", "medium",
            "-tune", "animation",
            "-crf", "17",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-profile:v", "high",
            "-level", "4.0",
        ]

    command = [
        ffmpeg,
        "-y",
        "-framerate",
        f"{fps:.6f}",
        "-i",
        str(frame_dir / "frame-%05d.png"),
        "-r",
        f"{fps:.6f}",
        *codec_args,
        str(out),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    shutil.rmtree(frame_dir)
    if result.returncode != 0:
        return {
            "ok": False,
            "error": result.stderr[-800:] if result.stderr else "ffmpeg failed",
            "command": command,
        }
    size = out.stat().st_size if out.exists() else 0
    return {
        "ok": True,
        "saved_to": str(out),
        "frameCount": source_frames,
        "encodedFrames": written,
        "fps": fps,
        "bytes": size,
        "format": format,
        "project": data.get("project"),
        "motionEffect": data.get("motionEffect"),
        "colorEffect": data.get("effect"),
    }
