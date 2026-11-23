---
name: petscii-draw
description: Draw PETSCII through the petscii-preview MCP — portraits and scenes, or complex op-art abstracts (moiré, tessellations, plasma fields). Use for illustration, animation stills, and geometric optical art on 40x25 or 80x25.
---

# Drawing PETSCII

Paint cells with the `petscii-preview` MCP. A sentence does not become a picture by itself.

**Before painting:** call `illustration_brief`, then read the catalogs `petscii://references/drawing/{category}`, `petscii://glyphs/families` and `petscii://glyphs/shading-ladder/{background_ink}` (MCP resources; clients without resource support use the `read_catalog` tool with the same URI). For abstracts read `petscii://op-art/recipes` and `petscii://op-art/recipes/{id}`, then `stamp_op_art`. `critique_drawing` reviews each pass. The `draw_picture` and `op_art_piece` prompts list the whole workflow.

Recognisable copyrighted characters are out of scope. When asked for one, design an original character with its own silhouette and details.

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

## Gradients and smooth shading

Lessons from shading studies (lit spheres, a sunset sky). Measure; do not guess.

**Tools.** Read `petscii://colors/ramps/{machine}` for inks sorted by brightness and ready ramps. `gradient_fill` paints a sky, backdrop or floor ramp with ordered dithering (`direction` down, up, left, right or radial). `shade_shape` paints a lit sphere or cylinder with a specular and a bounce light. Paint the backdrop first, then shapes back to front, then hand detail with `paint_cells`. On a gradient, a sphere's smooth outline shows a thin line of background colour; that is the one-ink-per-cell limit.

**Brightness, not names.** C64 (Pepto) inks from dark to light, with measured luminance:

| Ink | 0 black | 6 blue | 9 brown | 2 red | 11 dark grey | 4 purple | 8 orange | 14 light blue | 12 grey | 10 light red | 5 green | 15 light grey | 3 cyan | 7 yellow | 13 light green | 1 white |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lum | 0 | 49 | 55 | 65 | 68 | 77 | 83 | 103 | 108 | 113 | 124 | 149 | 154 | 189 | 192 | 255 |

- Build each ramp in that order. Red is darker than purple, so a blue → red → orange sky goes muddy. Use blue → purple → orange → light red → yellow.
- Ramps that work: grey `0 11 12 15 1`; warm `9 2 8 10 7`; cool `6 4 14 3 1`; green `11 5 13 1`.
- Pepto orange reads brown. Warm gradients stay muted; let yellow or white carry the brightest step.
- Plus/4 ink numbers are `1 + (hue − 1) × 8 + luminance` (white L0–L7 is 1–8, red 9–16, cyan 17–24 …). Look colours up with the machine's colour table, not C64 numbers.

**One ink per cell.** A cell shows its ink and the shared background, nothing else.

- A dither glyph blends an ink with the background only. Between two non-background inks there is no in-cell blend.
- Between two ramp inks, use a hard cell edge, or alternate whole cells with a 2×2 or 4×4 ordered (Bayer) pattern: `ink = ramp[round(s × (n−1) + bayer[y%4][x%4] − 0.5)]`. This reads as deliberate texture.
- Checker `102`/`230` (alternate by `(x+y)%2` so it stays continuous) is for the step from black into the darkest ink.
- Choosing the background is part of the gradient. A sky that fades to orange can use orange as the background and lay sparser blue glyphs over it.

**What failed.** Error diffusion over every coverage glyph produced streaky static. Diffusion that crossed object edges bled one ramp into another. Prefer cell-level ordered dither, and keep any diffusion inside one object.

**Exact partial blocks** (from glyph bytes, not memory):

| Fill | 1/8 | 2/8 | 3/8 | 4/8 | 5/8 | 6/8 | 7/8 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| From the bottom | 100 | 111 | 121 | 98 | 248 | 247 | 227 |
| From the left | — | 116 | 117 | 97 | 246 | 234 | — |

Quadrants: `126` top-left, `124` top-right, `123` bottom-left, `108` bottom-right.

**Forms.**

