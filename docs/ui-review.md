# UI review: drawing flow and predictable actions

Reviewed 21 October 2026 against the live application and current implementation. The goal is reducing attention spent managing the editor while retaining useful creative control.

## Main finding

The editor organizes most controls by implementation area. A user repeatedly choosing a glyph, changing ink and drawing must navigate several separate places. Disclosures reduce initial clutter but do not solve repeated access: opening Canvas, Colors, Animation and Save & export produces about 1,800 px of controls in an 875 px settings viewport in the inspected desktop layout.

The successful features to preserve are the large automatically fitted canvas, authentic bitmap glyphs, separate independently scrolling glyph picker, reversible strokes, consistent animation frames across formats, and a shared location for artwork downloads.

## Highest priority

1. **Give each output one action.** Download PNG, Download SVG, Download GIF, Download video and Download frame ZIP name the result. Rendering, encoding and Safari retry handling belong behind those actions. A repeat tap downloads the completed file only if artwork and output settings still match; otherwise it regenerates. This is the implementation change accompanying this review. Project JSON remains a separate editable backup.
2. **Keep the current brush and recovery controls visible.** A compact persistent strip should show the selected glyph, ink swatch, Paint/Eraser, Undo and Redo. Hiding settings must not hide these. Let the swatch open the 16-color palette directly. Expose symmetry with a small labeled control and visible active-state indicator. Keep placements stable when panels open.
3. **Make preview state unmistakable.** Use a persistent Animation preview label and a clearly visible Return to drawing action beside Play/Pause. Keep the effect name visible during playback. A paused animated frame should not look like an undocumented editing mode. Avoid adding mandatory Draw/Animate workspace tabs; the canvas and primary tools should remain in predictable places.
4. **Make downloads independent of settings scrolling.** Put Download artwork in a stable header position. Open one responsive sheet with Image / Animation / C64 data tabs, an output preview, final pixel dimensions, duration and estimated frame count where relevant. Use one primary action for the chosen format. Keep project Open / Download editable project in a separate project menu so an editable backup is distinguishable from artwork.

## Next priority

5. **Organize glyphs by visual intent.** Add recent selections, optional favorites and meaningful shape families (blocks, lines, corners, diagonals, symbols), with actual bitmap previews. Keep code pages, character bank, inverse selection and legacy shapes accessible. Keep screen-code labels optional for browsing, with exact codes available in labels/details. Use a neutral, high-contrast thumbnail background so changing canvas colors cannot hide glyph geometry. Keep the brush preview in its real ink color.
6. **Offer a pinned glyph palette on iPad.** Pinning should depend on available canvas space and user choice, including when the settings sidebar is hidden. The current automatic dismissal on narrow layouts makes repeated glyph changes require reopening the panel. Portrait can use a dismissible sheet; landscape can retain a compact dock. Never nest its scrolling inside settings.
7. **Move setup and broad edits away from routine painting.** Canvas dimensions, presets, Border, Checkerboard and Clear belong in Canvas settings. Stage width/height changes and show the crop before applying them together. Move Recolor entire drawing into a clearly scoped whole-drawing action menu; a brush swatch should affect future strokes only. Preserve reliable undo rather than adding routine confirmation dialogs.
8. **Use plain timing and file labels.** Show Loop duration: 2 seconds rather than requiring interpretation of a speed multiplier relative to an arbitrary four-second baseline. Rename Stop / edit to Return to drawing. Use PNG image, SVG vector, GIF animation, MP4/WebM video and PNG frame ZIP. Show final image dimensions alongside pixels per cell. State autosave scope as Saved on this device; show a saving failure explicitly.
9. **Quiet the visual hierarchy.** Retain the dark appearance and familiar canvas/palette positions. Reduce repeated bordered boxes and permanent explanatory paragraphs. Show explanations near the relevant setting when requested. Preserve strong selection, keyboard focus, readable labels and at least 44 px primary touch targets. Keep essential feedback visible without relying only on color or hover.

## Suggested layout

| Location | Contents |
| --- | --- |
| Header | Project/menu, device-save status, Download artwork |
| Persistent drawing strip | Selected glyph, ink, Paint/Eraser, symmetry, Undo/Redo |
| Main workspace | Canvas, dimensions, contextual preview indicator |
| Independent glyph panel | Recents/favorites, visual families, advanced character options |
| Settings drawer | Canvas setup, background, animation effect and loop duration, help |
| Download sheet | Output type, format, options, preview, one Download action |

## Implementation sequence

- First: single download actions, then persistent brush/undo controls and direct ink selection.
- Second: explicit preview state and the download sheet.
- Third: glyph navigation/pinning and staged canvas resize.
- Retain the existing appearance and familiar positions where practical. Evaluate each step with the same drawing tasks before adding further navigation layers.

## Implemented workspace changes

- Persistent drawing strip with glyph preview, direct ink access, Paint/Eraser, symmetry state and Undo/Redo, independent of settings visibility.
- Header Download artwork opens a responsive dialog with Image / Animation / C64 data tabs, format selection, grid-free output preview and actual dimensions/timing. Project open/editable downloads have a separate menu. Closing the dialog leaves export work running with accessible progress/cancellation.
- Explicit animation preview/effect/paused state and Return to drawing; loop durations use seconds.
- Neutral white-on-black glyph thumbnails, bank-specific recent selections/favorites, visual family filters and optional tablet pinning. Page, bank, inverse and legacy access remain available.
- Canvas dimensions stage together with a crop preview and Apply/Cancel; applying is one undoable operation. Whole-drawing actions use separate disclosures.
- Device-save status and a persistent failure notice, plus 44 px primary controls. Small-screen labels collapse while accessible names remain.

Potential follow-ups: an independently floating ink palette, optional hexadecimal labels, and testing reach/occlusion with a physical Apple Pencil. These can be evaluated after using the new layout.

## Validation tasks for the redesign

- Draw, switch glyph, change ink, erase, undo and resume drawing without settings scrolling.
- Hide settings and verify all routine drawing/recovery controls remain reachable.
- Preview a color animation, pause, return to drawing and verify original colors remain intact.
- Download a GIF, tap the same action again, change its speed/artwork and download a fresh version.
- Resize width and height together; inspect crop, cancel, apply and undo.
- Exercise iPad portrait/landscape, finger and Pencil reach/occlusion, keyboard focus, adequate contrast and large text. Browser automation supplements physical-device checks; it does not replace them.
