# C64 vs TED glyph atlas diff

Captured 2026-11-14; bank‑1 authenticity fix same day (2 KB TED chargen, not 4 KB kernal).

## Policy

- **Identity by atlas ID** on machine switch (`glyph-map.js`). Same screen-code slot; pixels may differ.
- Exception maps are only for layout mismatches (none today). Do not remap IDs to chase visual similarity.
- TED codes 128–255 are **hardware XOR** of 0–127 (default text mode), not C64 soft-inverse ROM.

## TED chargen provenance

Plus/4 / C16 kernal `318005-05` maps a **2 KB** character generator at `$D000` (offset `0x1000` in the 16 KB dump):

| Half | Bytes | Editor bank |
| --- | --- | --- |
| Uppercase / graphics | first 1 KB (128 shapes) | bank 0 (+ HW inverse → 256) |
| Lowercase / upper | second 1 KB (128 shapes) | bank 1 (+ HW inverse → 256) |

Case switch on hardware is `$FF13` half-page paging (same two 1 KB halves). Extracting **4 KB** from `0x1000` pulled KERNAL code into “bank 1” — that was wrong and is fixed. Source SHA-256 of the 2 KB chargen: `978c07ee0c9c30ad7fa2193e64e4196da8d10d614554132741f0033d1a0872a8`.

## Fingerprints

| Sheet | Display atlas SHA-256 |
| --- | --- |
| C64 | `fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420` |
| TED | `279b70a29c84aee936db10dbe8d797600ab2fb4f39807bef738f9affa7d5cf2e` |

## Diff summary (512 atlas IDs)

| | Count |
| --- | ---: |
| Identical bits | **478** |
| Differing bits | **34** |

### Where they differ

1. **Atlas ID 128** (and **384** in bank 1) — C64 keeps the ROM soft-inverse `@` one-bit quirk; TED synthesizes a true `row ^ 0xFF` of code 0.
2. **33 other bank‑1 IDs** — a handful of lowercase-set punctuation / graphics slots (and their hardware inverses) where TED and C64 ROMs genuinely diverge. Letters such as lowercase `a` (atlas 257) match.

### Where they match

- Bank 0 codes **0–127** (uppercase / graphics alphabet).
- Bank 0 inverses **129–255** as a consequence of TED XOR + C64 soft-inverse (except `@` above).
- Most of bank 1 lowercase alphabet and its inverses.

## Locked expectation

`tests/ted-glyphs.unit.mjs` asserts the differing set and the TED hardware-inverse contract. Rebuilds that change this set fail CI.

## Chooser note

**Grouped by shape** may list unique bank-1 stamps as `1xx` hex atlas IDs. Those are alternate-set tiles (and inverses), not an Asian character set — dense 8×8 PETSCII can look ideogram-like at a glance.
