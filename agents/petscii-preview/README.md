# PETSCII preview MCP

Lets an agent paint, animate, and export a PETSCII Graphics Lab project, with the same glyphs, colours, timing and native programs as the editor.

Glyphs and colours follow the project's **machine**, exactly as in the editor:

| Machine (`machine`) | Glyph sheet | Colours |
| --- | --- | --- |
| `c64` | `assets/c64-glyphs.svg` | VIC, using the project `palette` (Pepto, Colodore, VICE, RGB) |
| `c128` (40-col) | `assets/c64-glyphs.svg` | VIC, using the project `palette` |
| `c128-80` (80-col) | `assets/c64-glyphs.svg` | VDC RGBI |
| `plus4` | `assets/ted-glyphs.svg` | TED (121 colours) |

Every image export takes `cell_shape`: `square` (default) or `crt` (CRT proportion: 5∶6 cells on VIC/TED, 5∶12 on VDC).

## Setup

```bash
agents/petscii-preview/setup-venv.sh
node agents/petscii-preview/make_pgl_examples.mjs
```

Cursor starts the server from `.cursor/mcp.json` via `agents/petscii-preview/run-mcp.sh`. Restart Cursor after cloning so the tools appear. If the server does not start, set that command to the absolute path of `run-mcp.sh`.

## Generate demos locally

Demo renders are scripts, not MCP tools:

```bash
agents/petscii-preview/.venv/bin/python agents/petscii-preview/generate_demos.py --themes --colors
agents/petscii-preview/.venv/bin/python agents/petscii-preview/render_pgl_examples.py
```

Outputs land in `agents/petscii-preview/out/`.

## What the server offers

| Kind | What | How to use it |
| --- | --- | --- |
| Tools (41) | Change or export a project | Call by name |
| Resources (`petscii://…`) | Read-only catalogs | Read the URI, or call `read_catalog(uri)` if your client cannot read resources |
| Prompts | Whole workflows | `draw_picture(subject, machine)`, `op_art_piece(recipe, machine)` |

Every tool takes typed arguments. Animation settings are an object with the same keys as `project.animation`; effect names, durations, cycles and wave values are enums taken from the editor. Unknown keys are rejected.

### Catalogs (resources)

| URI | Contents |
| --- | --- |
| `petscii://effects` | Motion, colour and backdrop effects, ramps, waves, cycles, seconds, scales |
| `petscii://machines` | Column limits, boot colours, ink range, glyph sheet and colour table per machine |
| `petscii://glyphs/families` | Atlas glyph IDs by role, shading ladder, outline and accent glyphs |
| `petscii://glyphs/shading-ladder/{background_ink}` | Brightness steps on a background ink |
| `petscii://op-art/recipes`, `petscii://op-art/recipes/{recipe_id}` | Op-art, girih, mandala and rug recipes |
| `petscii://world-art/{tradition}` | Islamic, Hindu or rug craft study (`all` for everything) |
| `petscii://world-art/references/{tradition}` | Local study images and Commons links |
| `petscii://references/drawing`, `petscii://references/drawing/{category}` | Master PETSCII references with craft notes |
| `petscii://rugs`, `petscii://rugs/{combination}` | Layered rug presets |

### Project tools

| Tool | Purpose |
| --- | --- |
| `create_canvas` | New blank picture for a `machine`; colours default to its boot screen |
| `load_project` / `save_project` / `update_project` / `validate_project` | Read, write, patch (typed `patch`) and check v3 JSON |
| `copy_project_to_workspace` | Copy a project (for example from `examples/`) into `out/workspace/` |
| `export_text_grid` / `import_text_grid` | PETSCII-GLYPHS text exchange (TED inks use two hex digits) |

### Drawing tools

Brush state and undo history live beside each project in `out/workspace/sessions/`.

| Tool | Purpose |
| --- | --- |
| `set_tool_state` / `get_tool_state` | Brush glyph, ink, symmetry; selection |
| `paint_cells` | `cells` ([{x, y, glyph?, ink?}]) and/or `runs` ([{x, y, glyphs: [...], ink?}], `null` skips a cell) |
| `erase_cells` / `fill` / `draw_line` / `draw_rect` | Brush operations |
| `place_text` | Typed C64 text, planned by the editor's `typed-text.js` |
| `select_rect` / `deselect` / `move_selection` / `duplicate_selection` / `delete_selection` | Selection |
| `clear_drawing` / `recolor_drawing` / `stamp_border` / `stamp_checkerboard` | Whole canvas |
| `stamp_op_art` / `stamp_combined_style` | Recipe lattices and layered rugs |
| `read_grid` | Painted cells as `runs` (default, same shape as `paint_cells`), `cells`, or `text` |
| `undo` / `redo` | History (60 steps) |
| `illustration_brief` / `critique_drawing` | Plan a picture; review each pass |

