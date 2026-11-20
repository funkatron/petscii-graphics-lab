# Owner program queue (2026-11-20)

Ordered delivery tracks agreed in agent session. **One slice merged before the next starts** unless CI hotfixes are required.

| Phase | Roadmap | Intent | Status |
| ---: | ---: | --- | --- |
| **0** | UI polish | Post–help-panel polish: labels, stage hints, derived-frame summary, physical iPad checklist (manual) | **Complete** (v0.35.14+, merged #178) |
| **1** | **#3** Cross-editor UX | Tier A/B: grid label, glossary, export filenames, Canvas tools, project name in v3 | **Complete** (through **0.35.18**, PRs #179–#182) |
| **1b** | **#2** Validation debt | Sine scroller, Bonfire, depth preview pacing — CI matrix + [validation-debt-status.md](validation-debt-status.md) | **In progress** |
| **2** | **#1** Prep → prototype | [diagonal-wave-wipe-prep.md](diagonal-wave-wipe-prep.md) then spike | **Prep** (after 1b) |
| **3** | **#2** C64 / animation validation | VICE PAL/NTSC matrix, physical checks; [native-player-rewrite.md](native-player-rewrite.md) when needed | **Queued** (extends 1b) |
| **4** | **#7** Modularization | Slice `editor/canvas-view.js` per [modularization-slices.md](modularization-slices.md) | **Queued** (after phase 2 prep) |

## Phase 0–1 acceptance (done)

- Stage bar shows **Grid** (not “Guides”); prefs key remains `centerGuides`.
- Colors **?** includes VIC border/background register note.
- Animation **Timeline** shows derived frame count when any effect is active.
- Stage hint names drag vs tap for line/rectangle/select/move/duplicate; mentions pan when zoomed.
- Export filenames use `_` between effect ids; download dialog **Downloads as:** matches `export-filename.js`.
- Playwright: grid label, derived summary, naming, download-preview filename line; iPad WebKit in CI.

## Phase 1b — validation debt (current)

1. Run and record: `sine-scroll`, `diagonal-scroll`, `bonfire`, `depth-preview-pacing` on Chromium + both iPad WebKit projects (see validation-debt-status).
2. Update [diagonal-movement.md](diagonal-movement.md) sine-scroller line when CI green.
3. Physical iPad + hardware remain manual ([physical-device-checklist.md](physical-device-checklist.md)).

## Phase 2 kickoff (#1)

1. Read [diagonal-wave-wipe-prep.md](diagonal-wave-wipe-prep.md) (owner-approved scope before menu promotion).
2. Spike in `animation-frames.js` + one export fixture; native gate from [animation-types-research.md](animation-types-research.md#product-gate--real-hardware).
3. Prefer **diagonal wave** ranking pass first, then **diagonal wipe pattern** extensions.

## Phase 4 kickoff (#7)

1. [modularization-slices.md](modularization-slices.md) — slice 1a: pure helpers in `editor/canvas-view.js`; slice 1b: `fit` + pan (follow-up).
2. CI: `canvas-view.spec.cjs`, existing guides/drawing-tools specs stay green.
3. No bundler; static ESM imports on GitHub Pages.

## Manual polish (ongoing)

- Physical iPad finger reach at default text size ([ui-review.md](ui-review.md)).
- Spot-check C128 / Plus/4 chrome after theme passes.