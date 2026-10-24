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

- **Text grid.** Use `# PETSCII-GLYPHS 1 columns rows`, followed by space-separated three-digit hex atlas IDs or `--` empty cells. Require the header and validate the whole input before changing artwork. Old PETSCII-GRID, Unicode-only and mixed-shape imports are unsupported. Blank drawings use the same explicit header and empty tokens.

- **JSON compatibility.** Format v3 retains `format: "petscii-stencil-lab"`. Every grid, selected glyph and replay value is an integer atlas ID 0–511 or an empty cell. ID = source bank × 256 + screen code; bitmap offset = ID × 8. There is no global charset; reject that field, older versions, string glyphs and explicitly custom sources atomically. Saves include `glyphSource: "builtin"`. No migration is required by owner decision. Numeric ID 0 remains valid.

- **Dimensions and saving.** Grid dimensions 1–40 include 40×25. Undo covers strokes, resize/crop, imports and patterns. Autosave (`petscii-graphics-project-v3`) stores one device-local draft, independently of old drafts; explicit JSON downloads are portable backups. Undo history is session-only; if several tabs save, the last save replaces the draft.

- **Removed paths.** There is no legacy-shape palette, Unicode/path renderer, geometry checker, v1 project reader, or single-effect color normalization. Do not add migrations for those abandoned formats. The format identifier remains unchanged for current numeric projects.

- **Coverage.** Regression tests cover all 512 SVG symbols/fingerprint, known glyph shapes, both banks/inverse pixels in canvas/SVG/PNG, real Chromium touch dragging, real WebKit taps plus synthetic touch/pen streams, exports, storage, input rejection, resize, sidebar and undo. Physical iPad/Pencil verification remains a hardware check.

## Animation and export

- **Effect controls.** Persist optional `scrollDirection` / `waveDirection` (left/right/up/down), `waveShape` / `colorWaveShape` (sine/triangle/square/sawtooth/reverse-sawtooth), and `colorWaveDirection` (cardinal or hyphenated diagonal). Validate present values atomically. Defaults preserve existing frames: scroll-x left, scroll-y up, movement wave up/sine, color wave up-left/sawtooth. Hide irrelevant controls. Snapshots, history, cache keys, JSON and ZIP metadata retain all five fields.
- **Directions and waveforms.** Scroll source coordinates advance for left/up, retreat for right/down; frame count uses the chosen axis. Movement waves travel along the selected direction, shifting rows horizontally for up/down and columns vertically for left/right. Sample one periodic signed waveform, round displacement to whole cells and wrap. Sine starts at zero rising; triangle starts at zero rising; square starts high; sawtooth rises -1 to +1; reverse sawtooth falls +1 to -1. Color waves map phase plus signed cell offsets through their independent waveform into the eight-color ramp; default sawtooth retains the original exact integer ramp steps. Color effects never move glyphs. All outputs, including PRG, use the shared frame calculation.

- **Duration and independent rates.** `animation.seconds` sets the whole timeline (0.5/1/2/4/8/12 seconds, default 2). `motionCycles` and `colorCycles` independently select 1/2/4/8/16 complete periods within that timeline, default 1. Hide each rate when its effect is disabled. Validate present values as numbers in that exact set. Remove the duration-linked speed slider. Snapshots, JSON, history, cached files and ZIP metadata preserve both rates. Video repetitions count complete timelines.

- **Sampling and closure.** All formats and preview share `animationPlan`, `cyclePhase`, frames and centisecond-balanced durations. Preserve existing one-cycle frame timing. For multiple cycles, choose a uniform frame count divisible by the largest active power-of-two cycle count; each period then has an integer number of samples. Motion and color phases use independent modulo sample indices. Prefer each effect's existing per-cycle samples, bounded by the 20 ms frame budget. Require at least four samples per movement-wave/replay cycle and two for scrolling, inverse and color cycles. Warn and block preview/animation downloads if those minima cannot fit; never alias 16 cycles into a static or slower effect. An inactive rate does not impose a sampling restriction. Repeated replay reaches the finished picture at 75% of each cycle and holds it. Plain one-cycle replay retains its existing variable final hold.

