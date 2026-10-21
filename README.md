# PETSCII Graphics Lab

A standalone, touch-first C64 character graphics editor. [Open the editor](https://funkatron.github.io/petscii-stencil-lab/).

## Drawing

- Both C64 sets are available immediately from the built-in [SVG glyph sheet](assets/c64-glyphs.svg): **512 exact 8×8 glyphs**, including inverse slots. Select a glyph and drag with a finger, Pencil, or mouse. No ROM import is needed.

- The default **Graphics only** palette excludes ordinary letters and digits. Switch to **All screen codes** to inspect all 256 codes in either bank, or **Legacy shapes** to edit earlier artwork. Labels are hexadecimal screen codes; **Inverse ±128** selects the opposite half of the ROM.
- The character set applies to the whole composition, as on a single-bank C64 screen. Switching it changes how every numeric screen code renders and is undoable.
- Dragging interpolates between pointer samples; each stroke is one undo operation. Secondary pointers do not paint. Symmetry repeats the selected glyph at mirrored cell positions; it does not reflect the glyph bitmap itself.
- Grid dimensions range from 1–40, including a standard **40 × 25** C64 screen. Resize preserves the top-left overlap; undo restores cropped cells. Collapse the tools using the header button; the canvas refits without clearing artwork.

## Workspace

**Glyphs** in the header opens a dedicated picker with the selected glyph's bitmap preview. It docks to the right on wide screens and opens over the canvas on iPad-sized screens, closing when you select a character. Close it with ✕, Escape, or the shaded area outside. The picker scrolls independently of the settings; its glyph grid has no nested scrolling box. **Character options** holds palette mode, character set, and glyph-source details.

The left tools use disclosures for **Canvas & tools**, **Colors**, **Animation**, **Save & export**, and **Help & extras**. Eraser and undo/redo remain at the top. Use ☰ to hide the settings and enlarge the canvas; Glyphs and header Play remain available.

**Save & export** keeps editable project save/load together with three tabs: **Still** (PNG/SVG), **Animation** (GIF/video/PNG frame ZIP), and **Data** (text/screen codes and text import). Choose an animation format to see its options and Save link. Resolution/background are shared between animation formats; the **Edit** shortcut opens effect/speed settings. Changing sections or tabs preserves artwork and generated download links. Export cancellation stays at the top of the tools even when Save & export is closed.

## C64 colors

Open **Colors** in the tools, choose **Ink** or **Background**, then tap a swatch. All 16 colors follow C64 hardware color-number order (0–F), using [Philip “Pepto” Timmermann’s PAL RGB palette](https://www.pepto.de/projects/colorvic/2001/). RGB is an approximation of the C64’s analog output; displays and VIC-II revisions vary.

**Ink** sets the brush color: each painted cell keeps its own foreground color, including legacy shapes. Painting the same glyph again applies the new ink. The background is shared. **Recolor entire drawing** applies brush ink to all occupied cells; **Swap brush / background** swaps those two settings without recoloring existing cells. Default ink is Light blue (14), on Blue (6). Strokes, recoloring, symmetry, resizing, patterns, undo/redo, JSON save/load, autosave and drawing replay preserve cell colors. Earlier files inherit their saved global ink (or Light blue if absent).

Canvas, glyph previews, SVG, PNG, GIF, PNG frame sequences and video use the selected colors. **Canvas color** is the default export background; still exports can instead use white, black or transparency, and animation exports offer white or transparency. Transparent GIF/PNG omit the background; video uses the selected canvas background instead. Changing colors during an export does not alter its captured artwork. Use JSON to preserve the editable composition and colored replay. Text and binary screen-code files contain glyph data only; **Export color RAM .bin** supplies a separate row-major byte per cell (palette index 0–15, including empty cells), with the same dimensions as screen-code output. Neither binary file embeds dimensions, character set or a load address.

## Automatic animation

Choose an effect and **Animation speed**, then press **Play**. Speed ranges from **½ second to 12 seconds per loop**, with a faster **2-second default** for new projects. The displayed multiplier is relative to a 4-second loop: 8× = ½ second, 4× = 1 second, 2× = 2 seconds, and 1× = 4 seconds. Existing saved projects retain their selected duration. Shorter loops play faster in preview and every animation export.

The header's ▶ button also works while the sidebar is hidden. Pause freezes the preview; **Stop / edit** restores the original drawing. Painting, undo, imports and other artwork edits stop playback automatically. Playback pauses when the tab is hidden and never starts automatically on reopening a project.

- **Replay drawing** rebuilds the picture in the order cells were painted, including erasing, repainting and symmetry. The speed is a chosen loop duration rather than the original real-time drawing speed. The completed image holds for the last quarter of each loop.
- **Scroll left / up** wraps the drawing across the grid.
- **Wave rows** shifts character rows in a repeating wave.
- **Inverse pulse** alternates numeric glyphs with their actual inverse slots. Legacy shapes blink instead.

New strokes are recorded automatically. Older/imported artwork, patterns and resized canvases start a grid-order reveal; the earlier drawing process cannot be recovered. The recording stores at most 20,000 cell changes, then condenses to a reveal of the current composition. Undo/redo preserve the corresponding recording.

**Export animated GIF** writes a continuously looping, grid-free GIF with 8, 16 or 32 pixels per cell and the canvas color, white or transparent background. The export uses the same frame calculation and timing as the preview and takes a snapshot, so later edits do not change an export already in progress. C64 bitmap pixels remain sharp. A **Save animated GIF** link stays available after rendering for a direct second tap in Safari or repeat downloads. Static SVG/PNG/text/binary exports continue to use the source drawing.

**Export PNG frames (.zip)** uses the same animation resolution, background, frame order and encoded timings as GIF export. The ZIP includes:

- `frames/frame-0001.png`, etc.: complete, lossless PNG frames with no editing grid.
- `timing.json`: versioned metadata, dimensions, charset, background, C64 color indices and palette identifier, loop duration, and each frame's `file`, `startMs` and `durationMs`.
- `project.json`: an editable snapshot captured when export starts.
- `README.txt`: instructions for using the sequence.

Frame delays can vary, especially the final hold in drawing replay. Preserve `timing.json` when moving frames to another tool; importing every PNG at one fixed frame rate changes the intended timing. The ZIP contains the same sampled replay frames as GIF, rather than every recorded cell change. Video export is described below.

All animation export buttons show progress and support **Cancel export**. Editing remains available; later edits do not affect an export already in progress. **Save frame ZIP** remains available for a direct second tap or repeat download, like the GIF Save link.

**Export video** creates a silent clip with **1–100 repetitions** at the selected speed and resolution. Under **Save & export → Animation → Video**, enter **Video repetitions (total loops)**; 1 means play once. The duration hint shows loop length × count = total video length (for example, 2 seconds × 5 loops = 10 seconds). The count is saved in projects/autosave, defaults to 1 for earlier projects, and applies to both MP4 and WebM. Each repeat includes the full animation, including the drawing replay’s final hold. It uses native browser encoding, preferring **H.264 MP4**, with **VP9/VP8 WebM** as fallback. **Save video** remains available for a direct second tap or repeat download. Unsupported browsers show a clear message; GIF and PNG frames remain available.

Video uses the same raster frames and explicit timestamps as GIF/ZIP, without recording the live preview or waiting for real-time playback. No camera, microphone, screen-capture permission, server upload or runtime CDN is involved. Video colors use the selected solid background; **Transparent uses the selected canvas background** because these video codecs do not preserve alpha here. Video compression can introduce small color/edge differences; PNG frames are the lossless option. The chosen repetitions are encoded into a finite video file, so playback does not depend on the video player supporting looping. Preview and GIF looping and PNG ZIP timelines are unaffected by the video repetition setting.

Animation settings and the replay recording are included in JSON and local autosave; playing/paused state is not. Exported GIFs are capped at 48 replay frames (long recordings are sampled across the whole event sequence; fast loops reduce the frame count to keep delays at least 20 ms), 24 wave frames, or up to one frame per scroll cell / inverse state. Fast scrolling samples positions around the entire grid so it still completes a full cycle while keeping GIF delays at least 20 ms. These are procedural animations rather than a frame-by-frame timeline editor.

## Saving

Download JSON for a portable editable backup. Version 1 legacy projects and version 2 mixed projects remain supported. Projects contain glyph codes and metadata, **not ROM bytes**. Projects reopen immediately on another device using the same built-in glyphs. `glyphSource: "builtin"` records this choice. The experimental custom-ROM project format is no longer supported; custom-character editing may be added as a dedicated future feature.

The current project also autosaves locally after edits and when leaving the page. Browser storage is device/site specific and may be cleared or unavailable in private browsing. It is a convenience, not a replacement for JSON backups. Undo history is session-only. One browser draft is stored; multiple tabs use last-write-wins behavior.

## Export formats

| Format | Contents |
| --- | --- |
| SVG | Vector paths for legacy geometry and exact filled squares for ROM bits. Selected C64 ink, canvas/white/black/transparent background, no editing grid. |
| PNG | Same geometry as SVG; selected C64 ink, canvas/transparent/white/black background, and 16/32/64/128 pixels per cell. |
| Text, legacy only | Unicode approximations; spaces are empty cells. Import into the existing canvas dimensions. |
| Text, ROM or mixed | Labeled lossless grid described below; includes dimensions and charset. |
| PNG frame ZIP | Numbered lossless PNGs, frame timing metadata, an editable JSON snapshot and instructions. |
| Video | Selected number of silent loops at the chosen speed/resolution; MP4 where supported, WebM fallback; opaque background. |
| Animated GIF | Looping animation, sharp C64 pixels, selected resolution and background. |
| Color RAM `.bin` | One C64 foreground palette index (0–15) per cell, row-major. Pair with the screen-code file. No metadata or load address. |
| Screen `.bin` | One screen-code byte per cell, row-major, with empty cells mapped to space code 32. No load address, charset, colors, or dimensions embedded. Legacy shapes are rejected rather than silently lost. These are **screen codes, not PETSCII bytes**. |

Visual exports use the built-in SVG-derived bitmap data. If the glyph asset cannot load, numeric glyphs are marked on canvas; they are never silently omitted from an image export. Text, JSON, and binary screen codes do not require the ROM to preserve numeric data. Rendering preserves every source pixel, including the original inverse glyph slots.

### Lossless text grid

```text
# PETSCII-GRID 1 2 2 1
00 █
-- 80
```

Header fields: format version, columns, rows, charset bank (0 or 1). Each row contains exactly `columns` space-separated tokens: two hexadecimal digits for a screen code, `--` for an empty cell, or one supported legacy symbol. Imports validate the whole document before changing artwork. This format preserves empty cells separately from explicit space code `20` and preserves mixed legacy/ROM art.

## SVG assets and provenance

`assets/c64-glyphs.svg` contains an 8×8 `<symbol>` for each bank/screen-code pair (`c64-0-0` through `c64-1-255`), plus a viewable 16-column, 32-row sheet. Each shape is a vector rectangle covering a contiguous horizontal run of source pixels. No font substitution, tracing, smoothing, or synthesized inverse glyphs is involved.

Converted from `characters.901225-01.bin` obtained from the [Zimmers C64 firmware archive](https://www.zimmers.net/anonftp/pub/cbm/firmware/computers/c64/). Source fingerprint:

```text
SHA-256 fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420
MD5     12a4202f5331d45af846af6c58fba946
```

The repository includes the converted artwork, not the original ROM binary. SVG conversion retains ROM-derived shapes; it is not a claim of a separate license for those shapes. The SVGs were included at the project owner's request.

The editor reads the integer rectangle geometry into an in-memory bitmap table to reuse the existing accurate drawing/export pipeline. No original ROM file, encoded byte array, or third-party download is needed. The editor has no ROM-import workflow. Startup validates all 512 symbols before exposing editing and delays autosave until restoration completes. A failed SVG load leaves legacy editing available, preserves numeric project codes, and offers **Reload C64 glyphs**. Image export is blocked until the glyph data is available.

To reproduce the asset from a locally supplied ROM:

```sh
python3 scripts/build_glyphs.py /path/to/characters.901225-01.bin
```

Tests reconstruct all 512 glyphs from the SVG and compare the complete source SHA-256, check known uppercase/lowercase shapes, and preserve the source's one-bit `@`/inverse-`@` discrepancy in both banks. Inverse slots are intentionally copied exactly rather than regenerated by negating the first 128 glyphs.

Data-model references:

- [Commodore 64 Programmer's Reference Guide, character definitions](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_104.html): 256 glyphs per set, eight bytes per glyph; ROM-mapped charset offsets.
- [Michael Steil's Ultimate Commodore Charset / PETSCII / Keyboard Reference](https://www.pagetable.com/232): ROM-derived glyphs sorted by screen code, inverse forms, and the distinction between PETSCII and screen codes.

## Development and verification

```sh
npm ci
npx playwright install --with-deps chromium webkit
# Install FFmpeg (ffmpeg and ffprobe) using your platform package manager.
npm test
```

Playwright covers desktop Chromium and iPad WebKit in landscape and portrait. Every test fails on uncaught application errors. Video tests independently probe metadata and decode frames with FFmpeg/FFprobe. Animation tests independently validate ZIP archives/CRCs with `adm-zip`, decode PNG sequences with `pngjs`, and decode exported GIFs with `omggif` and inspect frame pixels, loop counts, dimensions and delays. Tests inspect downloaded file contents, numeric bytes, bitmap pixels, PNG dimensions/backgrounds, project compatibility, invalid input, persistence, symmetry, resizing, and undo/redo. Native Chromium touch dispatch verifies continuous dragging; WebKit uses real touchscreen taps plus synthetic sparse touch/pen pointer streams. Physical Apple Pencil and Safari gesture behavior still require a real iPad check.

`CHROMIUM_EXECUTABLE_PATH` optionally selects an existing local Chromium; normal development and CI use Playwright's bundled browsers. GitHub Actions installs from the committed lockfile using `npm ci`.

## Remaining limitations

- No physical iPad/Pencil hardware test is available in automated CI.
- The optional coarse stencil analysis supports legacy shapes only; ROM compositions receive an explicit unsupported message.
- SVG/PNG match artwork geometry and orientation; their foreground colors match each cell; export background overrides are explicit.
- Text exported by the early experimental ROM version was an ambiguous unlabelled mixed string. It cannot be reliably auto-detected; use its JSON project as the migration path.
