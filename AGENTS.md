# AGENTS.md — PETSCII Graphics Lab

## Mission
Build an enjoyable, touch-first **Commodore 64 graphics-character drawing editor**. The primary experience is selecting and painting C64 graphics glyphs to create patterns, art, borders, screens, and compositions. **This is primarily a digital C64 character-art tool, not a physical stencil production tool.** Preserve the user's ability to explore authentic C64 graphics interactively.

Repository: `funkatron/petscii-stencil-lab`
Published app: https://funkatron.github.io/petscii-stencil-lab/

## Product priorities
1. **Authenticity:** Progress from the current PETSCII-inspired Unicode approximations toward accurate C64 character-ROM glyph shapes and documented screen-code/PETSCII mappings. Distinguish character screen codes from PETSCII control/printing codes and distinguish uppercase/graphics and lowercase/uppercase character sets. Do not claim byte accuracy until verified against authoritative C64 character-ROM data.
2. **Drawing quality:** Continuous finger/stylus/mouse painting, selectable graphics glyphs, symmetry, erase, patterns, undo/redo, convenient canvas scaling, and fast responsive feedback.
3. **Creative output:** Save editable projects and export reliable graphics as SVG, PNG, and text or C64-oriented data where accurate and supported.
4. **Ease of use:** Clean, compact, collapsible sidebar and useful canvas workspace, especially on iPad Safari.
5. **Optional stencil experiments:** Preserve existing stencil checks where practical, but do not let manufacturing concerns dictate glyph palette, editing experience, or feature roadmap.

## Current architecture
- Root `index.html` contains the standalone HTML/CSS/vanilla JavaScript application. Keep it usable from GitHub Pages without a backend.
- `package.json`, `playwright.config.cjs`, `tests/editor.spec.cjs`, and `.github/workflows/browser-tests.yml` implement automated browser testing for Chromium and iPad-sized WebKit.
- Current Unicode symbols are **visual approximations**, not verified C64 glyphs or byte-level PETSCII representations. Treat that as an important technical limitation to resolve.
- Keep changes targeted; avoid breaking saved project files or existing editor workflows.

## UX / interaction requirements
- iPad Safari is a primary target; desktop keyboard/mouse should also work.
- Dragging a finger/stylus across the canvas must paint every crossed cell (interpolate between samples). Keep pointer capture and suppress page scrolling **only inside the active drawing region**; ordinary scrolling elsewhere should work.
- Canvas should scale to maximize the available bounding box while preserving square cells and full-grid visibility. Resizing or collapsing controls must not clear artwork.
- Keep glyph palette, grid settings, symmetry and export functions visible in a left sidebar while drawing, with a single-tap hide/show control. Narrow-screen overlay behavior is acceptable.
- Support touch-friendly hit targets and give visible selection/editing feedback.
- Glyph selection should eventually show actual pixel-rendered C64 glyph previews, not depend on platform Unicode font substitution.
- Avoid ordinary alphabet letters and numbers in the **graphics drawing palette** unless the user specifically requests them. UI labels and metadata can of course use text.

## Editing and data guarantees
- Maintain undo/redo at stroke granularity: one continuous drag is one undoable operation. Include clear, pattern, resize, and import operations.
- Editable JSON project save/load must validate schema and handle invalid files safely. Consider migration/versioning when changing the glyph representation.
- SVG export should use real vector paths/shapes; PNG should render the composition without editing grid lines and allow resolution/background options.
- Document explicitly whether text export is Unicode approximation, PETSCII bytes, screen codes, or another encoding. Never interchange these concepts.
- Export visual output should match the canvas as closely as possible. Preserve grid orientation and dimensions.

## Stencil analysis (secondary/experimental)
- Existing island detection is advisory coarse raster analysis, not a certification for manufacture. Keep labeling explicit.
- Do not prioritize bridge widths, metal thickness, kerf or physical stencil manufacturing unless asked.

## Testing and quality gates
1. Before editing, read current `index.html` and existing tests.
2. Add/update Playwright regression tests for each material change. Test Chromium and WebKit/iPad viewport, and real interactions where possible.
3. Cover continuous drawing, no scroll inside canvas, symmetry, sidebar collapse, grid resize, undo/redo, JSON round trips and rejection of corrupt imports, and SVG/PNG/text exports.
4. Test exported **file contents** and PNG dimensions, not merely that download buttons exist.
5. For genuine C64 glyph support, verify known character shapes and the distinction between PETSCII and screen codes against suitable sources and add deterministic rendering tests.
6. Keep the GitHub Actions workflow functional. Report what tests actually ran and their results. Never claim browser behavior passed based only on source inspection.
7. Preserve compatibility with existing projects wherever feasible; use explicit migration when formats change.

## Future features to explore
- Complete authentic graphics character sets, selectable charset mode, inverse-video variants, and C64-inspired screen/palette options.
- Tile stamp, line/rectangle/fill tools, selection/move/duplicate and motif libraries.
- Keyboard shortcuts, improved undo workflow, zoom, and optional grid guides.
- Export/import of C64-oriented character grids and metadata when reliably encoded.
- Stencil-specific manufacturing helpers only as optional tools.
