# UI review: Raskin principles — November 2026

**Reviewed:** 23 November 2026 · **Build:** 0.35.25 (`57e61cf`)

This review applies Jef Raskin’s *The Humane Interface* to the current editor. It follows the [October Raskin pass](ui-review.md#raskin-informed-follow-up--23-october-2026) and the [consolidated audit](ui-audit-2026-10-24.md).

## Evidence and limits

- Measured in Chromium at 1180 × 820 (landscape) and 820 × 1180 (portrait), the CSS viewport of an 11-inch iPad.
- Compared with an iPad Safari screenshot of 0.35.6 (17 November 2026).
- **Not tested:** physical iPad Safari, Apple Pencil, VoiceOver. Touch reach and occlusion still need a device.
- This is an expert review, not an observed user study.

## Principles used

| Principle | Meaning here |
| --- | --- |
| Habituation | Users act from habit. A control that moves breaks the habit and causes errors. |
| Modes | A mode is a state where the same action gives a different result. Hidden modes cause mode errors. |
| Locus of attention | People notice feedback only where they are looking — usually the canvas. |
| Monotony | One reliable way to do each thing builds habits faster than several ways. |
| Quasimode | A mode held by a physical action (holding a key). Releasing ends it, so it cannot be forgotten. |
| Fitts’s law | Small or distant targets take longer and miss more often. |

## High priority

### H1. Controls and the canvas move with state changes

This also breaks the layout-stability rule in [AGENTS.md](../AGENTS.md).

| Trigger | Measured movement |
| --- | --- |
| Stage status text changes (Ready, Undid edit, Animation paused, empty-canvas Play message) | Zoom, Grid and Symmetry move horizontally by up to 108 px |
| Entering preview | A banner row appears; canvas shrinks 559 → 512 px wide and moves down 47 px |
| Making a selection | The Move/Duplicate/Delete row appears; canvas shrinks about 56 px |
| Switching Download tabs | Dialog top edge, height and tab widths change |

**Proposed fix:** fixed-width status slot with truncation; reserve the preview and selection rows (or overlay them); fixed Download dialog geometry.

### H2. Preview is a mode with inconsistent signals and exits

- During preview, Paint, Pick and Fill are `aria-disabled` but render at full opacity. Paint stays orange, so it looks active. Eraser, Line, Rectangle, Select and Text dim to 50 %.
- Tapping Fill during preview leaves preview and selects Fill. Tapping Line does nothing.
- Choosing ink or pressing Undo also leaves preview without saying so.

**Proposed fix:** one rule for every control. Recommended: any editing action returns to drawing, and the preview banner says so.

### H3. Paint, Pick and Fill have hidden options

- Each has an option menu (for example Paint: Glyph and ink / Glyph only / Ink only). The only cue is a small ▾.
- A chosen option such as Ink only persists with nothing visible on the button.
- The canvas hint reads “Glyph and ink · Light blue”. It no longer names the tool, which AGENTS.md requires. In 0.35.6 it read “Paint · Orange ink · Glyph and ink · Drag to draw.”
- Hints differ between tools: the Line hint omits the ink.

**Proposed fix:** show the option on the button face; use one hint format for all tools: tool · option · glyph · ink.

## Medium priority

| ID | Finding | Proposed direction |
| --- | --- | --- |
| M1 | Status appears in three places (stage bar, canvas hint, header). Stale messages persist: “Redid edit” during a selection, “Ready to draw” inside the Download dialog. | Show transient feedback beside the canvas and let it fade; drop routine messages. |
| M2 | Device save status is an icon-only ✓ (previously “Saved on this device”). | Restore a short word: Saved / Not saved. |
| M3 | Duplicate entry points: Play (header and sidebar), Return to drawing (sidebar and stage), ink (strip, Colors, Canvas menu). Colors are named in the Ink popover but shown as 0–F in the Canvas menu. | One primary place per action; one color naming scheme. |
| M4 | The Canvas button sits among drawing tools and looks like one, but opens whole-drawing commands. Replace ink defaults to White → Red. | Group it apart from tools; apply Recolor/Replace to an active selection; default “To” to current brush ink. |
| M5 | At 1180 px (11-inch iPad landscape) the glyph panel overlays about 40 % of the artwork, because docking starts at 1200 px. Choosing a glyph takes three taps. | Lower the docking threshold, or add recent glyphs to the strip. |

## Lower priority

| ID | Finding | Proposed direction |
| --- | --- | --- |
| L1 | Only ⌘Z / ⇧⌘Z exist. No quasimodes. | Hold Option to pick, hold Space to pan, two-finger tap to Undo. |
| L2 | Tap endpoints is a persistent global mode for Line and Rectangle. | Let a tap set a point and a drag draw, without a setting. |
| L3 | Small targets: ▾ option markers; 28 px help buttons. | Larger option affordance; check help target spacing. |
| L4 | The animation timing summary wraps in half the sidebar width. | Use the full column width. |

## Working well

- Undo keeps the active tool (audit item U10).
- One stroke is one Undo step.
- Clear drawing is undoable instead of confirmed.
- Native program download shows readiness before download.
- Selection is select-first: choose the area, then Move or Duplicate.

## Next steps

1. Fix H1 (layout stability).
2. Fix H2 (preview consistency).
3. Fix H3 (visible tool options and consistent hint).
4. Evaluate M1–M5 after device testing.

## References

- Jef Raskin, *The Humane Interface* (Addison-Wesley, 2000).
- Jef Raskin, [“Down With GUIs!”](https://www.wired.com/1993/06/1-6-guis/) (*Wired*, 1993).
