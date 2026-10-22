# Planned work

These features are planned, not available in the editor yet. For current features, use the [user guide](../README.md).

## Combine movement and color cycling

- [ ] Allow a movement animation and a color-cycling animation to run at the same time.

**Example:** scroll the drawing left while its cell colors cycle through the C64 palette.

### What the feature should support

- Choose movement and color effects independently.
- Combine **Scroll left**, **Scroll up**, or **Wave rows** with **Color cycle**, **Rainbow wave**, or **Warm glow**.
- Keep each effect usable on its own.
- Make the combination match in preview, GIF, video, and PNG frame ZIP.
- Preserve original glyphs, cell colors, shared background, replay, and undo history.
- Store both choices in editable projects. Define how existing single-effect projects reopen.

### Decisions for implementation

1. Define effect order: move glyphs and their cell colors, then calculate animated ink colors.
2. Define whether the two effects share one loop duration, and label that timing clearly.
3. Reuse the shared frame calculation across every output format.
4. Test visible results, timing, save/load, cancellation, and edits during export.

## Run artwork on a C64

- [ ] Export a runnable still-picture PRG.
- [ ] Add native C64 drawing replay and color cycling.
- [ ] Extend playback to movement and inverse effects.

See the [C64 output guide](c64-output.md) for the proposed format, memory limits, transfer considerations, and testing stages.

## Other ideas

The [UI review](ui-review.md#follow-ups-to-evaluate) tracks layout experiments. [AGENTS.md](../AGENTS.md#future-features-to-explore) lists other possible editing features.
