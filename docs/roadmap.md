# Planned work

This page tracks requested work and completed milestones. For current controls, use the [user guide](../README.md).

## Current priorities

1. **Major UI cleanup:** simplify the drawing workflow and tool palette; evaluate removing stamps because their current interaction is confusing.
2. **Expand C64 animation capacity:** investigate supporting full-screen **40 × 24 movement-wave animations combined with color-wave animations**.
3. **Follow-up work:** physical hardware checks, richer imports and other usability improvements, after these priorities unless needed to verify them.

## Major UI cleanup — next

- [ ] Review the complete drawing, selection, animation and download workflows for confusing controls and unnecessary steps.
- [ ] Simplify the familiar tool palette, control grouping and contextual actions, keeping routine actions easy to reach on iPad.
- [ ] Evaluate removing the stamp function rather than adding more stamp controls; decide whether its value justifies the interaction cost.
- [ ] Verify the resulting workflows with touch, Pencil, mouse and keyboard, including clear tool state and Undo behavior.

This is a planned review; stamps remain available until the removal decision is implemented.

## Expand C64 animation capacity — investigation

Target: export a **40-column × 24-row** drawing with movement waves and color waves running together. Establish what detail, speed and loop length the C64 player can reliably accommodate before promising support.

- [ ] Add representative 40 × 24 combined-wave workloads, including detailed glyph patterns and widespread ink changes.
- [ ] Measure program/stream size, decode time, frame timing and loop drift; identify whether memory, update work or both cause rejection.
- [ ] Compare faster decoding and data encoding, staged screen updates, and native procedural movement/color effects. Keep the browser animation as the reference for intended output.
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
- [x] Save selections as reusable device-local stamps (up to 32).
- [x] Keep each completed drawing operation undoable; use pointer input for touch, Pencil and mouse.
- [ ] Evaluate physical Pencil reach; reassess stamps during the major UI cleanup before expanding motif-library organization.

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
