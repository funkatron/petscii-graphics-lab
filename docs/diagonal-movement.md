# Diagonal movement investigation

## Finding

Diagonal scrolling is feasible in the existing derived-frame pipeline. It requires coordinated changes to direction validation, control state, frame planning and sampling; adding select options alone would produce incorrect movement. This is a source review and implementation proposal, not a tested feature.

## Effect scope

| Effect | Proposed treatment | Reason |
| --- | --- | --- |
| Horizontal/vertical scroll | First implementation: add four diagonal choices | Both source coordinates can wrap independently while glyphs and inks move together. |
| Starfield | Follow-up after scroll | Each depth can use the same two-axis travel rule; retain collision order. |
| Sine scroller | Separate design | The current bend is perpendicular to one travel axis. A diagonal path needs a defined bend axis and amplitude. |
| Patterned wipe | Separate design | Direction controls reveal ranking rather than translation; diagonal reveal needs explicit pattern rules. |
| Wave | Separate design | Current direction chooses row or column displacement. Diagonal propagation and diagonal displacement are different effects. |
| Ripple, logos, replay, inverse | Keep existing controls | Ripple is radial; logos have their own paths; the other effects do not translate by direction. |

## Proposed first implementation

Use the existing four color-direction names: Up-left, Up-right, Down-left and Down-right. Introduce a movement-scroll direction set separate from wave and color direction sets. Keep all current cardinal results byte-identical.

For diagonal scroll, use normalized travel: one canvas width horizontally and one canvas height vertically per motion cycle. At phase `p`, sample source offsets `floor(p * columns)` and `floor(p * rows)` with signs chosen for the direction, then wrap each coordinate independently. For example, Up-left reads from increasing source x and y, moving visible artwork toward the upper left.

This closes both axes at every cycle boundary and makes loop duration predictable. On rectangular artwork the path follows the canvas diagonal; it is not necessarily 45 degrees in cell coordinates. Equal cell speed on both axes would instead need a traversal based on the least common multiple of width and height to close both axes, potentially producing much longer paths. Keep that alternative out of the first implementation unless requested.

Sampling should target `max(columns, rows)` frames per diagonal cycle, then use the existing cycle and 20 ms frame-budget rules. Test uneven dimensions where the short axis repeats positions. Preserve one-cell dimensions and the existing minimum-sample warning policy.

## Data and UI changes

- Keep existing `scroll-x` and `scroll-y` projects valid. Add an explicit diagonal-scroll effect identifier rather than treating every nonhorizontal direction as vertical. Save it with the existing `scrollDirection` field.
- Show one readable scroll choice in the movement menu, with eight direction choices only for ordinary scrolling. Existing cardinal labels/behavior can remain until a separately tested UI consolidation.
- Update `setAnimationSettings`, effect-change handlers, `animationName`, validation, `animationPlan` and `animationCells` together. Restrict unsupported diagonal combinations atomically; do not let Starfield, Sine scroller or Wipe silently interpret them as vertical.
- Preserve source snapshots, cell inks, history, autosave and cache identity. Preview and modern/native exports should consume the same sampled frames. C64 exporter memory/timing limits still apply.

Adding a new effect identifier extends the supported v3 settings; older app versions will reject it. Existing v3 projects must retain their current output. No project migration is needed for cardinal files.

## Ready for implementation

- [x] Trace cardinal direction assumptions in controls, import, planning and sampling.
- [x] Define rectangular-grid loop closure and distinguish it from equal cell speed.
- [x] Bound the first feature to ordinary scroll; record other effects separately.
- [ ] Add independent expected frames for all eight directions on square, rectangular, one-row and one-column artwork.
- [ ] Verify glyph/ink pairing, independent color cycles, loop closure and warning boundaries.
- [ ] Check preview, decoded GIF/PNG ZIP and C64 frame inputs against the same independent expectations; retain cardinal byte regressions.
- [ ] Check exact save/open, autosave, Undo, invalid combinations and export snapshots/cache invalidation.
- [ ] Validate Chromium and both iPad WebKit layouts before release.
