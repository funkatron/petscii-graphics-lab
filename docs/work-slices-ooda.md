# Work slice queue (owner order)

One slice is planned, approved, implemented, and merged before the next begins. **Current:** slice **1a** (magic replace).

| # | Track | Slice | Status |
| ---: | --- | --- | --- |
| 1 | Tier B drawing | **1a** Magic replace (ink + glyph) | **In PR** |
| 1 | | 1b Grid labeling | Planned |
| 1 | | 1c Line/rect polish | Planned |
| 2 | Zoom / selection polish | TBD | Outline |
| 3 | Motif / stamp spike | TBD | Outline |
| 4 | Animation research → ship | TBD | Outline |
| 5 | Modularization (`canvas-view.js`, …) | TBD | Outline |

---

## Slice 1a — Magic replace (ink + glyph) *(approved 2026-11-17)*

**Shipped target:** v0.35.4 · **Colors → Whole drawing**

### Scope

| Action | Rule |
| --- | --- |
| **Recolor entire drawing** | All painted cells → brush ink (unchanged label) |
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