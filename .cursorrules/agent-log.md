# Agent log

## 2026-11-13 — C128 80-col (VDC) editor + native player

**What:** Machine `c128-80` with RGBI drawing (`vdc-colors.js`), 80×25 canvas, VIC↔VDC ink remap, C64 glyph atlas. Native PRG/D64 via `c128-vdc-export.js` (`$1C01`, VDC `$D600` handshake, restore pre-RUN 40/80 on STOP). `MACHINE` / `INDEX_SPACE` constants in `machine-modes.js` and new/touched 80-col paths; repo-wide literal cleanup and non-square cell aspect left as follow-ups.

**Touched:** `vdc-colors.js`, `c128-vdc-export.js`, `machine-modes.js`, `glyph-map.js`, `ui-themes.js`, `project-validation.js`, `text-grid.js`, `animation-frames.js`, `index.html`, docs, `tests/vdc-colors.unit.mjs`, `tests/c128-vdc-export.unit.mjs`, `tests/machine-modes.unit.mjs`, `tests/machine-modes.spec.cjs`, `tests/ui-themes.unit.mjs`.

**Tested:** `node --test` vdc-colors / c128-vdc-export / machine-modes / ui-themes (and related). Playwright Chromium via CI for machine-modes 80-col case. Manual VICE `x128 -80col` still open.

## 2026-11-13 — Plus/4 TED glyphs + native player

**What:** Plus/4 mode draws with `assets/ted-glyphs.svg` (TED ROM + hardware-inverse high halves). VIC↔TED switch remaps inks and glyphs (`glyph-map.js`) in one undo. Native PRG/D64 via `plus4-export.js` (`$1001`, TED ROM path; RAM charset `@$F000` when mixed banks). `tedToAttr`/`attrToTed`. Color RAM `.bin` still VIC-only.

**Touched:** `assets/ted-glyphs.svg`, `scripts/build_glyphs.py`, `glyph-map.js`, `plus4-export.js`, `plus4-colors.js`, `c64-export.js` (`basicSysStub` export), `index.html`, docs, `tests/glyph-map.unit.mjs`, `tests/plus4-export.unit.mjs`, `tests/machine-modes.spec.cjs`.

**Tested:** `node --test` glyph-map / plus4-export / plus4-colors / machine-modes / c128-export (pass). Playwright via CI.

## 2026-11-13 — Undo canvas redraw

**Cause:** `restore()` called only `fit()`; `fit()` early-returns without `redraw()` when size/`W×H` unchanged (ResizeObserver guard from #96).  
**Fix PR:** [#104](https://github.com/funkatron/petscii-graphics-lab/pull/104) — `fit();redraw();`. Plus/4 WIP also calls `selectActiveRom()` on restore.

## 2026-11-13 — C128 80-col (VDC) research

**Saved:** [c128-80col-research.md](./c128-80col-research.md). Recommend editor-first 80×25 + RGBI; reuse C64 atlas; native player later via `$D600` handshake. Open owner questions listed in that note.

## 2026-11-13 — Native C128 player

**What:** C128 machine downloads a native 40-col player (BASIC `$1C01` / SYS 7181), not GO64. Same VIC frame stream as C64; disables C128 IRQ editor VIC rewrites (`$D8`); mirrors `$D018`→`$0A2C`. UI tab renamed Native program; labels follow Machine. Bg still drives border.

**Touched:** `c64-export.js`, `index.html`, `tests/c128-export.unit.mjs`, `docs/c64-output.md`, `docs/machine-modes.md`, `docs/maintainer-reference.md`.

**Tested:** `node --test tests/c128-export.unit.mjs tests/machine-modes.unit.mjs` (pass; py65 still/emulate). Local Playwright skipped to limit RAM — rely on GitHub Actions.

## 2026-11-13 — TED palette row wrap

**What:** Black was cell 1 of an 8-column TED grid, so each chroma×luma band shifted and wrapped. Black now spans row 1 alone (one tile wide); chroma rows stay L0–L7. Sidebar + Brush ink popover share `.ted-grid`.

**Touched:** `styles/editor.css`, `tests/machine-modes.spec.cjs`, `docs/machine-modes.md`.

## 2026-11-13 — CSS legacy cleanup

**What:** Collapse dead early/override layers in `editor.css`; make `shell.css` geometry-first (drop color `!important` wars); unify pressed keys on `--key-active` / `--text-on-accent`. Keep shell.css separate for future theming.

## 2026-11-13 — Extract injected CSS to shell.css

**What:** Moved the runtime `createElement('style')` block from `index.html` into `styles/shell.css`, linked after `editor.css`. No visual change intended.

## 2026-11-13 — Wider sidebar for TED 8-across

**What:** Desktop sidebar 276→300px; mid-width 260→280px; overlay/popover caps 310→320px so Plus/4 TED rows keep eight flush tiles. VIC 4×4 only gets slightly larger swatches.

**Touched:** `styles/editor.css`, `index.html`, `tests/machine-modes.spec.cjs`.

## 2026-11-13 — CSS chrome cleanup

**What:** Token-first shell chrome under `html[data-ui-theme]`. Plus/4 charcoal locked; JS `applyMachineChrome()` no longer writes unused `--chrome-*` paints; dialog status / glyph keys / selects / symmetry use semantic tokens; ivory hex locks removed from injected `index.html` style.

**Touched:** `styles/editor.css`, `styles/README.md`, `machine-modes.js`, `docs/machine-modes.md`, `index.html`, unit + Playwright theme/machine specs.

**Tested:** `node --test tests/machine-modes.unit.mjs tests/ui-themes.unit.mjs` (pass). Local Playwright Chromium missing browsers — rely on GitHub Actions.