- **Effects and playback.** The Animation section offers drawing replay, scrolling in four directions, row/column waves, inverse pulse, Color cycle, Rainbow wave and Warm glow. Header Play/Pause remains accessible with collapsed tools. Playback is opt-in, pauses in hidden tabs, and is never restored as playing from JSON/autosave.

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

- **Frame calculation.** At 1×, color alone uses the ramp length and combinations use the larger motion/ramp count. Multiple cycles use the shared animation plan described above, bounded by the same 20 ms frame budget. Combined replay uses a uniform timeline with up to 48 frames and reaches completion at 75% of the loop; plain replay retains its variable final hold. Use floor(frame/count * ramp.length) for phase, without duplicating the first frame at the end. Preview/GIF/ZIP/video must share the same color calculation and source snapshot. Persist independent `animation.effect` and `animation.colorEffect` (`none` or a named color ramp) in v3 metadata and reject unknown effects atomically. The movement control adds `none` for a still drawing. Color animation uses its own `colorEffect` field; movement `none` keeps geometry fixed. Apply movement/reveal first, then animated inks; diagonal bands use destination positions. Add `colorEffect` to ZIP timing metadata.

- **Color-effect tests.** Regression tests independently decode all color-effect GIF/ZIP frames, verify exact palette colors, geometry/alpha/background/timing, confirm preview pause/stop and still/project preservation, exercise export snapshots during edits, and decode repeated native video cycles.

## Workspace navigation

- **Persistent controls.** Keep Glyphs/brush preview, direct ink access, Paint/Eraser, Symmetry and Undo/Redo in a persistent drawing strip outside the settings scroller. Primary touch targets are at least 44 px. Compact visual labels on phones must retain accessible names; symmetry must expose its active state.

- **Quick ink and tool state.** Ink opens a native auto popover anchored beneath the drawing strip, without opening or scrolling settings. Its 16 swatches select brush ink through the existing undo path and dismiss to Ink; opening/dismissing alone never edits. Keep native Escape/outside dismissal and do not intercept outside canvas input. Paint/Eraser are idempotent selections and disabled during playing/paused preview; the canvas hint names the active drawing tool and ink. Return to drawing restores tool availability.

- **Settings and resize.** Settings use initially closed Canvas setup, Colors, Animation and Help disclosures. Broad pattern/clear/recolor actions live under explicitly scoped disclosures. Stage columns and rows together, show the proposed crop, and apply once with one undo entry; Cancel leaves art/history unchanged.

- **Download panel.** Header Download artwork opens a native responsive dialog with keyboard-accessible Image / Animation / C64 data tabs, format selection and exact grid-free output previews. Retain one action per chosen format, existing download caches and snapshot isolation.

  Project open/editable JSON download live in a separate Project menu. Dialog navigation must not alter art/history/playback. Escape closes only the top surface; dismissing downloads or ink must not also close the glyph panel. Closing it keeps export work running; progress and Cancel remain accessible outside it and inside when open.

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

- **Color RAM.** Color RAM export is one byte per cell, row-major, values 0–15 including empty cells. Glyph-ID and text exports remain glyph-only. Neither binary has dimensions, character set or a load address. JSON preserves all cell colors and replay.

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

