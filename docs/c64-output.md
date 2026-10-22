# Run your artwork on a Commodore 64

Use **Download artwork → C64 data** to create a runnable still or animation. Choose a direct PRG program or a D64 virtual floppy disk.

The program includes a small player and your character/color data. It uses the C64’s own character ROM; it does not include another copy of that ROM.

## Download a program

1. Draw with authentic C64 glyphs on a canvas no larger than **40 columns × 25 rows**.
2. For animation, open **☰ → Animation**. Choose **Movement / reveal**, **Color animation**, and **Loop duration**. Preview with **Play**.
3. Open **Download artwork → C64 data**.
4. Under **C64 program**, choose **Still drawing** or **Selected animation**.
5. For animation, set **C64 repetitions**. **0** repeats continuously. **1–100** plays that many complete loops, then holds the last frame.
6. Set **C64 file format** to **Program (.prg)** or **Disk image (.d64)**, then use the Download button.

Smaller drawings appear at the **top left** of the C64 screen. The rest of the screen is blank. The canvas background also becomes the C64 border color.

Image resolution and export-background choices do not affect C64 output. A C64 program always uses character cells, per-cell ink, and the canvas background.

## Load and run it

### In VICE

1. Start a standard C64 emulation.
2. Use **File → Autostart disk/tape image** and select the downloaded `.prg` or `.d64`. Menu wording may vary by VICE interface.
3. If it loads without starting, type `RUN` and press Return.
4. Press the emulated **RUN/STOP** key to exit. The player clears the picture and returns to BASIC.

