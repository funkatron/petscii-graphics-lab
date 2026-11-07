# Editor readability phases

`index.html` still hosts most UI wiring in a compact inline script. New logic belongs in readable ES modules; shrink the shell incrementally.

**Constraints (all phases):** no bundler; static `import()` from GitHub Pages; behavior must match [AGENTS.md](../AGENTS.md) and the [maintainer reference](maintainer-reference.md). Prefer named helpers, early returns, and normal spacing in every new module.

## Phase 1 — done

| Module | Extracted from `index.html` |
| --- | --- |
| `project-validation.js` | v3 project validation |
| `animation-frames.js` | Frame plan and sampling |
| `pointer-stroke.js` | Brush strokes and cell picking |
| `c64-colors.js` | Pepto palette table and RGB helper |
| `typed-text.js` | Text tool placement |
| `glyph-families.js` | Palette families and catalog building |
| `text-grid.js` | PETSCII-GLYPHS parse/format (slice A) |
| Effect modules | `bonfire.js`, `space-warp.js`, `depth-surfaces.js`, `depth-phase.js`, `solid-motion.js` reformatted |

`index.html` remains the integration shell: DOM, event handlers, global grid state, and glue that needs `$('…')`.

## Phase 2 — agreed plan

Phase 2 is **three slices** (ideally one PR each): move pure or mostly pure logic out of the inline script, add unit tests where possible, and leave DOM wiring in `index.html`.

### Success metrics

- Net shrink of the inline script on the order of **200–350 lines** after all three slices.
- No user-visible control renames; v3 JSON on disk and export bytes unchanged.
- CI: new `*.unit.mjs` where logic is pure; existing Playwright suites green on all three browser projects.

### Slice A — Text grid I/O (`text-grid.js`) — done

**Why first:** `importTextGrid` and `textGrid()` match documented `PETSCII-GLYPHS` v1/v2 rules; Playwright already covers imports (`text-file.spec.cjs`, `c64-only`, `color-text`).

**Planned exports:**

| Function | Role |
| --- | --- |
| `parseTextGrid(text)` | Validate header, dimensions, and tokens; return `{ columns, rows, grid, cellColors, background?, version }` or throw with the same messages as today |
| `formatTextGrid({ columns, rows, grid, cellColors, colors, includeColors })` | Build the string shown in **Raw bytes & text** and used for download |
| `TEXT_GRID_MAX_BYTES` | 64 KiB cap (shared with the file picker) |

**Stays in `index.html`:** file input handlers, `remember()` / grid apply after successful parse, status text, syncing `#output` on `redraw()`.

**Tests:** `tests/text-grid.unit.mjs` (headers, CRLF, bad tokens, v2 colors, dimensions); keep current import specs as regression.

**Risk:** Low — imports must stay atomic (full validation before mutating artwork).

### Slice B — Canvas render and glyph tiles (`canvas-render.js`)

**Why second:** `romGlyphRows`, `romRects`, `romCanvasGlyph`, `renderGrid`, `artworkPreview`, and the tile cache are ROM-dependent but need not depend on DOM IDs.

**Planned shape:** `createGlyphRenderer({ rom, inkHex, tileCache })` returning:

- `drawGlyph(ctx, glyphId, x, y, pixelSize, inkIndex)`
- `renderGrid(ctx, { cells, inks, W, H, colors, … })` — preserve WebKit `ctx.reset()` / resize behavior from the maintainer reference
- helpers for download and resize preview canvases

**Stays in `index.html`:** `canvas` / `ctx`, `fit()`, `redraw()` orchestration, animation preview calling `animationCells`.

**Tests:** rely on `colors.spec.cjs`, `builtin.spec.cjs`, and related pixel tests; optional tiny unit fixture for 8-byte glyph patterns if Node tests add value.

**Risk:** Medium — rendering regressions show up as pixels; do not change reset or `image-rendering: pixelated` assumptions without test evidence.

### Slice C — Project snapshot (`project-snapshot.js`)

**Why third:** `projectData()`, undo `snapshot()`, and `restore()` assemble grid + replay + settings; `validateProject` already lives in `project-validation.js`.

**Planned exports:**

| Function | Role |
| --- | --- |
| `buildProjectRecord(state)` | Pure JSON-shaped object from a plain state bag (dimensions, grid, inks, replay, animation fields, tool metadata) |
| `parseAndValidateProject(text)` | `JSON.parse` + `validateProject` |
| `normalizeReplay(data)` | Default missing replay color arrays |

**Stays in `index.html`:** `autosave()`, `localStorage`, `applyProject` calling modules then updating sidebar controls, `drawPalette`, `fit()`.

**Defer within phase 2:** `setAnimationSettings` / `animationSettings()` (heavy `$('…')` reads) — slice C moves the **on-disk shape**, not sidebar adapters.

**Tests:** extend `project-save`, `project-defaults`, `unified`; unit tests for sparse animation objects and omitted optional fields.

**Risk:** Medium — omitted-field defaults must not inherit previous-project state (see test-reliability audit / import-contract tests).

### Phase 2 — explicitly out of scope

| Area | Wait until |
| --- | --- |
| Animation UI (`setAnimationSettings`, `updateAnimationOptions`, `syncScrollDirections`) | Phase 3 — define plain `AnimationSettings` first |
| Export pipeline (`exportAnimation`, `animationRaster`, lazy GIF/video) | Phase 3+ — async cancellation already split across modules |
| C64 readiness preflight IIFE | Optional later; self-contained today |
| Whole-script reformat of `index.html` | Only expand sections touched per slice |

### Cross-cutting rules (every slice)

1. One slice per PR when practical — easier review and bisect.
2. Same `await import('./…')` pattern at the top of the async startup block.
3. Phase 2 modules take **arguments**; no shared global store until a later phase considers `createEditorState()`.
4. Update this doc and add a short module header pointing at maintainer contracts where relevant.

## Phase 3 — preview (not scheduled)

After phase 2, the shell is mostly workspace UI, tool gestures, animation playback, and export orchestration. Likely next extractions:

- **`animation-settings.js`** — plain settings objects; thin DOM adapters in `index.html`
- **`drawing-tools.js`** — fill, line, rectangle, select/move (conceptually isolated already)
- Optional **`editor-state.js`** factory if globals become hard to follow

Still no bundler unless you explicitly choose one later.

## Slice order

Default order: **A → B → C** (imports and text grid tests first, then rendering, then project JSON). **B before A** is acceptable if canvas work is higher priority; slices remain independent.
