"""Render PGL color-animation frame JSON into GIF/PNG sequences."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

from glyphs import load_glyph_banks

REPO_ROOT = Path(__file__).resolve().parents[3]
EXPORT_SCRIPT = Path(__file__).resolve().parents[1] / "export_color_animation.mjs"
DEFAULT_NODE = Path.home() / ".local/share/cursor-agent/versions/2026.11.10-731fb78/node"


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    raw = value.removeprefix("#")
    return tuple(int(raw[i : i + 2], 16) for i in (0, 2, 4))


def find_node() -> str:
    if DEFAULT_NODE.exists():
        return str(DEFAULT_NODE)
    return "node"


DEFAULT_PROJECT = (
    Path(__file__).resolve().parents[1] / "examples" / "golden-fuzzy-raven.json"
)


def export_frames_json(
    effect: str,
    json_path: Path,
    *,
    project_path: Path | None = None,
) -> Path:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    project = project_path or DEFAULT_PROJECT
    command = [
        find_node(),
        str(EXPORT_SCRIPT),
        effect,
        str(json_path),
        f"--project={project}",
    ]
    subprocess.run(command, check=True, cwd=str(REPO_ROOT))
    return json_path


def render_frame(
    cells: list,
    inks: list[int],
    palette: list[str],
    columns: int,
    rows: int,
    background: str,
    scale: int,
    banks: tuple,
) -> Image.Image:
    bg = hex_to_rgb(background)
    img = Image.new("RGB", (columns * 8 * scale, rows * 8 * scale), bg)
    draw = ImageDraw.Draw(img)
    glyphs = banks[0]

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
        if ink < 0 or ink >= len(palette):
            continue
        color = hex_to_rgb(palette[ink])
        x = (index % columns) * 8 * scale
        y = (index // columns) * 8 * scale
        for px, py in banks[bank][code]:
            x0 = x + px * scale
            y0 = y + py * scale
            draw.rectangle([x0, y0, x0 + scale - 1, y0 + scale - 1], fill=color)
    return img


def render_color_animation_gif(
    effect: str,
    out_path: Path,
    *,
    scale: int = 2,
    json_path: Path | None = None,
    project_path: Path | None = None,
) -> Path:
    payload_path = json_path or (out_path.parent / f"{effect}.frames.json")
    export_frames_json(effect, payload_path, project_path=project_path)
    data = json.loads(payload_path.read_text(encoding="utf-8"))
    banks = load_glyph_banks()
    frames: list[Image.Image] = []
    for frame in data["frames"]:
        frames.append(
            render_frame(
                frame["cells"],
                frame["inks"],
                data["palette"],
                data["columns"],
                data["rows"],
                data["background"],
                scale,
                banks,
            )
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    duration = max(40, int(data.get("durationMs", 80)))
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=False,
    )
    return out_path
