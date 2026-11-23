# Agent log

## 2026-11-23 — Text entry in the stage footer (0.35.30, branch ui/text-entry-footer)

**What:** Closes the remaining Raskin H1 gap. On tablet/desktop the Text tool's entry moves into the fixed stage footer as a one-line box with status and Apply/Cancel (hint hidden while Text is active), so choosing Text no longer resizes the canvas. Phones keep the multi-line panel in its original position.  
**Tested:** Chromium: `canvas-space` (Text now in the tool loop, typing keeps geometry), `alphanumeric-entry` pass; `phone-workspace` two failures reproduce on main here. WebKit/iPad: CI.

## 2026-11-23 — Docs after remote branch cleanup

**What:** Only `main` remains on the remote. Living docs no longer tell readers to check out deleted branches. Cell-editing spike points at PR #169. Modularization queue records slices 1–3 shipped; next extract is the download shell. Machine-modes roadmap heading marked shipped. Historical log lines that name old branches are unchanged.

## 2026-11-23 — Portrait lessons + paint_tone_map (branch claude/mcp-improvements-plan-qfvqv2)

**What:** Three original portrait studies (noir split light on C64, cel-shaded Plus/4, textured old fisherman on C64) after reading the reference faces. The petscii-draw skill gains a Portraits section (type the face as a tone map, flat skin bands, large eyes with one catchlight, expression from brows and mouth, texture by engraving with inverse glyphs 227/205/206/221). New MCP tool `paint_tone_map` (`src/tone_map.py`); protocol tool cap 43 → 44.  
**Tested:** MCP tests incl. `tests/test_tone_map.py` (legend and offsets, transparent cells, one undo step, smooth-edge corners, atomic rejection of ragged rows, unknown characters, oversize maps and bad legends). Editor unchanged.

## 2026-11-23 — Visible tool options and one hint grammar (0.35.29, branch ui/visible-tool-options)

**What:** Raskin review H3. Paint/Pick/Fill triggers keep their own icon; a non-default option shows a corner badge (square/drop/bar) and extends the accessible name. Previously Paint and Fill ink-only showed the identical droplet. Canvas hint now always reads `Tool · option · ink · action` (Paint name restored, Line/Rectangle/Text include ink). Merged to main via #196 → #199; this entry and the 0.35.29 version were lost in that merge and restored separately.  
**Tested:** CI on #196 (Chromium, iPad touch, iPad portrait, unit, MCP) passed; locally `node --test tests/*.unit.mjs` 230/230 with py65 1.2.0; Chromium `tool-options-visible.spec.cjs` passes.

## 2026-11-23 — Consistent preview mode (0.35.28, branch ui/consistent-preview)

**What:** Raskin review H2. Paint/Pick/Fill menu triggers (`aria-disabled`) now dim like the other drawing tools during read-only preview. Rule made explicit: tools are off; history edits (ink, glyph, Undo/Redo, Canvas actions) return to drawing and the status says "Returned to drawing". Stage hint during preview names the rule. Review correction: Fill was already inert in preview; the earlier exit came from Undo.  
**Tested:** Chromium: new `preview-consistency.spec.cjs` passes; `stage-hint.unit.mjs` 5 pass; animation-glossary, canvas-space, workspace, drawing-tools, editor, 6581-theme, download-preview: 58 passed (`cleanup` two-tap failure reproduces on main in this environment). WebKit/iPad not run locally; `animation.spec` needs `omggif` (unavailable offline).

## 2026-11-23 — Stable stage layout (0.35.27, branch ui/stable-stage-layout)

**What:** Raskin review H1. Tablet/desktop stage chrome no longer moves with state: fixed status/dimension slots keep zoom/grid/symmetry in place; the preview banner overlays the stage bar (`#stageCanvasView` inert during preview); hint and selection actions share one fixed footer row; the Download dialog has a fixed height with tabs above the columns. Phones and short landscape keep the previous reclaim behavior. Text entry panel still inserts a row (follow-up).  
**Tested:** Chromium (system Chrome 1.63 runner, local pngjs shim): `canvas-space` 7 passed incl. new stability tests at 810×1080, 1080×810, 1180×820, 820×1180, 1440×900; 44 non-GIF/ZIP specs: no new failures vs main (34 failures reproduce on main in this environment: C64/D64 emulator specs, two phone specs). WebKit/iPad not run locally.

