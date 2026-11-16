# Agent log

## 2026-11-15 — Agent log catch-up and MCP backdrop docs

**What:** Logged missing **0.31.0** release notes. Corrected the **0.30.0** entry to describe historical behavior (superseded by stacking in 0.31.0). MCP bridges now pass `backgroundEffect` / backdrop ramp fields through `animation-source.mjs`; `list_effects` exposes `backgroundEffects` and `fieldRamps`; README documents stacked layers and `backgroundEffect` instead of `colorEffect: field` for new JSON.  
**Tested:** `node agents/petscii-preview/export_animation.mjs --list-effects` and `--plan-only` with stacked backdrop; `node --test tests/project-validation.unit.mjs tests/stacked-backdrop.unit.mjs`.  
**Touched:** `.cursorrules/agent-log.md`, `agents/petscii-preview/README.md`, `animation-source.mjs`, `export_animation.mjs`, `pgl_cli.mjs`, `src/project_io.py`, `src/server.py`, `tests/test_pgl_mcp_smoke.py`.

## 2026-11-15 — Stack movement, color, and backdrop (0.31.0)

**What:** Movement, cell Color, and Backdrop animate together with independent `motionCycles`, `colorCycles`, and `backgroundCycles`. Projects save `backgroundEffect: 'none' | 'field' | 'plus4-field'`; legacy `colorEffect: 'field'` / `plus4-field` migrates in `normalizeAnimation()`. Release **0.31.0**.  
**Tested:** `node --test tests/stacked-backdrop.unit.mjs tests/project-validation.unit.mjs`; `tests/stacked-backdrop.spec.cjs` (Chromium).  
**Touched:** `project-validation.js`, `animation-frames.js`, `index.html`, `README.md`, `docs/maintainer-reference.md`, `tests/stacked-backdrop.*`, `tests/project-validation.unit.mjs`, `app-version.js`, `package.json`.

## 2026-11-15 — Backdrop animation section (0.30.0)

**What:** Animation panel gained a fourth **Backdrop** fieldset (`#backdropEffect` + ramp controls). Backdrop left the Color animation list. At 0.30.0 saves still used `colorEffect: field` on disk and the UI kept Color and Backdrop mutually exclusive — **0.31.0** moved backdrop to `backgroundEffect` and enabled stacking. Release **0.30.0**.  
**Tested:** `tests/backdrop-parallax.spec.cjs`, `tests/animation-layout.spec.cjs` (Chromium).  
**Touched:** `index.html`, `README.md`, `docs/maintainer-reference.md`, `tests/backdrop-parallax.spec.cjs`, `tests/animation-layout.spec.cjs`, `app-version.js`, `package.json`.

## 2026-11-15 — Backdrop ramp palette expansion (0.29.0)

**What:** Backdrop **Ramp** can step the shared background through every color-animation palette except Backdrop and Inverse: color cycle, warm glow, rainbow wave, raster bars, plasma, bonfire (`FIELD_RAMPS`). Plus/4 maps to the matching TED ramps. Release **0.29.0**.  
**Tested:** `node --test tests/backdrop-parallax.unit.mjs`; `tests/backdrop-parallax.spec.cjs` (Chromium).  
**Touched:** `project-validation.js`, `animation-frames.js`, `index.html`, `README.md`, `docs/maintainer-reference.md`, `tests/backdrop-parallax.*`, `app-version.js`, `package.json`.

## 2026-11-15 — Expanded animation cycle speed selectors

**What:** Movement and Color cycle selects now offer 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, and 16× per loop from shared `ANIMATION_CYCLES`. UI options are built at startup; validation and MCP export metadata follow the same list. Editor release **0.28.0** (`app-version.js` + `package.json`) shows as **Version 0.28.0** in the header and Project menu.  
**Tested:** `node --test tests/project-validation.unit.mjs tests/app-version.unit.mjs`; `tests/cycles.spec.cjs` (Chromium).  
**Touched:** `project-validation.js`, `app-version.js`, `package.json`, `index.html`, `README.md`, `docs/maintainer-reference.md`, `AGENTS.md`, `tests/cycles.spec.cjs`, `tests/project-validation.unit.mjs`, `tests/layout.spec.cjs`, `tests/app-version.unit.mjs`.

## 2026-11-15 — Animation export progress bar and frame counter

**What:** GIF, video, and frame-ZIP exports again show `Rendering …: n / total` in the download dialog plus a themed progress bar. The stage mirrors the same text and bar when the download panel is closed. `setStatus` no longer clears `#downloadStatus` during an active export (regression from the download-dialog split).  
**Tested:** `tests/download-actions.spec.cjs` (5 cases, Chromium).  
**Touched:** `index.html`, `styles/editor.css`, `tests/download-actions.spec.cjs`, `README.md`.

## 2026-11-15 — Declare the package as an ES module

**What:** `package.json` now has `"type": "module"`. The `.js` sources already use `import`/`export`, and CommonJS stays in `.cjs`. Node 24 validates without the line, then warns and reparses. The declaration matches the files.  
**Touched:** `package.json`.

