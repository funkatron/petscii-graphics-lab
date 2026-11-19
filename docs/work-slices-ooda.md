# Work slice queue (owner order)

One slice is planned, approved, implemented, and merged before the next begins. **Current:** [owner-program-queue.md](owner-program-queue.md) phases **0–1** (polish + Tier B #3).

| # | Track | Slice | Status |
| ---: | --- | --- | --- |
| 1 | Tier B drawing | **1a** Magic replace (ink + glyph) | **Merged** (v0.35.5) |
| 1 | | **1a′** Canvas toolbar panel | **Merged** (v0.35.6+) |
| 1 | | **1b** Grid labeling + derived-frame summary | **In PR** |
| 1 | | **1c** Line/rect stage hints + help | **In PR** (with 1b) |
| 2 | Roadmap **#3** | Colors/register help, Canvas size label | **In PR** (with 1b) |
| 3 | Roadmap **#1** | Next animation prototype (native gate) | Queued |
| 4 | Roadmap **#2** | VICE / capacity for shipped effect | Queued |
| 5 | Roadmap **#7** | `canvas-view.js` first slice — see [modularization-slices.md](modularization-slices.md) | Queued |

---

## Slice 1a — Magic replace (ink + glyph) *(approved 2026-11-17)*

**Shipped target:** v0.35.5 (sidebar) → **v0.35.6** drawing-strip **Canvas** popover

### Scope

| Action | Rule |
| --- | --- |
| **Recolor with current brush ink** | All painted cells → brush ink |
| **Replace ink** | Painted cells with ink *From* → ink *To*; glyphs unchanged |
| **Replace glyph** | Cells with glyph *From* → glyph *To*; inks unchanged |

Each action is one `remember()` step and updates `recordCell` per changed cell (replay-compatible).

### Out of v1

- Replace by glyph+ink pair simultaneously
- Empty-cell ink replacement
- Pick *From* from canvas tap

### Tests

`tests/magic-replace.unit.mjs`, `tests/magic-replace.spec.cjs`

### Next after merge

**Slice 1b** — Grid labeling / **Show grid** (editor-borrowings Tier B).

**Follow-up (shipped on main with stability pass):** Symmetry keeps its strip slot when inactive (`inert` + dim), not `hidden`.

### Slice 1a′ — Canvas toolbar *(approved 2026-11-17)*

- **Canvas** icon on the drawing strip (after Ink): popover with recolor, replace ink/glyph, border, checkerboard, clear.
- Panel **?** help describes each action; sidebar Colors/Canvas setup no longer duplicate these controls.