"""Machine mode chrome for shared C64-family PETSCII glyphs."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MachineMode:
    id: str
    label: str
    border: tuple[int, int, int]
    background: tuple[int, int, int]
    foreground: tuple[int, int, int]
    columns: int = 40
    rows: int = 25
    glyph_bank: int = 0
    banner: tuple[str, ...] = ()


# Pepto-ish C64 blues; Plus/4 approximates TED light gray/black defaults.
MACHINES: dict[str, MachineMode] = {
    "c64": MachineMode(
        id="c64",
        label="Commodore 64",
        border=(0x78, 0x69, 0xC4),
        background=(0x40, 0x31, 0x8D),
        foreground=(0x7A, 0xBF, 0xC7),
        banner=(
            "    **** COMMODORE 64 BASIC V2 ****",
            "",
            " 64K RAM SYSTEM  38911 BASIC BYTES FREE",
            "",
            "READY.",
        ),
    ),
    "c128": MachineMode(
        id="c128",
        label="Commodore 128 (40-col)",
        # Same VIC-II family; slightly cooler border to read as "128".
        border=(0x6C, 0x5E, 0xB5),
        background=(0x35, 0x28, 0x79),
        foreground=(0x9A, 0xD9, 0xE0),
        banner=(
            "   **** COMMODORE 128 BASIC V7.0 ****",
            "",
            "     122365 BYTES FREE",
            "",
            "READY.",
        ),
    ),
    "plus4": MachineMode(
        id="plus4",
        label="Commodore Plus/4",
        border=(0xC8, 0xC8, 0xC8),
        background=(0xE8, 0xE8, 0xE0),
        foreground=(0x10, 0x10, 0x10),
        banner=(
            "  **** COMMODORE PLUS/4 BASIC V3.5 ****",
            "",
            " 60671 BYTES FREE",
            "",
            "READY.",
        ),
    ),
}


def get_machine(machine_id: str) -> MachineMode:
    key = machine_id.strip().lower().replace("plus-4", "plus4").replace("c-128", "c128")
    if key not in MACHINES:
        known = ", ".join(sorted(MACHINES))
        raise KeyError(f"unknown machine {machine_id!r}; expected one of: {known}")
    return MACHINES[key]
