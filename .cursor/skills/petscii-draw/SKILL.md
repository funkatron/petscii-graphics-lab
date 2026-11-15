---
name: petscii-draw
description: Draw a PETSCII picture through the petscii-preview MCP. Use when asked to paint, draw, or compose character-art such as a portrait, a scene, or a still on a 40x25 or 80x25 screen.
---

# Drawing PETSCII

Paint cells with the `petscii-preview` MCP. A sentence does not become a picture by itself.

Before the first stroke, open the reference pictures in `agents/petscii-preview/examples/`. Read the image files. They are the quality bar. Study the craft in them. Do not trace them into the project.

For a face, read `IMG_0343.JPG`, `IMG_0350.JPG`, `IMG_0354.PNG`, `IMG_0355.PNG`, `IMG_0356.PNG`, `IMG_0357.JPG`, and `IMG_0358.GIF`.
For an animal or a figure, read `IMG_0344.JPG`, `IMG_0346.JPG`, `IMG_0349.PNG`, `IMG_0353.PNG`, and `IMG_0360.PNG`.
For a place, read `IMG_0347.JPG`, `IMG_0348.PNG`, `IMG_0351.JPG`, and `IMG_0359.JPG`.
`IMG_0352.PNG` is the reference for a screen of panels and labels.

## What the references do

- The subject fills the screen. A portrait is cropped at the forehead and the chest. The eyes sit high.
- The eyes decide the picture. They are large, dark against a lit face, and one cell of white is the catchlight.
- Black is a paint color. Hair, the shadow side of a face, a visor, and a doorway are solid black. Empty cells are only the untouched background.
- Light comes from one side. The near side is a lighter ink. The far side drops a step darker, then into black.
- A region is one flat color, then tone inside it. Checker, diagonal, and half-block glyphs change the value. They stay inside the shape.
- Skin, fur, and metal use three inks plus black. One extra color is the accent: a red scan, green eyes, a yellow sky.
- A busy background is one repeating glyph in one or two inks: foliage, roof shingles, a field of windows. The repeat stays behind the subject.
- Line glyphs are a thin accent: a window frame, an antenna, a whisker. The body of the picture is filled.
- A sparse glyph opens the background through that cell. A highlight on a lit surface is a lighter ink on a solid, or a dense glyph. Leave a cell empty only when that opening is meant to be black, such as a visor or a pupil.
- Letters, when they appear, are part of the picture and few.

## Passes

1. Silhouette. Block the mass with solid 160. One background, usually black (color 0).
2. Light. Split the form into a lit ink and a shadow ink.
3. Face or focal detail. Eyes, mouth, the one accent. Check with `read_grid`, then `render_still`, and compare the still with the references.
4. Texture last. Swap solids for denser or sparser glyphs only where the surface needs it.

## Canvas

- C64 and Plus/4: 40 columns by 25 rows.
- C128 80-column: 80 by 25, only when the picture needs the width.
- `glyph_families` lists atlas ids. Add 128 for the inverse of a bank-0 shape. 160 is solid.
- `create_canvas`, then `set_tool_state`, then `paint_cells`, `draw_line`, `draw_rect`, `fill`, or `place_text`.
- `undo` if a pass goes wrong.

Screen look stays off while drawing.