- A lit ball: Lambert light into the ramp, one white cell for the specular, and a faint bounce light on the lower shadow side so the silhouette survives against black.
- Smooth an edge by sampling the shape at the four cell corners: 4 inside → `160`, 3 → triangle (`233`/`223`/`95`/`105`, the missing corner is the empty half), 2 → half block. Skip single-corner cells; quadrants there make spikes at the poles.
- Mountains against sky are black negative space. The ridge cells are sky-coloured triangles (`95`, `105`) whose filled half is the sky.
- Thin line glyphs `99`, `100` and `64` make water shimmer and a sun path. They are not general shading.
- A cast shadow is a darker band of the floor ramp, offset away from the light and flattened.

Render after every pass and compare with the references. Two or three passes are normal: the first attempt is usually too bright, too noisy, or loses the silhouette.

## Portraits

Lessons from portrait studies (a split-lit noir man, a cel-shaded woman, a textured old fisherman).

**Type the face; do not compute it.** A head is about 18×22 cells on a 40×25 screen. Lighting computed from a 3-D face model became blobs. Typing the planes by hand reads far better: write rows of tone letters (W white, L light, G grey, D dark, K black) for the lit forehead, cheek and nose plane, the mid band down the centre, and the shadow side, then paint them with `paint_tone_map` (`smooth_edges=true` rounds the jaw and skull). Carve features afterwards with `paint_cells`.

**Planes and bands.**

- Split light: one side lit, the far side steps dark grey → black. The black side is paint, not empty cells.
- Skin is 3–4 flat bands plus black. Do not dither skin; dither breaks a face into noise. Dither belongs in backgrounds.
- Black hair or a black shadow side vanishes on a black screen. Put a lit wall, a glow or a rim light behind the head.

**Features.**

- Eyes decide the picture and must be large: a dark socket, two or three cells of white or iris, and one catchlight cell (a white quadrant such as `108`) on the lit eye only. The shadow eye just glints.
- Brows, nostrils and the mouth line are black shapes. Brows that slope down toward the nose read as anger; lift the inner ends for a calm face. A closed mouth is a dark line with a lit lower lip.
- Small marks carry expression. Check the face after every brow or mouth change.

**Texture by engraving.** The references' dense mid-tones are cut into the skin, not drawn on it. An inverse glyph keeps the skin ink and leaves a thin black line:

| Mark | Glyph |
| --- | --- |
| Forehead crease, lower lid | `227` (black line along the top) |
| Crow's feet, smile lines, hair and beard strands | `205`, `206` (inverse diagonals) |
| Knit or ribbed cloth | `221` |
| Cheek turning into shadow | `102` checker in the mid ink |

Strands follow the form: one diagonal direction per side, falling down and outward, mixed with solid cells. Alternating both diagonals makes a lattice that reads as chain mail.

**Workflow.** Tone map → features → engraved texture → `render_still`, then fix what reads wrong. Three passes were normal.

## Passes

1. Silhouette. Block the mass with solid 160. One background, usually black (color 0).
2. Light. Split the form into a lit ink and a shadow ink.
3. Face or focal detail. Eyes, mouth, the one accent.
4. Texture. This pass is part of the picture. Replace interior solids: lit interior becomes checker `102` with a few `160` highlights left, the middle band becomes diagonals `77` and `78`, and the shadow band stays solid `160` in the darker ink, with one checker column where the middle band meets it. Then `read_grid`, `render_still` (it returns a preview image), and compare the still with the references.

## Canvas

- C64 and Plus/4: 40 columns by 25 rows.
- C128 80-column: 80 by 25, only when the picture needs the width.
- `petscii://glyphs/families` lists atlas ids. Add 128 for the inverse of a bank-0 shape. 160 is solid.
- `create_canvas` (pick `machine`: c64, c128, c128-80, plus4; colours default to its boot screen), then `set_tool_state`, then `paint_cells` (`runs` paint a row segment in one entry), `draw_line`, `draw_rect`, `fill`, or `place_text`.
- `undo` if a pass goes wrong.

Screen look stays off while drawing.

## Symmetry and mirror glyphs

