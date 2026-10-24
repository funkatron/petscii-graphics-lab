# AGENTS.md — PETSCII Graphics Lab

## Mission

Build an enjoyable **Commodore 64 character-graphics editor** for touch, Apple Pencil, and mouse.

The main task is choosing authentic glyphs and painting pictures, patterns, and screens. Digital drawing comes first. Physical stencil experiments are secondary.

Repository: [funkatron/petscii-graphics-lab](https://github.com/funkatron/petscii-graphics-lab)
Published app: https://funkatron.github.io/petscii-graphics-lab/

## Start here

This file is the authoritative project guidance. Read it completely before changing the repository.

1. Read the [user guide](README.md) to understand the current controls.

2. Read the relevant sections of the [maintainer reference](docs/maintainer-reference.md). Its implementation contracts are part of this guidance.

3. Inspect the implementation and tests for the area you will change.

4. Make the change, run appropriate checks, and report actual results and remaining limits.

The [audit](AUDIT.md) records earlier versions. The [UI review](docs/ui-review.md) separates completed work from follow-ups.

## Product priorities

1. **Authenticity:** Use the exact built-in C64 glyph shapes and documented screen-code/PETSCII mappings. Keep screen codes distinct from PETSCII text/control codes. Identify the two character sets clearly. Verify byte accuracy against authoritative C64 character-ROM data before claiming it.

2. **Drawing quality:** Continuous finger/stylus/mouse painting, selectable graphics glyphs, symmetry, erase, patterns, undo/redo, convenient canvas scaling, and fast responsive feedback.

3. **Creative output:** Save editable projects and export reliable graphics as SVG, PNG, and text or C64-oriented data where accurate and supported.

4. **Ease of use:** Clean, compact, collapsible sidebar and useful canvas workspace, especially on iPad Safari.

5. **Optional stencil experiments:** Manufacturing is outside the current editor. Add stencil-specific tools only if explicitly requested.

## Where the code lives

- `index.html` contains the application’s HTML, CSS, and plain JavaScript; `assets/c64-glyphs.svg` supplies the built-in character artwork. Keep it usable from GitHub Pages without a backend.

- `package.json`, `playwright.config.cjs`, `tests/*.spec.cjs`, and `.github/workflows/browser-tests.yml` implement automated browser testing for Chromium and iPad WebKit in landscape and portrait.

- Artwork uses numeric atlas glyph IDs 0–511 (source bank × 256 + screen code) and an empty-cell marker only. There is no Unicode-shape renderer or stencil-analysis workflow. Keep glyph IDs distinct from screen codes and PETSCII bytes.

- Keep changes targeted. The owner approved the v3 unified-glyph format break without migration; preserve v3 files and existing editor workflows.

## Drawing and interaction

- iPad Safari is a primary target; desktop keyboard/mouse should also work.

- Dragging a finger/stylus across the canvas must paint every crossed cell (interpolate between samples). Keep pointer capture and suppress page scrolling **only inside the active drawing region**; ordinary scrolling elsewhere should work.

- Canvas should scale to maximize the available bounding box while preserving square cells and full-grid visibility. Resizing or collapsing controls must not clear artwork.

- Keep settings in a compact, collapsible left sidebar. Glyph selection lives in its own panel, reached from an always-visible drawing-strip Glyphs button. Dock it on wide screens (1200px+); use an overlay on smaller screens. Never nest the palette scroll box inside the settings scroller.

- Support touch-friendly hit targets and give visible selection/editing feedback. Paint and Eraser consistently select their named tool; repeated taps must not toggle to the other tool. Disable those two controls during read-only preview and name the current drawing tool in the canvas hint.

- Ink opens an anchored palette without opening or scrolling settings. Preserve keyboard dismissal/focus and normal outside-click behavior. Glyph codes are optional device-local display labels; exact accessible code labels remain available.

- Default glyph browsing groups similar shapes across code pages, with labeled families and adjacent inverse pairs. Include every allowed code once. Show letters & numbers is the only control that reveals letters and digits, defaults off, and is not changed by glyph selection, imports, Undo, or glyph reload. Do not restore numeric code-page browsing or a separate Inverse button. Select either inverse partner directly from the palette.

- Glyph selection must show actual pixel-rendered C64 glyph previews, not depend on platform Unicode font substitution.

- Uppercase, lowercase and full graphics share one palette and one per-cell ID space. Do not restore a whole-drawing character-set switch or separate lowercase toggle. Show letters & numbers reveals both cases without changing existing artwork.

- Avoid ordinary alphabet letters and numbers in the **graphics drawing palette** unless the user specifically requests them. UI labels and metadata can of course use text.

## Editing and data guarantees

- Keep one continuous drag as one undoable operation. Include clear, pattern, resize, and import operations.

- Editable JSON project save/load must check the file structure and reject invalid files safely. Plan format migration or versioning when changing glyph representation.

- SVG export should use real vector paths/shapes; PNG should render the composition without editing grid lines and allow resolution/background options.

- Document explicitly whether text export is Unicode approximation, PETSCII bytes, screen codes, or another encoding. Never interchange these concepts.

- Export visual output should match the canvas as closely as possible. Preserve grid orientation and dimensions.

## Before calling a change complete

1. Before editing, read current `index.html` and existing tests.

2. Add/update Playwright regression tests for each material change. Test Chromium and WebKit/iPad viewport, and real interactions where possible.

3. Cover continuous drawing, no scroll inside canvas, symmetry, sidebar collapse, grid resize, undo/redo, JSON round trips and rejection of corrupt imports, and SVG/PNG/text exports.

4. Test exported **file contents** and PNG dimensions, not merely that download buttons exist.

5. For genuine C64 glyph support, verify known character shapes and the distinction between PETSCII and screen codes against suitable sources and add deterministic rendering tests.

6. Keep the GitHub Actions workflow functional. CI uses the version-matched official Playwright container and one worker; update the container tag with the pinned npm version. Report what tests actually ran and their results. Never claim browser behavior passed based only on source inspection.

7. Preserve numeric v3 projects. Reject older versions, whole-drawing charset fields, Unicode-shape and custom-ROM projects atomically. Do not reintroduce abandoned format conversions.

## Current decisions to preserve

- **Built-in artwork:** both banks and inverse slots come from `assets/c64-glyphs.svg`. Keep the original ROM binary out of the repository. There is no user-facing ROM import.
- **Editable files:** v3 keeps the `petscii-stencil-lab` format identifier and numeric ID 0, with no global charset. Autosave uses `petscii-graphics-project-v3`. Earlier formats are unsupported by owner decision.
- **Colors:** preserve one ink index per cell and one shared background. A brush color change affects future strokes. Recoloring the entire drawing is a separate undoable action.
- **Animation:** previews use derived frames and leave source artwork intact. The canvas is read-only during playing and paused previews; Return to drawing enables painting. Loop duration sets the whole timeline; independent movement/color rates repeat 1/2/4/8/16 times within it. Preview and all animation downloads share phase and sampling; warn instead of silently aliasing unsupported fast combinations. Videos support 1–100 complete loops.
- **Animation options:** keep scroll direction and movement/color wave direction and waveform controls contextual. All preview and output formats share their snapshotted values; color waves alone never move characters.
- **Downloads:** one action per selected format. Snapshot artwork before asynchronous work. Keep progress, cancellation, and the last completed download available.
- **Workspace:** keep drawing/recovery controls visible, glyph browsing independent, and canvas resizing staged with Apply/Cancel and one undo entry.
- **Details:** use the [maintainer reference](docs/maintainer-reference.md) for exact bytes, hashes, timing, schema validation, encoder behavior, and regression coverage.

## Documentation style

Write for a novice who may be reading in short sessions.

- Lead with the task and the next action.
- Use numbered steps for sequences and tables for choices.
- Keep paragraphs short; give each bullet one main purpose.
- Define specialist terms before using them in instructions.
- Match visible control names exactly. Distinguish current behavior, historical behavior, and proposed work.
- Keep developer details in the maintainer reference. Preserve precise limits, identifiers, source hashes, and test evidence.
- Retain license text verbatim; explain the dependency in `vendor/README.md` instead of rewriting legal terms.

## Future features to explore

Track requested features in the [roadmap](docs/roadmap.md). Movement/reveal and color animation now have independent selections sharing one loop. Keep both settings in snapshots and project validation.

- C64 still/animation PRG and D64 export are implemented in `c64-export.js`. D64 packages the same player as one closed PRG on a standard 35-track disk. Preserve shared frame input, bounded memory, CPU-work checks, RUN/STOP exit, independent disk extraction and emulator tests. Representative full VICE/1541-II checks now pass on PAL/NTSC; physical hardware and broader animation performance remain follow-ups; see [C64 output](docs/c64-output.md).
- Legacy shapes, the manufacturing checker, v1 imports, mixed Unicode text, and old single-effect color settings have been removed. The owner does not prioritize abandoned-format compatibility; keep the C64-only architecture simple.
- Color-aware text/data import formats.
- Tile stamp, line/rectangle/fill tools, selection/move/duplicate and motif libraries.
- Keyboard shortcuts, improved undo workflow, zoom, and optional grid guides.
- Export/import of C64-oriented character grids and metadata when reliably encoded.
- Stencil-specific manufacturing helpers only as optional tools.
