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
- Keep settings in a compact, collapsible left sidebar. Glyph selection lives in its own panel, reached from an always-visible header Glyphs button. Dock it on wide screens (1200px+); use an overlay on smaller screens. Never nest the palette scroll box inside the settings scroller.
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
- Speed is stored as `animation.seconds`, selected through **Animation speed**: 0.5/1/2/4/8/12 seconds per loop. New projects default to 2 seconds; imported/autosaved explicit durations remain unchanged. Labels show rates relative to a 4-second loop. Speed affects preview and all exports; it is not an original wall-clock recording rate.
- Cap procedural frame count for fast loops so GIF durations remain at least 20 ms. Scroll positions use `floor(frame / count * dimension)` to cover a complete cycle even when frames are sampled. Other formats share this same sampled timeline.
- The Animation section offers drawing replay, scrolling left/up, row waves and inverse pulse. Header Play/Pause remains accessible with collapsed tools. Playback is opt-in, pauses in hidden tabs, and is never restored as playing from JSON/autosave.
- Preview is derived from the original grid; never mutate artwork/history/text/autosave on animation ticks. Painting and structural edits stop preview first. Pause holds the preview, Stop restores the original grid.
- `drawingReplay` contains a same-size `base` grid and `[cellIndex, glyph]` events, including erasures. New changes record in actual input order. Patterns, resizing and imported projects without recordings reset to a row-major reveal. At 20,000 events condense to current art. History snapshots include the recording.
- Validate replay length, indices, values and final reconstruction against the project grid before mutation. v2 saves add optional `animation` settings and `drawingReplay`; earlier standard files continue loading with defaults.
- Preview/GIF/PNG frame sequences share `animationCells`, frame counts and delays. Replay holds the final picture for 25% of the loop and limits frame count to keep GIF delays at least 20 ms. Animation export snapshots source grid, replay, bank, glyph bits, options and editable project before awaiting work; never pick up later edits mid-export.
- Export uses vendored MIT `gifenc@1.0.3`, dynamically imported only for GIF encoding. Keep its license/provenance in `vendor/`. GIFs use a two-color indexed palette, full frames, disposal 2, repeat forever, and centisecond-balanced delays. Resolution is 8/16/32 pixels per cell.
- Keep the most recent GIF Blob URL alive for the visible Save link; revoke replaced links after a grace period. Ordinary downloads retain a 60-second grace period for Safari handoffs.
- GIF, ZIP and video share `animationRaster` (indexed pixels) and `animationExportFrames` (centisecond-balanced durations). Validate numeric data in replay base/events as well as the final grid when glyphs are unavailable.
- Frame ZIP uses a lazily loaded, tree-shaken MIT `fflate@0.8.3` streaming writer. Store already compressed PNGs without another compression pass. Keep its license and build fingerprint in `vendor/`.
- ZIP contains complete numbered PNG frames in `frames/`, `timing.json` (`petscii-animation-frames`, version 1), original `project.json`, and `README.txt`. Frame metadata supplies `file`, `startMs`, `durationMs`; all durations must sum to the chosen loop duration. Replay sampling and final hold match GIF. Do not imply a constant frame rate or every cell event is separately exported.
- Allow only one animation export at once; disable all three export buttons during work, provide Cancel, and restore controls on success/failure/cancellation. Cancellation must never publish an incomplete archive. Retain prior successful GIF/ZIP/video links and revoke replaced URLs after a grace period. Editing remains available during export.
- `video-export.js` integrates a lazy, unmodified tree-shaken **MPL-2.0 mediabunny@1.61.6** bundle. Retain its copyright/license and pinned source/build provenance in `vendor/`. Prefer native AVC/H.264 MP4, then VP9/VP8 WebM, probing with exact dimensions. No WASM/CDN/backend or media capture permissions. Initialize the HTML media backend before probing WebCodecs to avoid GTK/WPE WebKit initialization failures.
- Video exports 1–100 complete silent loops using explicit frame timestamps/durations and awaited encoder backpressure. `animation.videoRepeats` is optional in v2 imports (default 1), must be an integer from 1–100, and persists through autosave/projects/history. The video-only number input shows total duration; invalid drafts do not replace the last valid saved count, and invalid video exports preserve previous Save links. Snapshot the count before async loading, offset each loop by `seconds * 1000`, request a keyframe at each loop boundary, and keep frame raster indices local to the loop. Use an outer loop rather than allocating a repeated-frame array; progress and cancellation span all loops. GIF/ZIP timelines and preview remain unchanged. Do not set a fixed-frame-rate muxing option that would quantize the shared timeline. Video's transparent setting renders against the dark palette; GIF/PNG retain alpha. Document lossy compression and unsupported-browser behavior.
- Video output/cancellation must close encoders and finalize or cancel the muxer. A canceled or failed output must never replace the last successful Save link. Snapshot artwork/options before module loading, and keep editor mutations independent of ongoing export.
- Tests independently decode video with FFmpeg and inspect metadata/timestamps with FFprobe. CI installs FFmpeg. Exercise native MP4/WebM, replay order/erasures, selected duration/resolution, transparent-to-dark behavior, unsupported encoders, module failure, source edits during loading, and cancellation during loading/finalization. Do not substitute mocked encoders for the native output checks.
- ZIP regressions independently validate CRCs and PNG pixels with development-only `adm-zip` and `pngjs`, compare all frames/timings to GIF, preserve both banks/inverse slots, snapshot edits during loading, and exercise cancellation and encoder failures.
- Tests use development-only `omggif` as an independent decoder to verify frame contents, order, erasures, dimensions, repeat count, timing and transparency. Also cover preview pause/stop/edit safety, recording persistence, invalid imports and encoder-load failures.