## 2026-11-23 — Measured TED palette (0.35.26, branch claude/mcp-improvements-plan-qfvqv2)

**What:** `plus4-colors.js` builds the 121 Plus/4 colours from measured TED parameters (Colodore values as used by VICE `ted-color.c`, converted like VICE `video-color.c`) instead of unit-length Pb/Pr on linear luma. The old table clipped: 98 of 120 per-hue entries distinct, 239 channels at 0/255. Now 120 distinct, luma rises per hue. Affects Plus/4 drawing, picker, exports, animation and MCP. Release **0.35.26**.  
**Tested:** `node --test tests/*.unit.mjs` 228 pass (new palette test fails on 0.35.25); Chromium `machine-modes` + `ui-theme` 21 passed; MCP tests OK; `smoke/editor_parity.py` 28 comparisons, 0 mismatches. WebKit not run locally.

## 2026-11-23 — MCP shading tools (branch claude/mcp-improvements-plan-qfvqv2)

**What:** `gradient_fill`, `shade_shape` and the `petscii://colors/ramps/{machine}` catalog in `agents/petscii-preview/src/shading.py`, from the shading studies; `pgl_cli.mjs color-luminance`. Skill file gains the shading and mirror-symmetry lessons and points to the tools. Tool cap in the protocol test raised from 41 to 43.  
**Tested:** MCP unit and protocol tests (including `tests/test_shading.py`: monotonic ramps on all machines, ordered gradient rows, one undo step, validation, lit side brighter, one specular cell, no quadrant spikes, opaque shapes, seam-free cylinders, TED inks); demo render `out/workspace/shading-tools-demo.png`. Editor unchanged.

## 2026-11-23 — Mirror glyph partners pair both ways (0.35.25, branch claude/mcp-improvements-plan-qfvqv2)

**What:** The one-pixel-shift match only worked one way, so top↔bottom copies of 105 and 95 kept their glyph (v[233]=95 but v[95]=-1). `glyph-mirror.js` now pairs partners back, so reflecting twice restores the shape. Found while drawing symmetric art with the MCP.  
**Tested:** `tests/glyph-mirror.unit.mjs` 8/8 incl. new *reflecting twice restores the shape* (fails on 0.35.24); MCP tests; Chromium editor spec.

## 2026-11-23 — Mirror glyph shapes for Symmetry (0.35.24, branch claude/mcp-improvements-plan-qfvqv2)

