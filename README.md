# PETSCII Graphics Lab

A standalone, touch-first C64 character graphics editor. [Open the editor](https://funkatron.github.io/petscii-stencil-lab/).

## Drawing

- Import a **4096-byte C64 character ROM** using **Import C64 ROM**. Select a bitmap glyph and drag with a finger, Pencil, or mouse. The checkbox optionally remembers the ROM on this device; **Forget stored ROM** removes that stored copy. A ROM active in the current tab remains active until the tab closes or reloads.
- The default **Graphics only** palette excludes ordinary letters and digits. Switch to **All screen codes** to inspect all 256 codes in either bank, or **Legacy shapes** to edit earlier artwork. Labels are hexadecimal screen codes; **Inverse ±128** selects the opposite half of the ROM.
- The character set applies to the whole composition, as on a single-bank C64 screen. Switching it changes how every numeric screen code renders and is undoable.
- Dragging interpolates between pointer samples; each stroke is one undo operation. Secondary pointers do not paint. Symmetry repeats the selected glyph at mirrored cell positions; it does not reflect the glyph bitmap itself.
- Grid dimensions range from 1–40, including a standard **40 × 25** C64 screen. Resize preserves the top-left overlap; undo restores cropped cells. Collapse the tools using the header button; the canvas refits without clearing artwork.

## Saving

Download JSON for a portable editable backup. Version 1 legacy projects and version 2 mixed projects remain supported. Projects contain glyph codes and metadata, **not ROM bytes**. Reimport the same ROM on a new device.

The current project also autosaves locally after edits and when leaving the page. Browser storage is device/site specific and may be cleared or unavailable in private browsing. It is a convenience, not a replacement for JSON backups. Undo history is session-only. One browser draft is stored; multiple tabs use last-write-wins behavior.

## Export formats

| Format | Contents |
| --- | --- |
| SVG | Vector paths for legacy geometry and exact filled squares for ROM bits. Black foreground, transparent background, no editing grid. |
| PNG | Same geometry as SVG; selectable transparent, white, or black background and 16/32/64/128 pixels per cell. Black background uses white ink. |
| Text, legacy only | Unicode approximations; spaces are empty cells. Import into the existing canvas dimensions. |
| Text, ROM or mixed | Labeled lossless grid described below; includes dimensions and charset. |
| `.bin` | One screen-code byte per cell, row-major, with empty cells mapped to space code 32. No load address, charset, colors, or dimensions embedded. Legacy shapes are rejected rather than silently lost. These are **screen codes, not PETSCII bytes**. |

Visual exports require the ROM whenever numeric codes are present. Missing ROM glyphs are marked on canvas; they are never silently omitted from an image export. Text, JSON, and binary screen codes do not require the ROM to preserve numeric data. Rendering uses the imported bits exactly, including the ROM's inverse glyph slots; arbitrary 4 KB files are accepted as custom bitmap data, not certified as original Commodore ROMs.

### Lossless text grid

```text
# PETSCII-GRID 1 2 2 1
00 █
-- 80
```

Header fields: format version, columns, rows, charset bank (0 or 1). Each row contains exactly `columns` space-separated tokens: two hexadecimal digits for a screen code, `--` for an empty cell, or one supported legacy symbol. Imports validate the whole document before changing artwork. This format preserves empty cells separately from explicit space code `20` and preserves mixed legacy/ROM art.

## ROM access and provenance

The application does not bundle, upload, or automatically fetch a proprietary ROM. Import a compatible file already available to you (for example, your own machine dump or emulator installation). Keeping that import in local browser storage avoids repeated file selection on iPad without depending on third-party CORS, network availability, or a changing download URL. Original ROM redistribution permissions have not been established, so bundling it is not part of this change.

References used to check the data model:

- [Commodore 64 Programmer's Reference Guide, character definitions](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_104.html): 256 glyphs per set, eight bytes per glyph; ROM-mapped charset offsets.
- [Michael Steil's Ultimate Commodore Charset / PETSCII / Keyboard Reference](https://www.pagetable.com/232): ROM-derived glyphs sorted by screen code, inverse forms, and the distinction between PETSCII and screen codes. The linked interactive reference compares both C64 sets.

The regression suite uses an original synthetic asymmetric bitmap fixture to detect swapped banks, bit order, vertical orientation, and accidental double inversion. It does not bundle or authenticate a complete Commodore ROM. Full-ROM hash identification and a rights-cleared built-in default remain future work.

## Development and verification

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm test
```

Playwright covers desktop Chromium and iPad WebKit in landscape and portrait. Every test fails on uncaught application errors. Tests inspect downloaded file contents, numeric bytes, bitmap pixels, PNG dimensions/backgrounds, project compatibility, invalid input, persistence, symmetry, resizing, and undo/redo. Native Chromium touch dispatch verifies continuous dragging; WebKit uses real touchscreen taps plus synthetic sparse touch/pen pointer streams. Physical Apple Pencil and Safari gesture behavior still require a real iPad check.

`CHROMIUM_EXECUTABLE_PATH` optionally selects an existing local Chromium; normal development and CI use Playwright's bundled browsers. GitHub Actions installs from the committed lockfile using `npm ci`.

## Remaining limitations

- No physical iPad/Pencil hardware test is available in automated CI.
- The optional coarse stencil analysis supports legacy shapes only; ROM compositions receive an explicit unsupported message.
- SVG/PNG match artwork geometry and orientation; their export colors intentionally differ from the editor's dark editing theme.
- Text exported by the early experimental ROM version was an ambiguous unlabelled mixed string. It cannot be reliably auto-detected; use its JSON project as the migration path.
