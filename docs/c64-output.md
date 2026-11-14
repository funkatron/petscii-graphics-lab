# Run your artwork on a Commodore 64, 128, or Plus/4

Use **Download artwork → Native program** to create a runnable still or animation. Choose a direct PRG program or a D64 virtual floppy disk.

The **Machine** setting chooses the player:

| Machine | Load address | Mode | Notes |
| --- | --- | --- | --- |
| Commodore 64 | `$0801` | C64 BASIC 2 | Standard C64 / emulator autostart |
| Commodore 128 (40-col) | `$1C01` | **Native** C128 BASIC 7 | Use a **40-column** VIC display. Same VIC screen/color map as C64 |
| Commodore 128 (80-col) | `$1C01` | **Native** C128 BASIC 7 + VDC | Forces 80-col for playback; restores the **pre-RUN** 40/80 mode on RUN/STOP. RGBI attributes; no VIC-style border ink |
| Commodore Plus/4 | `$1001` | Plus/4 BASIC 3.5 | TED text mode; screen `$0C00`, attrs `$0800`; bg drives `$FF15` and border `$FF19` |

The program includes a small 6502 player (tiny BASIC `SYS` stub) and your character/color data.

- **C64 / C128 40-col:** bank-0 artwork uses the machine character ROM. Mixed-bank artwork embeds required patterns in a RAM character set.
- **C128 80-col:** paints VDC private RAM via `$D600`/`$D601`. Atlas reverse → attribute bit 6; alternate bank → bit 7. Mixed-bank artwork installs a padded 16-byte/glyph charset at VDC `$2000`. Background sets VDC register 26; VDC has no separate border ink like VIC `$D020`.
- **Plus/4:** uses **TED character ROM** with hardware reverse (`$FF07` bit7 clear). Mixed uppercase/lowercase embeds TED patterns in a RAM charset at `$F000`. Stay in character mode (do not enable GRAPHIC/bitmap).

## Download a program

1. Set **Machine** to C64, C128 (40-col), C128 (80-col), or Plus/4. Draw with that machine’s glyphs. Canvas max is **40 × 25** except C128 80-col (**80 × 25**).
2. For animation, open **☰ → Animation**. Choose **Movement / reveal**, **Color animation**, and **Loop duration**. Preview with **Play**.
3. Open **Download artwork → Native program**.
4. Under the host **program** control, choose **Still drawing** or **Selected animation**.
5. For animation, set **repetitions**. **0** repeats continuously. **1–100** plays that many complete loops, then holds the last frame.
6. Set **file format** to **Program (.prg)** or **Disk image (.d64)**, then use the Download button.

Smaller drawings and animations are **centered** on the host screen (40 × 25 VIC/TED, or 80 × 25 VDC). Placement uses whole character cells; an odd extra blank cell goes on the right or bottom. The entire canvas stays fixed throughout animation, including its empty cells. The rest of the screen is blank. On VIC and TED, the canvas background also becomes the border color (`$D020` / `$FF19`). On VDC 80-col there is no separate border ink—only the shared background.

Image resolution and export-background choices do not affect native program output. Programs always use character cells, per-cell ink, and the canvas background.

## Load and run it

### In VICE

1. Start the matching emulator: **x64sc** (C64), **x128** (C128 40-col or `x128 -80col` for 80-col), or **xplus4** (Plus/4). Prefer VICE ≥ 3.7 for VDC work; assert the **VDC** window for 80-col, not VIC `$0400`.
2. Use **File → Autostart disk/tape image** and select the downloaded `.prg` or `.d64`. Menu wording may vary by VICE interface.
3. If it loads without starting, type `RUN` and press Return.
4. Press the emulated **RUN/STOP** key to exit. The player clears the picture and returns to BASIC. For C128 80-col, exit restores the display mode that was active when RUN started (stay in 80-col if you started there; return to 40-col if you started there).

