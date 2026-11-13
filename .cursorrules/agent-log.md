# Agent log

## 2026-11-13 — CSS chrome cleanup

**What:** Token-first shell chrome under `html[data-ui-theme]`. Plus/4 charcoal locked; JS `applyMachineChrome()` no longer writes unused `--chrome-*` paints; dialog status / glyph keys / selects / symmetry use semantic tokens; ivory hex locks removed from injected `index.html` style.

**Touched:** `styles/editor.css`, `styles/README.md`, `machine-modes.js`, `docs/machine-modes.md`, `index.html`, unit + Playwright theme/machine specs.

**Tested:** `node --test tests/machine-modes.unit.mjs tests/ui-themes.unit.mjs` (pass). Local Playwright Chromium missing browsers — rely on GitHub Actions.
