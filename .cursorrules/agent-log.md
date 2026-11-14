# Agent log

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
