# Agent log

## 2026-11-14 — MACHINE id cleanup

**What:** Production host checks use `MACHINE` and `isTedMachine` / `isVdcMachine`. Emitted ids are unchanged. HTML options, the pre-module boot map, and test fixtures stay the string ids.  
**Touched:** `c64-export.js`, `plus4-export.js`, `c128-vdc-export.js`, `project-validation.js`, `animation-frames.js`, `ui-themes.js`, `index.html` comment, roadmap, machine-modes.

## 2026-11-14 — Cell shape Phase B (CRT rasters)

**What:** PNG, SVG, GIF, video, ZIP frames, and the download preview use the same Square/CRT cell shape as the editor. VIC/TED CRT is 5×6; VDC is 5×12. Full-screen presets land on 400×300 and 800×600 at PNG scale 1. Native PRG/D64 stay square-cell.  
**Touched:** `index.html`, machine-modes spec, AGENTS, machine-modes, roadmap, cell-aspect brief.

## 2026-11-14 — Memory DRY + TED bank‑1 authenticity + readiness smoke

**What:** TED atlas rebuilt from authentic **2 KB** kernal chargen (1 KB upper + 1 KB lower; HW inverse per bank). Prior 4 KB extract had pulled KERNAL into bank 1. `plus4-export` / `c128-vdc-export` import `nativeMemoryLimit()`. Readiness smoke asserts Plus/4 `60,671` and C128 80-col `58,109` in the download panel. Glyph helper stays in `tests/`.  
**Touched:** `scripts/build_glyphs.py`, `assets/ted-glyphs.svg`, `tests/ted-glyphs.unit.mjs`, `tests/glyph-svg-bits.mjs`, `.cursorrules/c64-ted-glyph-diff.md`, `plus4-export.js`, `c128-vdc-export.js`, `tests/machine-modes.spec.cjs`, `scripts/ci-select-tests.cjs`, maintainer-reference / roadmap.

## 2026-11-14 — Cell shape Square / CRT (editor Phase A)

**What:** `#workspaceCellAspect` in Machine menu; device pref; `fit()` uses VIC/TED 5∶6 or VDC 5∶12 for CRT. Native PRG/D64 and rasters unchanged.  
**Touched:** `machine-modes.js`, `index.html`, machine-modes unit/spec, AGENTS/roadmap/machine-modes docs.

## 2026-11-14 — CI: py65 for c64/unified focused specs

**What:** Focused runs that touch `tests/c64.spec.cjs` / `unified.spec.cjs` need py65; expand `PY65_SPECS` beyond the old export-only list.

## 2026-11-14 — Inverse pulse → Color animation

**What:** Moved Inverse pulse from Movement into Color (`colorEffect:'inverse'`). Legacy `effect:'inverse'` migrates on load. Stacks with true movement; no longer stacks with other color ramps.  
**Touched:** `project-validation.js`, `animation-frames.js`, `index.html`, animation/c64/unified/frames/cell-colors tests, roadmap/README/maintainer-reference.

## 2026-11-14 — CI: install FFmpeg when video specs are focused

**What:** Focused Playwright could select `animation-controls` (via `project-validation.js`) without installing `ffprobe`/`ffmpeg`. Selector now emits `ffmpeg`/`py65` tool flags; workflow installs them separately.  
**Touched:** `scripts/ci-select-tests.cjs`, `.github/workflows/ci.yml`, `tests/ci-selection.unit.mjs`.

## 2026-11-14 — Cell aspect: PRG stays hardware-true

**What:** Owner: do **not** change aspect ratio in native PRG/D64. Cell shape is editor (+ optional raster) only.  
**Updated:** [cell-aspect-toggle.md](./cell-aspect-toggle.md), `docs/roadmap.md`.

## 2026-11-14 — Cell aspect / CRT proportion toggle research

**What:** Exploration only — square vs CRT cell shape for editor (and optional exports). VIC/TED **5∶6**, VDC **5∶12**; control in `#machineMenu`; device pref; default square.  
**Saved:** [cell-aspect-toggle.md](./cell-aspect-toggle.md). Linked from `docs/roadmap.md`.

## 2026-11-14 — Application-like UI IA implementation

**What:** System/Project/Editor header groups; sidebar “Editor settings”; Machine persistence (missing → keep current; New Project writes current); import cross-links; compact save status; Animation settings from preview banner.  
**Docs:** `docs/ui-review.md`, README Find a control, `docs/machine-modes.md` Persistence, roadmap, maintainer-reference. Brief: [app-like-ui-ia.md](./app-like-ui-ia.md).

## 2026-11-14 — Application-like UI IA exploration

**What:** Exploration only — map chrome to System / Project / Editor / Modal layers; placement recs; open product questions; phased IA PRs.  
**Saved:** [app-like-ui-ia.md](./app-like-ui-ia.md).

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
