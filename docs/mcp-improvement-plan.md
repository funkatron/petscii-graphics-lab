# PETSCII preview MCP — review and improvement plan

Status: **approved**. Phases 0 and 1 done (see below); Phases 2–3 not started. Reviewed 2026-11-22.

Scope: the `petscii-preview` MCP server in `agents/petscii-preview/` (Python, started by `.cursor/mcp.json` → `run-mcp.sh` → `src/server.py`).

## What was checked

| Check | Result |
| --- | --- |
| `setup-venv.sh` on a clean container | Installed `mcp 2.3.0`, `pillow 13.0.0` |
| Server import + `list_tools()` | 60 tools; startup warns `Tool already exists: list_style_combinations` |
| `python -m unittest discover -s tests` | 21 tests, all pass (0.8 s) |
| Edge-case probes (below) | 6 defects reproduced |
| CI (`.github/workflows/ci.yml`) | Does **not** run the MCP tests |

## Defects found

Each was reproduced in a script, not inferred from reading.

| # | Defect | Where | Effect |
| --- | --- | --- | --- |
| D1 | Invalid paint corrupts the saved file. `paint_cells(glyph=999)` writes first, validates second, returns `ok:false` and leaves an invalid project on disk. | `drawing.save_project`, `project_io.save_project` | Project can no longer be opened in the editor until `undo`. |
| D2 | `create_canvas(80, 25)` always fails (`Invalid dimensions`) because `machine` is hardcoded to `c64`. The docstring advertises 80×25. `create_project` caps at 40. | `drawing.create_canvas`, `project_io.create_project` | No C128 80-col drawing path. |
| D3 | Plus/4 projects render with C64 glyphs and the Pepto palette. TED glyphs (`assets/ted-glyphs.svg`) and TED/VDC palettes are never used. | `glyphs.py`, `pgl_export.PEPTO` | Violates the authenticity priority; stills/SVG/bin disagree with the editor. |
| D4 | Selection past the canvas edge raises `IndexError` (uncaught). | `drawing._selection_cells` | Tool call crashes instead of returning an error. |
| D5 | Failed or no-op mutations still push an undo step and re-save; `move_selection` with no selection returns `ok:true` plus `error`. | `drawing._mutate` | Undo history fills with empty steps; agents misread success. |
| D6 | Sidecar files for projects outside the workspace are keyed by file **stem**. Two `portrait.json` files in different folders share brush state and undo history. | `drawing._session_paths` | `undo` can restore another project's artwork. |

Smaller issues:

- Duplicate `@mcp.tool()` decorator on `list_style_combinations` (`server.py`).
- Read tools default to `examples/pgl-wordmark.json`, so `update_project` / `save_project` without a path can overwrite a tracked example.
- `render_animation` with a transparent background silently renders black.
- `json.loads` on `patch_json` / `data_json` / `settings_json` raises raw exceptions instead of a tool error.
- `requirements.txt` says `mcp>=1.22`, but the code imports the 2.x `mcp.server.mcpserver.MCPServer` API.
- `run-mcp.sh` and `node_bridge.py` look for a personal `~/build/node24` build.
- SVG export emits one 1×1 `<rect>` per lit pixel, not merged vector paths.
- `drawing.typed_glyph` duplicates `typed-text.js`; the `pgl_cli place-text` command is unused.
- README says glyph art "always comes from `assets/c64-glyphs.svg`", which contradicts AGENTS.md.

## Plan

Phases are ordered so each one is shippable alone. Every phase adds tests and runs them in CI (Phase 0 adds the CI job first).

### Phase 0 — Safety and correctness (small, do first)

**Done.** D1, D2 (creation only; rendering is Phase 1), D4, D5, D6 and items 1–8 below. Evidence: `tests/test_safety.py` and `tests/test_mcp_protocol.py` (41 MCP tests pass locally on Python 3.13), a stdio launch through `run-mcp.sh` lists 60 tools with no warnings. `export_c64` now refuses non-C64 projects until Phase 1.4.

