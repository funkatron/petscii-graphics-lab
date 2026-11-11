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

### Cursor MCP config example

```json
{
  "mcpServers": {
    "petscii-preview": {
      "command": "/absolute/path/to/petscii-graphics-lab/agents/petscii-preview/.venv/bin/python",
      "args": ["/absolute/path/to/petscii-graphics-lab/agents/petscii-preview/src/server.py"]
    }
  }
}
```

## Screen text notes

- Plain characters map to screen codes.
- Explicit codes: `{{#70}}` or `{{112}}`
- Reverse video: `{{!A}}` or `{{!#20}}`