Faces, rugs, mandalas, butterflies and reflections are symmetric. Paint one half or one quarter and let the brush copy it.

1. `set_tool_state(symmetry="horizontal" | "vertical" | "both", mirror_glyphs=true)`.
2. Paint only the source part: the left half, the top half, or the top-left quarter.
3. `render_still` and check that the copies read as true reflections.

- With `mirror_glyphs`, each copy uses the reflected glyph: triangles `233` ↔ `223` left-right and `233` ↔ `95` top-bottom, diagonals `77` ↔ `78`, half blocks `97` ↔ `225` and `226` ↔ `98`, round corners `85`/`73`/`74`/`75`, quadrants. Glyphs without a partner, such as most letters, keep their shape. The editor's **Mirror glyph shapes** uses the same rule (`glyph-mirror.js`), and the Plus/4 uses TED shapes.
- Use an even width for left/right and an even height for top/bottom. On an odd size the centre column or row is its own copy, and the flipped glyph overwrites the original.
- An asymmetric detail (a reflection darkened under water, ripples, a signature) goes in afterwards with `symmetry="none"`.
- A reflection in water: paint the scene with top/bottom symmetry, then repaint the lower half with darker inks of each ramp and add line-glyph ripples.

## Op-art and complex abstracts

Train on **Bridget Riley** (high-contrast bar fields, one deliberate symmetry slip), **Victor Vasarely** (nested squares, alternating solid/checker rings), and **demoscene color fields** (few glyphs, motion in color + backdrop stacks). PETSCII is a grid — op-art is **period control**, not decoration.

### Principles

- **One period:** lattice at period P, then counter-lattice at P or P±1 offset. Moiré is the beat between layers, not random glyphs.
- **Two inks first:** add a third only for animation or a single focal rupture.
- **Glyphs ≤ 3** in the field: `67`/`68` lines, `77`/`78` twill, `160`/`102` rings, `95`/`105` triangles.
- **Motion is half the art:** parallax on glyph or ink groups (`spread 1`, `opposite`), stacked `colorEffect` + `backgroundEffect` at different `*Cycles`.
- **One focal break:** invert a disk, widen one bar, or slip phase by one column — then stop.

### MCP workflow (abstract)

1. `illustration_brief("op-art …")` or read `petscii://op-art/recipes/line-moire`.
2. `create_canvas` → `stamp_op_art(recipe)` (lattice).
3. `paint_cells` for the symmetry break only.
4. `update_project(patch={"animation": animation_suggest})`.
5. `render_animation` (GIF + preview sheet); `critique_drawing(style='op-art')`.

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

Read `petscii://world-art/references/all` and open the local files in `agents/petscii-preview/examples/world-art/` (MET girih star, Wazir Khan arch, girih construction SVG, Sri Yantra, 32-dot kolam). Then read `petscii://world-art/islamic` or `petscii://world-art/hindu`. These traditions are **symmetry and repetition**, not random texture.

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

Study rugs with `petscii://world-art/references/rug` and `petscii://world-art/rug`. Open Ardabil, Konya gül, and Isfahan garden references in `examples/world-art/`.

**Layout law:** field (repeat) → **border** (margin overwrite) → **medallion** (center overwrite) → optional **corners** (kolam dots).

**Combinations** (`petscii://rugs`, `petscii://rugs/{combination}`, then `stamp_combined_style`):

| Preset | What it blends |
| --- | --- |
| `ardabil-medallion` | Girih field + interlace border + lotus toranj |
| `konya-gul` | Repeating gül lattice + bar border |
| `garden-charbagh` | Four-quadrant garden cross + arabesque bands |
| `indo-persian-fusion` | Diagonal field + arabesque border + yantra center + kolam corners |
| `kilim-band-stack` | Horizontal Caucasian bands only |

Single-layer rug stamps: `rug-gul-repeat`, `rug-charbagh`, `rug-kilim-bands`.

**Workflow:** `illustration_brief('Indo-Persian oriental rug')` → `stamp_combined_style('indo-persian-fusion')` → refine corners with `paint_cells` → `render_still`.