## 2026-11-15 — PETSCII shading glyphs in the drawing skill

**What:** The drawing skill now says a finished picture shades with glyphs, not a field of solid 160. Checker 102 is the mid tone, diagonals 77 and 78 brush a slope, halves and quarters are the steps toward black, and a region repeats one of those. The RoboCop profile was repainted that way through the preview MCP.  
**Touched:** `.cursor/skills/petscii-draw/SKILL.md`. The picture stays in `agents/petscii-preview/out/`.

## 2026-11-15 — Preview tools use the home-built Node 24

**What:** Node bridges and project validation call `~/build/node24/node-v*/out/Release/node` (v24.22.2) when that binary is present. `PGL_NODE` overrides it. `run-mcp.sh` puts that directory first on `PATH`. The older Cursor-agent pin is no longer the fallback.  
**Tested:** `find_node()` prints the Release binary and `v24.22.2`. Drawing and MCP smoke tests passed (6).

## 2026-11-15 — PETSCII preview MCP in the repo

**What:** `agents/petscii-preview` is tracked so someone else can paint, render, and export. The virtualenv and `out/` stay ignored. `.cursor/mcp.json` starts `run-mcp.sh`. The drawing skill is `.cursor/skills/petscii-draw`.  
**Tested:** drawing unit test and the MCP smoke tests after `pip install -r agents/petscii-preview/requirements.txt`.  
**Touched:** `agents/petscii-preview`, `.gitignore`, `.cursor/mcp.json`, `.cursor/skills/petscii-draw/SKILL.md`. `setup-venv.sh` creates the virtualenv and installs `requirements.txt`. The drawing skill studies `examples/IMG_0343` through `IMG_0360` before a picture is painted.

## 2026-11-14 — Screen look

**What:** Colors → Screen is None, Monitor, Television, Green, or Amber. Monitor and television keep the painted colors, with a thin scanline, a small glow, and a slight red/blue shift. Green and amber are one phosphor: luminance becomes that color, with the same scanline and glow and no color shift. The canvas and PNG, GIF, video, and frame ZIP use it. SVG, PRG, and D64 stay clean.  
**Tested:** `node --test tests/screen-look.unit.mjs`. None is unchanged, the scanline stays readable, television fringes farther than monitor, green and amber hit their phosphor peaks, a brighter ink stays brighter, a one-color tube does not split red and blue, and PRG/D64 bytes ignore the setting. Chromium `tests/screen-look.spec.cjs`: Monitor darkens a glyph row on the canvas, the project saves `monitor`, and the PRG matches Screen set to None.  
**Touched:** `screen-look.js`, `index.html`, `project-validation.js`, README, roadmap, maintainer reference, `tests/screen-look.unit.mjs`.

## 2026-11-14 — Backdrop and Parallax

**What:** Backdrop (`field` / `plus4-field`) steps the shared background on the color-cycle or warm-glow ramp, forward or reverse, with a border lead of 0, 1, 2, or 4. C128 80-col keeps the border equal to the background. Parallax groups cells by ink or glyph, with spread and same/opposite travel. Preview, GIF, video, and ZIP use the animated fill. Native PRG/D64 still write one background. Roadmap puts new animations and shaders first and parks the case frame under REU.  
**Tested:** `node --test tests/backdrop-parallax.unit.mjs` and Chromium `tests/backdrop-parallax.spec.cjs` plus `tests/project-defaults.spec.cjs`. Knobs persist, invalid values fail the load, the GIF fill follows the ramp, and preview leaves the source grid unchanged. `tests/plus4-colors.unit.mjs` treats `plus4-field` as a backdrop, not a cell-color cycle. Full `node --test tests/*.unit.mjs` passed (152). Canvas shader looks are not defined and are not in this change.  
**Touched:** `animation-frames.js`, `project-validation.js`, `plus4-colors.js`, `index.html`, `styles/editor.css`, README, roadmap, machine-modes, maintainer reference, new unit and browser tests.

## 2026-11-14 — VICE smoke for Plus/4 and C128 80-col

**What:** Optional `npm run test:vice:hosts` autostarts one Plus/4 still and one C128 80-col still. It checks TED screen, attributes, and `$FF19`, or VDC screen and attributes, then pokes STKEY `$91` and expects `READY.`. The C64 `test:vice` suite is unchanged. Not part of browser CI.  
**Touched:** `tests/vice-hosts.integration.mjs`, `package.json`, `docs/vice-validation.md`, `docs/c64-output.md`, `docs/machine-modes.md`, maintainer reference.

## 2026-11-14 — TED color text grid

**What:** Plus/4 Include colors in text writes `PETSCII-GLYPHS` v3 with two-digit TED inks `00`–`78`. v1 and v2 files are unchanged. A v2 grid opened on Plus/4 still remaps onto TED. A v3 grid opened on VIC or VDC remaps with `tedInkToC64`. Color RAM stays VIC-only.  
**Touched:** `text-grid.js`, `index.html`, `tests/text-grid.unit.mjs`, `tests/machine-modes.spec.cjs`, machine-modes, maintainer reference, roadmap, README.

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