- Validate dimensions 1–40 by 1–25; preserve top-left placement and 40-byte screen stride. Require numeric codes or empty cells in every exported frame. Empty cells are screen code 32; numeric 0 remains valid.
- Initialize exactly 1000 screen/color cells, preserving sprite pointers and memory beyond the color plane. For ROM-only IDs 0–255, retain screen `$0400`, VIC bank 0 and `$D018=$15` (the low-level ROM-bank-1 API retains `$17`). RAM-backed output uses the addresses above and blank slot 0 instead of ROM space code 32. Both use standard character mode and the chosen background/border.
- Frame stream: little-endian duration in 60 Hz jiffies, then changed runs `[addressLo,addressHi,count,value]` (count 1–255). A zero count instead introduces `[literalLength,...literalBytes]` (length 1–255). Repeated bytes use the original format; adjacent differing bytes share a literal run. Never include unchanged cells in a delta run. Address 0 ends a frame. Duration 0 ends a loop; `$FFFF` redirects to a little-endian stream address. The first frame fully initializes both planes. Subsequent frames and the loop transition write changed runs only. The redirect reuses the frame sequence without duplicating it.
- Round cumulative shared frame boundaries to 60 Hz ticks, so loop duration stays balanced. Keep KERNAL IRQs running, track low-byte clock wrap, and check STOP while waiting. The first picture is decoded before starting the loop clock. Updates are not raster synchronized and may show tearing; very fast complex updates require full-machine validation. The normal KERNAL clock is 60 Hz on PAL/NTSC, independent of video refresh.
- Estimate subsequent and loop-transition CPU work conservatively (repeated runs: 13 cycles/write plus 160/run; literal runs: 60 cycles/write plus 200/run; 2500/frame overhead) against PAL CPU time for the frame. Reject excessive work with an actionable slower/simpler message. Bound code plus stream below `$A000` (maximum 38,911 loaded bytes, excluding the two-byte load header). This is a conservative first player, not a cycle-accurate performance guarantee.
- C64 repetitions are download-panel state: 0 loops continuously; 1–100 holds the final frame after that many loops. Still output holds until RUN/STOP. Preserve `$FB–$FE` and display registers on the stack, disable the cursor during playback, clear the screen on exit, and return to BASIC with a balanced stack.
- Snapshot source/settings before lazy importing the exporter. Share the active export guard, disabled actions, cancellation during loading, cached completed-file identity, and 60-second replaced-URL grace period with other animation exports. Failed/canceled work must not replace the last completed file.
- Tests use pinned development dependency `py65==1.2.0`, installed in CI, to execute actual downloaded PRG machine code. Documented KERNAL STOP/CHROUT calls and the clock are stubbed. Assert screen/color RAM, both banks, inverse/code-zero values, row stride, loop order and timing at PAL/NTSC CPU speeds, low-byte wrap, scratch/register restoration, sprite-pointer boundaries, stack balance, and exit. This does not emulate VIC-II/CIA chips, IRQ latency, actual KERNAL ROM, disk loading, or physical hardware. The separate `npm run test:vice` suite checks real ROM/chips and D64 loading on PAL/NTSC, with host-only debug symbols. See [VICE validation](vice-validation.md) for setup, 16 passing scenarios, including full-screen performance workloads, and STOP-injection limits. Physical hardware checks remain open.

KERNAL call contracts: [STOP `$FFE1`](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_5/page_301.html) returns Z set for RUN/STOP; [CHROUT `$FFD2`](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_5/page_278.html) sends the clear-screen character after STOP restores default channels. The normal IRQ calls UDTIM; the player must not increment the clock itself.

## CI environment

GitHub Actions uses the official `mcr.microsoft.com/playwright:v1.58.2-noble` image, matching the pinned npm package. Update both versions together. The image supplies browser builds and OS dependencies; installing them from the runner's slow Ubuntu mirror previously consumed the entire job deadline before tests began. FFmpeg and a Python virtual environment with `py65==1.2.0` provide independent export checks.

Run CI with one worker for stable headless WebKit resource use. The two serial multi-effect/project-color scenarios have explicit 60-second limits; their assertions are unchanged. Playwright's 25-minute global timeout leaves time to upload reports inside the 30-minute job budget. Source: [Playwright CI guidance](https://playwright.dev/docs/ci) and [Docker image guidance](https://playwright.dev/docs/docker).
