# Tier A UX — OODA plans (priority #3)

Review **one section at a time** before implementation. Housekeeping on the roadmap tracks completion of issue #66 and this queue.

**Order:** 1 → Reference overlay import · 2 → Export / scroller copy · 3 → Animation glossary

---

## Item 1 — Reference image overlay → PETSCII

### Observe

- Competitors (Marq overlay, Petmate guide PNG, Wizard JPG/PNG import) trace or convert a bitmap into the character grid.
- We have **text grid import**, **glyph picker**, and **no** raster overlay or auto-trace path today.
- v3 projects are a single grid; AGENTS forbids layer stacks unless explicitly scoped.
- Placement guidance: [editor-borrowings.md](editor-borrowings.md) — **Project** or **Canvas**; optional trace layer **not** in v3 JSON.

### Orient

- **Product goal:** faster onboarding, not lossless photo→PETSCII.
- **Constraints:** GitHub Pages static app; authentic C64/TED glyphs only; one undoable import; iPad-primary interactions; no new v3 fields without owner break.
- **Accuracy:** document limits (palette, 2×1 cells, no sub-pixel fidelity).
- **Risks:** scope creep (full Marq auto-convert), performance on large images, misleading “perfect trace” expectations.

### Decide (proposed scope — revise before build)

| In | Out (v1) |
| --- | --- |
| User picks a local image; semi-transparent overlay on canvas aligned to grid | Persistent layers in project JSON |
| Opacity + optional scale/position before **Apply as import** | Quarter-block / sub-cell modes |
| **Apply** samples image into nearest allowed glyphs + inks (documented heuristic) | ML or external API |
| Clear overlay; result is one `remember()` history entry | Separate animation timeline |

**Acceptance:** README + help state accuracy limits; Playwright applies a fixture PNG and checks deterministic cells on a tiny grid; overlay does not break zoom/pan or preview lock.

### Act (implementation sequence — after you approve)

1. Spike sampling heuristic in a new `reference-overlay.js` (unit tests on fixed RGB fixtures).
2. UI: **Canvas** or **Project** entry → file picker → overlay draw on top of grid (CSS/canvas, read-only until Apply).
3. Wire Apply → grid mutation; Cancel removes overlay only.
4. Regression: drawing, undo, autosave, export unchanged when overlay dismissed.
5. Docs: editor-borrowings checkbox + maintainer contract paragraph.

---

## Item 2 — Export copy (scroller / native program)

### Observe

- Tier A asks for **scroller / native program labels** when **Scroll** + PRG align with Petmate habits ([editor-borrowings.md](editor-borrowings.md)).
- Tab label **Native program (PRG)** already shipped; **Movement** and **Backdrop effect** renamed.
- [c64-output.md](c64-output.md) and download panel notes may not mention **horizontal scroller**, **vertical scroller**, or effect slug filenames yet.
- Export filenames now include effect ids (`export-filename.js` on `main`).

### Orient

- **Copy-only** pass: no export bytes, no new effects.
- **Dynamic help:** when `animationEffect` resolves to scroll-x/y/diagonal, C64 download help could say “scroller-style program” where true.
- **Risk:** over-promising hardware DYCP; keep “style” language unless native path is literal scroll.

### Decide (proposed scope)

| In | Out |
| --- | --- |
| Contextual sentences in **Download → Native program** and/or `c64ExportHelp` when movement is scroll family | Renaming effect ids |
| Cross-link [c64-output.md](c64-output.md) for load/limit text | New export formats |
| README one-line on filename pattern (`project-effect-size`) | Full Petmate “9 scroller types” matrix |
| Playwright asserts help contains scroller hint when scroll-x + C64 tab visible | iPad-only physical copy review (manual) |

**Acceptance:** strings match visible control names; Chromium + one iPad layout snapshot or text assertion; no behavior change in PRG bytes.

### Act (after approval)

1. Inventory scroll-related effect ids and existing help nodes (`c64ExportHelp`, download dialog).
2. Add small `updateExportCopy()` hook tied to animation settings (mirror pattern of other contextual controls).
3. Patch `c64-output.md` + README export section.
4. Add focused spec `export-copy.spec.cjs` or extend `project-naming`/`cleanup` minimally.

---

## Item 3 — Animation glossary (procedural vs cel frames)

### Observe

- Borrowings recommend a short primer: effects **generate** frames; users need not paint every frame ([editor-borrowings.md](editor-borrowings.md) suggested help block).
- We have scattered notes (`About replay & speed`, animation sections) but no single **Glossary** disclosure.
- Wizard users expect a **frame bar**; we offer **Loop duration**, **cycles**, and **frame ZIP** as the bridge.

### Orient

- **Education, not UI restructure:** expandable help in **Animation** settings or download preview.
- **Terms:** glyph / ink / background vs backdrop; native program vs GIF; replay vs procedural stack; frame ZIP vs cel editor.
- **Risk:** wall of text on iPad; keep collapsible `<details>` per [ui-review.md](ui-review.md).

### Decide (proposed scope)

| In | Out |
| --- | --- |
| One new **Animation glossary** `<details>` (or expand existing disclosure) with 4–6 bullets from borrowings | Full timeline / cel strip UI (Tier B) |
| Link from Movement and Color section intros | Changing animation schema |
| README pointer under Preview an animation | Video walkthrough |

**Acceptance:** Playwright opens glossary, checks key phrases; iPad portrait reach test; labels still match `index.html` control names.

### Act (after approval)

1. Draft copy in `docs/ui-review.md` or inline in `index.html` help-disclosure pattern.
2. Implement disclosure + `aria` labels.
3. `tests/animation-glossary.spec.cjs` (open menu, expand, match strings).
4. Mark Tier A glossary item done on roadmap; spot-check editor-borrowings table.

---

## After Tier A

Per [roadmap.md](roadmap.md), **done when** Tier A checkboxes are green and iPad WebKit spot-checks pass on changed strings. Then Tier B (line/rect, show grid label, etc.) or priority **#1** animation prototypes per owner choice.