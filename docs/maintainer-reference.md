# Maintainer reference

Use this document when changing rendering, project files, animation, exports, or workspace behavior. The requirements here supplement [AGENTS.md](../AGENTS.md).

For drawing instructions, start with the [user guide](../README.md).

## Find the relevant requirements

| Working on | Read |
| --- | --- |
| Glyph loading, rendering, or saved files | [Built-in glyphs](#built-in-glyphs-and-project-files) |
| Preview, replay, GIF, ZIP, or video | [Animation and export](#animation-and-export) |
| Download buttons and cached files | [Download actions](#download-actions) |
| Animated colors | [Color cycling](#color-cycling) |
| Panels, controls, or resizing | [Workspace navigation](#workspace-navigation) |
| Brush and cell colors | [C64 colors](#c64-colors) |
| Source data and rebuilding glyphs | [Glyph provenance](#glyph-provenance-and-rebuilding) |

## Terms used here

- **Glyph:** one 8×8 character image.
- **ROM:** read-only memory; the original C64 character patterns live here.
- **CI:** the automated checks run by GitHub Actions.
- **Bank / character set:** one collection of 256 glyphs.
- **Screen code:** the number selecting a glyph within a bank.
- **PETSCII:** a separate C64 text encoding. Screen-code files are not PETSCII streams.
- **Row-major order:** left to right across each row, starting at the top.
- **Snapshot:** a copy of artwork and settings taken before export work starts.
- **Raster:** an image represented by pixels.
- **Indexed palette:** a color table; each pixel stores an entry number.
- **Frame:** one still image in an animation.
- **Codec:** the method used to encode or decode video.
- **Encoder backpressure:** waiting for the encoder to accept a frame before sending more work.
- **Muxer:** the component that packages encoded video into an MP4 or WebM file.
- **Atomic validation/publication:** accept the whole input or publish the completed output; do not leave a partial result.
- **Asynchronous work:** work that can finish later while the editor remains usable.
- **Tree-shaken bundle:** a packaged module with unused code removed.
- **Blob URL:** a temporary browser address for a generated file.
- **Centisecond:** one hundredth of a second; GIF timing uses this unit.
- **CDN:** an external content-delivery service. Bundled encoders do not need a runtime CDN request.
- **WebAssembly (WASM):** a browser code format; the video exporter uses native browser encoding instead.
- **CRC:** a checksum used to detect damaged archive entries.

## Built-in glyphs and project files

- **Built-in source.** The editor is a ready-to-draw C64 graphics tool. Both character sets and inverse slots load from **`assets/c64-glyphs.svg`**. There is no ROM-import or ROM-storage workflow. The project owner explicitly deprioritized experimental custom-project backward compatibility; do not reintroduce that complexity by default.

- **Asset contents.** The project owner requested converted SVG artwork without the original ROM binary. The sheet contains 512 vector symbols (IDs such as `c64-0-64`) plus a viewable 16-column, 32-row layout. Keep source history and fingerprints in this document, linked from README. Do not add the original binary or an encoded ROM byte array.

- **Rebuild tool.** `scripts/build_glyphs.py` reproducibly converts a developer-supplied 4 KB reference ROM into horizontal integer rectangle runs. This is a development tool, not an editor flow.

- **Byte layout.** Startup reads SVG geometry into an in-memory bitmap table; address = `bank * 2048 + screenCode * 8`. The most significant bit (MSB) is the left pixel; bytes run top to bottom. Full SVG reconstruction SHA-256 must match `fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420`. Preserve the source's one-bit @/inverse-@ discrepancy. Read inverse slots verbatim; never synthesize them by negating the first 128 glyphs.

- **Startup and failure.** Startup awaits validated SVG data before restoring local state and enabling editing. Suppress autosave until restoration completes, so a slow asset cannot erase the saved draft. Failed loads preserve numeric project codes, mark unavailable glyphs, block image export, and offer retry, and block painting and glyph patterns until authentic artwork is available. Glyph-ID/text/JSON backups remain available.

- **Palette filter.** Show letters & numbers is an unchecked session-only checkbox. Exclude codes 1–26 and 48–57 modulo 128 in both banks; also exclude 65–90 modulo 128 in bank 1. Every other code, including blank 32, solid block 160, punctuation and both inverse partners, stays eligible. One combined catalog keeps bank-0 slots and adds only new bank-1 patterns with their inverse partners: 314 selectable IDs (304 distinct patterns), 190 with letters hidden. Uppercase and lowercase pairs share the letter section. No whole-drawing bank switch exists. Apply the filter to grouped browsing, families, recents and favorites. There is no separate Inverse action. Select either partner directly from the paired palette buttons, through the same selection/recents/filter path as every other glyph. Imports, Undo and glyph reload must not enable letters. If the selected brush is outside the current view, show a notice without replacing it or modifying artwork. Numeric code-page browsing is removed; optional code labels and accessible code names remain.

- **Rendering.** Render bitmaps without smoothing, directly in the canvas’s internal pixel buffer. Avoid depending on a saved high-DPI scaling transform after WebKit resizes. SVG exports literal pixel rectangles; PNG converts the SVG into pixels.

- **Glyph-ID binary.** Binary export is row-major, two-byte little-endian atlas IDs 0–511, with FFFF for empty cells. It is neither native screen data nor PETSCII and contains no dimensions, load address, or colors.

- **Text grid.** Use `# PETSCII-GLYPHS 1 columns rows`, followed by space-separated three-digit hex atlas IDs or `--` empty cells. Optional Include colors in text emits `# PETSCII-GLYPHS 2 columns rows background`, with one hexadecimal background digit and `glyph:ink` tokens (`--:ink` for empty cells). Each ink is one hex digit 0–F. Import detects either version, retains the current brush ink, and applies version-2 background/cell colors; version 1 keeps the existing background and fills inks from the brush. Allow CRLF and a final newline. Require the header and validate the whole input before changing artwork or undo history. One Undo restores geometry, glyphs, inks, background and replay. Project → Open text grid uses the same importer as pasted text, accepts `.txt` files, and rejects files over 64 KiB before reading. Validate before `remember()` so failed reads/invalid grids preserve artwork, playback and history. Clear the file input after success or failure so the same file can be retried. Imports retain existing animation/brush settings and regenerate row-major replay. The checkbox is output UI state, not project data. Old PETSCII-GRID, Unicode-only and mixed-shape imports are unsupported. Blank drawings use the same explicit header and empty tokens.

- **JSON compatibility.** Format v3 retains `format: "petscii-stencil-lab"`. Every grid, selected glyph and replay value is an integer atlas ID 0–511 or an empty cell. ID = source bank × 256 + screen code; bitmap offset = ID × 8. There is no global charset; reject that field, older versions, string glyphs and explicitly custom sources atomically. Saves include `glyphSource: "builtin"`. No migration is required by owner decision. Numeric ID 0 remains valid.

- **Dimensions and saving.** Grid dimensions 1–40 include 40×25. Undo covers strokes, resize/crop, imports and patterns. Autosave (`petscii-graphics-project-v3`) stores one device-local draft, independently of old drafts; explicit JSON downloads are portable backups. Undo history is session-only; if several tabs save, the last save replaces the draft.

- **Removed paths.** There is no legacy-shape palette, Unicode/path renderer, geometry checker, v1 project reader, or single-effect color normalization. Do not add migrations for those abandoned formats. The format identifier remains unchanged for current numeric projects.

- **Coverage.** Regression tests cover all 512 SVG symbols/fingerprint, known glyph shapes, both banks/inverse pixels in canvas/SVG/PNG, real Chromium touch dragging, real WebKit taps plus synthetic touch/pen streams, exports, storage, input rejection, resize, sidebar and undo. Physical iPad/Pencil verification remains a hardware check.

Canvas size and Paint colors use named sidebar fieldsets. Keep staged Apply/Cancel resizing with dimensions, and whole-drawing actions/recoloring in separate disclosures. Preserve all control IDs, bindings and project data during layout changes.

## Animation and export

- **Animation layout.** Use semantic fieldsets for Timeline & preview, Movement and Color. Keep duration, contextual movement/color cycle controls and playback together in Timeline & preview; pair the two cycle controls. Pair direction/waveform and wavelength/height within each effect group using a compact two-column grid. Use short visible Direction/Waveform/Height/Cycles / loop captions within each group, with the original full accessible names. Shorten cycle option labels to 1×/2×/4×/8×/16×. Keep IDs, bindings and contextual visibility; group containers use display:contents only while visible. Retain native select behavior, section-header help and sidebar scrolling for large text. Navigation/layout alone must not mutate project data.

- **Effect controls.** Persist optional `scrollDirection` / `waveDirection` (left/right/up/down), `waveShape` / `colorWaveShape` (sine/triangle/square/sawtooth/reverse-sawtooth), and `colorWaveDirection` (cardinal or hyphenated diagonal). Validate present values atomically. Defaults preserve existing frames: scroll-x left, scroll-y up, movement wave up/sine, color wave up-left/sawtooth. Hide irrelevant controls. Snapshots, history, cache keys, JSON and ZIP metadata retain all five fields.
- **Wave height.** Optional numeric `waveAmplitude` accepts 10/25/50/75/100, defaults to 100 for missing fields. Multiply the original movement displacement by 2 × amplitude/100 before the existing whole-cell rounding. Keep frame sampling, timing unchanged. Optional numeric `colorWaveAmplitude` uses the same accepted values/default and persistence paths, independently of movement. For color-wave only, normalize the existing step modulo the eight-color ramp, multiply by color amplitude/100, floor, then add the cell’s starting ramp index and wrap. 100% preserves existing color frames; lower values narrow the excursion. Other color effects are unchanged. Persist through animation settings, history, JSON, autosave, async snapshots/cache identities and ZIP timing metadata (both amplitude fields). The shared frame calculation supplies every animation download, including C64 PRG/D64. Small displacements may round to zero.

- **Wavelength.** Optional numeric `waveLength` / `colorWaveLength` accept 10/25/50/75/100 and default to 50. At 50%, preserve the prior spatial phase exactly; 100% doubles wavelength. Multiply spatial coordinates/offsets by 50/length before sampling, leaving temporal phase, height and frame planning unchanged. Movement applies this to ordinary waves and the fixed spatial sine in Sine scroller; other movement effects ignore it. Color applies it to Rainbow wave/Raster-style bars offsets and both normalized Plasma field coordinates. For the sawtooth color path, floor scaled offset plus the existing integer temporal step before modulo/height mapping. Keep source inks, shared background and loop closure. Persist independently through settings, project JSON, history, autosave, async snapshots/cache identity and ZIP timing metadata. Unknown or nonnumeric present values reject atomically. Hide controls outside those five effects; retain paired direction/shape and wavelength/height rows, with cycles in Timeline & preview. Small grids may spatially alias short wavelengths.

- **Directions and waveforms.** Scroll source coordinates advance for left/up, retreat for right/down; frame count uses the chosen axis. Movement waves travel along the selected direction, shifting rows horizontally for up/down and columns vertically for left/right. Sample one periodic signed waveform, round displacement to whole cells and wrap. Sine starts at zero rising; triangle starts at zero rising; square starts high; sawtooth rises -1 to +1; reverse sawtooth falls +1 to -1. Color waves map phase plus signed cell offsets through their independent waveform into the eight-color ramp; default sawtooth retains the original exact integer ramp steps. Color effects never move glyphs. All outputs, including PRG, use the shared frame calculation.

- **Duration and independent rates.** `animation.seconds` sets the whole timeline (0.5/1/2/4/8/12 seconds, default 2). `motionCycles` and `colorCycles` independently select 1/2/4/8/16 complete periods within that timeline, default 1. Hide each rate when its effect is disabled. Validate present values as numbers in that exact set. Remove the duration-linked speed slider. Snapshots, JSON, history, cached files and ZIP metadata preserve both rates. Video repetitions count complete timelines.

- **Sampling and closure.** All formats and preview share `animationPlan`, `cyclePhase`, frames and centisecond-balanced durations. Preserve existing one-cycle frame timing. For multiple cycles, choose a uniform frame count divisible by the largest active power-of-two cycle count; each period then has an integer number of samples. Motion and color phases use independent modulo sample indices. Prefer each effect's existing per-cycle samples, bounded by the 20 ms frame budget. Require at least four samples per movement-wave/replay cycle and two for scrolling, inverse and color cycles. Warn and block preview/animation downloads if those minima cannot fit; never alias 16 cycles into a static or slower effect. An inactive rate does not impose a sampling restriction. Repeated replay reaches the finished picture at 75% of each cycle and holds it. Plain one-cycle replay retains its existing variable final hold.

- **Demoscene-inspired effects.** `sine-scroll` scrolls in `scrollDirection` while shifting perpendicular to travel by a fixed sine of destination position along the travel axis, so moving glyphs follow a stationary sine curve rather than carrying a frozen bend with them. Height uses the movement amplitude scaling; waveform/direction controls for ordinary waves are hidden. Inverse-map glyphs and inks together with wrapping on both axes. Sample at max(24, travel-axis length) subject to the shared budget/rate rules; use at least four samples per motion cycle. `raster-bars` uses the color ramp [0,6,14,3,1,3,14,6], independent of original occupied-cell ink; direction defaults to up and the existing color shape/height controls apply. Color-wave offsets and stepping remain shared, with starting ramp index zero. Empty cells and shared background stay untouched. These are character-grid color bands, not raster interrupts or per-scanline background changes. Both effect identifiers validate and persist in v3 projects and share all snapshots, previews and export frames.

- **Plasma field.** `plasma` uses ramp [6,4,2,8,7,13,3,14], independent of original inks. Reuse color direction, shape, amplitude and cycles. Default missing shape to sine for plasma only; choosing it starts up-left/sine. For normalized destination coordinates x/W and y/H, take the mean of three signed waveforms at x+dx×phase, y+dy×phase and x+y+(dx+dy)×phase. dx is +1 for left, -1 for right, 0 otherwise; dy is +1 for up, -1 for down, 0 otherwise. Clamp (mean+1)/2 to [0,1], scale by amplitude/100, multiply by 8, add a 1e-10 rounding tolerance before flooring, and cap at 7. The tolerance stabilizes exact palette boundaries across floating-point evaluation orders. These integer temporal frequencies close at each loop boundary, including diagonal directions and 1-cell dimensions. Target 24 samples per color cycle and require at least four; retain shared sampling-budget warnings. Apply after movement at destination positions, skip empty cells and preserve source inks/background. All preview/download paths use shared frames.

- **Intro movement effects.** `logo-bounce`, `logo-stretch`, `starfield` and `wipe` derive new cells/inks before the existing color pass. Include identifiers in v3 validation; source/history/replay remain unchanged. Use 24 samples per motion cycle, except starfield targets max(24, 3 × travel-axis length). Require eight samples per logo/wipe cycle and twelve per starfield cycle; shared budget warnings apply. `waveAmplitude` is contextual Travel/Squeeze for the logos (same numeric set/default), with wave direction/shape hidden. Starfield/wipe use `scrollDirection` without converting the selected effect to ordinary scrolling. Wipe alone shows optional `wipePattern` (diagonal/checkerboard/blinds; default diagonal). Validate present values atomically; persist through settings, JSON, history, autosave, snapshot/cache identity and ZIP timing metadata. Contextual help spans the movement fieldset without adding a new section.

  - Bounce uses the occupied bounding box (including occupied space glyphs). Empty input stays empty. For box width w/height h, place its top left at round((W−w)/2 × (1−sin(2πphase) × amplitude/100)), round((H−h)/2 × (1−cos(4πphase) × amplitude/100)). Move complete cells/inks together, without wrapping or clipping. A full-size box stays put.
  - Stretch keeps that box centered within its original bounds. New dimensions are max(1, round(size × (1−amplitude/100 × (1−cos(frequency × phase))/4))), using 2π horizontally and 4π vertically. Floor the centering offset. Sample source cells at floor((destination+.5) × originalSize/newSize), clamped to the source box. Preserve glyph bitmaps; whole-cell resampling can omit details/empty cells temporarily. One-cell dimensions stay one.
  - Starfield assigns occupied cell (x,y) depth 1+(17x+31y) mod 3. Translate each forward by floor(phase × axisLength × depth), negative for left/up, positive for right/down, wrapping on the selected axis. Draw depths 1,2,3 in order; nearer layers win collisions, then later source indices break ties. No randomness or added glyphs; source inks travel with glyphs. Layers return to their original positions at the loop boundary.
  - Wipe progress is min(1, phase/.35, (1−phase)/.35): hidden at the boundary, full from 35% through 65%. For direction right/down use normalized cell-center position u along the travel axis; left/up reverses u. v is normalized cell-center position on the other axis. Diagonal rank=(u+v)/2; checkerboard rank=((x+y) mod 2+u)/2. Blinds repeats stripes of min(4,axisLength) cells, with rank=(axisIndex mod stripeSize+.5)/stripeSize, reversed for left/up. Copy cells whose rank ≤ progress; hide the others without moving glyphs.

- **Ripple.** `ripple` uses existing movement shape/height/length/cycles; hide cardinal direction and keep waveform visible. Sample 24 frames per cycle with a minimum of four under the shared budget. For destination (x,y), dx=x−(W−1)/2 and dy=y−(H−1)/2, radius=hypot(dx,dy), reach=max(1,hypot((W−1)/2,(H−1)/2)). Evaluate waveValue(shape, radius/reach × 50/length − motionPhase). Multiply by min(3,max(1,min(W,H)/4)) × 2 × amplitude/100, then inverse-map x+dx/radius×shift and y+dy/radius×shift with whole-cell rounding. Keep radius zero fixed; out-of-bounds samples are empty, with destination source ink retained. Move glyphs/inks together before color effects. Existing optional defaults apply, and all preview/download paths share these frames.

- **Effects and playback.** The Animation section offers drawing replay, scrolling in four directions, row/column waves, inverse pulse, Sine scroller, Bouncing logo, Stretching logo, Starfield and Patterned wipe. Color options include Color cycle, Rainbow wave, Warm glow, Raster-style bars and Plasma field. Header Play/Pause remains accessible with collapsed tools. Playback is opt-in, pauses in hidden tabs, and is never restored as playing from JSON/autosave.

- **Preview state.** Preview is derived from the original grid; never mutate artwork/history/text/autosave on animation ticks. The canvas is read-only throughout preview, including pause: ignore pointer down/move/up without changing artwork, replay, history, autosave, or playback. Starting playback cancels any held stroke and releases its capture. Structural edits stop preview first. Pause holds the preview; Return to drawing restores the original grid and explicitly enables painting.

- **Replay recording.** `drawingReplay` contains a same-size `base` grid and `[cellIndex, glyph]` events, including erasures. New changes record in actual input order. Patterns, resizing and imported projects without recordings reset to a row-major reveal. At 20,000 events condense to current art. History snapshots include the recording.

- **Replay validation.** Validate replay length, indices, values and final reconstruction against the project grid before mutation. v3 saves include animation settings and drawingReplay; optional fields use documented defaults.

- **Shared frames.** Preview/GIF/PNG frame sequences share `animationCells`, frame counts and delays. Replay holds the final picture for the last 25% of each cycle and limits frame count to keep GIF delays at least 20 ms. Animation export snapshots source grid, replay, glyph bits, options and editable project before awaiting work; never pick up later edits mid-export.

### Frame-count limits

These are per-cycle sampling targets. Independent cycle counts multiply those targets; the shared timeline reduces samples to fit the whole-loop 20 ms frame budget while preserving integer cycle subdivisions. Unsupported rates show a warning.

| Effect | Per-cycle sampling target |
| --- | --- |
| Replay | 2–48 frames; sample long recordings across their full event order |
| Wave rows / columns | Up to 24 frames |
| Scroll | Up to one frame per cell along the scrolling axis |
| Inverse pulse | Up to two states |
| Bouncing logo / Stretching logo / Patterned wipe | Up to 24 frames |
| Starfield | Up to max(24, 3 × travel-axis length) frames |
| Sine scroller / Plasma field | Up to max(24, travel-axis length) / 24 frames |
| Color cycle / Rainbow wave / Warm glow | Up to 16 / 8 / 10 ramp steps |

### GIF and frame ZIP

- **GIF encoding.** Export uses vendored MIT `gifenc@1.0.3`, dynamically imported only for GIF encoding. Keep its license/provenance in `vendor/`. GIFs use an indexed palette with background/transparent index 0 and C64 ink indices 1–16, full frames, disposal 2, repeat forever, and centisecond-balanced delays. Resolution is 8/16/32 pixels per cell.

- **Temporary downloads.** Keep the most recent GIF Blob URL alive for the single Download button; revoke replaced links after a grace period. Ordinary downloads retain a 60-second grace period for Safari handoffs.

- **Shared raster.** GIF, ZIP and video share `animationRaster` (indexed pixels) and `animationExportFrames` (centisecond-balanced durations). Validate numeric data in replay base/events as well as the final grid when glyphs are unavailable.

- **ZIP encoding.** Frame ZIP uses a lazily loaded, tree-shaken MIT `fflate@0.8.3` streaming writer. Store already compressed PNGs without another compression pass. Keep its license and build fingerprint in `vendor/`.

- **ZIP contents.** ZIP contains complete numbered PNG frames in `frames/`, `timing.json` (`petscii-animation-frames`, version 2, glyphEncoding: c64-atlas-id), original `project.json`, and `README.txt`. Frame metadata supplies `file`, `startMs`, `durationMs`; all durations must sum to the chosen loop duration. Replay sampling and final hold match GIF. Do not imply a constant frame rate or every cell event is separately exported.

- **Export lifecycle.** Allow only one animation export at once; disable all three export buttons during work, provide Cancel, and restore controls on success/failure/cancellation. Cancellation must never publish an incomplete archive. Retain prior successful GIF/ZIP/video downloads and revoke replaced URLs after a grace period. Editing remains available during export.

### Video output

- **Video module.** `video-export.js` integrates a lazy, unmodified tree-shaken **MPL-2.0 mediabunny@1.61.6** bundle. Retain its copyright/license and pinned source/build provenance in `vendor/`. Prefer native AVC/H.264 MP4, then VP9/VP8 WebM, probing with exact dimensions. No WASM/CDN/backend or media capture permissions. Initialize the HTML media backend before probing WebCodecs to avoid GTK/WPE WebKit initialization failures.

- **Video repetitions.** Video exports 1–100 complete silent loops using explicit frame timestamps/durations and awaited encoder backpressure. `animation.videoRepeats` is optional in v3 imports (default 1), must be an integer from 1–100, and persists through autosave/projects/history. The video-only number input shows total duration; invalid drafts do not replace the last valid saved count, and invalid video exports preserve previous completed downloads. Snapshot the count before async loading, offset each loop by `seconds * 1000`, request a keyframe at each loop boundary, and keep frame raster indices local to the loop. Use an outer loop rather than allocating a repeated-frame array; progress and cancellation span all loops.

  GIF/ZIP timelines and preview remain unchanged. Do not force the shared timings onto a fixed-frame-rate grid during video packaging. For video, Transparent uses the captured canvas background. GIF/PNG retain transparency. Document lossy compression and unsupported-browser behavior.

- **Video cleanup.** Video output/cancellation must close encoders and finalize or cancel the muxer. A canceled or failed output must never replace the last successful cached file. Snapshot artwork/options before module loading, and keep editor mutations independent of ongoing export.

### Independent export checks

- **Video tests.** Tests independently decode video with FFmpeg and inspect metadata/timestamps with FFprobe. CI installs FFmpeg. Exercise native MP4/WebM, replay order/erasures, selected duration/resolution, transparent-to-dark behavior, unsupported encoders, module failure, source edits during loading, and cancellation during loading/finalization. Do not substitute mocked encoders for the native output checks.

- **ZIP tests.** ZIP regressions independently validate CRCs and PNG pixels with development-only `adm-zip` and `pngjs`, compare all frames/timings to GIF, preserve both banks/inverse slots, snapshot edits during loading, and exercise cancellation and encoder failures.

- **GIF tests.** Tests use development-only `omggif` as an independent decoder to verify frame contents, order, erasures, dimensions, repeat count, timing and transparency. Also cover preview pause/stop/edit safety, recording persistence, invalid imports and encoder-load failures.

## Download actions

- **C64 disk packaging.** `createD64Disk` packages the unchanged PRG in a 174,848-byte, 35-track D64 with no error table. Track 18 holds the BAM at sector 0 and one directory sector at 1; file data never uses track 18. The directory contains one closed PRG (`PICTURE` or `ANIMATION`), PETSCII names padded with `$A0`, a little-endian block count, and a valid final-sector byte count. Mark only existing sectors free; allocation counts and bits must agree. Use ten-sector interleave. Format, artwork, glyph IDs, animation and repeats are captured before lazy loading; cache identity includes PRG/D64 format. Changing format during work affects the next download, without relabeling the captured file. Disk format is an output preference and is not saved in project JSON. Keep one contextual Download button. Follow the [VICE D64 layout](https://vice-emu.sourceforge.io/vice_17.html).

- **Visible actions.** Still artwork offers Download PNG / Download SVG. Animation offers exactly one Download GIF, Download video, or Download frame ZIP button per selected format. Do not expose separate Generate/Export and Save controls for the same artifact.

- **Cached file identity.** `animationDownloads` retains one successful `{key,url,name}` result per format. `key` serializes the complete snapshotted project (including artwork, cell colors, recording, glyph IDs, effect, speed, scale, background and repetitions). Compare it before reusing a file; edits during async generation must not make that older result appear current. Repeat taps with matching source download immediately without rendering again, preserving Safari's user-gesture handoff. New inputs regenerate automatically.

- **Progress and recovery.** Primary buttons retain their labels after success/cancel/failure, show Preparing during generation, and disable during any active animation download. Keep progress and cancellation accessible. Cache publication is atomic after completion/checkpoint; failed or canceled attempts preserve the previous result. Replaced URLs get the existing 60-second grace period. Cache state is session-only and never enters project JSON.

- **Download tests.** Tests exercise the real single button for repeat downloads, inspect stable file URLs / bytes, assert regeneration after artwork/settings changes, and retain native video, cancellation, snapshot and failure checks. Primary buttons expose cached file metadata in `data-download-url` / `data-download-name` for regression inspection, not as separate visible actions.

## Color cycling

- **Color ramps.** `COLOR_CYCLES` defines C64 index ramps for `color-cycle` (all 16 colors, starts at each source ink), `color-wave` (eight chromatic inks with diagonal x+y offsets), and `color-glow` (warm shades with a return path). Source inks absent from a restricted ramp start at that ramp’s first color; repeated colors use their first position.

- **Source preservation.** These effects change derived frame inks only. Preserve glyph codes, empty cells, shared background, saved cell colors, replay and history. Return to drawing and still exports retain the original art. Keep movement/reveal and color animation in separate compact selects and use existing loop speed, resolution, background, repetition and export controls.

- **Frame calculation.** At 1×, color alone uses the ramp length (24 samples for Plasma field) and combinations use the larger motion/color sample count. Multiple cycles use the shared animation plan described above, bounded by the same 20 ms frame budget. Combined replay uses a uniform timeline with up to 48 frames and reaches completion at 75% of the loop; plain replay retains its variable final hold. Use floor(frame/count * ramp.length) for phase, without duplicating the first frame at the end. Preview/GIF/ZIP/video must share the same color calculation and source snapshot. Persist independent `animation.effect` and `animation.colorEffect` (`none` or a named color ramp) in v3 metadata and reject unknown effects atomically. The movement control adds `none` for a still drawing. Color animation uses its own `colorEffect` field; movement `none` keeps geometry fixed. Apply movement/reveal first, then animated inks; diagonal bands use destination positions. Add `colorEffect` to ZIP timing metadata (both amplitude fields).

- **Color-effect tests.** Regression tests independently decode all color-effect GIF/ZIP frames, verify exact palette colors, geometry/alpha/background/timing, confirm preview pause/stop and still/project preservation, exercise export snapshots during edits, and decode repeated native video cycles.

## Workspace navigation

- **Drawing tools.** Fill matches four-connected glyph/ink pairs (empty cells ignore ink). Line and outlined rectangle use transient raster previews; pointer-up commits differences through `recordCell` with one history entry. Cancel/Escape never modifies project, replay or autosave. Select captures a rectangle; drag inside moves it using a snapshot, including overlapping moves and cell colors. Duplicate skips empty cells; moves copy them. Selection is transient and cleared by structural edits/history. Stamps are removed from the UI; old device-local stamp storage is left untouched. Disable tools throughout animation preview. Use pointer capture and reject secondary pointers. Symmetry applies to freehand drawing; the region tools operate on their explicit geometry.

- **Typed entry.** Text uses a native textarea in a dock below the canvas so iPad and physical keyboards share input, correction, selection and paste behavior. Tap a cell to set or relocate the origin; retain the draft on relocation. Map A–Z to bank-0 IDs 1–26, a–z to bank-1 IDs 257–282, U+0020–003F to bank-0 IDs 32–63, @ to 0, [ to 27 and ] to 29. These are atlas IDs, not PETSCII streams; see the [charset reference](https://www.pagetable.com/c64ref/charset/). CRLF/CR normalize to line breaks. Wrap at the right edge back to the origin column; explicit line breaks use that same column. Reject unsupported code points or any occupied row beyond the bottom atomically; never substitute or clip. Space is occupied glyph 32. Preview uses the normal glyph renderer on copied glyph/ink arrays and outlines the origin; output, replay and autosave continue to use committed artwork. Apply uses `commitTool` for a single history entry and per-cell replay, preserves unrelated cells/colors/brush/settings and does not change palette filtering. Normal textarea keys edit the draft; Ctrl/Command+Enter applies and Escape cancels. Clearing tool gestures also clears text draft/origin during tool switches, edits, history, project/text imports or animation start. No project schema change; drafts and text tool state are transient. Automated iPad layout/input tests do not verify the physical on-screen keyboard or Pencil reach.

- **Persistent controls.** Keep Glyphs/brush preview, direct ink access, Paint/Eraser, Symmetry and Undo/Redo in a persistent drawing strip outside the settings scroller. Compact tool targets are 38 px; color swatches retain their larger targets. Validate spacing and physical touch accuracy. Compact visual labels on phones must retain accessible names; symmetry must expose its active state.

- **Quick ink and tool state.** Ink opens a native auto popover anchored beneath the drawing strip, without opening or scrolling settings. Its 16 swatches select brush ink through the existing undo path and dismiss to Ink; opening/dismissing alone never edits. Keep native Escape/outside dismissal and do not intercept outside canvas input. Paint/Eraser are idempotent selections and disabled during playing/paused preview; the canvas hint names the active drawing tool and ink. Return to drawing restores tool availability.

- **Settings and resize.** Settings use initially closed Canvas setup, Colors and Animation disclosures with contextual question-mark help. Broad pattern/clear/recolor actions live under explicitly scoped disclosures. Stage columns and rows together, show the proposed crop, and apply once with one undo entry; Cancel leaves art/history unchanged.

- **Download panel.** Header Download artwork opens a native responsive dialog with keyboard-accessible Image / Animation / C64 data tabs, format selection and exact grid-free output previews. Retain one action per chosen format, existing download caches and snapshot isolation.

  Project open/editable JSON download live in a separate Project menu. Dialog navigation must not alter art/history/playback. Escape closes only the top surface; dismissing downloads or ink must not also close the glyph panel. Closing it keeps export work running; progress and Cancel remain accessible outside it and inside when open.

- **Modal playback.** Animation and C64 Selected animation expose synchronized Play preview / Stop preview toggles. They share the existing derived frame clock and playback guards; Stop clears paused or playing preview, resets the modal to sample zero and returns the canvas to drawing. C64 still output hides its toggle and preview; C64 animation uses eight pixels per cell and the canvas background, independent of modern export settings. Modal previews use the same sampled effects/timing as downloads; they do not simulate C64 execution speed. Navigation and closing the dialog preserve playback.

- **Preview labels.** Animation preview shows effect name and paused state plus Return to drawing. Loop duration labels use seconds. Static previews/exports always show original art; motion previews use the shared derived frames and selected output background. Display actual output dimensions and sampled frame counts, including video repetitions.

- **Glyph panel.** Default to Grouped by shape: labeled Blocks/Lines/Corners/Diagonals/Symbols sections span code pages, pair each original/inverse, and include every remaining allowed code once under Other symbols, and a separate Letters & numbers section when enabled. Grouping follows the existing curated shape families; it does not change screen codes or artwork. The combined catalog in both checkbox states must remain complete and duplicate-free. Glyph picker retains one independent scrolling surface and authentic high-contrast white-on-black thumbnails. Hexadecimal tile labels default off; Show glyph codes (hex) persists as `showCodes` in the glyph-browser preference, with exact accessible labels retained. Recents (maximum 16) and favorites store validated [0, atlasID] pairs in device-local UI preferences, never project JSON. Families preserve the letter filter; both banks and inverse slots remain accessible.

  Pin is optional at widths 700 px+; normal wide-screen docking starts at 1200 px. Overlay selection dismisses; docked selection stays open. Escape/close/backdrop restore focus without painting. Never nest the palette in settings.

- **Save feedback.** Autosave success says Saved on this device; storage failure needs a persistent visible backup notice even at small widths. UI preferences must not prevent art restoration or editing if storage is unavailable.

- **Resize scheduling.** Coalesce ResizeObserver notifications into one requestAnimationFrame fit; do not write canvas layout inside observer delivery. This avoids WebKit resize-loop errors during disclosure, dialog, and contextual-control changes.

- **Navigation tests.** Preserve Canvas ResizeObserver fitting and stroke interpolation. Browser test helpers reveal controls through real dialog/disclosure/tab/picker clicks. Historical resize helpers apply each requested change; dedicated workspace tests exercise staging both dimensions and a single undo.

## C64 colors

- **Palette.** `C64_COLORS` is the 16-entry Pepto PAL palette, in hardware index order. Reference: https://www.pepto.de/projects/colorvic/2001/ (gamma-corrected hex table). Treat RGB as an approximation of analog C64 output, not a unique exact hardware RGB specification.

- **Color arrays.** `colors: {ink, background}` stores brush ink and shared background indices 0–15. `cellColors` parallels `grid` with one foreground index per cell, including empty cells. Omitted color arrays inherit brush ink (default 14); color 0 is valid. Validate array lengths and integer ranges before mutation.

- **Color actions.** Colors uses Ink/Background targets, a 16-swatch grid, Swap brush / background, and explicit Recolor entire drawing. Brush selection changes future strokes and glyph previews only. Swap changes brush/background settings without changing cell ink. Recolor changes occupied cells, records color edits in replay, and is undoable. Color changes stop preview and persist in history, JSON and autosave.

- **Painting and resize.** Painting checks both glyph and ink, so stamping an unchanged glyph can recolor it. Erasing writes the current brush index to the emptied cell. Symmetry applies brush ink to all stamped cells; patterns and text import use brush ink. Resize preserves overlap colors and fills new empty cells with brush ink.

- **Replay colors.** `drawingReplay.baseColors` and `eventColors` parallel the base grid and two-tuple glyph events. Infer missing arrays from global ink for older recordings. Validate that both final glyphs and colors reconstruct the saved composition, including empty cells. History and async export snapshots clone these arrays. Reset recordings preserve empty-cell color state; events include color-only edits.

- **Tile cache.** Bitmap tile cache keys include atlas ID and cell ink. Drawing-strip brush previews use brush ink; palette thumbnails use white on neutral black for reliable contrast. Canvas and SVG/PNG use each cell’s color; SVG keeps literal pixel rectangles. Still background overrides remain explicit.

- **Frame colors.** `animationCells` returns `{cells, inks}` so replay, scrolling, waves and inverse effects move colors with glyphs. GIF/ZIP/video share the same indexed raster with index 0 reserved for background/transparency and indices 1–16 for C64 inks, preserving opaque black and inks equal to the background under transparency. Video falls back to the snapshotted canvas background. Retain snapshot isolation while editing during export.

- **Color RAM.** Color RAM export is one byte per cell, row-major, values 0–15 including empty cells. Glyph-ID binary exports remain glyph-only. Optional text version 2 preserves cell inks and background. Neither binary has dimensions, character set or a load address. JSON preserves all cell colors and replay.

- **Color tests.** Tests inspect swatch RGB, brush-only selection, same-glyph repaint, recoloring, symmetry, resize, patterns, undo/autosave, old file defaults and invalid array/replay rejection. Independently inspect SVG/PNG/GIF/ZIP pixels, opaque black with transparency, inverse slots, colored replay and decoded native repeated-video colors. Shared FFmpeg helpers are in tests/video-utils.cjs.

## Glyph provenance and rebuilding

The built-in [glyph sheet](../assets/c64-glyphs.svg) contains 512 symbols: `c64-0-0` through `c64-1-255`. Each uses an 8×8 viewBox. The viewable sheet has 16 columns and 32 rows.

Shapes use integer rectangles covering horizontal runs of source pixels. There is no font substitution, tracing, smoothing, or generated inversion.

The source was `characters.901225-01.bin` from the [Zimmers C64 firmware archive](https://www.zimmers.net/anonftp/pub/cbm/firmware/computers/c64/).

```text
SHA-256 fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420
MD5     12a4202f5331d45af846af6c58fba946
```

The repository contains converted artwork at the project owner's request. The original ROM binary is excluded. Conversion retains ROM-derived shapes and does not establish a separate license for them.

### Rebuild from a local reference ROM

You need Python 3 and a local 4 KB reference ROM. From the repository root, run:

```sh
python3 scripts/build_glyphs.py /path/to/characters.901225-01.bin
```

This writes `assets/c64-glyphs.svg`. Tests reconstruct all 512 glyphs and compare the complete SHA-256, including the source's one-bit `@`/inverse-`@` difference in both banks.

### Format and source references

- [Commodore 64 Programmer's Reference Guide: character definitions](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_104.html): character-set sizes and memory offsets.
- [Michael Steil's Commodore Charset / PETSCII / Keyboard Reference](https://www.pagetable.com/232): screen-code ordering, inverse glyphs, and PETSCII distinctions.
- [C64 output guide](c64-output.md): binary exports and the runnable C64 player.

## C64 PRG player

`c64-export.js` emits a BASIC `10 SYS2061` entry at `$0801` and a generated 6502 player. Do not add a ROM binary to the repository. Export original cells for still mode and the shared `animationCells` / `animationExportFrames` sequence for animation mode. C64 output always uses the canvas background; image transparency, white backgrounds and raster resolution settings do not alter native screen data.

For any ID above 255, snapshot the runtime 4096-byte source atlas and pass it as `glyphBits`. Deduplicate exact patterns across every sampled frame, reserving slot 0 for a blank. Reject more than 256 patterns, including the blank, before creating a download. Map frames to those RAM slots without mutating source cells. Initialize the 2048-byte charset at `$C800` through the first frame's changed-run stream, before starting the clock; it stays constant across frames and loops. Select VIC bank 3 (`$DD00 & $FC`), screen `$C400`, charset `$C800`, `$D018=$12`, and KERNAL screen page `$C4`. Preserve sprite pointers and restoration. New RAM-path checks use py65 and independent SVG patterns; full VICE/hardware validation remains open. Browser image/video output has no 256-pattern limit.

- Validate dimensions 1–40 by 1–25; center the canvas within 40 × 25 cells and preserve 40-byte screen stride. Require numeric codes or empty cells in every exported frame. Empty cells are screen code 32; numeric 0 remains valid.
- Initialize exactly 1000 screen/color cells, preserving sprite pointers and memory beyond the color plane. For ROM-only IDs 0–255, retain screen `$0400`, VIC bank 0 and `$D018=$15` (the low-level ROM-bank-1 API retains `$17`). RAM-backed output uses the addresses above and blank slot 0 instead of ROM space code 32. Both use standard character mode and the chosen background/border.
- Frame stream: little-endian duration in 60 Hz jiffies, then changed runs `[addressLo,addressHi,count,value]` (count 1–255). A zero count instead introduces `[literalLength,...literalBytes]` (length 1–255). Repeated bytes use the original format; adjacent differing bytes share a literal run. A zero literal length introduces packed color data: `[addressLo,addressHi,0,0,cellCount,...packedInks]`, count 1–255, low nibble first. Consume exactly that many cells; ignore the unused high nibble of an odd final byte. Only color-RAM literals use packing. Emit the optional 51-byte decoder only if aggregate stream savings exceed its footprint; otherwise keep the original byte stream and decoder. Never include unchanged cells in a delta run. Address 0 ends a frame/update block. Address `$0001` followed by a little-endian pointer calls a shared update body, then restores the main stream pointer. Blocks contain ordinary run commands and a zero-address return, never further calls. Pool exact duplicate bodies only when savings exceed the optional 41-byte decoder footprint; durations stay in the main frame stream. Duration 0 ends a loop; `$FFFF` redirects to a little-endian stream address. The first frame fully initializes both planes. Subsequent frames and the loop transition write changed runs only. The redirect reuses the frame sequence without duplicating it.
- Round cumulative shared frame boundaries to 60 Hz ticks, so loop duration stays balanced. Keep KERNAL IRQs running, track low-byte clock wrap, and check STOP while waiting. The first picture is decoded before starting the loop clock. Updates are not raster synchronized and may show tearing; very fast complex updates require full-machine validation. The normal KERNAL clock is 60 Hz on PAL/NTSC, independent of video refresh.
- Estimate subsequent and loop-transition CPU work conservatively (repeated runs: 13 cycles/write plus 160/run; literal runs: 20 cycles/write plus 220/run; packed color runs: 40 cycles/write plus 320/run; 2500/frame overhead; 300 additional cycles per shared-block reference) against PAL CPU time for the frame. Reject excessive work with an actionable slower/simpler message. Bound code plus stream below `$A000` (maximum 38,911 loaded bytes, excluding the two-byte load header). This is a conservative first player, not a cycle-accurate performance guarantee.
- C64 repetitions are download-panel state: 0 loops continuously; 1–100 holds the final frame after that many loops. Still output holds until RUN/STOP. Preserve `$FB–$FE` and display registers on the stack, disable the cursor during playback, clear the screen on exit, and return to BASIC with a balanced stack.
- Snapshot source/settings before lazy importing the exporter. Share the active export guard, disabled actions, cancellation during loading, cached completed-file identity, and 60-second replaced-URL grace period with other animation exports. Failed/canceled work must not replace the last completed file.
- Tests use pinned development dependency `py65==1.2.0`, installed in CI, to execute actual downloaded PRG machine code. Documented KERNAL STOP/CHROUT calls and the clock are stubbed. Assert screen/color RAM, both banks, inverse/code-zero values, row stride, loop order and timing at PAL/NTSC CPU speeds, low-byte wrap, scratch/register restoration, sprite-pointer boundaries, stack balance, and exit. This does not emulate VIC-II/CIA chips, IRQ latency, actual KERNAL ROM, disk loading, or physical hardware. The separate `npm run test:vice` suite checks real ROM/chips and D64 loading on PAL/NTSC, with host-only debug symbols. See [VICE validation](vice-validation.md) for setup, 16 passing scenarios, including full-screen performance workloads, and STOP-injection limits. Physical hardware checks remain open.

KERNAL call contracts: [STOP `$FFE1`](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_5/page_301.html) returns Z set for RUN/STOP; [CHROUT `$FFD2`](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_5/page_278.html) sends the clear-screen character after STOP restores default channels. The normal IRQ calls UDTIM; the player must not increment the clock itself.

## CI environment

GitHub Actions uses the official `mcr.microsoft.com/playwright:v1.58.2-noble` image, matching the pinned npm package. Update both versions together. The image supplies browser builds and OS dependencies; installing them from the runner's slow Ubuntu mirror previously consumed the entire job deadline before tests began. FFmpeg and a Python virtual environment with `py65==1.2.0` provide independent export checks.

Run CI with one worker for stable headless WebKit resource use. The two serial multi-effect/project-color scenarios have explicit 60-second limits; their assertions are unchanged. Each browser runs in a separate matrix job with one worker. Playwright's 20-minute per-browser global timeout leaves time to upload reports inside the 30-minute job budget; obsolete runs on the same ref are canceled automatically. Source: [Playwright CI guidance](https://playwright.dev/docs/ci) and [Docker image guidance](https://playwright.dev/docs/docker).

## Compact cleanup and C64 preflight

Undo/Redo remain grouped. Selection actions occupy a reserved strip below the canvas without covering artwork or changing canvas dimensions. Undo preserves the active tool; project loading restores its saved Paint/Eraser state. Tap endpoints and canvas arrow/Enter input provide alternatives to dragging. Help is a manually activated popover dialog with Close/Escape and focus return; canvas dismissal must consume the gesture. Portrait settings start closed.

C64 `analyze:true` uses the same run encoder and work estimator, returns program size and worst update/budget ratio, and suppresses only memory/work rejection for diagnostics. Ordinary export still enforces both. Preflight snapshots source settings, invalidates stale async results and checks geometry/patterns before generation. Longer-loop remedies must pass the ordinary exporter and apply through history. Estimates are not hardware guarantees. Full PAL/NTSC 40 × 24 wave capacity expansion remains an investigation.

Portrait iPad settings start closed and dock beside the canvas when opened, keeping artwork and export cancellation reachable. Phone settings retain their overlay behavior.

## C64 capacity measurements

The exporter diagnostics also report `playerBytes` and `streamBytes` split into `characters`, `screen`, `color` and `framing`. These are byte counts, not cycle measurements. Their sum equals `programBytes`, excluding the two-byte PRG load address. `packedColorSavings` reports raw stream bytes saved; when nonzero, subtract the optional 51-byte decoder cost for the net program reduction before sharing. `sharedBlockSavings` reports additional stream savings after packing; subtract its 41-byte decoder footprint when nonzero. `sharedBlockCount` and `sharedFrameReferences` expose reuse. Framing includes reference pointers and shared-block terminators. Byte accounting itself does not change acceptance limits.

`tests/c64-capacity.spec.cjs` samples the actual browser animation functions through a test-only route injection; the shipped page exposes no test API. It checks 20 full-screen cases, accepted/rejected agreement, analysis byte identity, RAM-character accounting and exact loop ticks. Its JSON attachment records the capacity matrix for each browser. See [results and next experiments](c64-capacity.md).

Packed-color CPU tests optionally observe `frameStart` / `frameReady` symbols in `c64-emulate.py` without changing player bytes. Distinguish decoder-entry deadlines from completed-frame times: copying a full screen takes measurable CPU time. The full-screen test requires starts within one tick of cumulative deadlines, copies inside each frame budget and exact screen/color states across two loops. The packed decoder still needs new full VICE and physical-hardware validation.

Shared-update regressions execute the real call/return decoder with one level of nesting, including initial-frame pooling, RAM glyph initialization, unequal holds, independent effect rates, continuous/finite loops and clock wrap. The full-screen 96-sample four-cycle case checks two complete eight-second loops at both CPU speeds. Shared code still needs full VICE and physical-hardware validation; prior VICE measurements describe earlier decoders.

Candidate selection compiles actual output sizes: if the shared candidate exceeds timing, retain a valid unshared candidate that fits both timing and memory. Analysis and normal export select the same bytes. A 40 × 4 fast-animation regression preserves viable 2,430-byte output instead of rejecting it for call overhead. Compilation and acceptance checks are separate so diagnostic analysis still reports blockers without relaxing download limits.

The literal decoder copies with `LDA ($FB),Y` / `STA ($FD),Y`, then adds the completed count to `$FB/$FC` once. Do not advance the destination after a run: the next command replaces it. Packed decoding keeps Y at zero and inlines source increments and nibble writes, preserving carry handling on both pages and an exact odd-tail count. Code size is 388 bytes without optional decoders, 439 with packed colors, 480 with both packed and shared blocks. `tests/c64-decoder.spec.cjs` checks actual CPU cycle ceilings against recorded pre-change fixtures, exact byte output and short/255-boundary lengths. Updated work estimates are conservative; full VICE validation remains open.

## Native rows and candidate selection

`createC64RowProgram` compiles native rows explicitly; `createC64Program` preserves the generic API. The editor uses `createC64AdaptiveProgram` for readiness, tested remedies and PRG/D64 downloads. It preserves accepted generic bytes, tries native rows only for a rejected generic candidate with 2–256 frames, and selects native only if both timing and memory pass. If native does not fit, the original generic diagnostics/errors remain. `c64-native-rows.js` plans exact sampled row states grouped by physical page and value. The generated renderer indexes per-frame routine addresses, patches each row's JSR operands, and writes via absolute,Y. It preserves X/Y for subsequent row dispatches. Address `$0002` plus one frame-index byte invokes it from the existing stream. It initializes via the generic first-frame encoder, counts packed savings only for that retained initialization, and retains durations, loop redirect, RUN/STOP and restoration.

Native code/table bytes are included in `playerBytes`; dispatch records and first-frame runs remain in `streamBytes`. Frame counts are limited to 2–256. The native guard uses actual program size and a conservative per-frame work estimate. Analysis and downloads select identical bytes; `analyze:true` suppresses rejection only for diagnostics. The owner confirmed the reference D64 playback and RUN/STOP in Poke on iPad; broader full-machine and physical validation remain open. See [architecture, reference measurements and validation gate](c64-native-rows.md). The optional VICE suite imports the module by file URL so relative planner imports resolve correctly.

Native picture lookup columns are shared across identical complete glyph/color states; empty glyphs normalize to the output blank. `nativeFrameStates` counts distinct columns, while `frameCount`, stream durations, per-original-frame costs and finite-loop semantics remain unchanged. A 192-sample, eight-cycle reference falls from 32,978 to 16,850 program bytes by eliminating duplicate lookup entries, without reducing drawing work. Tests cover 384 samples at PAL/NTSC CPU speeds, unequal holds, color-only differences, code zero/empty equivalence and loop transitions.

`createC64AdaptiveProgram({allowTimingOverrun:true})` permits only timing overflow and still requires the selected candidate to fit program memory. Normal valid-candidate selection remains first; if all exceed timing, explicit override may select the faster memory-fitting native candidate. The UI always displays the remaining timing warning, records consent against current project/mode identity, captures the flag before lazy loading, and includes it in download cache identity. Withdrawing consent cannot reuse a cached over-budget export; changed artwork/animation clears consent. Geometry, glyph, frame and memory validation are unchanged.

C64 placement uses `floor((40-columns)/2)` columns and `floor((25-rows)/2)` rows. Apply the same screen offset to initial generic writes, delta writes and native glyph/color destinations. Center the canvas bounds, including empty cells, so motion never shifts the placement itself. Odd spare cells remain on the right/bottom. C64 animation previews display the full 320 × 200 screen with the same padding; other image/animation downloads keep their original dimensions.
