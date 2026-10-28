# UI review: keep attention on drawing

**Reviewed:** 21 October 2026. **Status updated:** 23 October 2026.

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
| Glyph panel | Families, recents, favorites, letter toggle, character options |
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

1. **Physical iPad/Pencil checks:** test reach, the hand covering controls or artwork, gestures, and portrait/landscape layouts on a device.
2. **Large-text checks:** confirm that labels, focus, and primary actions remain usable at larger text sizes.

Preserve familiar control positions as these changes are evaluated. Avoid adding mandatory Draw/Animate workspace tabs; drawing and preview can share the existing canvas.

## Tasks for future UI checks

1. Draw, switch glyph, change ink, erase, undo, and resume without settings scrolling.
2. Hide settings and reach every routine drawing/recovery control.
3. Preview a color effect, pause, return to drawing, and confirm the original colors.
4. Download a GIF twice, then change timing or artwork and download the updated file.
5. Change both canvas dimensions; inspect the crop, cancel, apply, undo, and redo.
6. Check keyboard focus, contrast, large text, and touch reach in both iPad orientations.

Browser automation covers reproducible interactions. Finger/Pencil reach and the hand covering controls or artwork need a physical device.


## Raskin-informed follow-up — 23 October 2026

This pass applies Jef Raskin’s emphasis on stable actions and reducing mode errors. The design interpretation is ours, rather than a claim that the editor is modeless. Source: [Raskin, “Down With GUIs!” (1993)](https://www.wired.com/1993/06/1-6-guis/).

| Observed friction | Change | Why |
| --- | --- | --- |
| Ink opens and scrolls settings for each color choice | Anchored ink palette; one swatch tap selects and dismisses | Keep repeated work beside the drawing |
| Eraser toggles back to Paint on a repeated tap | Paint and Eraser each select their named tool | The same action has a consistent result |
| Selected drawing tools appear usable during read-only preview | Disable Paint/Eraser during playing and paused preview; label the preview read-only | Make the input restriction visible at the action |
| Drawing state must be inferred from button color | Persistent tool and ink text below the canvas | Use words as well as color |
| Every glyph carries a tiny hexadecimal label | Hide codes by default; optional device preference preserves accessible code labels | Let visual browsing focus on shapes |

The floating palette uses native popover dismissal and keyboard focus restoration. Escape dismisses only the top ink/download surface and keeps the glyph panel in place. Opening ink changes no artwork, layout, history, or playback. Choosing a different ink retains the existing undoable brush-change behavior and stops preview. Tapping outside dismisses the palette and the target still receives its ordinary action, including painting on the editable canvas.

Remaining mode costs: choosing a glyph selects Paint; broad edits end preview; undo includes brush settings. Retain these for now and evaluate them against real drawing sessions before changing familiar behavior. Physical Pencil reach still needs device testing.


## Default shape grouping — 23 October 2026

The default glyph view now collects similar shapes across code pages, with labeled sections for Blocks, Lines, Corners, Diagonals, Symbols, and remaining graphics. Inverse pairs stay adjacent. This uses the existing curated shape families rather than a computed visual-distance score.

Jump to code page keeps exact numeric browsing available; Grouped by shape returns to visual browsing. Both character sets retain every permitted glyph once, and All screen codes includes the remaining letters and codes. Grouping changes only browsing order.


## Simplify the letter filter — 23 October 2026

This supersedes numeric-page browsing described above. Inverse previously switched views and enabled all codes when its result was outside the graphics subset. That made ordinary letters appear without a deliberate request.

Remove code-page controls and use one visible Show letters & numbers checkbox, initially off. Preserve it across Inverse, imports, Undo, character-set changes and asset reload. Blank and solid-block partners are both non-alphanumeric and remain available. Symbols and punctuation also remain available. Optional code labels retain exact identification without making hardware ordering a navigation task. Grouped browsing places enabled alphanumerics in a named section.

## Select paired glyphs directly — 23 October 2026

Remove the separate Inverse button and its special selection path. Paired glyphs remain adjacent in shape groups; choose either directly, including blank and solid block. The letter toggle and optional code labels remain. This supersedes the Inverse-button behavior described above; the Inverse pulse animation remains available.

## Unified alphabet — 24 October 2026

Remove the whole-drawing character-set switch. One visible Show letters & numbers checkbox reveals uppercase and lowercase together, alongside all graphics. Selecting a glyph never changes existing shapes. Matching uppercase/lowercase pairs are together in the letter section; duplicate source-bank graphics are omitted. Graphics remain the default view. Projects and exports now use per-cell atlas IDs, with no compatibility migration for the early v2 format.

Richer drawing tools are the next priority: fill, lines and rectangles, selection/move/duplicate, then reusable stamps and motifs.

## Compact cleanup — 25 October 2026

Drawing tools now use compact familiar icons with accessible names; Undo/Redo stay together. Stamps were removed in favor of Select and Duplicate. Selection actions occupy a reserved scrolling strip below the artwork. The 28 px help buttons sit beside headings, outside disclosure controls, and open on tap or keyboard activation. Portrait settings begin closed. Tap endpoints and canvas arrow/Enter controls provide alternatives to dragging. C64 download readiness distinguishes dimensions, glyph patterns, memory and estimated update time.

These changes supersede the earlier 44 px target recommendation for compact drawing/help controls. Physical reach and larger-text checks remain open.

## Group animation controls

Group the animation section into Timeline & preview, Movement and Color. Put common duration/playback first; pair each effect’s direction/waveform and height/cycles. Retain the existing control names and conditional options. Move the wave-height explanation into header help. Use semantic fieldsets, compact spacing and the existing sidebar scroll surface. Verify portrait/landscape iPad dimensions and enlarged text without changing artwork or saved settings.
