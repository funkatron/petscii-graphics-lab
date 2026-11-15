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
- A region is one ink, then several glyphs inside it. Solid 160 is the brightest step, not the whole surface. The tiger (`IMG_0346`), the pipe portrait (`IMG_0354`), the close face (`IMG_0355`), the house (`IMG_0359`), and the dragon (`IMG_0360`) all shade this way.
- Skin, fur, and metal use three inks plus black. The steps between those inks are glyphs. One extra color is the accent: a red scan, green eyes, a yellow sky.
- A busy background is one repeating glyph in one or two inks: foliage, roof shingles, a field of windows. The repeat stays behind the subject.
- Line glyphs are a thin accent: a window frame, an antenna, a whisker. The body of the picture is filled.
- A sparse glyph opens the background through that cell. A highlight on a lit surface is a lighter ink on a solid, or a dense glyph. Leave a cell empty only when that opening is meant to be black, such as a visor or a pupil.
- Letters, when they appear, are part of the picture and few.

## Shading with glyphs

Off pixels in a glyph show the background. On a black screen, a sparser glyph is a darker step of the same ink. Change the glyph before reaching for another ink.

Against black, from light to dark:

- `160` solid. A catchlight, a lamp, a rim, the brightest part of a lit face.
- `102` checker. The usual mid tone. Half the cell is ink. The panda's leaves and the house's lit wall repeat one pattern like this.
- `78` and `77` diagonals. A slope or brushed metal. `78` leans with light from the left. `77` leans the other way. A region uses one of them, the way one tiger stripe holds a single direction.
- `226` top half and `98` bottom half. A horizontal band: highlight along a brow, shade under a jaw.
- `95` and `105` triangles. They turn the corner of a flat area into a ramp.
- `126` and `123` quarters. A transition that still touches a filled neighbor. On the outer edge, with black behind them, they become a dashed fringe.
- `127` diagonal split. One cell between a lit block and a dark block.

The far side, on a black background, stays dense: solid `160` in the dark ink. Checker and diagonals belong on the lit face and the middle step. A whole region repeats one of these. Do not sprinkle unrelated characters through a shape.

Keep the outline as `160` or a half-block (`225` on a left edge, `97` on a right edge). Texture stays inside the outline.

`103`, `116`, and `111` are slots, scans, and thin lines. They are not shade. In the middle of a surface they open a hole. Add 128 to a bank-0 id for its inverse when the cell should be mostly ink with a dark notch.

## Passes

1. Silhouette. Block the mass with solid 160. One background, usually black (color 0).
2. Light. Split the form into a lit ink and a shadow ink.
3. Face or focal detail. Eyes, mouth, the one accent.
4. Texture. This pass is part of the picture. Replace interior solids: lit interior becomes checker `102` with a few `160` highlights left, the middle band becomes diagonals `77` and `78`, and the shadow band stays solid `160` in the darker ink, with one checker column where the middle band meets it. Then `read_grid`, `render_still`, and compare the still with the references.

## Canvas

- C64 and Plus/4: 40 columns by 25 rows.
- C128 80-column: 80 by 25, only when the picture needs the width.
- `glyph_families` lists atlas ids. Add 128 for the inverse of a bank-0 shape. 160 is solid.
- `create_canvas`, then `set_tool_state`, then `paint_cells`, `draw_line`, `draw_rect`, `fill`, or `place_text`.
- `undo` if a pass goes wrong.

Screen look stays off while drawing.
