# Planned work

This page tracks requested work and completed milestones. For current controls, use the [user guide](../README.md).

## Current priorities

1. **Expand C64 animation capacity:** support more **40 × 24 movement-wave animations combined with color-wave animations**, guided by the [capacity measurements](c64-capacity.md).
2. **UI validation:** physical iPad/Pencil reach and larger-text checks after the compact cleanup.
3. **Follow-up work:** physical C64 hardware checks, richer imports and other usability improvements.

## Major UI cleanup — implemented

- [x] Review drawing, selection, animation and download workflows; simplify tool grouping and contextual actions.
- [x] Remove stamps; retain Select and Duplicate for repeating artwork.
- [x] Keep Undo/Redo together and preserve the active drawing tool during Undo.
- [x] Add tap endpoints and keyboard alternatives to dragging.
- [x] Put compact tappable help beside headings; keep selection actions below the canvas.
- [x] Show C64 export readiness and offer only exporter-tested longer-loop remedies.
- [x] Add automated pointer, keyboard and iPad layout regressions.
- [ ] Verify physical finger/Pencil reach and larger text on an iPad.

## Expand C64 animation capacity — investigation

Target: export a **40-column × 24-row** drawing with movement waves and color waves running together. Establish what detail, speed and loop length the C64 player can reliably accommodate before promising support.

- [x] Add representative 40 × 24 combined-wave workloads, including sparse, repeated, detailed and mixed-bank glyphs, widespread ink changes and four-cycle loops.
- [x] Measure program/stream size and estimated update-budget usage across 20 cases; separate screen, color, character and framing bytes.
- [ ] Measure actual decode time, frame timing and loop drift for the combined-wave workloads on PAL/NTSC.
- [x] Pack two color inks per byte when savings exceed decoder overhead; the repeated-pattern baseline now fits at 4/8/12 seconds.
- [x] Reuse exact frame-update bodies; the four-cycle full-screen baseline falls to 22,269 bytes and fits exporter checks at 8/12 seconds.
- [x] Use indexed literal copies and inline packed colors; combined full-screen updates need 47.8% fewer measured CPU cycles in the deterministic CPU fixture.
- [x] Prototype native row routines and frame lookup tables: the private 96-frame full-screen reference meets its two-second timeline in CPU tests. See [native row prototype](c64-native-rows.md).
- [ ] Validate the native prototype in full VICE before selecting it in the editor.
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
