# Machine modes and display palettes

**Status:** Design contract; product UI shipped for C64 / C128 (40-col) / C128 (80-col VDC) / Plus/4. TED color text-grid remains a follow-up.  
**Audience:** Maintainers and coding agents. Read this before changing machine, palette, chrome, or Plus/4 color behavior.

For current drawing controls, see the [user guide](../README.md). For byte-level editor contracts, see the [maintainer reference](maintainer-reference.md). Track delivery on the [roadmap](roadmap.md).

## Goal

Add application-level **Machine** and **Display palette** controls for:

| Machine | Drawing colors | Glyphs |
| --- | --- | --- |
| Commodore 64 | VIC indices `0–15` | C64 atlas (`assets/c64-glyphs.svg`) |
| Commodore 128 (40-col) | VIC indices `0–15` | Same C64 atlas |
| Commodore 128 (80-col) | VDC RGBI indices `0–15` (`vdc-colors.js`) | Same C64 atlas (KERNAL copies VIC patterns into VDC) |
| Commodore Plus/4 | TED indices `0–120` (full 121-color palette) | TED atlas (`assets/ted-glyphs.svg`; hardware-inverse high halves) |

**Still follow-ups:** TED-capable color text-grid format; baking machine bezels into PNG/SVG/GIF; non-square cell aspect for canvas + raster exports (square cells remain for now — most visible at 80×25); repo-wide cleanup of bare `'c64'` / `'c128'` / `'plus4'` literals onto `MACHINE` / `INDEX_SPACE` constants (new 80-col paths already prefer the constants).

Exploratory MCP chrome demos live under `agents/petscii-preview/` and are **not** the product contract. Prefer this document.

## Product decisions

### App-level settings

- Machine and Display palette live in the **header**, peer to Project — not buried in sidebar Colors or Animation.
- They describe the **host computer and RGB presentation**, not a drawing tool stroke setting.

### Index spaces

- **C64 / C128:** cell inks and shared background are integers `0–15`.
- **Plus/4:** cell inks and shared background are TED indices `0–120` (black + chroma 1–15 × luma 0–7), using `plus4-colors.js`.
- VIC **Display palette** (Pepto, Colodore, VICE, RGB) remaps RGB for the same `0–15` indices. It does not rewrite cells.
- In Plus/4 mode the VIC display-palette control is hidden or disabled; drawing and still/animation RGB use the TED table.

### Persistence

- Optional v3 project fields: `machine` (`c64` | `c128` | `c128-80` | `plus4`, default `c64`) and `palette` (`pepto` | `colodore` | `vice` | `rgb`, default `pepto`).
- Missing fields on existing v3 files mean `c64` + `pepto`.
- Also store last Machine + Palette in a small device preference key (for example `petscii-workspace-prefs`) for New Project / fresh sessions.
- Reject unknown `machine` / `palette` values atomically. Color range validation **depends on** `machine` (VIC `0–15` vs TED `0–120`).

### Machine switch vs palette switch

- Changing VIC **display palette** only: not undoable; cells unchanged; swatches and image RGB update.
- Entering or leaving **Plus/4**: remaps brush, background, cell, and replay inks with `c64InkToTed` / `tedInkToC64` (chroma cousin; luma collapsed), and remaps glyph IDs with `c64GlyphToTed` / `tedGlyphToC64` (identity by character slot by default). That remap is **one undoable operation**.
- Confirm when crossing the VIC ↔ TED boundary.

### C128 (40-col)

- Same VIC indices and glyph sheet as C64.
- Product difference is label, **app chrome**, New Project color defaults, animation catalog scoping, and a **native C128 player** (BASIC 7.0 at `$1C01`, 40-col VIC).

### Native VIC export (C64 / C128)

- PRG/D64 available for `machine` `c64` or `c128` when all inks are `0–15` and size ≤ 40×25.
- **C64:** load `$0801`, `10 SYS2061`.
- **C128:** load `$1C01`, `10 SYS7181`, native 40-column mode (not GO64). Disables the IRQ screen-editor VIC rewrite (`$D8=$FF`) and mirrors `$D018` into `$0A2C`.
- Hidden or disabled in Plus/4 mode (TED cannot map to VIC color RAM).
- Canvas background drives both `$D020` and `$D021` (no separate border field yet).

