# Physical device checklist

Use this list after automated Playwright passes when you have a real phone or iPad. It mirrors high-value cases from `tests/phone-workspace.spec.cjs`, `tests/interaction.spec.cjs`, and `tests/workspace.spec.cjs` without replacing them.

Record the device, OS version, browser, and date at the top of your notes.

## Before you start

1. Open https://funkatron.github.io/petscii-graphics-lab/ (or your local build URL).
2. Confirm **Saved on this device** appears after a short edit (autosave).
3. Hide settings with **☰** so the canvas is as large as possible.

## Phone (portrait, ≤430 px wide)

| Step | Action | Pass criteria |
| --- | --- | --- |
| 1 | Tap **Glyphs**, pick a shape, close picker | Canvas stays visible; no page scroll while drawing |
| 2 | **Ink** → choose a swatch | Palette dismisses; brush color updates |
| 3 | Drag across canvas | Continuous stroke; **Undo** restores prior grid |
| 4 | Open **☰** (overlay settings) | Sidebar fits screen; **Apply size** reachable |
| 5 | **Download artwork** → PNG | File saves; colors match canvas |
| 6 | Rotate to landscape (short height) | Drawing strip and **Play** remain reachable; safe areas respected |

## iPad (Safari, Pencil or finger)

| Step | Action | Pass criteria |
| --- | --- | --- |
| 1 | Pin glyph picker (wide layout) if offered | Picker scrolls independently of settings |
| 2 | Draw with Pencil across many cells | No page scroll in canvas; one undo per stroke |
| 3 | **Text** tool → tap cell → type on on-screen keyboard | Preview matches C64 glyphs; **Apply text** works |
| 4 | **☰ → Animation** → Play header control | Preview read-only; **Return to drawing** restores art |
| 5 | **Project → Share / Save project** (if shown) or download JSON | Editable project opens again with same grid |
| 6 | Portrait: start with settings closed | More canvas space; glyph picker overlay closes on selection |

## Regression spot checks (any device)

- **Show letters & numbers** stays off after import and Undo.
- **Paint** / **Eraser** stay selected when tapped again (no toggle).
- Animation export: GIF completes and plays once without editing the source drawing.

## When something fails

Note screen size, orientation, which control failed, and whether autosave still works. Compare with the matching Playwright spec name if one exists.
