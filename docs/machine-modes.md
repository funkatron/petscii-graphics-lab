# Machine modes and display palettes

**Status:** Design contract; product UI shipped (C64/C128/Plus4 machine modes). C128 80-col and TED text-grid remain follow-ups.  
**Audience:** Maintainers and coding agents. Read this before changing machine, palette, chrome, or Plus/4 color behavior.

For current drawing controls, see the [user guide](../README.md). For byte-level editor contracts, see the [maintainer reference](maintainer-reference.md). Track delivery on the [roadmap](roadmap.md).

## Goal

Add application-level **Machine** and **Display palette** controls for:

| Machine | Drawing colors | Glyphs (first ship) |
| --- | --- | --- |
| Commodore 64 | VIC indices `0–15` | Shared C64 atlas |
| Commodore 128 (40-col) | VIC indices `0–15` | Same shared C64 atlas |
| Commodore Plus/4 | TED indices `0–120` (full 121-color palette) | Same shared C64 atlas |

**Out of scope for the first implementation:** C128 80-column (VDC) mode, TED-capable color text-grid format, Plus/4 native program export, baking machine bezels into PNG/SVG/GIF.

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

- Optional v3 project fields: `machine` (`c64` | `c128` | `plus4`, default `c64`) and `palette` (`pepto` | `colodore` | `vice` | `rgb`, default `pepto`).
- Missing fields on existing v3 files mean `c64` + `pepto`.
- Also store last Machine + Palette in a small device preference key (for example `petscii-workspace-prefs`) for New Project / fresh sessions.
- Reject unknown `machine` / `palette` values atomically. Color range validation **depends on** `machine` (VIC `0–15` vs TED `0–120`).

### Machine switch vs palette switch

- Changing VIC **display palette** only: not undoable; cells unchanged; swatches and image RGB update.
- Entering or leaving **Plus/4**: remaps brush, background, cell, and replay inks with `c64InkToTed` / `tedInkToC64` (chroma cousin; luma collapsed). That remap is **one undoable operation**. Glyphs stay put.
- Confirm when crossing the VIC ↔ TED boundary.

### C128 (40-col)

- Same VIC indices and glyph sheet as C64.
- Product difference is label, **app chrome**, New Project color defaults, and animation catalog scoping — not a separate exporter in the first ship.

### Native C64 export

- PRG/D64 remain available for `machine` `c64` or `c128` when all inks are `0–15` and size ≤ 40×25.
- Hidden or disabled in Plus/4 mode (TED cannot map to VIC color RAM).
- Keep current player behavior: `$D020` and `$D021` both use the shared background index (no separate border field yet).

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
- Plus/4: flush TED picker — black plus 15 chroma × 8 luma (accessible names such as `Green L4`).
- Selection uses an inset contrast ring on the tile; swatches stay edge-to-edge so denser palettes remain compact.

### New Project defaults

- C64 / C128: ink light blue (14), background blue (6), unless chrome research revises C128 defaults.
- Plus/4: dark ink and light paper TED indices aligned with boot-screen references.

## App chrome and contrast

Set `data-machine="c64|c128|plus4"` on `document.documentElement` and drive the shell from CSS variables, for example:

| Token | Role |
| --- | --- |
| `--chrome-bg` | App / stage wash |
| `--chrome-panel` | Header, sidebar, strip, menus, dialogs |
| `--chrome-panel-2` | Recessed wells / canvas frame outer |
| `--chrome-border` | Dividers and control borders |
| `--chrome-fg` | Primary UI text and icons |
| `--chrome-muted` | Secondary notes / status |
| `--chrome-accent` | Active / pressed emphasis |
| `--art-ink` / `--art-bg` | Existing artwork brush variables |

### Chrome reference research

Before locking CSS seeds, collect:

1. Boot / READY screen references (primary cue).
2. Physical case and keyboard photos (secondary accent cue).
3. Authoritative KERNAL / COLOR defaults when photos disagree.

**Locked seed indices / chrome cues (implementation):**