### Image exports vs editor chrome

- Machine **UI chrome** (header, sidebar, stage, frame bezel, menus, dialogs) follows the selected machine.
- PNG / SVG / GIF / video / ZIP frames stay **artwork pixels only** — no READY banner and no bezel baked into downloads.

## UI sketch

```text
[☰] PETSCII Graphics Lab   [Machine ▾]  [Project ▾]  Saved…  [Download] [▶]
```

| Control | Choices |
| --- | --- |
| Machine | Commodore 64 · Commodore 128 (40-col) · Commodore Plus/4 |
| Display palette | Pepto PAL · Colodore · VICE · RGB (VIC machines only) |

Summary examples: `C64 · Pepto`, `Plus/4 · TED`.

### Ink UI

- VIC: flush 4×4 swatch tile grid (no gaps, borders, or chrome button styling), labels `0`–`F`, names from the active display palette.
- Plus/4: flush TED picker — black alone on the first row, then 15 chroma rows × 8 luma (`L0`–`L7`, names such as `Green L4`). Keeping black off the 8-wide band avoids shifting each chroma across two rows.
- Selection uses an inset contrast ring on the tile; swatches stay edge-to-edge so denser palettes remain compact.

### New Project defaults

- C64 / C128: ink light blue (14), background blue (6), unless chrome research revises C128 defaults.
- Plus/4: dark ink and light paper TED indices aligned with boot-screen references.

## App chrome and contrast

Set `data-machine="c64|c128|plus4"` on `document.documentElement`. Map to `data-ui-theme` (`c64`→`c64c`, `c128`, `plus4`) and let **CSS theme scopes** in `styles/editor.css` paint the shell. Semantic token roles are documented in [styles/README.md](../styles/README.md). Artwork brush colors stay on `--art-ink` / `--art-bg`.

`applyMachineChrome()` only sets machine/palette data attributes (and clears any legacy inline `--chrome-*` paints). It does **not** drive live shell colors.

### Chrome reference research

Boot / READY indices inform **drawing defaults** and case cues; physical case photos inform enclosure tokens.

**Locked seed indices / chrome cues (implementation):**

| Machine | Boot indices / TED (drawing) | Case cue (UI shell) | Sources |
| --- | --- | --- | --- |
| C64 | Border 14 (light blue), background 6 (blue), text 14 | Beige–brown case cue; ivory UI via `c64c` | KERNAL `$0E`/`$06`; Pepto RGB via active display palette |
| C128 (40-col) | Border 13 (light green), background 11 (dark gray), text 13 | Cooler gray/beige UI via `c128` | Cameron Kaiser / common 40-col description; C128 System Guide Appendix F |
| Plus/4 | Ink 0; paper bg TED white L5 (`tedIndex(1,5)`); pink border TED pink L4 | **Charcoal** UI `#2f2f2f` via `plus4` (light text) | TED READY paper is drawing default only; shell is charcoal, not paper panels |

App chrome **evokes** these machines via CSS tokens — it does not paste CRT READY banners into the header.

### Contrast strategy (iPad Safari)

Primary target is iPad Safari. Theme scopes set explicit `--text` / `--text-status` / field pairs and `color-scheme` per machine. Do not rely on `color-scheme` alone; Plus/4 charcoal uses light status and control text tokens.

## Color animation

Today’s product `plus4-*` effects are **Pepto-twin remappers**: VIC cell inks `0–15` expanded into TED RGB for derived frames while drawing stays Pepto.

With TED drawing, that bridge is wrong.

| Machine | Color effects | Frame RGB |
| --- | --- | --- |
| C64 / C128 | Existing VIC effects (`color-cycle`, `color-wave`, …) | Active display palette |
| Plus/4 | Keep ids `plus4-cycle` … `plus4-bonfire` for compatibility, but operate on **native TED cell inks** | TED RGB for all frames, including `colorEffect: 'none'` |

