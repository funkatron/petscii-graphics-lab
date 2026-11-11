# PETSCII preview MCP

Renders **shared C64-family glyphs** with machine chrome for:

- `c64`
- `c128` (40-column VIC-II)
- `plus4`

Glyph art always comes from `assets/c64-glyphs.svg`. Modes differ by border, background, foreground, and boot banner.

## Generate demos locally

```bash
agents/petscii-preview/.venv/bin/python agents/petscii-preview/generate_demos.py
```

Outputs land in `agents/petscii-preview/out/`.

## MCP tools

| Tool | Purpose |
| --- | --- |
| `list_machines` | Mode chrome metadata |
| `render_petscii_screen` | One machine PNG (`png_base64`, optional `save_path`) |
| `render_machine_comparison` | C64/C128/Plus4 stills + mode-switch GIF |
| `render_themed_examples` | Themed machine-chrome example pack + GIF |
| `render_color_animation` | One PGL color-animation GIF (C64 or Plus/4) |
| `render_color_animation_set` | C64 vs Plus/4 color-animation GIF pack |

Color-animation GIFs land in `out/examples/` as `color-cycle.gif`, `plus4-cycle.gif`, `plus4-plasma.gif`, etc.

### Cursor MCP config

Registered in:

- project: `.cursor/mcp.json`
- user: `~/.cursor/mcp.json`

Restart Cursor (or start a new agent session) after changing MCP config, then confirm with MCP tools / `agent mcp list`.

## Screen text notes

- Plain characters map to screen codes.
- Explicit codes: `{{#70}}` or `{{112}}`
- Reverse video: `{{!A}}` or `{{!#20}}`

## Exploratory PGL examples

Generate openable v3 projects (and optional PNG previews):

```bash
node agents/petscii-preview/make_pgl_examples.mjs
agents/petscii-preview/.venv/bin/python agents/petscii-preview/render_pgl_examples.py
```

Projects: `agents/petscii-preview/examples/*.json`  
Open in the lab with **Project → Open**.
