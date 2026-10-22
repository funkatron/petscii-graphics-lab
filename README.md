# PETSCII Graphics Lab

Draw with Commodore 64 character graphics using a finger, Apple Pencil, or mouse.

**[Open the editor](https://funkatron.github.io/petscii-graphics-lab/)** — it runs in your browser. No installation or extra glyph download is needed.

## Draw your first picture

1. Open **Glyphs** and choose a shape. A *glyph* is one 8×8 character image.
2. Tap **Ink** and choose a color.
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

The editor includes **512 authentic 8×8 glyphs**: two character sets with 256 glyphs each. The default **Graphics only** view leaves out ordinary letters and digits.

Use **Browse glyphs** to choose a screen-code page, shape family, **Recently used**, or **Favorites**. Tap **☆** to add the selected glyph to Favorites. Favorites and recent selections are stored on this device. Each character set has its own list.

On wide screens, the picker sits beside the canvas. On smaller screens, it appears over the canvas and closes after selection. **Pin** keeps it beside the canvas where space allows. Close it with **✕**, **Escape**, or the shaded area outside the picker.

Open **Character options** for these choices:

- **All screen codes** includes letters, numbers, and every code in the selected set.
- **Character set** switches between uppercase/graphics and lowercase/uppercase. This affects the whole drawing; **Undo** restores the previous set.
- **Legacy shapes** provides the earlier approximate shapes.

**Inverse ±128** selects the corresponding inverse slot. The editor preserves the actual C64 inverse glyphs.

Small glyph labels use hexadecimal screen codes. You can draw without learning those numbers. See [C64 terms and data](#c64-terms-and-data) when you need them.

## Draw, color, and resize

### Change colors

Each painted cell keeps its own **Ink** color. Changing the brush affects future strokes. Paint over a cell to give it the current glyph and ink.

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

The editor opens version 1 legacy projects and version 2 projects containing C64 codes, legacy shapes, or both. It does not open the earlier experimental custom-ROM format. Project files store glyph codes and settings, without the ROM binary.

## Preview an animation

1. Open **☰ → Animation**.
2. Choose an **Effect**.
3. Choose **Loop duration**. A shorter duration plays faster. New projects start at two seconds per loop; choices range from half a second to 12 seconds.
4. Press **Play**, or use **▶** in the header.

**Pause** holds the current preview frame. **Return to drawing** restores the original artwork and colors. The preview names the effect and shows when it is paused.

Painting and other artwork edits stop the preview. Playback pauses when the browser tab is hidden and stays stopped when a project is reopened.

| Effect | What you see |
| --- | --- |
| **Replay drawing** | Paint, erase, and repaint actions appear in recorded order. The finished picture holds for the last quarter of the loop. |
| **Scroll left / Scroll up** | The drawing moves across the grid and wraps around. |
| **Wave rows** | Rows shift in a repeating wave. |
| **Inverse pulse** | C64 glyphs alternate with their inverse slots. Legacy shapes blink. |
| **Color cycle** | Each cell cycles through all 16 inks, starting with its original color. |
| **Rainbow wave** | Diagonal bands of eight C64 colors move across the drawing. |
| **Warm glow** | Ink moves through brown, orange, red, light red, yellow, and white, then back. |

Color effects keep the glyphs and shared background fixed. Still-image downloads use the original drawing, even when an animation is paused.

### What replay records

New strokes are recorded automatically. Replay follows their order at the selected loop duration; it does not reproduce the pauses you took while drawing.

Imported artwork without a recording, patterns, and resized canvases reveal in grid order: left to right, then down. After 20,000 cell changes, the recording is condensed to a reveal of the current picture. Undo/redo retain the matching recording.

Long recordings use selected points from the recording instead of showing every change as a separate frame. The editor creates effects and drawing replays; it does not provide a manual frame timeline.

## Download artwork

Open **Download artwork**, choose a tab and format, then use its **Download** button. The preview shows output dimensions in pixels and, for animations, duration and frame count. Editing grid lines are omitted.

| Goal | Tab and format | Result |
| --- | --- | --- |
| Share a still picture | **Image → PNG image** | A still image at 16, 32, 64, or 128 pixels per cell |
| Scale a picture | **Image → SVG vector** | Shapes that scale without blurring |
| Share a repeating animation | **Animation → Animated GIF** | An animation that loops continuously |
| Save a video with a set duration | **Animation → Video (MP4 / WebM)** | A silent clip with 1–100 complete loops |
| Edit frames elsewhere | **Animation → PNG frames (.zip)** | Full PNG images, timings, and an editable project |
| Work with text or C64 bytes | **C64 data** | Text, screen-code bytes, or separate color bytes |

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
| `timing.json` | Dimensions, character set, colors, loop duration, and each frame’s start time and duration |
| `project.json` | Editable artwork captured when export started |
| `README.txt` | Instructions for the frame sequence |

Frame durations can differ, especially during the final hold in replay. Use `timing.json` when importing frames into another tool. Giving every frame the same duration can change the animation’s timing.

## C64 terms and data

You can skip this section for ordinary drawing and image downloads.

| Term | Meaning here |
| --- | --- |
| **Glyph** | One 8×8 character image |
| **Cell** | One position in the canvas grid |
| **ROM** | Read-only memory; the original C64 stores its character patterns here |
| **Character set / bank** | One collection of 256 glyphs |
| **Screen code** | A number selecting a glyph in the chosen bank |
| **PETSCII** | A separate C64 text encoding; screen-code bytes are not PETSCII bytes |
| **Row-major** | Left to right across the top row, then each row below it |
| **Inverse glyph** | A glyph from the inverse half of the character set; actual source slots are preserved |

### Text and binary formats

- **Legacy-only text:** Unicode approximations. Spaces represent empty cells. Import uses existing canvas dimensions.
- **C64 or mixed text:** a labeled grid with dimensions and character set. It preserves codes, legacy symbols, and empty cells, but omits cell colors.
- **Screen codes (.bin):** one byte per cell in row-major order. Empty cells become space code 32. Legacy shapes cannot be converted.
- **Color RAM (.bin):** one foreground color index, 0–15, per cell, including empty cells. Pair it with the screen-code file.

Binary files omit dimensions, character set, and a C64 load address. Screen-code files also omit colors. Use the editable JSON project to preserve the full drawing and replay.

### Use the binary files on a C64

The two `.bin` files describe a **still picture**. They are data, not runnable programs, and contain no animation timing.

See [Use your artwork on a Commodore 64](docs/c64-output.md) for the file contents, an emulator reference workflow, and a proposal for exporting runnable C64 animations as `.prg` files.

### Labeled text example

```text
# PETSCII-GRID 1 2 2 1
00 █
-- 80
```

The header gives **format version, columns, rows, and bank**. Here it means version 1, two columns, two rows, bank 1.

Each row must have one space-separated token per column:

- Two hexadecimal digits, such as `00` or `80`: a screen code.
- `--`: an empty cell.
- A supported legacy symbol, such as `█`: that shape.

An empty cell differs from a deliberately placed space glyph (screen code `20` in hexadecimal). Import checks the whole document before changing the drawing.

## If something does not work

| What you notice | Next step |
| --- | --- |
| C64 glyphs are unavailable | Open **Glyphs → Character options → Reload C64 glyphs**. Numeric codes are retained; legacy editing remains available. |
| A backup notice appears | Use **Project → Download editable project**. |
| An animation download does not start | Tap its Download button again to reuse the completed file. |
| Video encoding is unavailable | Choose GIF or PNG frames. |
| An early experimental text file cannot be read | Use its JSON project; that old mixed-text format cannot be detected reliably. |

Image export waits for C64 glyph data rather than omitting unavailable glyphs. Text, JSON, and screen-code files can still preserve numeric codes.

The optional stencil check under **Help & extras** analyzes legacy shapes only. Physical iPad/Pencil gestures and Files/Photos handoffs still need testing on a real device.

## Develop or maintain the editor

Start with [AGENTS.md](AGENTS.md) for project rules and the [maintainer reference](docs/maintainer-reference.md) for file formats, rendering, timing, glyph provenance, and export requirements.

Tests need Node.js/npm, Python 3, and FFmpeg with `ffprobe`. GitHub Actions uses Node.js 22.

Run from the repository directory:

```sh
npm ci
npx playwright install --with-deps chromium webkit
```

Install FFmpeg with your platform’s package manager, then run:

```sh
npm test
```

Playwright tests desktop Chromium and iPad WebKit in landscape and portrait. Tests inspect downloaded files, pixels, timing, saved projects, touch input, and undo/redo. Video checks decode output independently with FFmpeg/FFprobe.

`CHROMIUM_EXECUTABLE_PATH` can select a local Chromium executable. Standard development and CI use Playwright’s browser builds and the committed npm lockfile.

## Other documentation

- [Planned work](docs/roadmap.md): combined movement/color effects and native C64 output.

- [C64 output guide](docs/c64-output.md): binary files today and a proposed runnable animation export.
- [Maintainer reference](docs/maintainer-reference.md): implementation contracts and source references.
- [UI review](docs/ui-review.md): layout decisions, implemented changes, and follow-ups.
- [Audit history](AUDIT.md): earlier findings and results from each development stage.
- [Bundled dependencies](vendor/README.md): versions, build fingerprints, and licenses.
- [Project license](LICENSE): BSD 3-Clause terms for the project code.
