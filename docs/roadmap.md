# Planned work

This page tracks requested work and completed milestones. For current controls, use the [user guide](../README.md).

## Project workflow — browser validation in progress

See issue #66. New Project resets to a blank default drawing with confirmation and Undo recovery. An icon-only refresh button generates adjective–noun names. All export formats use the same validated project name and capture it before asynchronous work; caches account for renaming. Names stay outside v3 drawing data. Regression coverage includes reset/cancel/Undo, source preservation, filename sanitization, export contents and in-flight naming.

**Validation status (2026-11-16):** Chromium run of `tests/project-naming.spec.cjs` and `tests/project-save.spec.cjs` — **14/14 passed** (native filenames include machine slug, e.g. `-c64-still-`; Project menu uses fixed viewport anchoring at 200% root font). **Close #66** still needs the same specs green on iPad WebKit in CI.

## Current priorities

Reviewed **2026-11-16** after PETSCII editor landscape research, the real-hardware product gate, and the borrowings backlog.

| # | Track | One-line intent |
| ---: | --- | --- |
| 1 | **New animation types** | Next movement/color prototypes with **native PRG/D64** on real hardware |
| 2 | **Animation & C64 follow-ups** | Capacity, VICE, physical checks, optional **player rewrite** |
| 3 | **Cross-editor UX & naming** | Petmate/Wizard/Marq workflows and familiar labels ([editor borrowings](editor-borrowings.md)) |
| 4 | **UI validation** | Physical iPad reach and larger text (automated pass largely done) |
| 5 | **Drawing & import** | Everyday tools beyond what #3 lifts from other editors |
| 6 | **Machine modes** | Extra VIC palettes; modes are shipped |
| 7 | **Editor modularization** | Split `index.html` for maintainability |
| 8 | **Canvas shaders** | Screen look on raster exports only |