VICE’s [startup documentation](https://vice-emu.sourceforge.io/vice_4.html) describes autostart. Full VICE testing of this exporter remains a follow-up; the current automated tests execute its machine code in a CPU emulator.

### On a physical C64

Transfer the `.prg` using your storage device’s normal workflow. For a disk drive or compatible device using device number 8, a typical BASIC command is:

```basic
LOAD "PICTURE",8,1
RUN
```

Replace `PICTURE` with the filename as your device displays it. Device-specific menus and transfer tools can differ.

### Use a D64 virtual disk

A D64 is a file representing a 1541 floppy disk. It contains one program, named **PICTURE** for a still or **ANIMATION** for an animation. It has the same player, colors, timing, repetitions, and memory limits as the PRG download.

1. Download **Disk image (.d64)**.
2. Attach or mount it as device 8 in an emulator or a storage device that supports D64 images.
3. Type `LOAD "*",8,1` and press Return. The asterisk selects the first program on the disk.
4. Type `RUN` and press Return.

A physical 1541 cannot read a D64 file directly: it needs a compatible tool to write the image to an actual floppy. Hardware transfer and full-machine loading tests remain to be done. This option packages one drawing; it does not add a multi-picture disk menu or stream animation from disk.

Start from ordinary C64 BASIC. The first player does not target cartridge environments, alternative KERNAL firmware, accelerators, or other Commodore models.

## Supported effects and limits

| Feature | Current behavior |
| --- | --- |
| Glyphs | Both authentic character sets, including inverse slots and screen code 0 |
| Colors | One foreground ink per cell and one shared background |
| Still drawing | Original artwork, held until RUN/STOP |
| Animation | Replay, scrolling, row/column waves, inverse, color effects, and their combinations |
| Repetitions | Continuous, or 1–100 loops followed by a held final frame |
| Canvas | 1–40 columns and 1–25 rows, placed at the top left |
| Larger/unsupported drawings | Export stops with an explanation; it never silently crops |
| Memory / speed | Export checks program size and estimated update work; simplify or slow the animation if rejected |

The editor uses authentic numeric C64 glyphs throughout. Animation cycle counts, directions, and waveform settings use the same sampled frames as modern outputs.

The player stores the same **sampled frames** used by GIF, video, and frame ZIP, as character/color changes. It does not run a native mathematical implementation of each effect. Long replays may skip recorded steps, just as the other animation downloads do.

### Timing

The program uses the standard KERNAL clock, which counts **60 ticks per second**. Frame boundaries are rounded cumulatively to those ticks, keeping the loop duration balanced. Commodore documents the clock interval in its [TIME description](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_2/page_089.html).

The first picture is loaded before the loop clock starts. Later updates use changed runs rather than rewriting the entire screen.

Updates are not synchronized with the video chip’s scan position, so tearing or small timing variations are possible. The processing check is an estimate, not a guarantee for every machine configuration. PAL/NTSC interrupt and video behavior still need full-machine and physical checks.

### Verification so far

Automated tests download the actual PRG and execute it with the independent **py65 6502 CPU emulator**. They check:

- BASIC start entry, screen-code values, character-set selection, colors, and 40-column row placement.
- Combined movement/color frames, repeated playback, held final frames, and clock-byte wrap.
- Timing at PAL and NTSC CPU speeds, with a simulated 60 Hz KERNAL clock.
- RUN/STOP exit, balanced stack, restored scratch/display state, and writes staying inside screen/color memory.
- Rejection of unsupported sizes, invalid screen codes, excessive memory, invalid repeats, and excessive update work.
- D64 directory, file-sector chains, allocation records, full/partial final sectors, and disk capacity. Tests extract the PRG independently, compare it byte for byte with the direct download, and execute the extracted program with py65.

The tests simulate the clock and documented KERNAL calls. **They do not emulate the VIC-II/CIA chips, actual KERNAL ROM, disk loading, or a physical C64.** Full VICE and real hardware testing remain open work.

The D64 writer was also checked locally with **VICE c1541 3.7.1**: disk validation and file extraction passed for partial sectors, exact 254-byte sector boundaries, track-density changes, and a full 664-block data area. Extracted files matched their inputs byte for byte. This checks disk structure; it is not a full emulated-drive loading test.

## What is in the `.bin` files?

Open **Raw bytes & text** under **C64 data** for these separate data downloads.

`.bin` means binary data. These files describe one still picture; they do not contain runnable instructions.

| Download | Contents | Size |
| --- | --- | --- |
| **Screen codes (.bin)** | One character-selection number per cell | Columns × rows bytes |
| **Color RAM (.bin)** | One foreground color number, 0–15, per cell | Columns × rows bytes |

Both list cells left to right, then top to bottom. A 40×25 drawing produces two files of 1,000 bytes each. Empty cells use screen code 32; their color entries remain included.

The raw files omit dimensions, character set, background, timing, and animation. Keep an editable JSON project with them. **Renaming `.bin` to `.prg` will not make it runnable.** Use the program download for that.

## Display memory reference

A normal C64 screen has 40 cells per row and 25 rows. Smaller raw grids need row-by-row placement with a 40-byte destination stride.

| Display data | Default address | Contents |
| --- | --- | --- |
| Screen characters | `$0400` / 1024 | 1,000 screen codes |
| Foreground colors | `$D800` / 55296 | 1,000 four-bit color values |
| Background | `$D021` / 53281 | One shared color |
| Character selection | `$D018` / 53272 | `$15` uppercase/graphics; `$17` lowercase/uppercase, in VIC bank 0 |

See Commodore’s [screen/color memory description](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_101.html), [character memory table](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_104.html), and [background example](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_117.html).

### Inspect raw data with the VICE monitor

For a fresh standard C64 emulation and a **40×25** drawing, download both raw files and rename them locally to `screen.bin` and `colors.bin`. Open the VICE monitor and change its working directory to that folder. Enter these monitor commands:

```text
radix H
bload "screen.bin" 0 0400
bload "colors.bin" 0 d800
> d018 15
> d021 06
x
```

`0` selects the host computer’s files. `bload` reads raw data without discarding a two-byte load header. This example uses uppercase/graphics and Blue (6). For lowercase/uppercase, use `> d018 17`; replace `06` with your background’s hexadecimal color index.

These commands follow the [VICE monitor manual](https://vice-emu.sourceforge.io/vice_12.html). They have not been executed as part of this exporter’s CPU tests. Avoid typing into the emulated screen afterward; BASIC can overwrite the picture.

## Next steps

- Verify loading, video output, timing, and stopping in full VICE emulation and on physical PAL/NTSC C64s.
- Evaluate scan-synchronized updates and more compact native effect routines.
- Validate D64 loading with a full emulated drive and physical storage devices. The image layout follows the [VICE D64 specification](https://vice-emu.sourceforge.io/vice_17.html); the [c1541 utility](https://vice-emu.sourceforge.io/vice_14.html) can inspect or extract it.

Other Commodore models need separate players and compatibility checks.
