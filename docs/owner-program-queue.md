# Owner program queue (2026-11-19)

Ordered delivery tracks agreed in agent session. **One slice merged before the next starts** unless CI hotfixes are required.

| Phase | Roadmap | Intent | Status |
| ---: | ---: | --- | --- |
| **0** | UI polish | Post–help-panel polish: labels, stage hints, derived-frame summary, physical iPad checklist (manual) | **In progress** (`cursor/track3-polish-tierb-6ab6`) |
| **1** | **#3** Cross-editor UX | Tier B: grid label, line/rect copy, $D020/$D021 help, animation timeline clarity; Tier B remainder as small PRs | **Started** (with phase 0) |
| **2** | **#1** New animation types | Pick next prototype from [animation-types-research.md](animation-types-research.md) with [product gate](animation-types-research.md#product-gate--real-hardware) | Queued |
| **3** | **#2** C64 / animation validation | Capacity, VICE PAL/NTSC, physical checks; [native-player-rewrite.md](native-player-rewrite.md) when needed | Queued after #1 candidate chosen |
| **4** | **#7** Modularization | Slice `index.html` per [roadmap modularization checklist](roadmap.md#editor-modularization--planned); first slice `canvas-view.js` | Queued after #1–#2 foundations |

## Phase 0–1 acceptance (this PR series)

- Stage bar shows **Grid** (not “Guides”); prefs key remains `centerGuides`.
- Colors **?** includes VIC border/background register note.
- Animation **Timeline** shows derived frame count when any effect is active.
- Stage hint names drag vs tap for line/rectangle/select/move/duplicate; mentions pan when zoomed.
- Playwright: grid label, derived summary, help strings; iPad WebKit in CI.

## Phase 2 kickoff (#1)

1. Re-read ranked candidates in animation-types-research (post–Parallax/Backdrop).
2. Choose one movement or color prototype with a documented native path (or procedural-v2 profile).
3. Spike in code + focused tests before Animation menu promotion.

## Phase 3 kickoff (#2)

Run in parallel once #1 prototype is chosen: extend VICE matrix for that effect; update [c64-output.md](c64-output.md) if readiness rules change.

## Phase 4 kickoff (#7)

1. Land [modularization-slices.md](modularization-slices.md) boundaries on `main`.
2. Extract **canvas view** (zoom, guides, pan, `drawCenterGuides`) with no behavior change.
3. Each slice: unit/helpers + one Playwright smoke; no bundler.

## Manual polish (ongoing)

- Physical iPad finger reach at default text size ([ui-review.md](ui-review.md)).
- Spot-check C128 / Plus/4 chrome after theme passes.