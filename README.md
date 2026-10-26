# PETSCII Graphics Lab

Draw with Commodore 64 character graphics using a finger, Apple Pencil, or mouse.

**[Open the editor](https://funkatron.github.io/petscii-graphics-lab/)** — it runs in your browser. No installation or extra glyph download is needed.

## Draw your first picture

1. Open **Glyphs** and choose a shape. A *glyph* is one 8×8 character image.
2. Tap **Ink** and choose a color from the floating palette.
3. If settings cover the canvas, tap **☰** to hide them. Drag across the canvas to draw.
4. Use **Undo** to reverse your last stroke. Use **Redo** to restore it.
5. Choose **Project → Download editable project** to keep a file you can edit later.

To share a picture instead, choose **Download artwork → Image → Download PNG**.

## Find a control

The drawing strip stays visible when settings are hidden. Tap **☰** to show or hide settings and give the canvas more space.

| You want to… | Use |
| --- | --- |
| Choose a shape | **Glyphs** |
| Change the brush color | **Ink** |
| Draw or erase | **Paint** / **Eraser** |
| Repeat strokes across an axis | **Symmetry** |
| Reverse or restore an edit | **Undo** / **Redo** |
| Change canvas dimensions | **☰ → Canvas setup** |
| Change the shared background | **☰ → Colors → Background** |
| Choose an animation | **☰ → Animation** |
| Keep or open editable artwork | **Project** |
| Download a still, animation, or C64 data | **Download artwork** |

## Choose glyphs

The editor combines both authentic C64 source character sets in one palette. **Show letters & numbers** starts off, hiding letters and digits in both normal and inverse forms. Turn it on to see uppercase and lowercase together, alongside the full graphics palette. Symbols, punctuation, blank space, and graphic shapes remain available. The authentic solid block (ID 160) is included under **Blocks**.

The default **Browse glyphs → Grouped by shape** view brings similar shapes together across screen-code pages: **Blocks**, **Lines**, **Corners**, **Diagonals**, **Symbols**, then **Other symbols**. Corresponding inverse shapes sit beside each other.

Choose one shape family, **Recently used**, or **Favorites** to narrow the view. Use **Show letters & numbers** to include them; in **Grouped by shape**, they appear in their own section. This filter also applies to Recently used and Favorites. Tap **☆** to add the selected glyph to Favorites. Favorites and recent selections are stored on this device.

On wide screens, the picker sits beside the canvas. On smaller screens, it appears over the canvas and closes after selection. **Pin** keeps it beside the canvas where space allows. Close it with **✕**, **Escape**, or the shaded area outside the picker.

There is no character-set switch or separate lowercase option. Selecting a letter never changes shapes already in your drawing. The palette hides redundant source-bank copies while keeping inverse pairs together.

Open **Character options** for optional code labels and glyph-source details.

Choose either member of a light/dark pair directly from the palette. Both remain available with letters hidden, including the blank/solid-block pair. There is no separate Inverse button. The editor preserves the actual C64 inverse glyphs.

The letter toggle changes browsing only. Opening a project or using Undo preserves its artwork without turning the toggle on. If the current brush is outside the view, a notice explains how to find it. The toggle starts off again when the editor reloads.

Glyph codes are hidden by default. Turn on **Character options → Show glyph codes (hex)** to display hexadecimal labels. The setting stays on this device. You can draw without learning those numbers. See [C64 terms and data](#c64-terms-and-data) when you need them.

## Draw, color, and resize

### Drawing tools

The compact drawing strip uses familiar tool icons with accessible names. The selected tool is highlighted. Undo and Redo stay together. Tap the question mark for drawing instructions.

| Tool | Action |
| --- | --- |
| Paint / Eraser | Drag to draw or remove cells |
| Fill | Tap to replace a connected region of matching glyph and ink; empty regions ignore ink |
| Line / Rectangle | Drag to preview a straight line or outlined rectangle; release to apply |
| Select | Drag a rectangular marquee, then drag inside it to move the region |
| Duplicate | Select a region, choose Duplicate, then drag inside it to place a copy |
| Delete | Remove the selected region |

Each completed drawing operation is one Undo step. Escape or an interrupted pointer gesture cancels a shape preview. Deselect clears the marquee. Moves preserve empty cells as well as artwork; duplicates and stamps treat empty cells as transparent. Placement stays within the canvas.

Stamps have been removed; use Select and Duplicate to repeat artwork. Old device-local stamp data is left untouched. The canvas is read-only during animation preview.

For lines, rectangles and selections, enable **Tap endpoints** to mark two points instead of dragging. Move and Duplicate accept a tap on the destination. On a focused canvas, use arrow keys to position the cursor and Enter to draw or mark endpoints. Cancel and Escape abandon unfinished operations. Undo preserves the active tool.

Optional explanations are available through compact question marks beside section headings. Selection actions sit in a reserved strip below the canvas, keeping artwork uncovered. Help supports keyboard activation, Close and Escape. Portrait iPad settings start closed to leave more canvas space.

The C64 download panel checks readiness before downloading: dimensions, distinct patterns, program memory and estimated update time. PRG and D64 share the same limits. When playback is too demanding, a longer loop is offered only after the exporter accepts that candidate. Applying it is undoable. When needed, the exporter tries a faster row renderer while preserving the sampled frames and requested speed. If timing is the remaining blocker, check **Download despite timing warning** to try the animation anyway. The warning stays visible; memory and artwork limits still apply. Changing the artwork or animation settings clears this choice. These estimates do not guarantee smooth physical-hardware playback; broader capacity validation remains on the roadmap.

### Change colors

**Ink** opens a small palette beside the drawing controls, without opening settings. Choose a swatch to select it and close the palette; use **Escape**, **✕**, or tap outside to dismiss it. The canvas remains active when you tap outside.

Each painted cell keeps its own **Ink** color. Changing the brush affects future strokes. Paint over a cell to give it the current glyph and ink.

**Paint** and **Eraser** consistently select their named tools, even when tapped again. The text beneath the canvas identifies the current tool.

The **Background** color is shared by the whole canvas.

| Control | What changes |
| --- | --- |
| **Ink** | Brush color for future strokes |
| **Background** | Shared canvas background |
| **Swap brush / background** | Those two settings; existing cell ink stays the same |
| **Whole drawing color → Recolor entire drawing** | Ink in every occupied cell; this is undoable |

The 16 colors use the [Pepto PAL palette](https://www.pepto.de/projects/colorvic/2001/), an RGB approximation of C64 color. The default is Light blue ink on Blue. Glyph thumbnails stay white on black so their shapes remain visible at any brush color.

### Repeat a stroke or change the whole drawing

**Symmetry** places the selected glyph in matching cell positions across the chosen axis. It repeats the glyph without flipping its pixels.

For **Border**, **Checkerboard**, or **Clear drawing**, open **Canvas setup → Whole drawing actions**. Each operation can be undone.

### Resize the canvas

1. Open **Canvas setup**.
2. Choose **Columns** and **Rows**. Each can be 1–40; a standard C64 screen is 40×25.
3. Inspect the preview and its count of painted cells that will be cropped.
4. Choose **Apply size**, or **Cancel** to keep the current size.

Resizing keeps the overlapping artwork at the top left. Applying both dimensions is one undoable edit, including any cropped cells.

## Keep an editable project

**Project → Download editable project** saves a JSON project file containing the drawing, cell colors, animation settings, and drawing replay. Use **Open project** to resume editing on this or another device.

The editor also keeps **one automatic draft on this device**. Look for **Saved on this device**. If saving fails, the editor shows a backup notice.

- Download an editable project before clearing browser storage or changing devices. Browser storage may be cleared or unavailable, including in private browsing.
- Undo history lasts for the current session; it is not included in the project file.
- If several tabs edit the draft, the last tab to save replaces it.

The editor opens version 3 projects containing numeric glyph IDs across both source banks. Older projects, including version 2, are unsupported; this early-development format change has no migration. The new automatic draft is separate from the old one. Project files store glyph IDs and settings, without the ROM binary.

## Preview an animation

1. Open **☰ → Animation**.
2. Choose **Movement / reveal** and **Color animation** independently. For example, combine **Scroll horizontally** with **Rainbow wave**. Use **Still drawing** for color alone, or **Original colors** for movement alone.
3. Set the direction and waveform controls that appear for your selected effects.
4. Choose **Loop duration**, the length of the complete timeline: half a second to 12 seconds.
5. Set **Movement cycles per loop** and **Color cycles per loop** independently: **1×, 2×, 4×, 8×, or 16×**. More cycles make that effect faster without changing the overall loop duration.
6. Press **Play**, or use **▶** in the header.

**Pause** holds the current preview frame. **Return to drawing** restores the original artwork and colors. The preview names the effect and shows when it is paused.

The canvas is read-only during playback and while paused. **Paint** and **Eraser** are unavailable until you choose **Return to drawing**. Other artwork edits stop the preview. Playback pauses when the browser tab is hidden and stays stopped when a project is reopened.

| Effect | What you see |
| --- | --- |
| **Still drawing / Original colors** | Disable movement or color animation independently. |
| **Replay drawing** | Paint, erase, and repaint actions appear in recorded order. The finished picture holds for the last quarter of each cycle. |
| **Scroll horizontally / Scroll vertically** | The drawing wraps around. **Scroll direction** chooses left, right, up, or down. |
| **Wave rows / columns** | Rows or columns shift in a repeating wave. Choose its travel direction and waveform. |
| **Inverse pulse** | C64 glyphs alternate with their inverse slots. |
| **Color cycle** | Each cell cycles through all 16 inks, starting with its original color. |
| **Rainbow wave** | Bands of eight C64 colors change the ink. Choose a cardinal or diagonal direction and a waveform. Glyphs remain stationary with **Still drawing**. |
| **Warm glow** | Ink moves through brown, orange, red, light red, yellow, and white, then back. |

Movement carries each cell’s ink with its glyph. Color animation then changes the resulting ink; Rainbow wave uses the cell’s new position. Both choices share one loop duration. The shared background stays fixed. Still-image downloads use the original drawing, even when an animation is paused.

For example, an **8-second loop** with **4× movement** and **8× color** repeats movement every 2 seconds and color every 1 second. Both return to their starting phase at the loop boundary. Video repetitions still count complete 8-second loops.

Faster rates use fewer intermediate positions or colors per cycle. Increase loop duration for more detail. Very short loops cannot represent every high cycle rate reliably. If a warning appears, increase **Loop duration** or reduce cycles. Preview and animation downloads wait for a supported combination instead of silently skipping whole cycles. Repeated replay completes and holds the finished drawing within each cycle.

### Shape a wave

Wave controls appear only when their effect is selected. Movement and color waves have separate directions and waveforms. **Wave direction** is the direction the pattern travels: Up/Down shifts rows sideways; Left/Right shifts columns vertically.

| Waveform | How it changes |
| --- | --- |
| **Sine** | Smooth, rounded motion |
| **Triangle** | Even rise and fall |
| **Square** | Switches between two levels |
| **Sawtooth** | Rises steadily, then jumps back |
| **Reverse sawtooth** | Falls steadily, then jumps back |

Character movement uses whole cells, so even smooth waveforms appear stepped on a small grid. Color waveforms choose from eight palette inks. A square color wave switches between two ramp positions.

Settings apply to preview, GIF, video, PNG frames, and C64 animation programs, and are saved with the editable project.

### What replay records

New strokes are recorded automatically. Replay follows their order at the selected cycles-per-loop rate; it does not reproduce the pauses you took while drawing.

Imported artwork without a recording, patterns, and resized canvases reveal in grid order: left to right, then down. After 20,000 cell changes, the recording is condensed to a reveal of the current picture. Undo/redo retain the matching recording.

Long recordings use selected points from the recording instead of showing every change as a separate frame. The editor creates effects and drawing replays; it does not provide a manual frame timeline.

## Download artwork

Open **Download artwork**, choose a tab and format, then use its **Download** button. The preview shows output dimensions in pixels and, for animations, duration and frame count. Editing grid lines are omitted.

In **Animation**, use **Play preview** to watch the selected animation directly in the download panel. **Stop preview** resets it to the first frame. The same control appears in **C64 data** when **Selected animation** is chosen. The C64 preview uses the drawing’s background color; it previews the animation in the browser, not C64 execution speed.

| Goal | Tab and format | Result |
| --- | --- | --- |
| Share a still picture | **Image → PNG image** | A still image at 16, 32, 64, or 128 pixels per cell |
| Scale a picture | **Image → SVG vector** | Shapes that scale without blurring |
| Share a repeating animation | **Animation → Animated GIF** | An animation that loops continuously |
| Save a video with a set duration | **Animation → Video (MP4 / WebM)** | A silent clip with 1–100 complete loops |
| Edit frames elsewhere | **Animation → PNG frames (.zip)** | Full PNG images, timings, and an editable project |
| Run artwork on a C64 | **C64 data → C64 program** | A runnable still or animation, as a `.prg` program or `.d64` virtual disk |
| Work with glyph data | **C64 data → Raw bytes & text** | Text, two-byte glyph IDs, or separate color bytes |

Image backgrounds can use the canvas color, white, black, or transparency. Animation backgrounds can use the canvas color, white, or transparency. **Video uses the canvas color when Transparent is selected.**

GIF, video, and frame ZIP share resolution choices of 8, 16, or 32 pixels per cell. PNG frames preserve exact pixels; video compression may slightly change colors and edges.

### Video repetitions

In **Animation → Video (MP4 / WebM)**, set **Video repetitions (total loops)**. One plays once; the maximum is 100.

For example: **2 seconds per loop × 5 repetitions = a 10-second video**.

The editor prefers H.264 MP4 and uses VP9/VP8 WebM when needed. If the browser cannot encode video, use GIF or PNG frames. Videos contain no audio and require no camera, microphone, or screen-recording permission.

Repetitions change the video file only. GIF and preview looping, and the frame ZIP’s one-loop timeline, keep their existing behavior.

### While a file is being prepared

Animation downloads show progress and provide **Cancel export**. You can close the download panel and keep drawing. Each export uses a copy of the artwork and settings from when it started.

Tap the same animation Download button again to reuse the completed file. Changing artwork or output settings makes the editor prepare a new file. Canceling or failing to prepare a file preserves the previous completed download.

### Use a frame ZIP

Keep these files together:

| File | Purpose |
| --- | --- |
| `frames/frame-0001.png`, and later numbers | Complete images in playback order |
| `timing.json` | Dimensions, glyph encoding, colors, loop duration, and each frame’s start time and duration |
| `project.json` | Editable artwork captured when export started |
| `README.txt` | Instructions for the frame sequence |

Frame durations can differ, especially during the final hold in replay. Use `timing.json` when importing frames into another tool. Giving every frame the same duration can change the animation’s timing.

### Run a C64 program

1. Choose **Download artwork → C64 data**.
2. Set **C64 program** to **Still drawing** or **Selected animation**.
3. For animation, set **C64 repetitions**: 0 repeats continuously; 1–100 plays that many loops and holds the last frame.
4. Choose **C64 file format**: **Program (.prg)** for a direct program, or **Disk image (.d64)** for a virtual 1541 floppy containing that program.
5. Use the Download button. Load the program in a standard C64 emulator or transfer it to your C64, then `RUN`. For a D64, attach the disk as device 8, type `LOAD "*",8,1`, then `RUN`.
6. Press **RUN/STOP** to exit.

The program uses your cell colors and canvas background. Graphics-only source-bank-0 artwork uses the C64’s own character ROM. Mixed-bank artwork includes a RAM character set containing the patterns it needs. C64 output allows at most **256 distinct patterns across the entire animation, including a blank**. This limit does not apply to images or videos. Drawings must fit within 40×25 cells. Smaller drawings and animations are centered on the C64 screen. Large or very fast animations may exceed memory or processing limits; the exporter explains what to change.

The player has automated CPU checks. The original ROM-backed path also has full PAL/NTSC VICE checks for representative stills, animation, and disk loading; full-machine verification of the new mixed-bank RAM path and physical C64 checks remain open. See the [C64 output guide](docs/c64-output.md) for loading instructions and timing limits.

## C64 terms and data

You can skip this section for ordinary drawing and image downloads.

| Term | Meaning here |
| --- | --- |
| **Glyph** | One 8×8 character image |
| **Cell** | One position in the canvas grid |
| **ROM** | Read-only memory; the original C64 stores its character patterns here |
| **Character set / bank** | One collection of 256 glyphs |
| **Screen code** | A number selecting a glyph in the chosen bank |
| **Glyph ID** | An editor atlas slot, 0–511: source bank × 256 + screen code |
| **PETSCII** | A separate C64 text encoding; screen-code bytes are not PETSCII bytes |
| **Row-major** | Left to right across the top row, then each row below it |
| **Inverse glyph** | A glyph from the inverse half of the character set; actual source slots are preserved |

### Text and binary formats

- **Glyph-ID text:** a labeled grid with dimensions. It preserves numeric IDs and empty cells, but omits cell colors.
- **Glyph IDs (.bin):** two bytes per cell, little-endian, in row-major order. Empty cells use `FFFF`. These are not native C64 screen bytes or PETSCII bytes.
- **Color RAM (.bin):** one foreground color index, 0–15, per cell, including empty cells. Pair it with the glyph-ID file.

Binary files omit dimensions and a C64 load address. Glyph-ID files also omit colors. Use the editable JSON project to preserve the full drawing and replay.

### Use the binary files on a C64

The two `.bin` files describe a **still picture**. They are data, not runnable programs, and contain no animation timing.

See [Use your artwork on a Commodore 64](docs/c64-output.md) for the file contents, an emulator reference workflow, and runnable still/animation `.prg` downloads.

### Labeled text example

```text
# PETSCII-GLYPHS 1 2 2
100 0A0
-- 180
```

The header gives **format version, columns, and rows**. Here it means version 1, two columns and two rows. Each cell chooses its own source-bank glyph.

Each row must have one space-separated token per column:

- Three hexadecimal digits, such as `000` or `180`: a glyph ID, at most `1FF`.
- `--`: an empty cell.

An empty cell differs from a deliberately placed space glyph (ID `020` in hexadecimal). Import checks the whole document before changing the drawing. The older PETSCII-GRID format is unsupported.

## If something does not work

| What you notice | Next step |
| --- | --- |
| C64 glyphs are unavailable | Open **Glyphs → Character options → Reload C64 glyphs**. Numeric codes are retained. Reload glyphs to resume drawing. |
| A backup notice appears | Use **Project → Download editable project**. |
| An animation download does not start | Tap its Download button again to reuse the completed file. |
| Video encoding is unavailable | Choose GIF or PNG frames. |

Image export waits for C64 glyph data rather than omitting unavailable glyphs. Text, JSON, and glyph-ID files can still preserve numeric IDs.

Physical iPad/Pencil gestures and Files/Photos handoffs still need testing on a real device.

## Develop or maintain the editor

Start with [AGENTS.md](AGENTS.md) for project rules and the [maintainer reference](docs/maintainer-reference.md) for file formats, rendering, timing, glyph provenance, and export requirements.

Tests need Node.js/npm, Python 3 with the py65 CPU emulator, and FFmpeg with `ffprobe`. GitHub Actions uses Node.js 22.

Run from the repository directory:

```sh
npm ci
npx playwright install --with-deps chromium webkit
python3 -m pip install py65==1.2.0
```

Install FFmpeg with your platform’s package manager, then run:

```sh
npm test
```

Playwright tests desktop Chromium and iPad WebKit in landscape and portrait. Tests inspect downloaded files, pixels, timing, saved projects, touch input, and undo/redo. Video checks decode output independently with FFmpeg/FFprobe. C64 checks execute downloaded PRGs with py65, using simulated KERNAL calls and a clock. Use a Python virtual environment if your platform requires one.

`CHROMIUM_EXECUTABLE_PATH` can select a local Chromium executable. Standard development and CI use Playwright’s browser builds and the committed npm lockfile.

## Other documentation

- [Planned work](docs/roadmap.md): completed animation/player milestones and requested follow-ups.

- [C64 output guide](docs/c64-output.md): raw binary files and runnable still/animation programs.
- [Maintainer reference](docs/maintainer-reference.md): implementation contracts and source references.
- [UI review](docs/ui-review.md): layout decisions, implemented changes, and follow-ups.
- [Audit history](AUDIT.md): earlier findings and results from each development stage.
- [Bundled dependencies](vendor/README.md): versions, build fingerprints, and licenses.
- [Project license](LICENSE): BSD 3-Clause terms for the project code.
