# Planned work

This page tracks requested work and completed milestones. For current controls, use the [user guide](../README.md).

## Unified alphabet — approved, not implemented

- [ ] Offer uppercase and lowercase alongside the full graphics palette without switching the whole drawing's character bank.
- [ ] Update glyph identifiers, projects, rendering and every export consistently; preserving old formats is not required.
- [ ] Build per-artwork RAM character sets for C64 playback and check the 256-pattern limit across the complete animation. The two source banks contain 304 distinct bitmaps, so one fixed 256-slot set cannot contain everything.
- [ ] Verify mixed-case text and graphics in browser output and C64 execution.

Meanwhile, the existing whole-drawing character-set control stays above the glyph list in the sticky picker header, with its scope explained.

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

- [x] Remove legacy approximate shapes, their renderers and stencil checker, v1 projects, Unicode/mixed text imports, and obsolete single-effect color settings. Keep the authentic C64 editor and current numeric v2 projects intact.

The [UI review](ui-review.md#follow-ups-to-evaluate) tracks layout experiments. [AGENTS.md](../AGENTS.md#future-features-to-explore) lists other possible editing features.
