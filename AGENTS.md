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
- Keep settings in a compact, collapsible left sidebar. Glyph selection lives in its own panel, reached from an always-visible drawing-strip Glyphs button. Dock it on wide screens (1200px+); use an overlay on smaller screens. Never nest the palette scroll box inside the settings scroller.
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
- Canvas uses nearest-neighbor bitmap rendering in backing-store pixels; avoid relying on a retained HiDPI context transform across WebKit resizes. SVG exports literal pixel rectangles; PNG rasterizes the SVG. Legacy canvas and SVG share path geometry.
- Binary export is a row-major screen-code grid, empty cells map to 32, and nonempty legacy shapes are rejected. It is not PETSCII and contains no dimensions, charset, load address, or colors.
- Text containing numeric codes uses `# PETSCII-GRID 1 columns rows charset`, followed by space-separated hex codes, `--` empty cells, or legacy symbols. Validate atomically. Legacy-only Unicode text remains supported.
- JSON format remains v2 and accepts earlier v1/v2 standard/legacy files. New saves include `glyphSource: "builtin"`; reject explicitly custom-source files instead of silently replacing their artwork. No custom compatibility migration is needed. Numeric code 0 must never be lost through truthiness checks.
- Grid dimensions 1–40 include 40×25. Undo covers strokes, resize/crop, imports, patterns and charset changes. Autosave (`petscii-graphics-project-v2`) stores one device-local draft; explicit JSON downloads are portable backups. Undo history is session-only; concurrent tabs are last-write-wins.
- Stencil analysis explicitly refuses numeric glyph compositions rather than reporting a misleading success.
- Regression tests cover all 512 SVG symbols/fingerprint, known glyph shapes, both banks/inverse pixels in canvas/SVG/PNG, real Chromium touch dragging, real WebKit taps plus synthetic touch/pen streams, exports, storage, input rejection, resize, sidebar and undo. Physical iPad/Pencil verification remains a hardware check.

## Automatic animation and drawing replay
- Speed is stored as `animation.seconds`, selected through **Loop duration**: 0.5/1/2/4/8/12 seconds per loop. New projects default to 2 seconds; imported/autosaved explicit durations remain unchanged. Labels show seconds per loop. Speed affects preview and all exports; it is not an original wall-clock recording rate.
- Cap procedural frame count for fast loops so GIF durations remain at least 20 ms. Scroll positions use `floor(frame / count * dimension)` to cover a complete cycle even when frames are sampled. Other formats share this same sampled timeline.
- The Animation section offers drawing replay, scrolling left/up, row waves, inverse pulse, Color cycle, Rainbow wave and Warm glow. Header Play/Pause remains accessible with collapsed tools. Playback is opt-in, pauses in hidden tabs, and is never restored as playing from JSON/autosave.
- Preview is derived from the original grid; never mutate artwork/history/text/autosave on animation ticks. Painting and structural edits stop preview first. Pause holds the preview, Stop restores the original grid.
- `drawingReplay` contains a same-size `base` grid and `[cellIndex, glyph]` events, including erasures. New changes record in actual input order. Patterns, resizing and imported projects without recordings reset to a row-major reveal. At 20,000 events condense to current art. History snapshots include the recording.
- Validate replay length, indices, values and final reconstruction against the project grid before mutation. v2 saves add optional `animation` settings and `drawingReplay`; earlier standard files continue loading with defaults.
- Preview/GIF/PNG frame sequences share `animationCells`, frame counts and delays. Replay holds the final picture for 25% of the loop and limits frame count to keep GIF delays at least 20 ms. Animation export snapshots source grid, replay, bank, glyph bits, options and editable project before awaiting work; never pick up later edits mid-export.
- Export uses vendored MIT `gifenc@1.0.3`, dynamically imported only for GIF encoding. Keep its license/provenance in `vendor/`. GIFs use an indexed palette with background/transparent index 0 and C64 ink indices 1–16, full frames, disposal 2, repeat forever, and centisecond-balanced delays. Resolution is 8/16/32 pixels per cell.
- Keep the most recent GIF Blob URL alive for the single Download button; revoke replaced links after a grace period. Ordinary downloads retain a 60-second grace period for Safari handoffs.
- GIF, ZIP and video share `animationRaster` (indexed pixels) and `animationExportFrames` (centisecond-balanced durations). Validate numeric data in replay base/events as well as the final grid when glyphs are unavailable.
- Frame ZIP uses a lazily loaded, tree-shaken MIT `fflate@0.8.3` streaming writer. Store already compressed PNGs without another compression pass. Keep its license and build fingerprint in `vendor/`.
- ZIP contains complete numbered PNG frames in `frames/`, `timing.json` (`petscii-animation-frames`, version 1), original `project.json`, and `README.txt`. Frame metadata supplies `file`, `startMs`, `durationMs`; all durations must sum to the chosen loop duration. Replay sampling and final hold match GIF. Do not imply a constant frame rate or every cell event is separately exported.
- Allow only one animation export at once; disable all three export buttons during work, provide Cancel, and restore controls on success/failure/cancellation. Cancellation must never publish an incomplete archive. Retain prior successful GIF/ZIP/video downloads and revoke replaced URLs after a grace period. Editing remains available during export.
- `video-export.js` integrates a lazy, unmodified tree-shaken **MPL-2.0 mediabunny@1.61.6** bundle. Retain its copyright/license and pinned source/build provenance in `vendor/`. Prefer native AVC/H.264 MP4, then VP9/VP8 WebM, probing with exact dimensions. No WASM/CDN/backend or media capture permissions. Initialize the HTML media backend before probing WebCodecs to avoid GTK/WPE WebKit initialization failures.
- Video exports 1–100 complete silent loops using explicit frame timestamps/durations and awaited encoder backpressure. `animation.videoRepeats` is optional in v2 imports (default 1), must be an integer from 1–100, and persists through autosave/projects/history. The video-only number input shows total duration; invalid drafts do not replace the last valid saved count, and invalid video exports preserve previous completed downloads. Snapshot the count before async loading, offset each loop by `seconds * 1000`, request a keyframe at each loop boundary, and keep frame raster indices local to the loop. Use an outer loop rather than allocating a repeated-frame array; progress and cancellation span all loops. GIF/ZIP timelines and preview remain unchanged. Do not set a fixed-frame-rate muxing option that would quantize the shared timeline. Video's transparent setting renders against the dark palette; GIF/PNG retain alpha. Document lossy compression and unsupported-browser behavior.
- Video output/cancellation must close encoders and finalize or cancel the muxer. A canceled or failed output must never replace the last successful cached file. Snapshot artwork/options before module loading, and keep editor mutations independent of ongoing export.
- Tests independently decode video with FFmpeg and inspect metadata/timestamps with FFprobe. CI installs FFmpeg. Exercise native MP4/WebM, replay order/erasures, selected duration/resolution, transparent-to-dark behavior, unsupported encoders, module failure, source edits during loading, and cancellation during loading/finalization. Do not substitute mocked encoders for the native output checks.
- ZIP regressions independently validate CRCs and PNG pixels with development-only `adm-zip` and `pngjs`, compare all frames/timings to GIF, preserve both banks/inverse slots, snapshot edits during loading, and exercise cancellation and encoder failures.
- Tests use development-only `omggif` as an independent decoder to verify frame contents, order, erasures, dimensions, repeat count, timing and transparency. Also cover preview pause/stop/edit safety, recording persistence, invalid imports and encoder-load failures.

