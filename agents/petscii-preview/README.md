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

```bash
agents/petscii-preview/.venv/bin/python agents/petscii-preview/generate_demos.py
```

Outputs land in `agents/petscii-preview/out/`.

## MCP tools

### Machine chrome (exploratory)

| Tool | Purpose |
| --- | --- |
| `list_machines` | Mode chrome metadata |
| `render_petscii_screen` | One machine PNG (`png_base64`, optional `save_path`) |
| `render_machine_comparison` | C64/C128/Plus4 stills + mode-switch GIF |
| `render_themed_examples` | Themed machine-chrome example pack + GIF |

### Project document

| Tool | Purpose |
| --- | --- |
| `list_effects` | Motion, color, and backdrop enums + ramp/camera/wave/wipe values from the lab UI |
| `validate_project` | Validate v3 JSON |
| `load_project` / `save_project` / `create_project` / `update_project` | Project CRUD |
| `copy_project_to_workspace` | Copy into `out/workspace/` for drawing sessions |
| `export_text_grid` / `import_text_grid` | PETSCII-GLYPHS text exchange |

### Animation + image exports

| Tool | Purpose |
| --- | --- |
| `plan_animation` | Frame count, readiness, and `suggestedSeconds` when the settings are too fast |
| `render_still` / `export_png` / `export_svg` | Still artwork. SVG uses one vector path per glyph shape |
| `render_animation` / `export_gif` | Movement × cell colour × backdrop GIF. Refuses settings that would alias (see `plan_animation`) |
| `render_color_animation` / `render_color_animation_set` | Compat helpers (cube + color pack) |
| `export_png_frames_zip` | PNG frame ZIP + `timing.json` (editor manifest v2) + `project.json` |
| `export_video` | MP4/WebM, exact frame timing, 1–100 loops (needs ffmpeg) |
| `export_native` | `.prg` / `.d64` for the project's machine: C64, C128 40/80-col, Plus/4 |
| `export_glyph_bin` | Glyph atlas IDs (bank × 256 + screen code), 16-bit LE, `FFFF` = empty. Not PETSCII bytes |
| `export_color_ram_bin` | One VIC colour index per cell (C64 / C128 40-col only) |

Animation settings use the same object shape as `project.animation` (pass
`animation={...}` or `settings_json='{...}'`). Keys include `effect` /
`motionEffect`, `colorEffect`, `backgroundEffect`, `seconds`, `motionCycles`,
`colorCycles`, `backgroundCycles`, backdrop ramp knobs (`fieldRamp`,
`fieldDirection`, `fieldLead`, `fieldWaveDirection`, `fieldWaveShape`,
`fieldWaveLength`, `fieldWaveAmplitude`), scroll/wave/color-wave, wipe, depth,
parallax,
and solid-camera fields.

Movement, cell color, and backdrop stack independently. For a stepped shared
background, set `backgroundEffect` to `'field'` (VIC) or `'plus4-field'` (TED) —
do not use `colorEffect: 'field'` in new JSON; the editor and MCP still migrate
that legacy shape on load.

### Drawing tools

Operate on a workspace project path. Brush state lives in a sidecar.

| Tool | Purpose |
| --- | --- |
| `create_canvas` | Blank picture; `machine` is c64, c128, c128-80 (80 columns) or plus4 |
| `glyph_families` / `read_grid` | Atlas ids, then the cells you have painted |
| `set_tool_state` / `get_tool_state` | Glyph, ink, symmetry, selection |
| `paint_cells` / `erase_cells` / `fill` | Brush ops |
| `draw_line` / `draw_rect` | Geometry |
| `place_text` | Typed C64 text |
| `select_rect` / `deselect` / `move_selection` / `duplicate_selection` / `delete_selection` | Selection |
| `clear_drawing` / `recolor_drawing` / `stamp_border` / `stamp_checkerboard` | Whole-canvas |
| `undo` / `redo` | History (≤60 steps) |

### Illustration craft + op-art

| Tool | Purpose |
| --- | --- |
| `list_drawing_references` | Master portrait/figure/place references + craft notes |
| `illustration_brief` | Plan subject (incl. op-art): palette, passes, recipes |
| `shading_ladder` | Glyph brightness steps on a background ink |
| `glyph_families` | Atlas groups + shading ladder |
| `critique_drawing` | Heuristic review (`style`: auto, illustration, op-art) |
| `list_op_art_recipes` / `op_art_recipe` | Op-art + Islamic girih / Hindu mandala recipes |
| `stamp_op_art` | Fill canvas with a recipe lattice (+ `animation_suggest`) |
| `study_world_art` | Islamic & Hindu geometric craft notes |
| `list_world_art_references` | Local Commons study images + category URLs |
| `list_style_combinations` / `combine_styles` / `stamp_combined_style` | Oriental rug multi-layer presets |

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
