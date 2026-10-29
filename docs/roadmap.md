# Planned work

This page tracks requested work and completed milestones. For current controls, use the [user guide](../README.md).

## Current priorities

1. **UI validation:** physical iPad/Pencil reach and larger-text checks after the compact cleanup.
2. **Drawing and import usability:** typed entry and text-file import are implemented; evaluate further everyday drawing improvements.
3. **New animation types:** prioritize additional creative effects over C64 capacity optimization and memory-expansion support; continue the demoscene-inspired effects below.
4. **Animation and C64 follow-ups — lower priority:** current animation behavior meets the owner’s needs. Keep further capacity optimization, broader PAL/NTSC VICE validation and physical C64/storage checks as follow-ups; revisit when a concrete need or playback issue arises.

## Brittle-test audit — in progress

See the [audit findings and remaining work](test-reliability-audit.md).

- [ ] Audit animation tests for fixed sleeps, frame-clock races and samples that cover only the first few frames. Prefer controlled clocks and assert the displayed frame and its pixels together.
- [ ] Review fixed layout/pixel limits across both iPad orientations and enlarged text; preserve checks for actual overlap, reachability and glyph/color correctness.
- [ ] Review saved-project fixtures and default settings so schema additions and benchmark workload changes are explicit rather than accidental.
- [ ] Identify flaky shared helpers and order-dependent browser state. Reproduce failures before changing assertions; retain regressions for confirmed product defects.

## Typed alphanumeric entry — implemented

- [x] Enter letters and numbers with the Text tool instead of selecting each glyph.
- [x] Use native textarea input for uppercase/lowercase C64 glyphs and a visible starting cell.
- [x] Complete Chromium and both iPad WebKit CI layouts; released with PR #23.
- [ ] Verify the physical iPad on-screen keyboard.
- [x] Preview placement, explicit line breaks and right-edge wrapping; support native corrections and one-step Apply/Undo with cell colors.
- [x] Keep the graphics palette’s letters-and-numbers filter independent of typing.

## Additional animations — in progress

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

Wave height shipped in PR #24; doubled movement range and independent color-wave height shipped in PR #25. Grouped animation controls shipped in PR #26. Sine scroller and Raster-style bars shipped in PR #27 after Chromium and both iPad WebKit layouts passed. Plasma field shipped in PR #28. Bouncing/stretching logos, Starfield and Patterned wipe shipped in PR #29 after all three browser jobs passed. Independent wavelength controls shipped in PR #30 after all three browser jobs passed. A fresh sidebar grouping pass comes next, followed by Ripple animation. Existing animation optimization and C64 validation remain lower-priority follow-ups.

## Color-aware text exchange — implemented

- [x] Add optional labeled text with cell inks and shared background.
- [x] Preserve glyph-only imports, atomic validation and one-step Undo.
- [x] Complete Chromium and both iPad WebKit CI layouts; released with PR #21.
- [x] Open labeled text-grid files directly from Project with atomic validation and one-step Undo; released with PR #22.

## Sidebar follow-up — in progress

- [x] Group all animation timing in Timeline & preview; pair wavelength/height under each effect.
- [x] Add semantic Canvas size and Paint colors groups; retain separate whole-drawing actions.
- [x] Check automated iPad layouts, larger text, source preservation and existing workflows; released in PR #31. Physical-device checks remain open.
- [ ] Add Ripple: center-out radial movement using existing waveform, wavelength, height and cycle controls. Tunnel and Twist remain proposals.

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
- [x] Select native rows when the generic export fails its limits and native passes; share selection across readiness and PRG/D64 downloads. Preserve accepted generic output.
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
