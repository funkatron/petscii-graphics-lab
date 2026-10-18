# AGENTS.md — PETSCII Graphics Lab

## Mission
Build an enjoyable, touch-first **Commodore 64 graphics-character drawing editor**. The primary experience is selecting and painting C64 graphics glyphs to create patterns, art, borders, screens, and compositions. **This is primarily a digital C64 character-art tool, not a physical stencil production tool.** Preserve the user's ability to explore authentic C64 graphics interactively.

Repository: `funkatron/petscii-stencil-lab`
Published app: https://funkatron.github.io/petscii-stencil-lab/

## Product priorities
1. **Authenticity:** Use the exact built-in C64 glyph shapes and documented screen-code/PETSCII mappings. Keep legacy Unicode approximations explicitly labeled. Distinguish character screen codes from PETSCII control/printing codes and distinguish uppercase/graphics and lowercase/uppercase character sets. Do not claim byte accuracy until verified against authoritative C64 character-ROM data.
2. **Drawing quality:** Continuous finger/stylus/mouse painting, selectable graphics glyphs, symmetry, erase, patterns, undo/redo, convenient canvas scaling, and fast responsive feedback.
3. **Creative output:** Save editable projects and export reliable graphics as SVG, PNG, and text or C64-oriented data where accurate and supported.
4. **Ease of use:** Clean, compact, collapsible sidebar and useful canvas workspace, especially on iPad Safari.
5. **Optional stencil experiments:** Preserve existing stencil checks where practical, but do not let manufacturing concerns dictate glyph palette, editing experience, or feature roadmap.

## Current architecture
- Root `index.html` contains the HTML/CSS/vanilla JavaScript application; `assets/c64-glyphs.svg` supplies the built-in character artwork. Keep it usable from GitHub Pages without a backend.
- `package.json`, `playwright.config.cjs`, `tests/*.spec.cjs`, and `.github/workflows/browser-tests.yml` implement automated browser testing for Chromium and iPad WebKit in landscape and portrait.
- The optional legacy Unicode shapes are **visual approximations**. The default palette uses exact C64 SVG glyphs; neither representation should be mislabeled as a PETSCII byte stream.
- Keep changes targeted; avoid breaking saved project files or existing editor workflows.

## UX / interaction requirements
- iPad Safari is a primary target; desktop keyboard/mouse should also work.
- Dragging a finger/stylus across the canvas must paint every crossed cell (interpolate between samples). Keep pointer capture and suppress page scrolling **only inside the active drawing region**; ordinary scrolling elsewhere should work.
- Canvas should scale to maximize the available bounding box while preserving square cells and full-grid visibility. Resizing or collapsing controls must not clear artwork.
- Keep glyph palette, grid settings, symmetry and export functions visible in a left sidebar while drawing, with a single-tap hide/show control. Narrow-screen overlay behavior is acceptable.
- Support touch-friendly hit targets and give visible selection/editing feedback.
- Glyph selection must show actual pixel-rendered C64 glyph previews, not depend on platform Unicode font substitution.
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

## Current built-in SVG implementation (October 2026)
- The editor is a ready-to-draw C64 graphics tool. Both character sets and inverse slots load from **`assets/c64-glyphs.svg`**. There is no ROM-import or ROM-storage workflow. The project owner explicitly deprioritized experimental custom-project backward compatibility; do not reintroduce that complexity by default.
- The project owner requested converted SVG artwork without the original ROM binary. The sheet contains 512 vector symbols (`c64-bank-code`) plus a viewable 16-column, 32-row layout. Keep provenance/fingerprints in README. Do not add the original binary or an encoded ROM byte array.
- `scripts/build_glyphs.py` reproducibly converts a developer-supplied 4 KB reference ROM into horizontal integer rectangle runs. This is a development tool, not an editor flow.
- Startup reads SVG geometry into an in-memory bitmap table; address = bank * 2048 + screenCode * 8. MSB is left, bytes run top to bottom. Full SVG reconstruction SHA-256 must match `fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420`. Preserve the source's one-bit @/inverse-@ discrepancy. Read inverse slots verbatim; never synthesize them by negating the first 128 glyphs.
- Startup awaits validated SVG data before restoring local state and enabling editing. Suppress autosave until restoration completes, so a slow asset cannot erase the saved draft. Failed loads preserve numeric project codes, mark unavailable glyphs, block image export, and offer retry; legacy editing remains usable.
- Default palette filters to graphics codes 64–127 and 192–255 (excluding second-bank alphabet codes 65–90 and 193–218). All codes and legacy shapes are explicitly selectable. Previews use cached bitmap canvases, accessible labels, pressed states, and inverse selection toggles bit 7.
- Canvas uses nearest-neighbor bitmap rendering. SVG exports literal pixel rectangles; PNG rasterizes the SVG. Legacy canvas and SVG share path geometry.
- Binary export is a row-major screen-code grid, empty cells map to 32, and nonempty legacy shapes are rejected. It is not PETSCII and contains no dimensions, charset, load address, or colors.
- Text containing numeric codes uses `# PETSCII-GRID 1 columns rows charset`, followed by space-separated hex codes, `--` empty cells, or legacy symbols. Validate atomically. Legacy-only Unicode text remains supported.
- JSON format remains v2 and accepts earlier v1/v2 standard/legacy files. New saves include `glyphSource: "builtin"`; reject explicitly custom-source files instead of silently replacing their artwork. No custom compatibility migration is needed. Numeric code 0 must never be lost through truthiness checks.
- Grid dimensions 1–40 include 40×25. Undo covers strokes, resize/crop, imports, patterns and charset changes. Autosave (`petscii-graphics-project-v2`) stores one device-local draft; explicit JSON downloads are portable backups. Undo history is session-only; concurrent tabs are last-write-wins.
- Stencil analysis explicitly refuses numeric glyph compositions rather than reporting a misleading success.
- Regression tests cover all 512 SVG symbols/fingerprint, known glyph shapes, both banks/inverse pixels in canvas/SVG/PNG, real Chromium touch dragging, real WebKit taps plus synthetic touch/pen streams, exports, storage, input rejection, resize, sidebar and undo. Physical iPad/Pencil verification remains a hardware check.

## Future features to explore
- C64-inspired screen colors and palette options.
- Tile stamp, line/rectangle/fill tools, selection/move/duplicate and motif libraries.
- Keyboard shortcuts, improved undo workflow, zoom, and optional grid guides.
- Export/import of C64-oriented character grids and metadata when reliably encoded.
- Stencil-specific manufacturing helpers only as optional tools.