## Single download actions
- Still artwork offers Download PNG / Download SVG. Animation offers exactly one Download GIF, Download video, or Download frame ZIP button per selected format. Do not expose separate Generate/Export and Save controls for the same artifact.
- `animationDownloads` retains one successful `{key,url,name}` result per format. `key` serializes the complete snapshotted project (including artwork, cell colors, recording, charset, effect, speed, scale, background and repetitions). Compare it before reusing a file; edits during async generation must not make that older result appear current. Repeat taps with matching source download immediately without rendering again, preserving Safari's user-gesture handoff. New inputs regenerate automatically.
- Primary buttons retain their labels after success/cancel/failure, show Preparing during generation, and disable during any active animation download. Keep progress and cancellation accessible. Cache publication is atomic after completion/checkpoint; failed or canceled attempts preserve the previous result. Replaced URLs get the existing 60-second grace period. Cache state is session-only and never enters project JSON.
- Tests exercise the real single button for repeat downloads, inspect stable file URLs / bytes, assert regeneration after artwork/settings changes, and retain native video, cancellation, snapshot and failure checks. Primary buttons expose cached file metadata in `data-download-url` / `data-download-name` for regression inspection, not as separate visible actions.

## Color cycling animation
- `COLOR_CYCLES` defines C64 index ramps for `color-cycle` (all 16 colors, starts at each source ink), `color-wave` (eight chromatic inks with diagonal x+y offsets), and `color-glow` (warm shades with a return path). Source inks absent from a restricted ramp start at that ramp’s first color; repeated colors use their first position.
- These effects change derived frame inks only. Preserve glyph codes, empty cells, shared background, saved cell colors, replay and history. Stop/edit and static exports retain original art. Keep effect selection in the existing compact select and use existing loop speed, resolution, background, repetition and export controls.
- Frame count equals the ramp length, capped by the shared minimum 20 ms frame budget. Use floor(frame/count * ramp.length) for phase, without duplicating the first frame at the end. Preview/GIF/ZIP/video must share the same color calculation and source snapshot. Persist effect names in v2 animation metadata and reject unknown effects atomically.
- Regression tests independently decode all color-effect GIF/ZIP frames, verify exact palette colors, geometry/alpha/background/timing, confirm preview pause/stop and still/project preservation, exercise export snapshots during edits, and decode repeated native video cycles.

