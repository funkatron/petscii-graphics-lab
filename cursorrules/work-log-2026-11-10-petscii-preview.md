# Work log: PETSCII machine-mode preview (2026-11-10)

## Goal
Explore C64 / C128 (40-col) / Plus-4 UI modes that share one glyph sheet, with visual demos and a small MCP.

## Done
- Confirmed shared-glyph cluster: C64, C128 VIC-II 40-col, Plus/4.
- Built authentic renderer from `assets/c64-glyphs.svg` under `agents/petscii-preview/`.
- Wrote demo stills + mode-switch GIF to `agents/petscii-preview/out/`.
- Added MCP server tools: `list_machines`, `render_petscii_screen`, `render_machine_comparison`.
- Moved this work from project6581 into petscii-graphics-lab (correct home).

## Not done
- Cursor MCP config not registered in the user's global Cursor settings yet.
- No product UI wiring for multi-machine modes yet; exploration only.
