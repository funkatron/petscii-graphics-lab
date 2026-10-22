# Use your artwork on a Commodore 64

**Today:** the editor exports the character and color data for one still drawing.

**Proposed next step:** a **Download C64 program (.prg)** option that packages an animation with a small player. That option is not implemented yet.

Start with the first two sections to understand the downloads. The memory map and emulator example are optional technical steps.

## What is in the `.bin` files?

`.bin` means binary data. These files describe the picture; they do not contain instructions that a C64 can run.

| Download | Contents | Size |
| --- | --- | --- |
| **Screen codes (.bin)** | One character-selection number per cell | Columns × rows bytes |
| **Color RAM (.bin)** | One foreground color number, 0–15, per cell | Columns × rows bytes |

Both files list cells left to right, then top to bottom. Download both from the same version of your drawing.

For a 40×25 drawing, **each file is 1,000 bytes**. Empty cells use screen code 32. Their color entries are still included.

The files omit the character set, shared background, dimensions, animation, and playback timing. Keep an editable JSON project alongside them to retain that information.

**Renaming `.bin` to `.prg` will not make it runnable.** A program needs a load address and code that knows what to do with the data.

## What can you do with them now?

1. **Use them in your own C64 program.** A loader places the character and color values into the display’s memory.
2. **Inspect a still in an emulator.** The VICE monitor can load raw bytes at chosen addresses. A reference workflow appears below.
3. **Keep them as source data for a future player.** They are useful building blocks, although a complete animation needs more information.

For an image to share on a modern device, PNG is the simpler choice. For later editing in this lab, keep the JSON project.

## How a C64 displays these bytes

In its normal 40-column character mode, a C64 uses separate memory for the character numbers and their colors.

| Display data | Default address | What the loader writes |
| --- | --- | --- |
| Screen characters | `$0400` / decimal 1024 | 1,000 screen codes |
| Foreground colors | `$D800` / decimal 55296 | 1,000 color values, 0–15 |
| Shared background | `$D021` / decimal 53281 | One color value |

These locations are documented in Commodore’s [graphics memory description](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_101.html) and [background color register example](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_117.html).

The loader must also choose the matching character set. This uses the VIC-II video chip’s character-memory setting at `$D018`; see the [character memory table](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_104.html).

### Smaller or taller drawings

A C64 screen has 40 cells per row and 25 visible rows in this mode.

- A smaller drawing needs row-by-row placement into that screen. Its rows must not be treated as if they were already 40 cells wide.
- A drawing taller than 25 rows needs an explicit crop, scrolling, or another presentation choice.
- Legacy approximate shapes have no direct screen-code equivalent. The current screen-code download rejects them.

## Reference workflow: inspect a still in VICE

**Scope:** a fresh C64 emulator in its standard display configuration. These commands are checked against the VICE and Commodore manuals; this documentation change has not tested them in VICE or on physical hardware.

1. In the editor, set **Canvas setup** to **40 columns × 25 rows**, then **Apply size**.
2. Use authentic C64 glyphs and note the character set and background color number.
3. Download **Screen codes (.bin)** and **Color RAM (.bin)** from **Download artwork → C64 data**.
4. On the computer running VICE, give the files short local names: `screen.bin` and `colors.bin`.
5. Start a fresh C64 emulation and open its monitor. Change the monitor’s working directory to the folder containing those files.
6. Enter the commands below in the **VICE monitor**, not at the C64 BASIC prompt.

```text
radix H
bload "screen.bin" 0 0400
bload "colors.bin" 0 d800
> d018 15
> d021 06
x
```

Here `0` means the host computer’s files. `bload` reads raw data without discarding a two-byte load header. The example selects **uppercase/graphics** and background **Blue (6)**. For **lowercase/uppercase**, use `> d018 17` instead. Replace `06` with your background’s hexadecimal color index.

The monitor commands are documented in the [VICE monitor manual](https://vice-emu.sourceforge.io/vice_12.html), under File commands, Memory commands, and Monitor state commands. These instructions display a still; they do not create an animation player. Avoid typing into the emulated screen afterward, because BASIC can overwrite the picture.

For a physical C64, the bytes need a loader and a transfer method supported by your disk drive or storage device. A `.prg` export would make this easier by including the loader.

## Proposed feature: Download C64 program

The intended experience is:

1. Choose an effect, loop duration, and repeat behavior in the lab.
2. Choose **Download C64 program (.prg)**.
3. Load the program in an emulator or transfer it to a C64 and run it.

The exporter would include a small C64 player, artwork, cell colors, the selected character-set setting, background, and timing. It would use the C64’s own character ROM rather than bundle another copy.

This is an implementation proposal based on the editor’s data model and the C64 display model. It is not an available download option.

### Start with compact effects

| Effect | Suggested approach |
| --- | --- |
| Still drawing | Load screen/color data and set the character set and background |
| Drawing replay | Apply recorded cell and color changes in order |
| Color cycle / Rainbow wave / Warm glow | Keep character data and update cell colors using the existing ramps |
| Scrolling / Wave rows | Move screen codes and colors together |
| Inverse pulse | Change each occupied character’s screen code to its inverse slot |

Replay and color cycling are good first animation targets because their data can be compact. The proposed player would use machine code for regular updates. A BASIC loop that copies every cell would be a slower starting point.

### Why not export every frame unchanged?

A full 40×25 character frame plus its colors uses about **2,000 bytes** before timing or program code. Just 24 such frames would use about **48,000 bytes**.

The first implementation should therefore favor a stored picture plus effect settings or changed cells. It should calculate the actual memory budget and reject output that will not fit. Browser PNG frames are pictures for modern software, not C64 screen-code frames.

### What needs implementation and testing

- A loadable PRG with a BASIC start entry and a C64 player. A PRG begins with a two-byte load address; executable code must be included after it.
- Clear placement/crop rules for canvases that are not 40×25.
- Character-set selection, shared background, and per-cell foreground colors.
- Timings adapted to PAL and NTSC video standards, with any rounding reported. These machines refresh at different rates, so the player must account for both.
- A choice between continuous playback and a finite repeat count, plus a way to stop.
- Checks for program/data memory limits and unsupported legacy shapes.
- Emulator tests comparing displayed glyph codes, colors, frame order, and duration with the browser.
- Physical C64 testing, including transfer/loading and the machine’s character-ROM variant.

An optional **D64** disk image could later package the PRG for disk workflows. VICE’s [c1541 manual](https://vice-emu.sourceforge.io/vice_14.html) documents creating disk images and adding program files. Packaging a disk image does not remove the need for a player.

## Other Commodore models

The initial target should be a **C64**. Other Commodore models should have separate compatibility checks; matching the brand does not guarantee the same screen layout, character ROM, color system, or timing.

## Suggested implementation order

1. Export and verify a runnable still-picture PRG.
2. Add drawing replay and color cycling.
3. Add scroll, row wave, and inverse effects.
4. Verify finite loops, stop behavior, PAL/NTSC timing, and real hardware.
5. Add D64 packaging if it simplifies the chosen transfer workflow.