## Compact workspace navigation
- Keep Glyphs/brush preview, direct ink access, Paint/Eraser, Symmetry and Undo/Redo in a persistent drawing strip outside the settings scroller. Primary touch targets are at least 44 px. Compact visual labels on phones must retain accessible names; symmetry must expose its active state.
- Settings use initially closed Canvas setup, Colors, Animation and Help disclosures. Broad pattern/clear/recolor actions live under explicitly scoped disclosures. Stage columns and rows together, show the proposed crop, and apply once with one undo entry; Cancel leaves art/history unchanged.
- Header Download artwork opens a native responsive dialog with keyboard-accessible Image / Animation / C64 data tabs, format selection and exact grid-free output previews. Retain one action per chosen format, existing download caches and snapshot isolation. Project open/editable JSON download live in a separate Project menu. Dialog navigation must not alter art/history/playback. Closing it keeps export work running; progress and Cancel remain accessible outside it and inside when open.
- Animation preview shows effect name and paused state plus Return to drawing. Loop duration labels use seconds. Static previews/exports always show original art; motion previews use the shared derived frames and selected output background. Display actual output dimensions and sampled frame counts, including video repetitions.
- Glyph picker retains one independent scrolling surface and authentic high-contrast white-on-black thumbnails. Recents (maximum 16) and favorites store validated bank/code pairs in device-local UI preferences, never project JSON. Families preserve the graphics-only filter; exact pages, both banks, inverses and legacy options remain accessible. Pin is optional at widths 700 px+; normal wide-screen docking starts at 1200 px. Overlay selection dismisses; docked selection stays open. Escape/close/backdrop restore focus without painting. Never nest the palette in settings.
- Autosave success says Saved on this device; storage failure needs a persistent visible backup notice even at small widths. UI preferences must not prevent art restoration or editing if storage is unavailable.
- Preserve Canvas ResizeObserver fitting and stroke interpolation. Browser test helpers reveal controls through real dialog/disclosure/tab/picker clicks. Historical resize helpers apply each requested change; dedicated workspace tests exercise staging both dimensions and a single undo.

## C64 color picker
- `C64_COLORS` is the 16-entry Pepto PAL palette, in hardware index order. Reference: https://www.pepto.de/projects/colorvic/2001/ (gamma-corrected hex table). Treat RGB as an approximation of analog C64 output, not a unique exact hardware RGB specification.
- `colors: {ink, background}` stores brush ink and shared background indices 0–15. `cellColors` parallels `grid` with one foreground index per cell, including empty cells. Missing arrays in earlier v1/v2 projects inherit global ink (default 14); color 0 is valid. Validate array lengths and integer ranges before mutation.
- Colors uses Ink/Background targets, a 16-swatch grid, Swap brush / background, and explicit Recolor entire drawing. Brush selection changes future strokes and glyph previews only. Swap changes brush/background settings without changing cell ink. Recolor changes occupied cells, records color edits in replay, and is undoable. Color changes stop preview and persist in history, JSON and autosave.
- Painting checks both glyph and ink, so stamping an unchanged glyph can recolor it. Erasing writes the current brush index to the emptied cell. Symmetry applies brush ink to all stamped cells; patterns and text import use brush ink. Resize preserves overlap colors and fills new empty cells with brush ink.
- `drawingReplay.baseColors` and `eventColors` parallel the base grid and two-tuple glyph events. Infer missing arrays from global ink for older recordings. Validate that both final glyphs and colors reconstruct the saved composition, including empty cells. History and async export snapshots clone these arrays. Reset recordings preserve empty-cell color state; events include color-only edits.
- Bitmap tile cache keys include bank, code and cell ink. Header brush previews use brush ink; palette thumbnails use white on neutral black for reliable contrast. Canvas and SVG/PNG use each cell’s color; SVG keeps literal pixel rectangles. Still background overrides remain explicit.
- `animationCells` returns `{cells, inks}` so replay, scrolling, waves and inverse effects move colors with glyphs. GIF/ZIP/video share the same indexed raster with index 0 reserved for background/transparency and indices 1–16 for C64 inks, preserving opaque black and inks equal to the background under transparency. Video falls back to the snapshotted canvas background. Retain snapshot isolation while editing during export.
- Color RAM export is one byte per cell, row-major, values 0–15 including empty cells. Screen-code and text exports remain glyph-only. Neither binary has dimensions, character set or a load address. JSON preserves all cell colors and replay.
- Tests inspect swatch RGB, brush-only selection, same-glyph repaint, recoloring, symmetry, resize, patterns, undo/autosave, old file defaults and invalid array/replay rejection. Independently inspect SVG/PNG/GIF/ZIP pixels, opaque black with transparency, inverse slots, colored replay and decoded native repeated-video colors. Shared FFmpeg helpers are in tests/video-utils.cjs.

## Future features to explore
- Color-aware text/data import formats.
- Tile stamp, line/rectangle/fill tools, selection/move/duplicate and motif libraries.
- Keyboard shortcuts, improved undo workflow, zoom, and optional grid guides.
- Export/import of C64-oriented character grids and metadata when reliably encoded.
- Stencil-specific manufacturing helpers only as optional tools.