| Machine | Boot indices / TED | Case cue | Sources |
| --- | --- | --- | --- |
| C64 | Border 14 (light blue), background 6 (blue), text 14 | Beige–brown `#6b5428` | KERNAL `$0E`/`$06`; Pepto RGB via active display palette |
| C128 (40-col) | Border 13 (light green), background 11 (dark gray), text 13 | Dark gray `#3a3a3a` | Cameron Kaiser / common 40-col description; C128 System Guide Appendix F (default text light green) |
| Plus/4 | Ink 0; paper bg TED white L5 (`tedIndex(1,5)`); pink bezel TED pink L4 | Dark gray `#2f2f2f` | Plus/4 paper READY + pink border reports; TED exploratory RGB |

App chrome **evokes** these machines via CSS tokens resolved in `machine-modes.js` — it does not paste CRT READY banners into the header.

### Contrast strategy (iPad Safari)

Primary target is iPad Safari. CSS `contrast-color()` is only available in Safari / iOS 26+, so it must not be the sole mechanism.

1. On machine (and VIC palette) change, JavaScript resolves theme seeds and computes readable foregrounds with relative luminance, writing `--chrome-fg` / muted / border as concrete values.
2. Prefer `color-mix()` (Safari iOS 16.2+) for hovers, pressed states, and border tints.
3. Optional progressive enhancement with `@supports (color: contrast-color(red))` is fine; JS-computed tokens remain the source of truth.

Do not rely on `color-scheme` alone for Plus/4. Explicit fg/bg pairs keep form controls and `currentColor` icons correct on paper-light chrome.

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

- `machine-modes.js` — machine ids/labels, chrome seeds, defaults, convert helpers, `applyMachineChrome()`.
- `c64-colors.js` — Pepto + Colodore + VICE + RGB 16-color tables.
- `plus4-colors.js` — TED drawing + animation source; keep `c64InkToTed`; add `tedInkToC64`.
- `project-validation.js` — conditional ink ranges; optional `machine` / `palette`.
- `index.html` — header controls, chrome tokens, machine-scoped swatches and animation lists.
- `animation-frames.js` — TED-native Plus/4 color passes and `ted-pal` tagging whenever `machine === 'plus4'`.

Product owns the JS source of truth. Do not dual-write Python MCP machine tables unless a later sync is requested.

## Export gates (first ship)

| Path | Behavior |
| --- | --- |
| PNG / SVG / GIF / video / ZIP | VIC: display-palette RGB. Plus/4: TED RGB. ZIP `timing.json` must not hardcode `pepto-pal` when TED. |
| Color RAM `.bin` and C64 PRG/D64 | Disabled in Plus/4 mode. |
| Text grid with colors | Current format is one hex nibble `0–F`. Disable “Include colors in text” in Plus/4; glyph-only text remains OK. |

## Follow-ups

1. C128 80-column (VDC glyphs, 80×25, editor width limit today is 40).
2. TED-capable color text-grid format.
3. Extra VIC presets (DeeKay, Frodo, CCS64, NTSC variants).
4. Optional bezel in image exports; separate PRG border ink; MCP Python sync from JS.
5. True Plus/4 native program export (if ever).

## Shipped behavior

- Header **Machine** menu with C64 / C128 (40-col) / Plus/4 and VIC **Display palette** (Pepto / Colodore / VICE / RGB).
- App chrome tokens via `applyMachineChrome()`; Plus/4 uses dark foreground on paper panels.
- Plus/4 drawing uses TED indices `0–120`; entering/leaving Plus/4 remaps inks (undoable).
- Contextual color-animation lists; C64 PRG/D64 and color text disabled in Plus/4 mode.
- Unit: `tests/machine-modes.unit.mjs`, `tests/plus4-colors.unit.mjs`. Chromium Playwright: `tests/machine-modes.spec.cjs` + theme mapping coverage in `tests/ui-theme.spec.cjs` (run on GitHub Actions).
- Machine appearance maps onto `data-ui-theme` (`c64`→`c64c`, `c128`, `plus4`); there is no separate Interface look control.
