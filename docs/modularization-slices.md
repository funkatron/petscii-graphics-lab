# Modularization slices (roadmap #7)

**Goal:** Shrink the `index.html` module script without a bundler or build step. GitHub Pages keeps static ESM imports.

Phases 0–1 are complete; slice **1a** may land while validation and animation prep continue ([owner-program-queue.md](owner-program-queue.md)).

## Proposed modules (order)

| Slice | Module | Owns | Leaves in boot |
| --- | --- | --- | --- |
| 1 | `editor/canvas-view.js` | `canvasZoom`, `centerGuides`, `fit`, `drawCenterGuides`, frame pan/zoom wheel, `updateCanvasViewChrome` | DOM refs, `redraw` callback, prefs read/write |
| 2 | `editor/drawing-tools.js` | `toolPreview`, line/rect/select/move, `toolDrag`, tap endpoints | `grid`, `commitTool`, pointer-stroke paint path |
| 3 | `editor/stage-hint.js` | `updateDrawingHint`, symmetry/tap chrome hooks | Tool names, animation preview flag |
| 4 | `editor/download-shell.js` | Download dialog open/close, tab wiring, preview refresh hooks | Exporters in existing `*-export.js` |
| 5 | `editor/help-popovers.js` | `helpFor`, `contextHelp`, section append rules | Section HTML in `index.html` |

## Contracts

- **State:** Explicit imports from a thin `editor/state.js` or passed `init({...})` bag — no new hidden globals.
- **Tests:** Each slice keeps current Playwright specs green; add `*.unit.mjs` only for pure helpers moved out.
- **Version:** One user-visible bump per merged slice if behavior or strings change.

## Slice 1 checklist (`canvas-view.js`)

### Slice 1a (shipped incrementally)

- [x] `editor/canvas-view.js`: `drawCenterGuides`, `centerFrameScroll`, `editorZoomed`.
- [x] `index.html` imports module; `tests/canvas-view.unit.mjs`.
- [ ] Slice 1b: `fit`, `setCanvasZoom`, pan pointers, wheel zoom — `initCanvasView({...})`.

CI: existing `canvas-view.spec.cjs`, `drawing-tools.spec.cjs` (guides during rect).