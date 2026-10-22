# UI review: keep attention on drawing

**Reviewed:** 21 October 2026. **Status updated:** 22 October 2026.

This record explains the recent workspace changes and identifies follow-up work. For instructions on using the editor, see the [user guide](../README.md).

## What the review found

Frequent drawing actions were spread across settings panels. Choosing a glyph, changing ink, and recovering from a stroke required repeated navigation.

The earlier desktop layout had about 1,800 px of controls when Canvas, Colors, Animation, and Save & export were open, within an 875 px settings viewport. Collapsing sections reduced clutter but did not make repeated actions easier to reach.

The review aimed to preserve:

- A large canvas that fits the workspace.
- Authentic C64 bitmap previews.
- Independent scrolling for glyph browsing.
- Undo at the level of a complete stroke.
- Matching animation frames across output formats.

## Decisions and current status

| Decision | Status | What it helps the user do |
| --- | --- | --- |
| One Download action for the selected format | Implemented | Download without managing separate Generate and Save steps |
| Persistent drawing strip | Implemented | Reach glyph, ink, Paint/Eraser, symmetry, Undo, and Redo with settings hidden |
| Explicit animation preview state | Implemented | See the effect and paused state, then Return to drawing |
| Separate Download artwork panel | Implemented | Choose Image, Animation, or C64 data without scrolling settings |
| Project menu for editable backups | Implemented | Distinguish a file for later editing from artwork for sharing |
| Glyph families, recents, and favorites | Implemented | Find shapes by appearance or previous use |
| High-contrast glyph thumbnails | Implemented | Recognize shapes even when brush and background colors match |
| Optional palette pinning | Implemented | Keep choosing glyphs beside the canvas where space allows |
| Staged canvas resizing | Implemented | Inspect a crop, Apply or Cancel, and undo both dimensions together |
| Whole-drawing action groups | Implemented | Find Border, Checkerboard, Clear, and Recolor separately from brush changes |
| Independent movement and color controls | Implemented | Combine effects or use either alone without separate workspaces |
| C64 program with optional animation repeats | Implemented | Download runnable artwork; raw bytes/text stay in a disclosure |
| Independent cycle rates and loop duration | Implemented | Set effect cycles within an explicit total timeline |
| Device-save status and backup notice | Implemented | Know where the draft is kept and what to do if saving fails |

## Where controls belong

| Location | Contents |
| --- | --- |
| Header | Project menu, device-save status, Download artwork, Play/Pause |
| Drawing strip | Selected glyph, ink, Paint/Eraser, symmetry, Undo/Redo |
| Main workspace | Canvas, dimensions, preview state, Return to drawing |
| Glyph panel | Families, recents, favorites, screen-code pages, character options |
| Settings sidebar | Canvas setup, colors, animation effect and duration, help |
| Download panel | Output type, format, options, preview, dimensions/timing, Download |

The drawing strip stays in place as panels open. Navigation changes do not edit artwork or start playback.

## Keep these interaction rules

### Make the next action visible

- Keep the current brush and recovery controls reachable without settings scrolling.
- Keep effect name and paused state visible during preview.
- Use **Return to drawing** to restore the original artwork.
- Show output dimensions and animation timing near the Download action.

### Keep repeated work simple

- Reuse a completed animation file when artwork and settings still match.
- Prepare a new file after an artwork or output-setting change.
- Keep export progress and cancellation available after the panel is closed.
- Keep project open/backup actions in their own menu.

### Separate brush changes from broad edits

- Brush ink changes future strokes; Recolor applies to the whole drawing.
- Preview width and height together before applying a resize.
- Make reversible edits recoverable with Undo.
- Keep exact codes, both banks, inverse selection, accessible.

### Use space and labels consistently

- Retain the dark appearance and familiar canvas/palette positions.
- Keep glyph scrolling independent of settings; avoid nested scroll areas.
- Put longer explanations behind expandable help sections.
- Preserve visible selection, keyboard focus, readable contrast, and primary touch targets of at least 44 px.
- Keep essential feedback available without hover or color alone.

## Follow-ups to evaluate

These are ideas to test after using the new layout:

1. **Floating ink palette:** choose ink without opening the settings sidebar.
2. **Optional hexadecimal labels:** browse by shape while keeping exact codes available in accessible labels or details.
3. **Physical iPad/Pencil checks:** test reach, the hand covering controls or artwork, gestures, and portrait/landscape layouts on a device.
4. **Large-text checks:** confirm that labels, focus, and primary actions remain usable at larger text sizes.

Preserve familiar control positions as these changes are evaluated. Avoid adding mandatory Draw/Animate workspace tabs; drawing and preview can share the existing canvas.

## Tasks for future UI checks

1. Draw, switch glyph, change ink, erase, undo, and resume without settings scrolling.
2. Hide settings and reach every routine drawing/recovery control.
3. Preview a color effect, pause, return to drawing, and confirm the original colors.
4. Download a GIF twice, then change timing or artwork and download the updated file.
5. Change both canvas dimensions; inspect the crop, cancel, apply, undo, and redo.
6. Check keyboard focus, contrast, large text, and touch reach in both iPad orientations.

Browser automation covers reproducible interactions. Finger/Pencil reach and the hand covering controls or artwork need a physical device.