### Render and export tools

| Tool | Purpose |
| --- | --- |
| `render_still` | PNG or SVG; returns a preview image. SVG uses one vector path per glyph shape |
| `render_animation` | GIF of movement × cell colour × backdrop; returns a 4-frame preview sheet |
| `plan_animation` | Frame count, readiness, and `suggestedSeconds` when the settings are too fast |
| `export_png_frames_zip` | PNG frame ZIP + `timing.json` (editor manifest v2) + `project.json` |
| `export_video` | MP4/WebM, exact frame timing, 1–100 loops (needs ffmpeg) |
| `export_native` | `.prg` / `.d64` for the project's machine: C64, C128 40/80-col, Plus/4 |
| `export_binary` | `glyph-ids` (atlas IDs, 16-bit LE, `FFFF` = empty; not PETSCII bytes) or `color-ram` (VIC only) |
| `render_petscii_screen` | Boot-style text screen with machine chrome, returned as an image |

Movement, cell colour and backdrop stack independently. For a stepped shared background set `backgroundEffect` to `field` (VIC) or `plus4-field` (TED); `colorEffect: "field"` is a legacy shape the editor migrates on load.

### Video (ffmpeg)

`export_video` encodes MP4 or WebM with **ffmpeg** (not browser WebCodecs). Install it first:

```bash
sudo apt-get install -y ffmpeg   # or brew install ffmpeg
```

Each frame keeps its exact start time and duration (variable frame rate), matching the editor's video download. Frames are padded to even dimensions for `yuv420p`. Transparent backgrounds render black.

## Workspace

Default example artwork: `examples/pgl-wordmark.json`  
Session files / exports: `out/workspace/` (gitignored under `out/`).

## Cursor MCP config

Registered in:

- project: `.cursor/mcp.json`
- user: `~/.cursor/mcp.json`

Restart Cursor (or start a new agent session) after changing MCP config.

## Screen text notes (machine chrome)

- Plain characters map to screen codes.
- Explicit codes: `{{#70}}` or `{{112}}`
- Reverse video: `{{!A}}` or `{{!#20}}`

## Headless bridges

- `pgl-shared.mjs` — editor-equivalent helpers (project source, colour tables, frame timing, glyph bits, native export routing). Keep in step with `index.html`.
- `pgl_cli.mjs` — `validate`, `list-effects`, `plan`, `render-plan`, `export-native`, text grids, typed text
- Python: `src/project_io.py`, `src/pgl_export.py` (rasterizer only), `src/drawing.py`, `src/project_store.py`

## Tests

Run every MCP test (CI runs the same command when MCP files or shared modules change):

```bash
cd agents/petscii-preview && .venv/bin/python -m unittest discover -s tests -v
```

### Editor parity check (local)

Compares MCP exports with the editor's own downloads in Chromium: PNG and SVG for every machine, both cell shapes and two VIC palettes, GIFs, and native PRGs. Needs Node and the pre-installed Playwright Chromium.

```bash
agents/petscii-preview/.venv/bin/python agents/petscii-preview/smoke/editor_parity.py
```

Known difference: for CRT cells the editor's still PNG is an anti-aliased rasterization of its SVG, so glyph edges blur. The MCP draws CRT stills crisply, like the editor canvas and its GIF/ZIP/video. The check requires the same size and no colours the editor lacks.
## Errors and safety

- A failed tool call returns an MCP error result with the reason (bad glyph, cell outside the canvas, no selection, invalid project). It never leaves a half-written file.
- Saves are atomic: the project is validated with the editor's `project-validation.js` before it replaces the old file.
- Edits that change nothing do not add an undo step.
- Tools refuse to write inside `examples/`. Call `copy_project_to_workspace` first.
- Brush state and undo history live in `out/workspace/sessions/`, one folder per project path.

## Exploratory PGL examples

```bash
node agents/petscii-preview/make_pgl_examples.mjs
agents/petscii-preview/.venv/bin/python agents/petscii-preview/render_pgl_examples.py
```

The example projects predate the `machine` field, so they load as C64.
