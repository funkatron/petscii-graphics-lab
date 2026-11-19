---
name: petscii-draw
description: Draw PETSCII through the petscii-preview MCP — portraits and scenes, or complex op-art abstracts (moiré, tessellations, plasma fields). Use for illustration, animation stills, and geometric optical art on 40x25 or 80x25.
---

# Drawing PETSCII

Paint cells with the `petscii-preview` MCP. A sentence does not become a picture by itself.

**MCP craft tools (use before painting):** `illustration_brief`, `list_drawing_references`, `shading_ladder`, `glyph_families`, `critique_drawing`, and for abstracts `list_op_art_recipes`, `op_art_recipe`, `stamp_op_art`.

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

## Op-art and complex abstracts

Train on **Bridget Riley** (high-contrast bar fields, one deliberate symmetry slip), **Victor Vasarely** (nested squares, alternating solid/checker rings), and **demoscene color fields** (few glyphs, motion in color + backdrop stacks). PETSCII is a grid — op-art is **period control**, not decoration.

### Principles

- **One period:** lattice at period P, then counter-lattice at P or P±1 offset. Moiré is the beat between layers, not random glyphs.
- **Two inks first:** add a third only for animation or a single focal rupture.
- **Glyphs ≤ 3** in the field: `67`/`68` lines, `77`/`78` twill, `160`/`102` rings, `95`/`105` triangles.
- **Motion is half the art:** parallax on glyph or ink groups (`spread 1`, `opposite`), stacked `colorEffect` + `backgroundEffect` at different `*Cycles`.
- **One focal break:** invert a disk, widen one bar, or slip phase by one column — then stop.

### MCP workflow (abstract)

1. `illustration_brief("op-art …")` or `op_art_recipe("line-moire")`.
2. `create_canvas` → `stamp_op_art(recipe)` (lattice).
3. `paint_cells` for the symmetry break only.
4. `update_project` with returned `animation_suggest`.
5. `render_animation` / `export_gif`; `critique_drawing(style='op-art')`.

### Recipe picks

| Ask | Recipe id |
| --- | --- |
| Crossed lines / moiré | `line-moire` |
| Twill / textile diagonal | `diagonal-weave` |
| Tunnel / target | `nested-squares` or `ring-bands` |
| Riley stripes | `vertical-bars` |
| Triangle op field | `triangle-tessellation` |
| Plasma / color-only | `plasma-field` |
| Ink chessboard motion | `dual-checker` |

Editor help: two line glyphs under **Parallax** make moiré; two inks on a checker make a chessboard. Empty cells stay put — sparse `plasma-field` is intentional.

## Islamic & Hindu geometric art

Call `list_world_art_references` and open the local files in `agents/petscii-preview/examples/world-art/` (MET girih star, Wazir Khan arch, girih construction SVG, Sri Yantra, 32-dot kolam). Then `study_world_art('islamic')` or `study_world_art('hindu')`. These traditions are **symmetry and repetition**, not random texture.

### Islamic (girih, arabesque, interlace)

- **8-fold stars** on a period-4 lattice (`islamic-girih-8`): cross nodes solid, star interior checker, arms diagonals 77/78.
- **Strapwork** (`islamic-interlace`): alternating diagonals; over-under implied by ink band period 2.
- **Borders** (`arabesque-band`): dense 95/105 chevrons top and bottom; calm center for calligraphy or empty sky.
- Palette: white/gold on blue (1, 7, 8) or cyan/teal (3, 6). **No figurative** center in mosque-style pieces.
- Motion: slow `scroll-x` + `backgroundEffect` field `glow` or `wave` — meditative, not demoscene-fast.

### Hindu (mandala, yantra, kolam)

- **Mandala** (`mandala-lotus`): radial petals from center bindu (one white 160); quarter-blocks on rings; saffron/white/red (8, 1, 2).
- **Yantra** (`yantra-triangles`): nested 95 up / 105 down; bindu at center; strict left-right symmetry.
- **Kolam** (`kolam-pulli`): dot grid + lines — **leave air**; extend loops with `draw_line` after stamp; do not flood fill.
- Motion: mandala may use slow `ripple` + `color-cycle`; kolam usually **still**.

### Recipe picks

| Ask | Recipe id |
| --- | --- |
| Islamic star / girih / Alhambra | `islamic-girih-8` |
| Interlace / strapwork border | `islamic-interlace` |
| Arabesque margin bands | `arabesque-band` |
| Lotus mandala / thangka ring | `mandala-lotus` |
| Sri Yantra–style nested triangles | `yantra-triangles` |
| Kolam / rangoli dots | `kolam-pulli` |

## Oriental rugs & combining styles

Study rugs with `list_world_art_references('rug')` and `study_world_art('oriental-rug')`. Open Ardabil, Konya gül, and Isfahan garden references in `examples/world-art/`.

**Layout law:** field (repeat) → **border** (margin overwrite) → **medallion** (center overwrite) → optional **corners** (kolam dots).

**Combinations** (`list_style_combinations` / `stamp_combined_style`):

| Preset | What it blends |
| --- | --- |
| `ardabil-medallion` | Girih field + interlace border + lotus toranj |
| `konya-gul` | Repeating gül lattice + bar border |
| `garden-charbagh` | Four-quadrant garden cross + arabesque bands |
| `indo-persian-fusion` | Diagonal field + arabesque border + yantra center + kolam corners |
| `kilim-band-stack` | Horizontal Caucasian bands only |

Single-layer rug stamps: `rug-gul-repeat`, `rug-charbagh`, `rug-kilim-bands`.

**Workflow:** `illustration_brief('Indo-Persian oriental rug')` → `stamp_combined_style('indo-persian-fusion')` → refine corners with `paint_cells` → `render_still`.