**What:** Symmetry popover gains **Mirror glyph shapes** (`#symMirror`, project `mirrorGlyphs`): reflected copies use the glyph whose pixels mirror the brush glyph, from the active machine's sheet (`glyph-mirror.js`; exact flip, else one-pixel-shifted flip). MCP `set_tool_state(mirror_glyphs)` uses the same tables through `pgl_cli.mjs mirror-tables`. Release **0.35.24**.  
**Tested:** `tests/glyph-mirror.unit.mjs` 7/7; Chromium editor/layout/drawing-tools/tool-mode/6581 specs 26 passed, 1 failed (*project JSON save and reload round-trip*, fails identically on unmodified code locally); MCP 63 tests OK; `smoke/editor_parity.py` 28/0. WebKit not run locally.
**Also fixed:** opening a project or importing text at the current canvas size left the canvas and text panel stale (`fit()` skips redraw when the size is unchanged since #184); `applyProject` and text import now call `redraw()`. Regression: `editor.spec.cjs` *project JSON save and reload round-trip* (was failing on main) and new *same-size text import redraws the canvas* (fails without the fix).

## 2026-11-22 — Crisp CRT still PNG + petscii-preview MCP rebuild (0.35.23, branch claude/mcp-improvements-plan-qfvqv2, PR #186)

**What:** Still PNG draws glyph pixels directly (`stillPngPixels`) with the GIF/ZIP/video sampling rule instead of rasterizing the SVG; CRT stills no longer anti-alias (blurred edges, striped solid blocks). Same PR rebuilds the `agents/petscii-preview` MCP server (safety, machine-correct exports, typed tools, previews, docs). Release **0.35.23**.  
**Tested:** `tests/machine-modes.spec.cjs` *CRT still PNG is crisp* (Chromium; fails on the old code with 6 extra blended colours, passes now); PNG-related specs on Chromium: 101 passed, 9 failed identically on the unmodified editor (local Chromium build newer than pinned Playwright); MCP: 58 tests on Python 3.12/3.13; `smoke/editor_parity.py` 28 comparisons, 0 mismatches including CRT stills. WebKit not run locally.

## 2026-11-19 — Canvas replace UX (0.35.15, branch cursor/canvas-replace-ux-6ab6)

**What:** Merged PR #178 (v0.35.14). Replace ink in Canvas tools uses palette swatches (like brush ink), not selects. Glyph pick for replace keeps or restores the Canvas popover after each choice.  
**Tested:** `tests/magic-replace.spec.cjs` Chromium.

## 2026-11-19 — Polish + Tier B #3 (0.35.14, branch cursor/track3-polish-tierb-6ab6)

**What:** Stage **Grid** label; animation derived-frame summary; Colors **?** $D020/$D021 note; Canvas size sidebar title; line/rect/select stage hints. Added [owner-program-queue.md](../docs/owner-program-queue.md) and [modularization-slices.md](../docs/modularization-slices.md) for polish → #3 → #1 → #2 → #7 plan.  
**Tested:** `tests/canvas-view.spec.cjs` Chromium 7/7.

## 2026-11-16 — Pick/Fill toolbar polish and screenshot smoke (0.34.1)

**What:** Uniform 44px Pick/Fill triggers and mode options; redrawn mode icons; `smoke/tool-mode-screenshots.mjs` + workflow artifact upload; `tests/tool-mode-screenshots.spec.cjs` in focused CI. Release **0.34.1**.  
**Tested:** Chromium `tool-mode-screenshots`, `drawing-tools`; `node smoke/tool-mode-screenshots.mjs` (desktop).

## 2026-11-16 — Canvas pick and split fill menus (0.34.0)

**What:** **Pick** and **Fill** use horizontal sub-menus (glyph+ink / glyph-only / ink-only fill; ink / glyph / background pick). Preview locks mode menus via `inert`. Release **0.34.0**.  
**Tested:** `tests/drawing-tools.spec.cjs` (Chromium 8/8); `tests/canvas-space.spec.cjs` (Chromium).

## 2026-11-16 — Project naming regressions (#66) (0.33.4)

**What:** Native export filenames in tests match `{stem}-{machine}-still|animation-{W}x{H}`; Project menu panel uses fixed viewport anchoring so it stays on-screen at 200% root font (iPad layout spec). Release **0.33.4**.  
**Tested:** `tests/project-naming.spec.cjs`, `tests/project-save.spec.cjs` (Chromium 14/14).

## 2026-11-16 — Roadmap #66 validation snapshot

**What:** `docs/roadmap.md` records Chromium results for `project-naming` + `project-save` (11/14 pass; export filename sweep and 200% text layout still failing).  
**Tested:** `npx playwright test tests/project-naming.spec.cjs tests/project-save.spec.cjs --project=chromium`.

## 2026-11-16 — Physical checklist: backdrop preview rows

**What:** `docs/physical-device-checklist.md` adds iPad steps for Animation **Backdrop** Play and Download preview parity; spot check notes VIC/TED native block-paper (optional hardware).  
**Tested:** Documentation only.

## 2026-11-16 — VDC backdrop expectations in UI (0.33.3)

**What:** C128 80-col **Machine** help and an Animation **Backdrop** note explain that backdrop waves appear in preview/raster exports only; native VDC PRG/D64 keeps empty cells blank (no block-paper). Release **0.33.3**.  
**Tested:** `node --test tests/app-version.unit.mjs`; `tests/project-defaults.spec.cjs` (version label).

## 2026-11-16 — VICE Plus/4 backdrop host smoke

**What:** `tests/vice-hosts.integration.mjs` adds an optional xplus4 case: empty cells with `plus4-field` become block 160 + TED attribute mattes after `prepareNativeBackdropFrames`, matching native export. Requires `VICE_EXECUTABLE` and `VICE_DATA_DIR` (`npm run test:vice:hosts`).  
**Tested:** Not run in CI (opt-in host test).

## 2026-11-16 — GitHub Pages version check (0.33.2 live)

**What:** Verified production `app-version.js` serves **0.33.2** (`curl https://funkatron.github.io/petscii-graphics-lab/app-version.js`). Matches `main` after backdrop preview matte (PR #132). No app bump — documentation only.  
**Follow-ups:** Split into separate PRs for MCP Plus/4 backdrop smoke, VDC backdrop UI note, optional VICE Plus/4 backdrop host test, project-naming roadmap (#66), and physical-device backdrop checklist rows.

## 2026-11-16 — Backdrop matte in download preview (0.33.2)

**What:** `artworkPreview` paints `backgroundMatte` so backdrop spatial waves show in the Download animation preview (and centered native tab). Release **0.33.2**.  
**Tested:** `tests/backdrop-parallax.spec.cjs` (new preview case).

## 2026-11-16 — Plus/4 backdrop block paper (0.33.1)

**What:** Shared `native-backdrop-export.js` (`prepareNativeBackdropFrames`); Plus/4 native download uses the same empty→block 160 path as VIC; docs and export help. Release **0.33.1**.  
**Tested:** `node --test tests/c64-backdrop-blocks.unit.mjs tests/plus4-backdrop-blocks.unit.mjs`.

## 2026-11-15 — Backdrop brightness + C64 block paper (0.33.0)

**What:** `fieldBrightness` (10–100%) remaps backdrop mattes by palette luminance; VIC native export paints empty cells as block 160 with `backgroundMatte` color RAM (`prepareC64BackdropFrames`, `buildNativeExportFrames`). Release **0.33.0**.  
**Tested:** `node --test tests/backdrop-brightness.unit.mjs tests/c64-backdrop-blocks.unit.mjs`.

## 2026-11-15 — Independent backdrop wave controls (0.32.2)

**What:** Backdrop spatial ramps use `fieldWaveDirection`, `fieldWaveShape`, `fieldWaveLength`, and `fieldWaveAmplitude`, separate from cell `colorWave*`. Backdrop fieldset shows wave direction/waveform/wavelength/height when Backdrop is on; `fieldDirection` is labeled play direction (forward/reverse along the ramp). Legacy projects copy `colorWave*` into `fieldWave*` on load. Release **0.32.2**.  
**Tested:** `node --test tests/backdrop-parallax.unit.mjs tests/project-validation.unit.mjs tests/project-defaults.spec.cjs` (unit); `tests/animation.spec.cjs` (Chromium, defaults).  
**Touched:** `project-validation.js`, `animation-frames.js`, `index.html`, `docs/maintainer-reference.md`, `agents/petscii-preview/*`, tests.

**Docs follow-up:** `index.html` animation help and `README.md` preview section explain independent Color vs Backdrop wave rows.

## 2026-11-15 — Spatial backdrop ramps (0.32.0)

**What:** Every backdrop ramp paints a per-cell `backgroundMatte` in preview and raster exports. Wave, raster, plasma, and bonfire match cell-color spatial rules; **Color cycle** and **Warm glow** backdrops add wave bands on the paper via the color-wave knobs (cell cycle/glow unchanged). Border lead still uses the scalar `background`/`border` step. Release **0.32.0**.  
**Tested:** `node --test tests/backdrop-parallax.unit.mjs tests/stacked-backdrop.unit.mjs tests/app-version.unit.mjs`.  
**Touched:** `animation-frames.js`, `index.html`, `docs/maintainer-reference.md`, `tests/backdrop-parallax.unit.mjs`, `app-version.js`, `package.json`.

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