- Populate the Color animation list **contextually** by machine.
- When a machine switch makes the current effect unavailable, set `none` as part of the same undoable conversion.
- Retire the “C64 effect looked up in TED” mental model in help text once shipped.

## Architecture notes

Planned modules (names may match repo style when implemented):

- `machine-modes.js` — machine ids/labels, case cues, defaults, convert helpers, `applyMachineChrome()` (data attributes).
- `c64-colors.js` — Pepto + Colodore + VICE + RGB 16-color tables.
- `plus4-colors.js` — TED drawing + animation source; keep `c64InkToTed`; add `tedInkToC64`.
- `project-validation.js` — conditional ink ranges; optional `machine` / `palette`.
- `index.html` — header controls, machine-scoped swatches and animation lists; maps `data-ui-theme`.
- `styles/editor.css` — theme tokens and component surfaces under `html[data-ui-theme]`.
- `styles/shell.css` — compact layout / geometry (linked after `editor.css`).
- `animation-frames.js` — TED-native Plus/4 color passes and `ted-pal` tagging whenever `machine === 'plus4'`.

Product owns the JS source of truth. Do not dual-write Python MCP machine tables unless a later sync is requested.

## Export gates (first ship)

| Path | Behavior |
| --- | --- |
| PNG / SVG / GIF / video / ZIP | VIC: display-palette RGB. Plus/4: TED RGB. C128 80-col: RGBI (`vdc-pal`). ZIP `timing.json` must not hardcode `pepto-pal` when TED/VDC. |
| Color RAM `.bin` | VIC-only (C64 / C128 40-col). Disabled in Plus/4 and C128 80-col. |
| Native PRG/D64 | C64 / C128 40-col (`c64-export.js`) / C128 80-col (`c128-vdc-export.js`, BASIC `$1C01`, VDC handshake) / Plus/4 (`plus4-export.js`, BASIC `$1001`). |
| Text grid with colors | Hex nibble `0–F` means VIC ink on VIC machines and RGBI on C128 80-col. Disabled in Plus/4; glyph-only text remains OK. |

## Follow-ups

1. TED-capable color text-grid format.
2. Non-square cell aspect for canvas + raster exports (all machines; most visible at 80-col). See plan note in `.cursorrules/c128-80col-research.md`.
3. Repo-wide `MACHINE` / `INDEX_SPACE` literal cleanup (constants already used in machine-modes and new 80-col paths).
4. Extra VIC presets (DeeKay, Frodo, CCS64, NTSC variants).
5. Optional bezel in image exports; separate PRG border ink; MCP Python sync from JS.
6. Full VICE `xplus4` / `x128 -80col` smoke for native players (unit coverage exists today).

## Shipped behavior

- Header **Machine** menu with C64 / C128 (40-col) / C128 (80-col) / Plus/4 and VIC **Display palette** (Pepto / Colodore / VICE / RGB; hidden for TED and VDC).
- Shell paints via CSS `data-ui-theme` scopes; Plus/4 shell is charcoal with light text (drawing defaults remain TED paper indices); C128 80-col reuses the C128 shell theme with RGBI drawing colors.
- Plus/4 drawing uses TED indices `0–120` and TED glyph atlas; C128 80-col uses RGBI `0–15` and the C64 glyph atlas up to **80 × 25**; crossing VIC / TED / VDC remaps inks (and glyphs for TED) undoably.
- Contextual color-animation lists; native PRG/D64 for all four machines; color RAM `.bin` VIC-only; color text enabled for VIC and VDC.
- Unit: `tests/machine-modes.unit.mjs`, `tests/plus4-colors.unit.mjs`, `tests/vdc-colors.unit.mjs`, `tests/c128-vdc-export.unit.mjs`. Chromium Playwright: `tests/machine-modes.spec.cjs` + theme mapping coverage in `tests/ui-theme.spec.cjs` (run on GitHub Actions).
- Machine appearance maps onto `data-ui-theme` (`c64`→`c64c`, `c128` / `c128-80`→`c128`, `plus4`); there is no separate Interface look control.
- Editor cells remain square for now; aspect-ratio UI is a tracked follow-up.