1. **CI job.** Add a path-filtered job for `agents/petscii-preview/**` that runs the unittest suite plus a new in-process MCP client test (list tools, call a read tool, a draw tool and an export tool over the protocol). This catches duplicate registrations and schema breaks.
2. **Atomic saves (D1).** Write to a temp file in the same folder, validate, then `os.replace`. On failure the original file is untouched. Share one `save_project` between `drawing.py` and `project_io.py`.
3. **Validate inputs before mutating (D4).** Coerce/check `x`, `y`, glyph (`""` or 0–511), and ink (valid for the project's machine); clamp selections to the canvas.
4. **Honest results (D5).** Only push history when something changed; return `ok:false` for "no selection" / "out of bounds".
5. **Sidecar keys (D6).** Key tool-state and history by a hash of the absolute project path.
6. **Structured errors.** Wrap every tool so bad JSON or bad arguments return an MCP error (`isError`) with a readable message, never a traceback.
7. **Write-path guard.** Writing tools require an explicit path or default to `out/workspace/`; refuse to write inside `examples/` unless asked.
8. Remove the duplicate decorator; pin `mcp>=2.3,<3`; fix transparent GIF background.

### Phase 1 — Machine-mode authenticity

**Done.** Evidence:

- `tests/test_machines.py` (12 tests; 53 MCP tests in all pass on Python 3.12 and 3.13): colours checked against the editor's own `inkHex` / `plus4Hex` / `vdcHex`, known C64 ROM shapes (ball `$51`, `A`), TED glyphs on Plus/4, CRT sizes, vector SVG, backdrop frames, ZIP manifest, video loop length, PRG load addresses and D64 size for all four machines, replay order.
- `smoke/editor_parity.py` (local, Chromium): 28 comparisons with the editor's downloads, 0 mismatches. Square PNGs and GIF playback are pixel-identical, SVG cells/fills/sizes match, and native PRGs are byte-identical for C64, C128 40-col, C128 80-col and Plus/4.

What changed beyond the list below:

- One frame path: `pgl-shared.mjs` mirrors the editor's `animationSource()`, `animationRaster()` colour tables, `animationExportFrames()` timing (10 ms rounding) and native export routing. The old `export_animation.mjs`, `export_color_animation.mjs` and `animation-source.mjs` were removed.
- Fixed while porting: animations ignored per-frame backdrop colours and mattes; reveal/replay effects read non-existent `replayBase` fields; GIFs forced a 40 ms minimum frame time; too-fast settings silently lengthened the loop; video resampled to 25 fps. Drawing tools now record paint order in `drawingReplay` like the editor.
- `export_c64` is now `export_native`. `export_color_ram_bin` is VIC-only, as in the editor.

**Editor finding (not changed here):** at CRT proportion the editor's still PNG rasterizes its SVG at 1.25×1.5 with anti-aliasing, so glyph edges blur and solid blocks show seams. The canvas and the GIF/ZIP/video exports are crisp. Worth a separate editor fix.

**Still open:** the example projects in `examples/` predate the `machine` field (all load as C64); `render_pgl_examples.py` keeps its own Pepto-only renderer until Phase 2 moves the demo tools out.

Follow `docs/machine-modes.md`.

1. **One source of truth for colour and glyphs.** Have the Node bridge resolve each cell to `{bank, code, rgb}` using `machine-modes.js`, `c64-colors.js`, `plus4-colors.js`, `vdc-colors.js`. Python only rasterizes. This removes the hardcoded `PEPTO` table and future drift (D3).
2. Select `ted-glyphs.svg` for Plus/4; respect the project `palette` (display palette id).
3. `create_canvas` / `create_project` take `machine` and use `maxColumnsForMachine` (D2). Merge the two functions.
4. `export_c64` refuses non-C64 machines; add Plus/4 and C128 VDC native export through `plus4-export.js` / `c128-vdc-export.js` only where the editor already supports them.
5. Add the **Cell shape** option (square / CRT proportion) to PNG, SVG, GIF and video, matching the editor.
6. SVG: merge pixel runs into `<path>` data per glyph (smaller, real vectors).
7. Deterministic tests: render known glyphs (e.g. solid 160, checker 102) on C64 and Plus/4 and compare pixel hashes with the editor's exports.

### Phase 2 — Agent ergonomics

1. **Let the agent see its work.** `render_still` (and a first-frame preview from `render_animation`) return an MCP image content block (small PNG) besides `saved_to`. This makes the paint → look → critique loop work without extra file reads.
2. **Fewer, clearer tools (60 → ~35).**
   - Merge `render_still` / `export_png` / `export_svg` into `export_still(format=…)`; `render_animation` / `export_gif` into one.
   - Move `render_color_animation`, `render_color_animation_set`, `render_themed_examples`, `render_machine_comparison` to `generate_demos.py` (scripts, not tools).
   - Expose static catalogs as **MCP resources**: effects, glyph families, shading ladder, op-art recipes, world-art and drawing references.
   - Expose the illustration workflow (brief → passes → critique) as an **MCP prompt**.
3. **Typed schemas.** Replace `data_json` / `patch_json` / `settings_json` strings with typed objects; use `Literal` enums for `symmetry`, `fmt`, `background`, `mode`, `format`, and effect names (generated from `list_effects`).
4. **Tool annotations.** `readOnlyHint` on list/read/plan tools; `destructiveHint` on `clear_drawing`, `save_project`, `update_project`; `idempotentHint` where true.
5. **Compact I/O.** `paint_cells` accepts row strings or runs as well as cell lists; `read_grid` can return a text-grid view. Fewer tokens per pass.
6. Use `typed-text.js` (via `pgl_cli place-text`) for `place_text`; delete the Python copy.

### Phase 3 — Packaging and docs

1. `run-mcp.sh`: drop the personal Node path; check Node version and print a clear setup message.
2. Add a project `.mcp.json` for Claude Code next to `.cursor/mcp.json`.
3. Rewrite the MCP README for novices (task first, numbered setup, tool table by job); move bridge/encoding details to `docs/maintainer-reference.md`. State encodings explicitly (`export_glyph_bin` = atlas IDs, not screen codes or PETSCII).
4. Record the work in `docs/roadmap.md`.

## Owner decisions (2026-11-22)

1. **Local only.** The server runs over stdio for Cursor / Claude Code. No remote hosting or path sandboxing beyond the write-path guard.
2. **Remove** the compatibility/demo tools from the MCP surface (Phase 2.2).
3. **In scope:** Plus/4 and C128 native exports (Phase 1.4), where the editor already supports them.
