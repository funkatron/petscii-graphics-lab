"""Load C64 PETSCII glyph bitmaps from assets/c64-glyphs.svg."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_GLYPH_SVG = REPO_ROOT / "assets" / "c64-glyphs.svg"

RECT_RE = re.compile(
    r'<rect\s+x="(?P<x>\d+)"\s+y="(?P<y>\d+)"\s+width="(?P<w>\d+)"\s+height="(?P<h>\d+)"\s*/>'
)
SYMBOL_RE = re.compile(
    r'<symbol id="c64-(?P<bank>\d+)-(?P<code>\d+)"[^>]*>(?P<body>.*?)</symbol>',
    re.DOTALL,
)


def parse_glyph_pixels(body: str) -> list[tuple[int, int]]:
    """Return lit pixel coordinates for one 8x8 glyph body."""
    pixels: list[tuple[int, int]] = []
    for match in RECT_RE.finditer(body):
        x0 = int(match.group("x"))
        y0 = int(match.group("y"))
        width = int(match.group("w"))
        height = int(match.group("h"))
        for y in range(y0, y0 + height):
            for x in range(x0, x0 + width):
                if 0 <= x < 8 and 0 <= y < 8:
                    pixels.append((x, y))
    return pixels


@lru_cache(maxsize=2)
def load_glyph_banks(svg_path: str | None = None) -> tuple[list[list[tuple[int, int]]], ...]:
    """
    Load both 256-glyph banks.

    Bank 0 = uppercase/graphics, bank 1 = lowercase/uppercase.
    Each glyph is a list of lit (x, y) pixels.
    """
    path = Path(svg_path) if svg_path else DEFAULT_GLYPH_SVG
    text = path.read_text(encoding="utf-8")
    banks: list[list[list[tuple[int, int]]]] = [
        [[] for _ in range(256)],
        [[] for _ in range(256)],
    ]

    for match in SYMBOL_RE.finditer(text):
        bank = int(match.group("bank"))
        code = int(match.group("code"))
        if bank not in (0, 1) or not (0 <= code < 256):
            continue
        banks[bank][code] = parse_glyph_pixels(match.group("body"))

    return tuple(banks)


def ascii_to_screen_code(ch: str, bank: int = 0) -> int:
    """
    Map a single printable character to a C64 screen code.

    For bank 0 (uppercase/graphics): letters become uppercase screen codes.
    For bank 1 (lowercase/uppercase): lowercase letters use codes 1-26,
    uppercase letters use 65-90 style via PETSCII-ish mapping.
    """
    if len(ch) != 1:
        raise ValueError("expected a single character")

    codepoint = ord(ch)

    if ch == "\n":
        return 32
    if ch == "@":
        return 0
    if ch == "[":
        return 27
    if ch == "]":
        return 29
    if ch == "^":
        return 30
    if ch == "_":
        return 31
    if ch == " ":
        return 32

    if bank == 0:
        if "a" <= ch <= "z":
            return ord(ch) - ord("a") + 1
        if "A" <= ch <= "Z":
            return ord(ch) - ord("A") + 1
        if 33 <= codepoint <= 63:
            return codepoint
        return 32

    # bank 1: lowercase/uppercase
    if "a" <= ch <= "z":
        return ord(ch) - ord("a") + 1
    if "A" <= ch <= "Z":
        return ord(ch) - ord("A") + 65
    if 33 <= codepoint <= 63:
        return codepoint
    return 32


def parse_screen_cell(token: str, bank: int = 0) -> int:
    """
    Parse one cell token.

    - plain char: "A"
    - hex screen code: "#70" or "0x70"
    - decimal screen code: "112"
    - reverse video: prefix "!" e.g. "!A" or "!#70"
    """
    reverse = False
    raw = token
    if raw.startswith("!"):
        reverse = True
        raw = raw[1:]

    if raw.startswith("#"):
        code = int(raw[1:], 16)
    elif raw.startswith("0x") or raw.startswith("0X"):
        code = int(raw, 16)
    elif raw.isdigit() and len(raw) > 1:
        code = int(raw, 10)
    elif len(raw) == 1:
        code = ascii_to_screen_code(raw, bank=bank)
    else:
        raise ValueError(f"unsupported cell token: {token!r}")

    code &= 0x7F
    if reverse:
        code |= 0x80
    return code


def lines_to_screen(
    lines: list[str],
    *,
    columns: int = 40,
    rows: int = 25,
    bank: int = 0,
    fill: int = 32,
) -> list[list[int]]:
    """
    Convert text lines into a rows x columns screen-code grid.

    Each line may use spaces as separators for multi-character tokens only when
    using explicit codes. For normal text, pass plain strings; each character
    becomes one cell. Explicit codes can be embedded as {{#70}} or {{112}}.
    """
    grid = [[fill for _ in range(columns)] for _ in range(rows)]
    token_re = re.compile(r"\{\{(!?(?:#|0x|0X)?[0-9A-Fa-f]+|[!-~])\}\}|.")

    for y, line in enumerate(lines[:rows]):
        x = 0
        for match in token_re.finditer(line):
            if x >= columns:
                break
            group = match.group(0)
            if group.startswith("{{") and group.endswith("}}"):
                cell = parse_screen_cell(group[2:-2], bank=bank)
            else:
                cell = ascii_to_screen_code(group, bank=bank)
            grid[y][x] = cell
            x += 1
    return grid
