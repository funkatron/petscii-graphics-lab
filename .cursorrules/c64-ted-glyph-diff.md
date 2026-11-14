# C64 vs TED glyph atlas diff

Captured 2026-11-14 from shipped `assets/c64-glyphs.svg` and `assets/ted-glyphs.svg`.

## Policy

- **Identity by atlas ID** on machine switch (`glyph-map.js`). Same screen-code slot; pixels may differ.
- Exception maps are only for layout mismatches (none today). Do not remap IDs to chase visual similarity.
- TED codes 128–255 are **hardware XOR** of 0–127 (default text mode), not C64 soft-inverse ROM.

## Fingerprints

| Sheet | Display atlas SHA-256 |
| --- | --- |
| C64 | `fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420` |
| TED | `1bc59062292b207e0e0cd6da35503a2334ff7dec462a7bc6aec021ddde16fed4` |

## Diff summary (512 atlas IDs)

| | Count |
| --- | ---: |
| Identical bits | **255** |
| Differing bits | **257** |

### Where they differ

1. **Atlas ID 128 only** in bank 0 — C64 keeps the ROM soft-inverse `@` one-bit quirk; TED synthesizes a true `row ^ 0xFF` of code 0.
2. **Entire bank 1 (IDs 256–511)** — TED alternate / text set. Same slots as C64 lowercase bank, different pixels (including inverses of that bank). Intentional ROM truth, not a mapping bug.

### Where they match

- Bank 0 codes **0–127** (uppercase / graphics alphabet) — shared C64/TED/C128-family look.
- Bank 0 inverses **129–255** match as a consequence of TED XOR + C64 soft-inverse (except the `@` pair above).

## Locked expectation

`tests/ted-glyphs.unit.mjs` asserts the differing set equals `[128, ...256..511]` and the TED hardware-inverse contract. Rebuilds that change this set fail CI.

## Chooser note

**Grouped by shape** may list unique bank-1 stamps as `1xx` hex atlas IDs. Those are alternate-set tiles (and inverses), not an Asian character set — dense 8×8 PETSCII can look ideogram-like at a glance.
