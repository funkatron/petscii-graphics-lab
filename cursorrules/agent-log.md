# Agent log (2026-11-07)

## Tier A housekeeping (2026-11-17)

**What:** Roadmap marks #66 done; `docs/tier-a-ooda-plans.md` for ordered Tier A work; app 0.35.1.  
**Next:** Owner review OODA §1, then implement reference overlay.

## Issue #66 — name collision space (2026-11-17)

**What:** `project-naming.js` — 48×48 adjective–noun pool (2 304 stems), shared regenerate with retry. `export-filename.js` — effect slugs on GIF/video/ZIP and native PRG/D64 (`machine` + movement/color/backdrop ids).  
**Tested:** `project-naming` + `export-filename` unit; Chromium `project-naming` + `project-save` + `d64` (15/15). iPad WebKit awaits CI.

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

## PR #96 CI fix (2026-11-12)

- Unit: sine-scroll deepEqual failed because `animationCells` now includes `colorPalette`.
- iPad portrait: `#import` / export-tab clicks never settled while readiness panel stuck on "Checking…"; `schedule()` bumped `revision` on every redraw and invalidated in-flight checks.
- Fix: compare cells/inks (+ assert pepto-pal); debounce schedule without revision bump; only reschedule from redraw when data export tab is open.
- Pushed `6468a5e` for GitHub Actions (no local Playwright).

## Flush ink palette tiles (2026-11-13)

- Branch `ui/flush-ink-palette` / PR #97.
- `.color-grid` VIC + TED swatches: gap 0, no border/radius/chrome; selection is inset white+black ring.
- Compact injected button min-height/padding no longer applies to swatches.
- Tests: colors flush abutment; machine-modes TED 121 / 8-col / gap 0.

## PR #96 WebKit dialog stability (2026-11-13)

- Follow-up: unit+chromium green; both iPad jobs still failed — modal recentered while readiness rewrote, so `#downloadClose` / export tabs never settled; suite hit 600s.
- Stop schedule-from-redraw and panel rewrite on debounce; helpers close dialog via `.close()` and skip already-selected tabs; focused CI global-timeout 20m.
- Retriggered on `5bd6a18`.

## Research motion native capacity (2026-11-17)

- After merge of PR #155 (`fld-blinds`), branch `cursor/research-effects-native-6ab6`.
- Added `tests/research-motion-capacity.spec.cjs`: 40×24 × five profiles × four loop lengths for `column-wave` and `fld-blinds`; uses `capacityInput()` like `c64-capacity.spec.cjs`.
- Finding: `column-wave` at 40 columns → 40 samples; sparse @ 2s fails **playback speed** on `generic` (~31k bytes, ratio > 1); `native-rows` would fit timing but ~220k bytes RAM. `fld-blinds` sparse @ 2s still fits.
- Docs: `column-wave-native.md`, `fld-blinds-native.md`, maintainer reference coverage lines.
- Local: Chromium `research-motion-capacity.spec.cjs` pass; WebKit not installed on agent VM (CI).

## Procedural VIC v2 analysis (2026-11-17)

- Branch `cursor/procedural-vic-v2-6ab6` (includes capacity matrix).
- `c64-procedural-vic.js`: column bend + fld-blinds gap tables, encode/decode, CPU/RAM estimates; `createC64AdaptiveProgram` prefers `procedural-v2` when `motionSource` present.
- Readiness/export pass `motionSource` for research effects; download still replay-only until runtime codegen.
- Tests: `tests/c64-procedural-vic.unit.mjs`; capacity spec expects sparse column-wave `procedural-v2`.

## Housekeeping (2026-11-17)

- Closed obsolete **PR #156**; capacity matrix and native docs live on `main` via #157–#159.
- Track **#2** adds optional VICE procedural-v2 scenarios (`vice.integration.mjs`).

## Procedural VIC playback (2026-11-17)

- `c64-procedural-codegen.js`: 6502 column-wave + fld-blinds players; py65 `c64-procedural-playback.spec.cjs`.
- 8×5 column-wave sparse PRG ~946 bytes total; download via adaptive + `motionSource`.