1. **New animation types:** Backdrop and Parallax shipped; **deep research** for the next movement/color prototypes is in [animation types research](animation-types-research.md) (demoscene references + ranked candidates) and [other PETSCII editors](petscii-editors-landscape.md) (competitive context). **Ship only what can run as native PRG/D64** on real hardware ([product gate](animation-types-research.md#product-gate--real-hardware)); prioritize new creative effects over raw C64 capacity work. UX polish from other editors belongs in priority **#3**, not here.
2. **Animation and C64 follow-ups:** capacity optimization, broader PAL/NTSC VICE validation, native export hardening, physical C64/storage checks, and—when a prototype needs hardware fidelity—a **native player rewrite** ([design note](native-player-rewrite.md)). Run **in parallel with #1** once prototypes are chosen (validation debt for shipped effects overlaps here).
3. **Cross-editor UX and naming:** adopt high-value ideas from [editor borrowings](editor-borrowings.md) and [PETSCII editors landscape](petscii-editors-landscape.md)—glyph-only/ink-only paint, reference overlay import, low-risk label changes (Movement, Backdrop effect, Native program (PRG)), animation glossary (procedural effects vs cel frames), scroller export copy. See [Cross-editor UX and naming](#cross-editor-ux-and-naming--priority-3).
4. **UI validation:** physical iPad finger reach and larger-text checks after the compact cleanup (Apple Pencil is out of scope). Overlaps the nomenclature pass in **#3** on device.
5. **Drawing and import usability:** typed entry and text-file import are implemented; line/rect/fill and replace-ink called out in **#3** land here when not tied to cross-editor parity. Evaluate further everyday drawing improvements (stamps, selection/move, motifs per [AGENTS.md](../AGENTS.md)).
6. **Machine modes / display palettes:** C64, C128 (40-col), C128 80-col, and Plus/4 are shipped. Extra VIC palettes (DeeKay, Frodo, CCS64, Pepto NTSC) stay later. See [machine modes](machine-modes.md).
7. **Editor modularization:** peel the large `index.html` script into native ES modules without a bundler or build step (static `import` for GitHub Pages). See [Editor modularization](#editor-modularization--planned).
8. **Canvas shaders (lowest):** the screen look is our own Monitor, Television, Green, and Amber treatment. Raster exports match the canvas. SVG, PRG, and D64 stay clean. See [Canvas shaders](#canvas-shaders--exploration).

### How the top three relate

- **#1** chooses *what moves* on the grid; every shipped effect needs a native story ([product gate](animation-types-research.md#product-gate--real-hardware)).
- **#2** keeps *exports honest* on silicon (timing, bytes, VICE, physical)—and funds a [player rewrite](native-player-rewrite.md) when replay is not enough.
- **#3** makes the editor *feel familiar* to Petmate/Wizard refugees without diluting glyph authenticity or v3 project ids.

Research PRs may land documentation for #1–#3 together; implementation order should still respect the numbers above unless the owner reorders.

## Cross-editor UX and naming — priority #3

**Source of truth:** [editor-borrowings.md](editor-borrowings.md) (features, naming table, tier list). **Survey:** [petscii-editors-landscape.md](petscii-editors-landscape.md). **UI placement rules:** [ui-review.md](ui-review.md) follow-up #3.

**Tier A — implement or relabel first**

- [x] **Glyph-only / ink-only paint** (Wizard Shift, Petmate modes); Playwright stroke coverage (`drawing-paint-modes.spec.cjs`).
- [x] **Nomenclature pass (partial):** Movement label, Backdrop effect vs brush Background, Native program **(PRG)** tab; help glossary remains follow-up.
- [ ] **Reference image overlay → PETSCII** (Marq/Petmate/Wizard); accuracy limits documented before ship.
- [ ] **Export copy:** scroller / native program labels when Scroll + PRG ([c64-output.md](c64-output.md) alignment).

**Tier B — after Tier A or with #5**

- [ ] Line, rectangle, replace-ink (**magic replace** wording).
- [ ] **Show grid** label (retain center guides).
- [ ] Optional animation **timeline** disclosure (effect-generated frames, not Wizard cel strip).
- [ ] Krissz-style **$D020 / $D021** help (border vs background).

**Explicitly defer (document only):** layers, quarter-block grid, Ultimate 64 live port, SID ([editor borrowings](editor-borrowings.md) Tier B/C).

**Done when:** Tier A checkboxes green, README/help match new labels, iPad WebKit spot-check for changed Animation/Download strings.

## Editor modularization — planned

Most of the app still lives in one `index.html` module script; smaller areas already ship as separate `.js` files (`machine-modes.js`, exporters, `pointer-stroke.js`, and similar). A larger pass should shrink the monolith incrementally while keeping deploy as “open the repo on Pages.”

**Constraints**

- No npm build, Vite, or Webpack in the default workflow.
- Keep `index.html` as the shell: markup, styles, and a thin boot script that wires DOM to modules.
- Preserve static hosting: only standard browser ES modules and existing vendor ESM copies.

**Approach**

1. **Inventory** — list cohesive chunks still inline (canvas view/zoom/pan, drawing tools, download sheet, project persistence, animation preview chrome).
2. **Extract in slices** — one feature or subsystem per change, with focused Playwright or `*.unit.mjs` coverage where practical.
3. **Document contracts** — each module owns clear inputs/outputs; shared editor state stays explicit (imported store or passed context) instead of hidden globals.
4. **Maintain AGENTS guidance** — update “where the code lives” as modules move; avoid drive-by refactors unrelated to the slice.

**Algorithmic VIC research (optional prototypes)**

- [x] **Column-wave** in Movement menu ([column-wave-spike.md](column-wave-spike.md), [column-wave-native.md](column-wave-native.md)); procedural-v2 C64 for movement-only exports; py65 in CI, VICE optional (`vice-validation.md`).
- [x] **FLD blinds** in Movement menu ([fld-blinds-spike.md](fld-blinds-spike.md), [fld-blinds-native.md](fld-blinds-native.md)); procedural-v2 C64 for movement-only exports; py65 in CI, VICE optional.
- [ ] Keep **VSP/FLI/AGSP** as documentation-only unless requirements change.

**Checklist (not started)**

- [ ] Agree module boundaries and naming (`editor-stage.js`, `canvas-view.js`, `drawing-tools.js`, or similar).
- [ ] Move canvas view (zoom, guides, pan) out of `index.html`.
- [ ] Move download/export UI orchestration behind a module boundary shared with existing exporters.
- [ ] Reduce boot script to imports, DOM queries, and `init()` calls.
- [ ] Confirm cold load on GitHub Pages and CI (Chromium + iPad WebKit) after each slice.

## Machine modes and display palettes — design in progress

Design contract: [machine modes](machine-modes.md).

- [x] Publish the design document and link it from AGENTS, maintainer reference, and this roadmap.
- [x] Lock chrome seed colors from boot-screen and case photo references (see [machine modes](machine-modes.md)).
- [x] Implement header Machine / Display palette controls and machine-themed app chrome.
- [x] Ship VIC display palettes (Pepto, Colodore, VICE, RGB) and Plus/4 TED drawing (`0–120`) with undoable VIC↔TED conversion.
- [x] Gate C64 PRG/Color RAM and color text in Plus/4 mode; contextual animation lists (TED-native effect ids retained).
- [x] Add Playwright/unit coverage; update the design doc’s shipped section (Chromium machine-modes spec).
- [x] C128 80-column (VDC) editor + native PRG/D64 (`c128-vdc-export.js`).
- [x] Application-like UI IA: System / Project / Editor header grouping and Machine persistence (see `.cursorrules/app-like-ui-ia.md`).
- [x] Follow-up: TED color text-grid. Plus/4 Include colors in text writes `PETSCII-GLYPHS` v3 (`00`–`78`). v1 and v2 files are unchanged. A v3 grid opened on VIC or VDC is remapped with `tedInkToC64`.
- [x] Follow-up: non-square cell aspect / **Cell shape** toggle (Square vs CRT proportion) for the editor and PNG/SVG/GIF/video. Native PRG/D64 unchanged. Design: [`.cursorrules/cell-aspect-toggle.md`](../.cursorrules/cell-aspect-toggle.md).
- [x] Follow-up: lock C64↔TED glyph atlas diff (identity-by-slot; TED SHA + hardware-inverse). Findings: [`.cursorrules/c64-ted-glyph-diff.md`](../.cursorrules/c64-ted-glyph-diff.md). TED bank 1 is the authentic second 1 KB of the 2 KB chargen (not a 4 KB kernal extract).
- [x] Follow-up: production code uses `MACHINE` / `isTedMachine` / `isVdcMachine`. Saved JSON, HTML option values, and the pre-module boot map stay the id strings.

## Brittle-test audit — in progress

See the [audit findings and remaining work](test-reliability-audit.md).

- [x] Validate animation state waits and controlled-clock pause/stop checks in Chromium and both iPad WebKit layouts; released in PR #37 after all nine CI jobs passed.
- [x] Validate shared atomic frame/pixel sampling and composite preview/autosave synchronization in all three browsers; PR #38.
- [x] Review animation/layout thresholds; retain geometry, overlap and rounding checks. PR #37 removes the undocumented height percentage; PR #41 retains the remaining tolerances.
- [x] Add independent omitted-field serialization and autosave/reload checks; PR #39.
- [x] Pin capacity and native-player benchmark wave settings; PR #39 and PR #40 passed all nine CI jobs.
- [x] Add repeated download/navigation coverage and failure-state attachments; PR #41 passed all nine CI jobs.
- [x] Validate controlled-clock C64 download-preview playback and two-second Stop stability in all three browsers; PR #53.
- [x] Fix iPad WebKit project-download helper flake (`#saveProject` hidden when Share is offered); see [test-reliability-audit.md](test-reliability-audit.md).

## Phone UI — automated first pass released

- [x] Release the automated first phone pass in PR #45: safe-area spacing and overlay settings on short landscape screens; preserve canvas space and primary actions.
- [ ] Review panel placement, touch targets, safe areas and on-screen keyboard behavior; preserve artwork while resizing or rotating.
- [x] Run 320/390/430-pixel portrait and rotated landscape checks for overflow, control reach, erase/Undo, exact projects and exported pixels; PR #45.
- [ ] Verify the phone workflows on a physical device.

## Canvas space — released

- [x] Reclaim the empty selection dock for idle drawing tools at every screen size; PR #54.
- [x] Reserve action space before Select/Line/Rectangle gestures so artwork stays stationary; browser checks cover tablet, desktop and short phone layouts.

## Canvas shaders — exploration

A shader is a visual effect applied over the rendered canvas. The shipped screen look is drawn here, not taken from a preset pack. Monitor is the sharper color tube. Television is a little softer, with more phosphor and color bleed. Green and amber are one-color phosphors: brightness follows the ink, and the hue is replaced. Defaults stay off, so an existing picture is unchanged until the look is chosen.

- [ ] Compare approaches for applying shader presets with a small number of controls, including preview performance on phones and iPads.
- [ ] Include the selected effect in image and animation exports, matching the canvas preview. Evaluate raster output and how SVG should handle effects.
- [ ] Keep C64 native exports free of shaders; retain authentic glyph, ink and playback data in PRG/D64 output.
- [ ] Define export snapshots, animation timing and project persistence for shader settings before implementation; add pixel and source-preservation checks.

## Typed alphanumeric entry — implemented

- [x] Enter letters and numbers with the Text tool instead of selecting each glyph.
- [x] Use native textarea input for uppercase/lowercase C64 glyphs and a visible starting cell.
- [x] Complete Chromium and both iPad WebKit CI layouts; released with PR #23.
- [ ] Verify the physical iPad on-screen keyboard.
- [x] Preview placement, explicit line breaks and right-edge wrapping; support native corrections and one-step Apply/Undo with cell colors.
- [x] Keep the graphics palette’s letters-and-numbers filter independent of typing.

## Additional animations — in progress

**Roadmap priority #1.** **Research (2026-11-16):** [New animation types research](animation-types-research.md) maps shipped effects to C64 demoscene references and ranks next prototypes. Open checklist items below still apply.

### Bonfire — implementation, validation pending

- [x] Add Bonfire movement: rising, tapering flames made from source glyph/ink texture without altering artwork.
- [x] Add independent Bonfire colors with warm tips and yellow-white cores; preserve background and empty cells.
- [x] Add deterministic unit checks and browser preview/GIF/ZIP, persistence and rate coverage.
- [x] Document Bonfire release gate in [bonfire-release-checklist.md](bonfire-release-checklist.md); run automated specs before merge.
- [ ] Review visual quality on iPad; evaluate native C64 capacity using representative artwork.


### Rotating 3-D objects — released, device review pending

- [x] Add Rotating cube, Spinning globe and Rolling drum using artwork as whole-cell surface textures.
- [x] Preserve original artwork, ink pairs, nearest-surface visibility and exact cycle closure; 20 new geometry checks pass locally.
- [x] Add shared preview/export integration, project persistence and sampling warnings.
- [x] Pass the focused Chromium and both iPad WebKit browser checks for PR #56, including preview and exports.
- [ ] Review readability and motion on a physical iPad; evaluate full browser performance.

### Racing and space depth effects — released, review continues

See the [depth-effects plan](depth-effects.md) for artwork mapping, projection, loop closure and validation.

- [x] Release deterministic Space warp (PR #47), surface effects (PR #48), top-edge and tunnel symmetry fixes (PR #49), and waveform/height/wavelength controls (PR #52).
- [x] Validate mixed glyphs and independent colors in GIF/ZIP/native bytes and repeated video cycles across all three browsers; PR #51.
- [x] Record a reproducible 160-case pure projection cost baseline; see [measurement scope and results](depth-performance.md).
- [x] Record live browser preview cadence for all four effects in Chromium and both iPad WebKit layouts; see [browser results](depth-performance.md#recorded-browser-result).
- [ ] Measure full browser rendering and physical-device cost before changing sampling limits.
- [ ] Validate Perspective floor prototype: repeated artwork texture moves toward/away from a horizon; review quantized motion and exports.
- [ ] Evaluate Curved road and Tunnel flight prototypes against the simpler effects; retain them only if visual review shows useful, readable depth.
- [ ] Preserve shared preview/export frames, independent color effects, source artwork and existing C64 limits; validate phone/iPad readability and sampling cost.


- [x] Diagonal directions for movement animations: Scroll, Starfield, Sine scroller, Wave rows/columns, and Patterned wipe each use the eight direction names where applicable (PRs #44, #62, #150, #151). See [diagonal movement investigation](diagonal-movement.md).

- [x] Release Sine scroller and Raster-style bars with shared preview/download behavior; PR #27.
- [x] Release Plasma field using intersecting color waves and the existing color controls; PR #28.
- [x] Release Bouncing logo and Stretching logo with contextual Travel/Squeeze controls; PR #29.
- [x] Release a deterministic three-layer Starfield using the drawing’s glyphs and inks; PR #29.
- [x] Release Diagonal, Checkerboard and Blinds wipes with reveal/hold/hide loops; PR #29.
- [x] Release independent movement/color wavelengths (PR #30): 10/25/50/75/100%, with 50% matching the prior spacing and 100% twice as long.
- [ ] Use C64 demoscene productions and cracker intros (cracktros) as visual references when choosing effects. Explore sine-wave text/graphic scrollers, bouncing or stretching logos, raster-style color bars, plasma-like color fields, starfields and patterned wipes/reveals.
- [ ] Adapt those references to the editor’s character grid, per-cell inks and shared background. Evaluate smooth loops, useful combinations with existing effects, and preview/export consistency. Treat these as candidates to prototype, not a committed feature list.
- [ ] Preserve source artwork and share effect behavior across preview and supported downloads.
- [x] Add movement-wave amplitude (the waveform’s “height”) choices of **10%, 25%, 50%, 75%, and 100%**. Scale displacement only; keep direction, waveform, timing and canvas dimensions independent. At 100%, use twice the earlier displacement range; 50% matches that earlier range.
- [x] Add independent Color wave height percentages to Rainbow wave for every waveform; preserve the full color sequence at 100%.
- [x] Save both amplitude settings with the project and share it across preview and supported animation downloads.
- [x] Backdrop steps the shared background along the color-cycle or warm-glow ramp. Ramp, direction, and border lead are selects. VIC and TED can lead the border; C128 80-col keeps the border equal to the background. Preview, GIF, video, and ZIP use the animated fill. Native PRG/D64 still write one background.
- [x] Parallax moves ink groups or glyph groups. Direction, spread, and same/opposite travel are selects. Spread 1 is the two-speed drift (moiré with two line glyphs, chessboard with two inks). Source art stays still for Undo and still exports.

Wave height shipped in PR #24; doubled movement range and independent color-wave height shipped in PR #25. Grouped animation controls shipped in PR #26. Sine scroller and Raster-style bars shipped in PR #27 after Chromium and both iPad WebKit layouts passed. Plasma field shipped in PR #28. Bouncing/stretching logos, Starfield and Patterned wipe shipped in PR #29 after all three browser jobs passed. Independent wavelength controls shipped in PR #30 after all three browser jobs passed. The sidebar grouping pass shipped in PR #31 and Ripple in PR #32. Existing animation optimization and C64 validation remain lower-priority follow-ups.

## Color-aware text exchange — implemented

- [x] Add optional labeled text with cell inks and shared background.
- [x] Preserve glyph-only imports, atomic validation and one-step Undo.
- [x] Complete Chromium and both iPad WebKit CI layouts; released with PR #21.
- [x] Open labeled text-grid files directly from Project with atomic validation and one-step Undo; released with PR #22.

## Sidebar follow-up — in progress

- [x] Group all animation timing in Timeline & preview; pair wavelength/height under each effect.
- [x] Add semantic Canvas size and Paint colors groups; retain separate whole-drawing actions.
- [x] Check automated iPad layouts, larger text, source preservation and existing workflows; released in PR #31. Physical-device checks remain open.
- [x] Add Ripple: center-out radial movement using existing waveform, wavelength, height and cycle controls; released in PR #32. Tunnel and Twist remain proposals.

## Major UI cleanup — implemented

- [x] Review drawing, selection, animation and download workflows; simplify tool grouping and contextual actions.
- [x] Remove stamps; retain Select and Duplicate for repeating artwork.
- [x] Keep Undo/Redo together and preserve the active drawing tool during Undo.
- [x] Add tap endpoints and keyboard alternatives to dragging.
- [x] Put compact tappable help beside headings; keep selection actions below the canvas.
- [x] Show C64 export readiness and offer only exporter-tested longer-loop remedies.
- [x] Add automated pointer, keyboard and iPad layout regressions.
- [ ] Verify physical finger reach and larger text on an iPad.
- [x] Validate 200% text in both iPad orientations, including header controls, glyph selection, download navigation and saved artwork; flexible-header change released with PR #20. Physical device text testing remains open.

## C64 animation capacity — priority #2 follow-ups

Current animation behavior meets the owner’s needs for daily use. Capacity optimization and broader machine validation sit under **roadmap priority #2** (not #1). Fix reported regressions as needed.

The work below explores **40-column × 24-row** movement waves combined with color waves, guided by the [capacity measurements](c64-capacity.md). Retain the distinction between CPU checks, full-machine emulation and physical-hardware validation.

- [x] Add representative 40 × 24 combined-wave workloads, including sparse, repeated, detailed and mixed-bank glyphs, widespread ink changes and four-cycle loops.
- [x] Measure program/stream size and estimated update-budget usage across 20 cases; separate screen, color, character and framing bytes.
- [ ] Measure actual decode time, frame timing and loop drift for the combined-wave workloads on PAL/NTSC.
- [x] Pack two color inks per byte when savings exceed decoder overhead; the repeated-pattern baseline now fits at 4/8/12 seconds.
- [x] Reuse exact frame-update bodies; the four-cycle full-screen baseline falls to 22,269 bytes and fits exporter checks at 8/12 seconds.
- [x] Use indexed literal copies and inline packed colors; combined full-screen updates need 47.8% fewer measured CPU cycles in the deterministic CPU fixture.
- [x] Prototype native row routines and frame lookup tables: the private 96-frame full-screen reference meets its two-second timeline in CPU tests. See [native row prototype](c64-native-rows.md).
- [x] Manually test the reference D64 in Poke on iPad: owner confirmed correct playback and RUN/STOP return to BASIC.
- [x] Select native rows when the generic export fails its limits and native passes; share selection across readiness and PRG/D64 downloads.
- [ ] Complete PR #64. Prefer paired glyph-and-color playback for ROM-backed animations that fit its 256-pair dictionary and both budgets. Keep generic/native players available for other workloads. The four-second private cube uses 21,882 bytes at 93.1% estimated timing use; its prototype played successfully in Poke. Browser CI passed before the additional boundary tests; full VICE validation remains open.
- [x] Reuse lookup entries for identical complete pictures without changing frame durations or loop timing.
- [x] Add Play/Stop preview controls to Animation and C64 animation downloads.
- [x] Allow explicit download despite timing warnings while retaining memory and artwork limits.
- [x] Center smaller artwork in C64 playback and its download preview.
- [ ] Broaden native validation in full VICE across PAL/NTSC, including VIC-II contention and disk loading.
- [ ] Compare reusable color-only blocks, further decoder improvements, staged screen updates, and native procedural movement/color effects. Keep the browser animation as the reference for intended output.
- [ ] Measure achievable speeds and visual tradeoffs on PAL and NTSC in full VICE emulation; include the mixed-bank RAM character path where applicable.
- [ ] Update export limits and actionable messages from measured results, and document any approximation or remaining hardware limits.

Increasing capacity must retain glyph/color accuracy, bounded memory, RUN/STOP exit and machine-state restoration. The existing 256-pattern character-set limit is a separate constraint from animation size and playback speed.

## Unified alphabet — implemented

- [x] Offer uppercase and lowercase alongside the full graphics palette without switching the whole drawing's character bank.
- [x] Update glyph identifiers, v3 projects, rendering and every export consistently; older formats are unsupported.
- [x] Build per-artwork RAM character sets for C64 playback and check the 256-pattern limit across the complete animation, including the blank. The two source banks contain 304 distinct bitmaps, so one fixed 256-slot set cannot contain everything.
- [x] Verify mixed-case text and graphics in browser pixels and independent 6502 CPU execution.
- [ ] Verify mixed-bank RAM character output in full PAL/NTSC VICE and on hardware.

Show letters & numbers reveals both cases. There is no whole-drawing character-set switch or separate lowercase option; existing graphics stay unchanged.

## Canvas zoom and center guides — implemented

- [x] Device-pref editor zoom (fit, 125%, 150%, 200%, 300%) with scrollable bezel when enlarged; Ctrl/Cmd + wheel steps zoom.
- [x] Optional center guides for symmetry (editor only; exports unchanged).
- [x] Zoom and **Guides** in the stage bar above the canvas (0.35.0).

## Richer drawing tools — implemented

- [x] Fill connected cells with the selected glyph and ink.
- [x] Draw straight lines and outlined rectangles with a visible preview before applying.
- [x] Select, move, duplicate and delete regions.
- [x] Evaluate reusable stamps; remove them during UI cleanup in favor of Select and Duplicate.
- [x] Keep each completed drawing operation undoable; use pointer input for touch and mouse.
- [x] Contextual Symmetry: show the control only while Paint or Eraser is active; preserve the saved symmetry setting elsewhere.
- [x] Two-finger pan on the zoomed editor canvas (touch).

## Combine movement and color cycling — implemented

- [x] Choose movement and color effects independently, including color-only animation.
- [x] Move glyphs and their cell colors, then calculate animated inks at destination positions.
- [x] Share one loop duration and frame calculation across preview, GIF, video, PNG frame ZIP, and C64 programs.
- [x] Preserve source artwork, replay, project settings, and history.
- [x] Test all nine movement/color combinations and exported pixels.
- [x] Move **Inverse pulse** from Movement / reveal into the Color animation section. It flips character appearance (normal ↔ inverse glyphs) without translating cells, so it fits color/appearance effects better than motion. Keep independent stacking with true movement effects; preserve project ids / migration for existing `inverse` saves.

## Shape animation effects — implemented

- [x] Scroll left, right, up, or down with explicit direction controls.
- [x] Set movement-wave and color-wave directions independently.
- [x] Choose sine, triangle, square, sawtooth, or reverse sawtooth for each wave.
- [x] Set independent movement/color rates of 1, 2, 4, 8, or 16 cycles inside an overall loop duration.
- [x] Keep cycle boundaries aligned across preview and every output; warn for undersampled combinations.
- [x] Keep controls contextual and share saved settings across preview and downloads.

## Run artwork on a C64 — first player implemented

- [x] Export a runnable still-picture PRG with both character sets and per-cell colors.
- [x] Play sampled replay, color cycling, movement, inverse effects, and combinations using compressed changed runs.
- [x] Support continuous playback, 1–100 repetitions, and RUN/STOP exit.
- [x] Check geometry, memory budget, estimated playback work, and actual 6502 CPU execution.
- [x] Package the same still/animation player in a standard D64 disk image, with directory and allocation checks and independent PRG extraction.
- [x] Verify representative stills and composite playback in full PAL/NTSC VICE emulation, including VIC-II pixels, timing, BASIC return, and D64 loading through a 1541-II drive.
- [x] Measure full-screen repeated, fragmented, sparse, and unequal-duration updates on PAL/NTSC; preserve cumulative timing across two loops.
- [x] Compact scattered changes into literal byte runs, reducing full-screen update work and program size.
- [ ] Verify on physical PAL/NTSC C64 hardware, including RUN/STOP key handling.
- [ ] Verify transfer to physical storage devices.
- [ ] Evaluate raster-synchronized updates and procedural native effects. See [native player rewrite](native-player-rewrite.md) (owner-approved scope; hybrid replay + procedural profiles).

The fragmented full-screen benchmark now copies in at most 6 clock ticks (about 0.1 seconds), down from 18 ticks on PAL. Raster synchronization alone cannot fit that work into one screen refresh; further work needs faster decoding, staged updates, or native effects. See [VICE performance checks](vice-validation.md#full-screen-performance).

See the [C64 output guide](c64-output.md) for loading instructions, timing, memory limits, and verification scope.

## C64-only editor — implemented

- [x] Remove legacy approximate shapes, their renderers and stencil checker, v1 projects, Unicode/mixed text imports, and obsolete single-effect color settings. The later unified-alphabet change replaces numeric v2 projects with v3.

The [UI review](ui-review.md#follow-ups-to-evaluate) tracks layout experiments. [AGENTS.md](../AGENTS.md#future-features-to-explore) lists other possible editing features.

## C64 memory expansion / REU support — lowest priority

New animation types take priority over this optional hardware feature.

- [ ] Investigate an optional REU-aware export/player mode for larger animations, with expansion detection, loading and DMA transfers into main memory.
- [ ] When designing expansion-aware players, also consider **C128 bank 1** (`FRE(1)` ≈ 64,256) via MMU banking. The C128 boot banner’s **122,365** is bank 0 + bank 1; today’s linear `$1C01` player only budgets bank-0 `FRE(0)` (58,109). Bank-1/REU capacity is optional and must not replace standard bank-0 exports.
- [ ] Validate capacity, timing, glyph/color accuracy and RUN/STOP behavior in VICE with REU emulation before physical-hardware testing.
- [ ] Keep standard C64 / C128 bank-0 / Plus/4 exports available. Extra RAM does not automatically extend the current player or remove every playback-speed limit.
- [ ] Optional case frame on PNG, SVG, GIF, and video: one export-cell thick, default off, square corners, using the editor highlight color. ZIP and PRG/D64 stay artwork pixels only. The editor bezel stays on-screen chrome.
