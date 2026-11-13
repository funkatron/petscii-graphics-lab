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

## Machine theme architecture (2026-11-12)

- Branch `ui/machine-theme-architecture` from main after PR #88.
- Added `html[data-ui-theme=c64c|c128|plus4]` token scopes, `ui-themes.js`, header Interface look control, device pref `petscii-ui-theme`.
- Themes change chrome only; artwork `--art-*` and C64 exports unchanged.
- Tests: `node --test tests/ui-themes.unit.mjs tests/ci-selection.unit.mjs` (11 pass); Chromium `ui-theme`, `6581-theme-screenshots`, `layout` (8 pass). Local WebKit missing `libavif16`; CI covers iPad projects.

## Theme screenshots + chrome token fix (2026-11-12)

- CI on PR #95 was green (unit + chromium + both iPad WebKit jobs).
- Pixel sampling showed hardcoded C64C enclosure rules (header gradient, panel wells, stage wash) still painted ivory over theme tokens.
- Tokenized those surfaces; Plus/4 header/sidebar now measure ~#373737/#333333.
- Review shots in `docs/review-screenshots/pr95/` (desktop + iPad portrait/landscape).

## Machine modes rebased (2026-11-12)

- Branch `feature/machine-modes-rebased` on top of theme architecture.
- Machine header owns chrome via `applyMachineChrome` + `uiThemeForMachine`; TED drawing, schema, animation, export gates ported.
- Local browser suites deferred; unit 26 pass; push for GitHub Actions.
