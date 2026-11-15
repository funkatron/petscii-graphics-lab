---
name: petscii-draw
description: Draw a PETSCII picture through the petscii-preview MCP. Use when asked to paint, draw, or compose character-art such as a portrait, a scene, or a still on a 40x25 or 80x25 screen.
---

# Drawing PETSCII

Paint cells with the `petscii-preview` MCP in this repo (`agents/petscii-preview`). Do not turn a sentence into a picture by itself, and do not copy someone else's picture into the repo.

Study the craft, not the files:

- Electric, Jeff Minter (CSDb 151435) and Kinski (247197). A face is fragile. Eyes, nose, and mouth decide who it is.
- redcrab, Yarr! (129100). Pure colors. Glyphs stop reading as separate stamps.
- Mermaid, Glad Gubbe (149161), and Gary. Big mosaic shapes plus small pixel-style detail.
- Reunanen, Heikkinen, and Carlsson, "PETSCII – A Character Set and a Creative Platform."

## How a picture is built

- One shared background, usually black (color 0). Other colors are light and shadow.
- Big forms use block and triangle glyphs (text mosaic).
- Tone comes from how dense the glyph is, not from extra colors.
- Fine edges use quarter-blocks and bridges. A 7 or a quote can become part of a larger shape.
- Line characters are a thin accent. A picture made only of lines looks like a BASIC sketch.

## Passes

1. Silhouette. Block in the mass with solid 160 and a couple of inks.
2. Tone. Swap dense and sparse glyphs so the form has light and shadow.
3. Face or focal detail. Spend the cells here. Check with `read_grid` after each pass.

## Canvas

- C64 and Plus/4: 40 columns by 25 rows.
- C128 80-column: 80 by 25. Use that only when the picture needs the extra width.
- Call `glyph_families` for atlas ids. Add 128 for the inverse of a bank-0 shape.
- `create_canvas`, then `set_tool_state`, then `paint_cells`, `draw_line`, `draw_rect`, `fill`, or `place_text`.
- `undo` if a pass goes wrong.

Screen look (Monitor, Television, Green, Amber) is a display treatment. Leave it off while drawing.
