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
