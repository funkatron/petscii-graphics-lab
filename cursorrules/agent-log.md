# Agent log (2026-11-07)

## Download flake (item 2)

- Documented root cause in `docs/test-reliability-audit.md`: hidden `#saveProject` on iPad when Share is shown.
- Fixed `tests/helpers.cjs` to call `saveProject.click()` in-page for that selector.

## Physical device checklist (item 3)

- Added `docs/physical-device-checklist.md`; linked from README.

## Bonfire gate (item 4)

- Added `docs/bonfire-release-checklist.md`; updated roadmap Bonfire CI item.

## Architecture diagram (item 5)

- Added `docs/architecture.md` with module map and Mermaid flow; linked from README.

## Modularization (item 1)

- Extracted `project-validation.js`, `animation-frames.js`, `pointer-stroke.js`.
- Added `tests/project-validation.unit.mjs`.

## Local verification

- `node --test tests/project-validation.unit.mjs tests/bonfire.unit.mjs` — 10 passed.
- Chromium: `c64-only`, `bonfire`, `layout` repeated-download — 8 passed.

## PETSCII machine-mode preview (2026-11-10)

- Added `agents/petscii-preview/` renderer + MCP for C64 / C128 / Plus-4 shared-glyph chrome demos.
- Demo outputs in `agents/petscii-preview/out/`.
- Details: `cursorrules/work-log-2026-11-10-petscii-preview.md`.
- Moved here from project6581 after realizing this was the intended repo.

## Plus/4 color animation twins (2026-11-11)

- Added exploratory TED 121-color palette (`plus4-colors.js`) and Plus/4 twins of color-cycle / wave / glow / raster / plasma / bonfire.
- Drawing/ink palette remains C64 Pepto; Plus/4 effects only recolor animation frames via TED RGB.
- Unit tests: `tests/plus4-colors.unit.mjs`.

## MCP registration (2026-11-11)

- Registered `petscii-preview` in project `.cursor/mcp.json` and `~/.cursor/mcp.json`.
- Added `render_themed_examples` MCP tool; sample outputs under `agents/petscii-preview/out/examples/`.

## Raven color-animation artwork (2026-11-11)

- Color GIF export defaults to `agents/petscii-preview/examples/golden-fuzzy-raven.json` (40×40 painted cube+bonfire).
- `export_color_animation.mjs` / MCP tools accept `--project` / `project_path`.
- Regenerated C64 + Plus/4 color GIFs under `agents/petscii-preview/out/examples/` (gitignored `out/`).

## Rotating-cube + color GIF set (2026-11-11)

- Exporter defaults motion to `rotating-cube` (`--motion=` override); copies project camera fields.
- Seconds sized so frame budget keeps a full 48-sample cube tumble with each color ramp.
- Regenerated all 12 C64/Plus4 color GIFs with cube motion on raven artwork.

## Full PGL MCP UI parity (2026-11-11)

- Generalized `export_animation.mjs` for any motion × color + full animation settings.
- Phase 1: project CRUD, text-grid, plan/still/GIF/ZIP/C64/bin MCP tools.
- Phase 2: drawing tools (paint/fill/line/rect/text/selection/undo) on workspace projects.
- Phase 3: `export_video` via PNG frames + ffmpeg (MP4/WebM); requires ffmpeg on PATH.
- Smoke tests: `agents/petscii-preview/tests/test_pgl_mcp_smoke.py`.