## Compact workspace navigation
- Settings use native disclosures: Canvas & tools (initially open), Colors, Animation, Save & export, and Help & extras. Eraser/Undo/Redo and an active export's Cancel stay in a sticky toolbar. Experimental stencil controls live under Help.
- Save & export groups project save/load with keyboard-accessible Still / Animation / Data tabs. Animation has one format selector for GIF, video or PNG frames ZIP, sharing resolution/background. Keep prior Save links alive when changing tabs/formats. An Edit shortcut reveals effect/speed settings; the export summary reflects loaded/undone settings too.
- Navigation is UI-only: disclosures, tabs and picker visibility must not mutate artwork/history or start/stop playback. Keep animation export cancellation accessible even when its section is collapsed. Never put navigation state into project JSON.
- The glyph panel has one scroll surface for the entire panel; the palette grid has no nested overflow. Show bitmap selection in the header. Selecting a glyph closes the overlay on smaller screens, leaves a wide dock open, and returns focus to Glyphs when closing. Close button, Escape and outside backdrop dismiss without painting. Picker remains usable when settings are hidden. Preserve the existing Canvas ResizeObserver fitting behavior.
- Browser test helpers reveal controls through real disclosure/tab/picker clicks before interacting. Dedicated layout tests assert default compactness, keyboard navigation, independent scroll, responsive picker selection/dismissal, and export cancellation while collapsed.

## C64 color picker
- `C64_COLORS` is the 16-entry Pepto PAL palette, in hardware index order. Reference: https://www.pepto.de/projects/colorvic/2001/ (gamma-corrected hex table). Treat RGB as an approximation of analog C64 output, not a unique exact hardware RGB specification.
- `colors: {ink, background}` contains global indices 0–15 in v2 JSON. Validate integers atomically; absent metadata defaults to ink 14 / background 6. This replaces the earlier mint/UI-colored appearance. Color zero is valid. Colors recolor the whole composition; no per-cell color RAM or colored replay events are implemented.
- Colors is a compact native disclosure with Ink/Background targets, one 16-swatch grid, accessible names/pressed states and Swap. Target selection is UI-only; actual color changes and swaps are undoable and stop preview. Preserve colors through project imports, history and autosave.
- Bitmap tiles and header previews use selected ink; invalidate their cache on color changes. Canvas background matches selected color, with contrasting editing guides excluded from exports.
- SVG/PNG share the still-export background selector (default canvas; optional white/black/transparent). Never replace selected ink with automatic black/white. Animation retains the serialized `background: "dark"` token for Canvas color; resolve it using the snapshotted C64 background. White and transparent overrides still work; transparent video falls back to the snapshotted canvas background.
- Animation source snapshots clone global color indices before awaiting encoders. GIF, ZIP and video use the same two indexed RGB colors. Frame ZIP metadata includes `colorPalette: "pepto-pal"` and `colors`; project.json preserves indices too. Glyph-only text/binary formats intentionally do not embed colors.
- Color tests independently inspect all swatch RGB values, canvas/preview pixels, SVG/PNG/GIF/ZIP contents, decoded repeated-video colors, snapshot isolation, legacy shapes, equal colors, black index 0, validation, autosave and undo. Shared FFmpeg test helpers are in tests/video-utils.cjs.

## Future features to explore
- Per-character color RAM editing and color-aware text/data formats.
- Tile stamp, line/rectangle/fill tools, selection/move/duplicate and motif libraries.
- Keyboard shortcuts, improved undo workflow, zoom, and optional grid guides.
- Export/import of C64-oriented character grids and metadata when reliably encoded.
- Stencil-specific manufacturing helpers only as optional tools.
