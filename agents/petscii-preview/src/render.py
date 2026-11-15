"""Render PETSCII screens with shared C64 glyphs and machine chrome."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

from glyphs import load_glyph_banks, lines_to_screen
from machines import MachineMode, get_machine

DEMO_UI = (
    "",
    " {{#70}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#6e}}",
    " {{#5d}}  PETSCII LAB     {{#5d}}",
    " {{#5d}}  MACHINE PREVIEW{{#5d}}",
    " {{#6d}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#64}}{{#7d}}",
    "",
    " {{#7e}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#77}}{{#6c}}",
    " {{#a0}} WAVE  PULSE     {{#a0}}",
    " {{#a0}} CUTOFF ####.... {{#a0}}",
    " {{#a0}} RES    ##...... {{#a0}}",
    " {{#7c}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#6f}}{{#7f}}",
)


def blit_glyph(
    img: Image.Image,
    pixels: list[tuple[int, int]],
    origin_x: int,
    origin_y: int,
    scale: int,
    color: tuple[int, int, int],
) -> None:
    draw = ImageDraw.Draw(img)
    for px, py in pixels:
        x0 = origin_x + px * scale
        y0 = origin_y + py * scale
        draw.rectangle([x0, y0, x0 + scale - 1, y0 + scale - 1], fill=color)


def render_screen(
    machine: MachineMode | str,
    lines: list[str] | None = None,
    *,
    scale: int = 3,
    border_chars: int = 3,
    include_banner: bool = True,
    cursor: bool = True,
    glyph_svg: str | None = None,
) -> Image.Image:
    mode = get_machine(machine) if isinstance(machine, str) else machine
    banks = load_glyph_banks(glyph_svg)
    glyphs = banks[mode.glyph_bank]

    content_lines: list[str] = []
    if include_banner:
        content_lines.extend(mode.banner)
    if lines is None:
        content_lines.extend(DEMO_UI)
    else:
        content_lines.extend(lines)

    grid = lines_to_screen(
        content_lines,
        columns=mode.columns,
        rows=mode.rows,
        bank=mode.glyph_bank,
    )

    if cursor:
        # Place a reverse-space cursor after READY. style prompt area.
        for y, row in enumerate(grid):
            row_text = "".join(chr(32) if c == 32 else "?" for c in row)
            # Find first empty line after content and put cursor on READY line end.
            _ = row_text
        ready_y = None
        for y, line in enumerate(content_lines):
            if line.startswith("READY"):
                ready_y = y
                break
        if ready_y is not None and ready_y < mode.rows:
            x = min(len(content_lines[ready_y]), mode.columns - 1)
            grid[ready_y][x] = 32 | 0x80

    border_px = border_chars * 8 * scale
    width = border_px * 2 + mode.columns * 8 * scale
    height = border_px * 2 + mode.rows * 8 * scale
    img = Image.new("RGB", (width, height), mode.border)
    screen = Image.new("RGB", (mode.columns * 8 * scale, mode.rows * 8 * scale), mode.background)

    for y in range(mode.rows):
        for x in range(mode.columns):
            code = grid[y][x]
            pixels = glyphs[code]
            blit_glyph(
                screen,
                pixels,
                x * 8 * scale,
                y * 8 * scale,
                scale,
                mode.foreground,
            )

    img.paste(screen, (border_px, border_px))
    return img


def render_mode_animation(
    machines: list[str] | None = None,
    *,
    scale: int = 2,
    hold_frames: int = 12,
    out_path: Path | None = None,
) -> Path:
    ids = machines or ["c64", "c128", "plus4"]
    # GIF writers coalesce identical consecutive frames, so store unique
    # frames with explicit hold durations instead of repeating pixels.
    frame_ms = 80
    frames: list[Image.Image] = []
    durations: list[int] = []
    for machine_id in ids:
        frame = render_screen(machine_id, scale=scale, cursor=True)
        frames.append(frame)
        durations.append(hold_frames * frame_ms)
        blink = render_screen(machine_id, scale=scale, cursor=False)
        frames.append(blink)
        durations.append(4 * frame_ms)

    path = out_path or Path(__file__).resolve().parents[1] / "out" / "mode-switch.gif"
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=False,
    )
    return path


def save_machine_stills(out_dir: Path | None = None, scale: int = 3) -> list[Path]:
    directory = out_dir or Path(__file__).resolve().parents[1] / "out"
    directory.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for machine_id in ("c64", "c128", "plus4"):
        img = render_screen(machine_id, scale=scale)
        path = directory / f"{machine_id}-demo.png"
        img.save(path)
        paths.append(path)
    return paths
