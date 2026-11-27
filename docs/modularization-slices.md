# Modularization slices (roadmap #7)

**Goal:** Shrink the `index.html` module script without a bundler or build step. GitHub Pages keeps static ESM imports.

Slices **1–3** are on `main` (**0.35.22**); slice **4** (`editor/download-shell.js`) follows. Next is slice **5**, `editor/help-popovers.js`. See [owner-program-queue.md](owner-program-queue.md).

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

### Slice 1 (`canvas-view.js`)

- [x] **1a:** `drawCenterGuides`, `centerFrameScroll`, `editorZoomed`.
- [x] **1b:** `initCanvasView` — `fit`, `setCanvasZoom`, wheel zoom, two-finger pan, `updateCanvasViewChrome`.
- [x] `index.html` wires `stageView`; `tests/canvas-view.unit.mjs` covers fit/zoom helpers.

### Slice 2 (`drawing-tools.js`)

- [x] **2a:** `applyToolPreview`, `normalizeSelectionRect`, `strokeToolOutline`.
- [x] **2b:** `initDrawingTools` — vector pointer listeners; index keeps paint/fill/picker/text.
- [x] `tests/drawing-tools.unit.mjs`.

### Slice 3 (`stage-hint.js`)

- [x] `buildDrawingHintText`, `syncSymmetryChrome`, `syncTapEndpointsChrome`.
- [x] `index.html` `drawingHintState()` bag; `tests/stage-hint.unit.mjs`.

### Slice 4 (`download-shell.js`)

- [x] `initDownloadShell({ $, closeOtherSurfaces, onOpen, onRefresh })` owns open/close, backdrop-click close, refresh on change, export tabs (click + Arrow/Home/End), and the still/animation format toggles.
- [x] Preview rendering, filename note and exporters stay in `index.html` / `*-export.js` and are called through hooks.
- [x] `downloadShell.onTabChange(fn)` replaces the old global `selectExportTab` wrapper used by the native size check.
- [x] `tests/download-shell.unit.mjs` covers tab-key navigation and backdrop hit testing.

CI: `workspace.spec.cjs` (stage hint), `animation.spec.cjs`, drawing/canvas specs.