# Individual cell editing — OODA plan

**Status:** **Approved (2026-11-17).** Implementing as **Edit cell** (v0.35.3+).

**Owner decisions:** under-canvas inspector bar; dedicated tool only; live glyph/ink/clear (full palette); clear = Eraser; no replay events; help via **?** pop-ups on the tool and Drawing tools help.

---

## Observe

- Drawing today is **stroke-based**: Paint/Eraser, Fill, Line, Rect, Select/move/duplicate, Text, Picker (eyedropper), glyph-only / ink-only paint modes.
- A single cell’s glyph and ink can be changed only by painting over it, filling, picker sampling, or text apply — there is no dedicated **inspect one cell → edit fields → apply** flow.
- Competitors (Wizard, Petmate, Marq) often support click-to-edit or attribute panels for the active cell.
- iPad users may want precision without zooming in to hit one cell with a brush; keyboard users already have arrow keys + Enter on the canvas.
- v3 projects store per-cell glyph IDs and inks; no layer or per-cell animation overrides.

## Orient

| Goal | Constraint |
| --- | --- |
| Fix mistaken cells without broad strokes | One undo step per apply; match existing `remember()` / `commitTool` patterns |
| Teach glyph vs ink vs empty | Reuse glossary terms; do not add screen-code confusion in UI |
| iPad + Pencil + keyboard | 38px targets; no nested scroll in sidebar |
| Animation preview lock | Cell edit disabled while preview read-only (same as Paint/Eraser) |

**Risks:** Overlapping Picker and Selection tools; scope creep into multi-cell spreadsheet edit; breaking stroke replay metadata if cell edits bypass replay log.

**Non-goals (v1):** Per-cell animation keys; layers; editing color RAM export blocks separately from ink; bulk spreadsheet paste.

## Decide (proposed v1 scope)

| In | Out |
| --- | --- |
| **Edit cell** mode (or inspector drawer): shows column/row, current glyph preview, ink swatch, actions **Pick glyph**, **Set ink**, **Clear cell** | Multi-cell simultaneous edit |
| Activate via canvas tap in new tool **or** long-press on cell **or** Enter when focus ring on cell (extend existing keyboard flow) | Sub-cell / quarter-block |
| Apply = one undo entry; updates `grid` + `cellColors` like a 1×1 paint | Changing replay event log unless effect is Replay drawing |
| Accessible names: “Cell column 5, row 3”, glyph family name from palette | Hex screen codes unless **Show glyph codes** on |

**Decisions (locked):**

1. **Inspector bar** under the canvas (like reference overlay).
2. **Dedicated** **⊡ Edit cell** tool only (no long-press / Enter in v1).
3. **Change on pick**; **one undo** when leaving the tool (**Done** or switching away).
4. **Clear** = Eraser (empty glyph, brush ink); **no** `recordCell` / replay events.
5. **Picker** stays separate.
6. Naming via contextual **?** help, not a long sidebar label.

**Acceptance:** README section; Playwright sets one cell via inspector; undo restores; preview lock blocks edit; exports unchanged for untouched cells.

## Act (implementation sequence — after approval)

1. Spike UI placement (popover vs dock under canvas) with static HTML mock in branch; iPad tap test.
2. `cell-inspector.js` (pure helpers): `cellIndex(x,y)`, validate glyph/ink, apply patch to arrays.
3. Wire mode into `drawingTool` / `updateToolPalette`; pointer handler for single-cell tap.
4. Glyph picker integration: open palette with callback to chosen ID.
5. Replay: document whether direct cell apply appends to replay events or only affects static grids.
6. Tests: `cell-editing.spec.cjs` (Chromium + iPad portrait).
7. Roadmap Tier B / #5 cross-link.

---

## Related roadmap

- Tier B: line/rect/fill, selection tools — cell edit should not duplicate **Picker** or **Fill**.
- Future: **Tile stamp**, motif libraries — may reuse inspector chrome.

See [tier-a-ooda-plans.md](tier-a-ooda-plans.md) for current queue.