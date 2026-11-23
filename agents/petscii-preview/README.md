# Draw with an AI agent (petscii-preview)

Ask an AI coding agent, such as Cursor or Claude Code, to draw, animate, and export PETSCII Graphics Lab pictures. The agent uses the same glyphs, colors, timing, and C64-family programs as the editor, and shows you previews as it works.

**Terms used here**

- **MCP (Model Context Protocol):** the standard way an agent talks to an add-on program. This folder is one such program, called an *MCP server*.
- **Tool:** an action the agent can take, such as "paint these cells" or "export a GIF".
- **Resource:** a read-only reference list the agent can read, such as the list of animation effects.
- **Prompt:** a ready-made set of instructions, such as "draw a picture of…".
- **Project:** an editable `.json` file, the same format as **Project → Save editable project** in the editor.

## Set up

You do this once per computer.

1. Install **Node.js 22 or newer** and **Python 3.10 or newer**.
2. Optional: install **FFmpeg** if you want MP4 or WebM videos (`brew install ffmpeg` or `sudo apt-get install -y ffmpeg`).
3. In the repository folder, run:

   ```bash
   agents/petscii-preview/setup-venv.sh
   ```

   It ends with "petscii-preview is ready".
4. Open the repository in your agent. The server is already configured:

   | Agent | Configuration file | What to do |
   | --- | --- | --- |
   | Claude Code | `.mcp.json` | Start Claude Code in the repository folder and approve **petscii-preview** when asked |
   | Cursor | `.cursor/mcp.json` | Restart Cursor, then turn on **petscii-preview** in MCP settings if it is off |

5. Check it works: ask the agent "List the petscii-preview tools." It should list about 40 tools.

## Draw your first picture

1. Ask the agent, for example: "Use petscii-preview to draw a lighthouse at night on the C64, then show me a PNG."
2. The agent creates a project in `agents/petscii-preview/out/workspace/`, paints in passes, and looks at a preview after each pass.
3. Ask for changes in plain words: "make the beam brighter", "undo that", "add a slow color wave".
4. Ask for the files you want: PNG or SVG still, GIF, MP4/WebM video, PNG frame ZIP, or a native program (PRG) or disk image (D64).
5. To keep editing by hand, open the project `.json` in the editor with **Project → Open project**.

If your agent supports prompts, choose **Draw a PETSCII picture** or **Make an op-art or pattern piece** to start with a full plan.

## Choose a machine

Say which machine you want when you ask for a picture. The agent sets it when it creates the canvas.

| Machine | Canvas | Glyphs | Colors |
| --- | --- | --- | --- |
| C64 (default) | up to 40 × 40 | C64 character set | 16 VIC colors; Pepto unless you choose Colodore, VICE, or RGB |
| C128 40-column | up to 40 × 40 | C64 character set | 16 VIC colors |
| C128 80-column | up to 80 × 40 | C64 character set | 16 VDC RGBI colors |
| Plus/4 | up to 40 × 40 | Plus/4 (TED) character set | 121 TED colors |

New canvases start in the machine's boot-screen colors. Any image or video can use **square cells** (default) or **CRT proportion**: taller cells shaped like a real screen.

## What the agent can do

| Job | Tools |
| --- | --- |
| Start or open a project | `create_canvas`, `load_project`, `copy_project_to_workspace`, `import_text_grid` |
| Paint | `paint_cells`, `erase_cells`, `fill`, `draw_line`, `draw_rect`, `place_text`, `set_tool_state` (brush, symmetry, `mirror_glyphs`) |
| Select and move | `select_rect`, `move_selection`, `duplicate_selection`, `delete_selection`, `deselect` |
| Whole canvas | `clear_drawing`, `recolor_drawing`, `stamp_border`, `stamp_checkerboard`, `stamp_op_art`, `stamp_combined_style` |
| Shade | `gradient_fill` (sky, backdrop or floor ramps), `shade_shape` (lit sphere or cylinder); ramps by measured brightness at `petscii://colors/ramps/{machine}` |
| Check and fix | `read_grid`, `critique_drawing`, `undo`, `redo`, `validate_project` |
| Plan | `illustration_brief`, `plan_animation`, `read_catalog` |
| Look | `render_still` (PNG/SVG + preview), `render_animation` (GIF + preview), `render_petscii_screen` |
| Keep settings | `update_project` (name, palette, colors, animation, size) |
| Export | `export_video`, `export_png_frames_zip`, `export_native` (PRG/D64), `export_binary`, `export_text_grid` |

Reference lists the agent reads before drawing:

| Resource | Contents |
| --- | --- |
| `petscii://effects` | Animation effects and their allowed settings |
| `petscii://machines` | Canvas limits and colors for each machine |
| `petscii://glyphs/families` | Glyphs grouped by shape, and a shading ladder |
| `petscii://references/drawing` | Master PETSCII pictures with notes on how they were made |
| `petscii://op-art/recipes` | Op-art, Islamic girih, Hindu mandala, and rug patterns |
| `petscii://world-art/{tradition}` | Notes on Islamic, Hindu, and rug traditions |
| `petscii://rugs` | Layered rug designs |

Agents that cannot read resources use the `read_catalog` tool with the same address.

## Where files go

| Folder | Contents |
| --- | --- |
| `agents/petscii-preview/out/workspace/` | Projects and exports the agent makes (not committed to Git) |
| `agents/petscii-preview/out/workspace/sessions/` | Brush settings and undo history for each project |
| `agents/petscii-preview/examples/` | Example projects and reference pictures. The agent cannot change these; it copies them first |

## If something does not work

| What you notice | Next step |
| --- | --- |
| The agent has no petscii-preview tools | Run `agents/petscii-preview/setup-venv.sh`, then restart the agent. In Cursor, check that the server is switched on |
| "The Python environment is missing" | Run `agents/petscii-preview/setup-venv.sh` |
| "Node.js was not found" or "too old" | Install Node.js 22 or newer. To use a particular copy, set `PGL_NODE` to its path in the MCP configuration's `env` |
| "ffmpeg not found" | Install FFmpeg, or ask for a GIF or PNG frame ZIP instead |
| An animation is refused as too fast | Ask the agent to run `plan_animation`; it suggests a longer loop |
| "refusing to overwrite a tracked example" | Expected: ask the agent to copy the example to the workspace first |
| A tool reports an error | The message says what to change (for example a cell outside the canvas). The project file is never left half-written |

## Make demo images

These scripts are for trying the server out; they are not tools.

```bash
agents/petscii-preview/.venv/bin/python agents/petscii-preview/generate_demos.py --themes --colors
agents/petscii-preview/.venv/bin/python agents/petscii-preview/render_pgl_examples.py
```

Images land in `agents/petscii-preview/out/`. Each example project sets its machine (C64, C128 40-column, or Plus/4).

## For maintainers

Architecture, encodings, tests, and the editor-parity check are in the [maintainer reference](../../docs/maintainer-reference.md#mcp-server-agentspetscii-preview). The improvement history is in the [MCP improvement plan](../../docs/mcp-improvement-plan.md).
