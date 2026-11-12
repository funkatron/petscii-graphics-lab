# Planned work

This page tracks requested work and completed milestones. For current controls, use the [user guide](../README.md).

## Project workflow — implementation, browser validation pending

See issue #66. New Project resets to a blank default drawing with confirmation and Undo recovery. An icon-only refresh button generates adjective–noun names. All export formats use the same validated project name and capture it before asynchronous work; caches account for renaming. Names stay outside v3 drawing data. Regression coverage includes reset/cancel/Undo, source preservation, filename sanitization, export contents and in-flight naming. Chromium and iPad WebKit CI results are required before release.

## Current priorities

1. **UI validation:** physical iPad/Pencil reach and larger-text checks after the compact cleanup.
2. **Drawing and import usability:** typed entry and text-file import are implemented; evaluate further everyday drawing improvements.
3. **New animation types:** prioritize additional creative effects over C64 capacity optimization and memory-expansion support; continue the demoscene-inspired effects below.
4. **Animation and C64 follow-ups — lower priority:** current animation behavior meets the owner’s needs. Keep further capacity optimization, broader PAL/NTSC VICE validation and physical C64/storage checks as follow-ups; revisit when a concrete need or playback issue arises.

## Native Commodore 128 40-column animation player — planned

Build a **separate native C128-mode player/export target** for PETSCII Graphics Lab artwork and animations. This means a PRG that starts and runs **without `GO64`**, using the C128's VIC-IIe **40-column display**. It is **not** a request for 80-column VDC/RGBI support, and C64-mode compatibility alone does not satisfy it.

- [ ] Research C128 native-mode memory banking, BASIC 7.0 program loading, VIC-IIe initialization, character RAM and color RAM access, interrupt/timing requirements, and clean exit to BASIC.
- [ ] Reuse the existing C64 exporter’s validated artwork, glyph/color frames, timing semantics and compression where practical, while keeping a **distinct C128 executable player** and export choice. Avoid duplicating animation logic unnecessarily.
- [ ] Generate a loadable native C128 PRG with documented load/run instructions; ensure it runs in C128 40-column mode without switching to C64 mode.
- [ ] Verify still frames, animated playback, character shapes, colors, loop closure, and recovery/exit using appropriate emulation and automated byte-level checks.
- [ ] Validate on the owner's physical Commodore 128 and 1541, including output on the existing composite CRT setup; document differences from C64-mode playback and any unsupported effects.
- [ ] Keep existing C64 PRG/D64 exports unchanged and do not claim native C128 compatibility until verified.

**Scope:** native C128 **40-column player**, not an 80-column VDC player, RGBI export, or machine-wide editor mode.

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

A shader is a visual effect applied over the rendered canvas. Explore quick ways to choose and apply optional effects while preserving the editable glyphs and cell colors.

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


- [ ] Investigate diagonal directions for movement animations, using the existing color-animation direction choices as a reference. Source review and a proposed first scroll implementation are documented in the [diagonal movement investigation](diagonal-movement.md). Ordinary Scroll shipped with eight directions in PR #44; unsupported picker entries were removed in PR #50; diagonal Starfield shipped in PR #62; diagonal Sine scroller is implemented with browser checks pending; waves and Wipe remain separate follow-ups. Validate preview/export consistency before release.

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
- [ ] Verify physical finger/Pencil reach and larger text on an iPad.
- [x] Validate 200% text in both iPad orientations, including header controls, glyph selection, download navigation and saved artwork; flexible-header change released with PR #20. Physical device text testing remains open.

## C64 animation capacity — lower-priority follow-ups

Current animation behavior meets the owner’s needs. Further optimization and broader machine validation remain useful follow-ups, but do not lead the roadmap. Fix reported regressions as needed.

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

## Richer drawing tools — implemented

- [x] Fill connected cells with the selected glyph and ink.
- [x] Draw straight lines and outlined rectangles with a visible preview before applying.
- [x] Select, move, duplicate and delete regions.
- [x] Evaluate reusable stamps; remove them during UI cleanup in favor of Select and Duplicate.
- [x] Keep each completed drawing operation undoable; use pointer input for touch, Pencil and mouse.
- [ ] Evaluate physical Pencil reach before expanding drawing controls.

## Combine movement and color cycling — implemented

- [x] Choose movement and color effects independently, including color-only animation.
- [x] Move glyphs and their cell colors, then calculate animated inks at destination positions.
- [x] Share one loop duration and frame calculation across preview, GIF, video, PNG frame ZIP, and C64 programs.
- [x] Preserve source artwork, replay, project settings, and history.
- [x] Test all nine movement/color combinations and exported pixels.

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
- [ ] Evaluate raster-synchronized updates and procedural native effects.

The fragmented full-screen benchmark now copies in at most 6 clock ticks (about 0.1 seconds), down from 18 ticks on PAL. Raster synchronization alone cannot fit that work into one screen refresh; further work needs faster decoding, staged updates, or native effects. See [VICE performance checks](vice-validation.md#full-screen-performance).

See the [C64 output guide](c64-output.md) for loading instructions, timing, memory limits, and verification scope.

## C64-only editor — implemented

- [x] Remove legacy approximate shapes, their renderers and stencil checker, v1 projects, Unicode/mixed text imports, and obsolete single-effect color settings. The later unified-alphabet change replaces numeric v2 projects with v3.

The [UI review](ui-review.md#follow-ups-to-evaluate) tracks layout experiments. [AGENTS.md](../AGENTS.md#future-features-to-explore) lists other possible editing features.

## C64 memory expansion / REU support — lowest priority

New animation types take priority over this optional hardware feature.

- [ ] Investigate an optional REU-aware export/player mode for larger animations, with expansion detection, loading and DMA transfers into main memory.
- [ ] Validate capacity, timing, glyph/color accuracy and RUN/STOP behavior in VICE with REU emulation before physical-hardware testing.
- [ ] Keep standard C64 exports available. Extra RAM does not automatically extend the current player or remove every playback-speed limit.
