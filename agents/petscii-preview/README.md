# PETSCII preview MCP

Renders **shared C64-family glyphs** with machine chrome, and exposes the full
PETSCII Graphics Lab project / animation / export surface for agents.

Glyph art always comes from `assets/c64-glyphs.svg`.

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
| `list_effects` | Motion/color enums + camera/wave/wipe values from the lab UI |
| `validate_project` | Validate v3 JSON |
| `load_project` / `save_project` / `create_project` / `update_project` | Project CRUD |
| `copy_project_to_workspace` | Copy into `out/workspace/` for drawing sessions |
| `export_text_grid` / `import_text_grid` | PETSCII-GLYPHS text exchange |

### Animation + image exports

| Tool | Purpose |
| --- | --- |
| `plan_animation` | Frame count + readiness warning |
| `render_still` / `export_png` / `export_svg` | Still artwork |
| `render_animation` / `export_gif` | Any motion × color GIF |
| `render_color_animation` / `render_color_animation_set` | Compat helpers (cube + color pack) |
| `export_png_frames_zip` | PNG frame ZIP + `timing.json` |
| `export_c64` | `.prg` / `.d64` (still or animation; max 40×25) |
| `export_glyph_bin` / `export_color_ram_bin` | Raw dumps |

Animation settings use the same object shape as `project.animation` (pass
`animation={...}` or `settings_json='{...}'`). Keys include `effect` /
`motionEffect`, `colorEffect`, `seconds`, cycles, scroll/wave/color-wave,
wipe, depth, and solid-camera fields.

### Drawing tools

Operate on a workspace project path. Brush state lives in a sidecar.

| Tool | Purpose |
| --- | --- |
| `set_tool_state` / `get_tool_state` | Glyph, ink, symmetry, selection |
| `paint_cells` / `erase_cells` / `fill` | Brush ops |
| `draw_line` / `draw_rect` | Geometry |
| `place_text` | Typed C64 text |
| `select_rect` / `deselect` / `move_selection` / `duplicate_selection` / `delete_selection` | Selection |
| `clear_drawing` / `recolor_drawing` / `stamp_border` / `stamp_checkerboard` | Whole-canvas |
| `undo` / `redo` | History (≤60 steps) |

### Video (ffmpeg)

| Tool | Purpose |
| --- | --- |
| `export_video` | MP4 or WebM from PNG frames via **ffmpeg** (not browser WebCodecs) |

Requires `ffmpeg` on `PATH`:

```bash
sudo apt-get install -y ffmpeg   # or brew install ffmpeg
```

## Workspace

Default example artwork: `examples/golden-fuzzy-raven.json`  
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

- `export_animation.mjs` — full motion/color frame JSON
- `pgl_cli.mjs` — validate, text-grid, C64, place-text
- Python: `src/project_io.py`, `src/pgl_export.py`, `src/drawing.py`

## Tests

```bash
agents/petscii-preview/.venv/bin/python -m unittest agents.petscii-preview.tests.test_pgl_mcp_smoke
# or:
cd agents/petscii-preview && .venv/bin/python -m unittest tests.test_pgl_mcp_smoke
```

## Exploratory PGL examples

```bash
node agents/petscii-preview/make_pgl_examples.mjs
agents/petscii-preview/.venv/bin/python agents/petscii-preview/render_pgl_examples.py
```