VICE’s [startup documentation](https://vice-emu.sourceforge.io/vice_4.html) describes autostart. Representative C64 PRG/D64 loading, still pictures, and composite playback have passed full PAL/NTSC VICE checks. See [the validation setup and limits](vice-validation.md). Plus/4 (`xplus4`) and C128 80-col (`x128 -80col`) smoke checks remain manual follow-ups.

### On physical hardware

Transfer the `.prg` using your storage device’s normal workflow. For a disk drive or compatible device using device number 8, a typical BASIC command is:

```basic
LOAD "PICTURE",8,1
RUN
```

Replace `PICTURE` with the filename as your device displays it. Device-specific menus and transfer tools can differ. Use a Plus/4 or C16 for Plus/4 programs; C64/C128 players are not interchangeable with TED.

### Use a D64 virtual disk

A D64 is a file representing a 1541 floppy disk. It contains one program, named **PICTURE** for a still or **ANIMATION** for an animation. It has the same player, colors, timing, repetitions, and memory limits as the PRG download.

1. Download **Disk image (.d64)**.
2. Attach or mount it as device 8 in an emulator or a storage device that supports D64 images.
3. Type `LOAD "*",8,1` and press Return. The asterisk selects the first program on the disk.
4. Type `RUN` and press Return.

A physical 1541 cannot read a D64 file directly: it needs a compatible tool to write the image to an actual floppy. Loading through VICE’s emulated 1541-II drive has passed; transfer to physical storage remains to be checked. This option packages one drawing; it does not add a multi-picture disk menu or stream animation from disk.

Start from ordinary C64 BASIC. The first player does not target cartridge environments, alternative KERNAL firmware, accelerators, or other Commodore models.

## Supported effects and limits

| Feature | Current behavior |
| --- | --- |
| Glyphs | Both authentic source sets together, including inverse slots and glyph ID 0 |
| Mixed-bank character limit | At most 256 distinct patterns across all frames, including a reserved blank; images/video are unrestricted |
| Colors | One foreground ink per cell and one shared background |
| Still drawing | Original artwork, held until RUN/STOP |
| Animation | Replay, scrolling, row/column waves, inverse, color effects, and their combinations |
| Repetitions | Continuous, or 1–100 loops followed by a held final frame |
| Canvas | 1–40 × 1–25 (VIC/TED) or 1–80 × 1–25 (C128 80-col), centered on screen |
| Larger/unsupported drawings | Export stops with an explanation; it never silently crops |
| Memory / speed | Export checks program size and estimated update work; simplify or slow the animation if rejected |

The editor uses authentic numeric C64 glyphs throughout. Animation cycle counts, directions, and waveform settings use the same sampled frames as modern outputs.

For ROM-backed animations, the exporter prefers a player that writes glyphs and colors together. It stores up to 256 distinct glyph-and-ink pairs as one-byte indexes and writes both planes in one pass. When the paired player is unavailable or exceeds either limit, the exporter tries its compact general player and compiled row routines. Stills use the general player. Readiness, PRG and D64 use the same checks and preserve frame count and loop duration. The two-second reference animation was manually checked in Poke on iPad, including RUN/STOP. Broader PAL/NTSC and physical-machine checks remain open.

The player stores the same **sampled frames** used by GIF, video, and frame ZIP, as character/color changes. It does not run a native mathematical implementation of each effect. Long replays may skip recorded steps, just as the other animation downloads do.

### Timing

The program uses the standard KERNAL clock, which counts **60 ticks per second**. Frame boundaries are rounded cumulatively to those ticks, keeping the loop duration balanced. Commodore documents the clock interval in its [TIME description](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_2/page_089.html).

The first picture loads before the loop clock starts. Later updates use paired glyph-and-color writes, general changed runs, or compiled row routines. A glyph used in three colors needs three dictionary entries. An animation that exceeds 256 pairs can still export if another player fits.

The readiness percentage asks: **can the player finish this screen update before the next frame is due?** It is independent of the memory check. A small program can still require too much processing per frame.

For each timed update, the exporter estimates its CPU cycles, including command/dispatch overhead and the writes it performs. It divides that estimate by the cycles available during that frame’s rounded clock interval, using the slower PAL CPU frequency of 985,248 Hz. The displayed percentage is the **worst individual update**, including the loop transition, rather than an average.

| Percentage | Meaning |
| --- | --- |
| 50% | Estimated drawing work takes half the available interval |
| 100% | Estimated work fills the interval |
| 120% | Estimated work exceeds the interval; explicit timing override is required |

For example, 192 samples over eight seconds average about 24 frames per second. The C64 clock schedules them in two- or three-tick intervals (about 33 or 50 ms); it does not require 60 pictures per second. Faster requested loops leave fewer cycles per update. Longer loops can ease that limit without reducing sample count.

When timing is the remaining blocker, the C64 panel offers **Download despite timing warning**. Check it to experiment at the requested speed. The warning remains visible and playback may run late or stutter. This bypasses only the timing estimate: program memory, dimensions, valid frames and glyph limits are still enforced. Consent applies to the current artwork and animation settings; changing them clears it. PRG and D64 share the same choice.

This is a software work estimate, not a direct measurement of the complete C64. It allows for player overhead but does not explicitly simulate video-chip bus contention or KERNAL interrupt delays. A pass is useful screening, followed by CPU-emulator checks and full-emulator or hardware testing; it does not promise tear-free display.

Repeated bytes use short repeat instructions. Scattered changes are packed together as literal bytes, so detailed pictures use less program memory and copy faster. Color literals can store two inks per byte, reducing animation size without changing frames or colors. The exporter uses this only when it saves space after accounting for the decoder. Identical frame-update instructions can also share storage while keeping each frame’s duration. The exporter includes that decoder only when it saves space. Literal and packed-color updates also use faster copy loops. You do not need to select a compression mode.

Updates are not synchronized with the video chip’s scan position, so tearing or small timing variations are possible. The processing check is an estimate, not a guarantee for every machine configuration. Representative PAL/NTSC interrupt timing and still-image video output have passed full VICE checks. Complex animations and physical machines still need further checks.

Full-screen performance checks also pass on PAL and NTSC. In the detailed test picture, copying a frame takes up to about 0.1 seconds. The animation keeps its overall timing, but part of the next picture can become visible before the copy finishes. Use smaller or simpler drawings for faster changes. See the [measured workloads and limits](vice-validation.md#full-screen-performance).

### Verification so far

Automated tests download the actual PRG and execute it with the independent **py65 6502 CPU emulator**. They check:

- BASIC start entry, screen-code values, character-set selection, colors, and 40-column row placement.
- Combined movement/color frames, repeated playback, held final frames, and clock-byte wrap.
- Timing at PAL and NTSC CPU speeds, with a simulated 60 Hz KERNAL clock.
- RUN/STOP exit, balanced stack, restored scratch/display state, and writes staying inside screen/color memory.
- Rejection of unsupported sizes, invalid screen codes, excessive memory, invalid repeats, and excessive update work.
- D64 directory, file-sector chains, allocation records, full/partial final sectors, and disk capacity. Tests extract the PRG independently, compare it byte for byte with the direct download, and execute the extracted program with py65.

The tests simulate the clock and documented KERNAL calls. **The py65 tests do not emulate the VIC-II/CIA chips, actual KERNAL ROM, disk loading, or a physical C64.** Mixed-bank RAM output is checked against independent SVG patterns in py65. A separate [full VICE suite](vice-validation.md) covers the earlier ROM-backed path: 16 scenarios passed across PAL/NTSC, with no skips. Those results do not validate the new RAM-backed display path or the current optimized literal, packed-color and shared-update decoders. Its STOP check injects the KERNAL scan result; full VICE checks for mixed-bank output, physical key handling and hardware testing remain open.

Centered placement has CPU/browser regression coverage, including blank margins and page crossings. The updated full VICE centering checks were not run in this runtime.

The D64 writer was also checked locally with **VICE c1541 3.7.1**: disk validation and file extraction passed for partial sectors, exact 254-byte sector boundaries, track-density changes, and a full 664-block data area. Extracted files matched their inputs byte for byte. This checks disk structure; it is not a full emulated-drive loading test.

## What is in the `.bin` files?

Open **Raw bytes & text** under **C64 data** for these separate data downloads.

`.bin` means binary data. These files describe one still picture; they do not contain runnable instructions.

| Download | Contents | Size |
| --- | --- | --- |
| **Glyph IDs (.bin)** | One two-byte little-endian atlas ID (0–511) per cell | Columns × rows × 2 bytes |
| **Color RAM (.bin)** | One foreground color number, 0–15, per cell | Columns × rows bytes |

Both list cells left to right, then top to bottom. A 40×25 drawing produces 2,000 glyph-ID bytes and 1,000 color bytes. Empty glyph cells use FFFF; their color entries remain included. IDs are source bank × 256 + screen code, not native screen-memory bytes.

The raw files omit dimensions, background, timing, and animation. Keep an editable JSON project with them. **Renaming `.bin` to `.prg` will not make it runnable.** Use the program download to map glyph IDs and build any required RAM character set.

## Display memory reference

A normal C64 screen has 40 cells per row and 25 rows. The player maps editor IDs to one-byte native screen slots, with a 40-byte destination stride.

| Display data | Default address | Contents |
| --- | --- | --- |
| Screen characters | `$0400` / 1024 | 1,000 screen codes |
| Foreground colors | `$D800` / 55296 | 1,000 four-bit color values |
| Background | `$D021` / 53281 | One shared color |
| Character selection | `$D018` / 53272 | `$15` uppercase/graphics; `$17` lowercase/uppercase, in VIC bank 0 |

Mixed-bank programs instead select VIC bank 3, screen memory `$C400`, character patterns `$C800`, and `$D018=$12`. The character set is built once from all sampled frames and stays fixed throughout playback. The exporter reserves one blank slot and refuses an over-limit animation instead of silently dropping shapes.

See Commodore’s [screen/color memory description](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_101.html), [character memory table](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_104.html), and [background example](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_117.html).

### Plus/4 TED display memory

| Display data | Address | Contents |
| --- | --- | --- |
| Screen characters | `$0C00` | 1,000 screen codes |
| Attributes | `$0800` | 1,000 chroma+luma bytes (`tedToAttr`) |
| Background / border | `$FF15` / `$FF19` | Same attr as canvas background |
| Char ROM / RAM | `$FF12` bit2, `$FF13` | ROM upper `$D000` / lower `$D400`, or RAM charset `$F000` |

Default text mode keeps `$FF07` bit7 clear so screen codes 128–255 are hardware-reversed. Mixed-bank exports install a 2 KB TED pattern table at `$F000`. Player scratch uses ZP `$D8+` and jiffy `$A5` (not C64 `$FB` / `$A2`).

### Raw data is not screen memory

Do not load the two-byte glyph-ID file directly into C64 screen memory. It needs decoding and pattern-to-slot mapping first. Use the PRG or D64 download for a ready-to-run picture; use raw IDs for your own conversion tools.

## Next steps

- Verify physical PAL/NTSC playback and RUN/STOP key handling; broaden complex-animation performance and tearing checks.
- Evaluate scan-synchronized updates and more compact native effect routines.
- Validate transfer to physical storage devices. Full emulated 1541-II loading has passed. The image layout follows the [VICE D64 specification](https://vice-emu.sourceforge.io/vice_17.html); the [c1541 utility](https://vice-emu.sourceforge.io/vice_14.html) can inspect or extract it.

Other Commodore models need separate players and compatibility checks.
