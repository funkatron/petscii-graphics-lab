# Check the C64 player in VICE

Run this optional integration suite when changing the C64 player or disk writer. It starts a complete emulated C64 with its ROM, VIC-II video chip, CIA timers, and a 1541-II drive.

The ordinary browser tests still use py65 for faster CPU checks. This suite adds machine-level coverage; it is not part of the default browser CI job.

## Prepare the emulator

You need Node.js 22 or later and **VICE x64sc**. These checks passed with **VICE 3.7.1**, in console mode, without a desktop display.

Keep the emulator and ROM files outside this repository. Set up a VICE data directory containing these files:

| Relative path | Purpose |
| --- | --- |
| `C64/basic-901226-01.bin` | BASIC interpreter |
| `C64/kernal-901227-03.bin` | C64 operating-system routines |
| `C64/chargen-901225-01.bin` | Both character sets |
| `DRIVES/dos1541ii-251968-03.bin` | 1541-II disk-drive firmware |

Use an installed VICE data directory, including its keyboard maps and supporting files. The suite passes explicit ROM paths to the emulator and checks the character ROM fingerprint. It does not download or redistribute ROMs.

## Run the checks

From the repository directory, replace the two example paths and run:

```sh
VICE_EXECUTABLE=/path/to/x64sc \
VICE_DATA_DIR=/path/to/vice/data \
npm run test:vice
```

The paths must be absolute. Missing configuration fails with an explanation, rather than producing skipped tests. Tests run one at a time, bind the debugger only to localhost, and remove their temporary disk/program files afterward.

## What passed

**16 integration scenarios passed, with no skips**, covering PAL (`c64`) and NTSC models. The original eight exercise both character sets; eight more measure full-screen updates:

- Load PRGs through VICE autostart and D64s through hardware-level 1541-II emulation. Virtual-device shortcuts are disabled for disk loading. Compare loaded memory with the original program bytes.
- Display all 256 screen codes in each character set, including code 0 and inverse slots. Compare every artwork pixel from VIC-II output against the reference character ROM and contrasting foreground inks.
- Check all 1,000 screen and color cells, including blank space outside the artwork and the 40-byte row stride.
- Run a sampled movement/color combination for two finite loops or at least three continuous loops. Check every frame and its cumulative duration against the real KERNAL clock, including low-byte wrap.
- Hold the final frame after finite playback. Execute the real KERNAL STOP and clear-screen routines, restore display/scratch state, balance the SYS stack, and reach BASIC's `READY.` prompt.

Breakpoints observe completed frame copies; they do not replace the clock, interrupts, player instructions, or ROM routines. Test-only debug addresses are returned as host metadata and add no bytes to the generated program.

The stop check injects the KERNAL's RUN/STOP scan result at `$91`. It does **not** simulate a physical key or independently verify keyboard-matrix scanning. PRG autostart uses VICE's memory-injection mode; D64 tests use the emulated drive. Pixel checks use stable stills, not a claim that animated updates are free of tearing.

VICE 3.7's display response can omit four trailing border bytes and report the inner screen one raster line late. The test handles those two debugger-format details while requiring an exact match for every artwork pixel.

## Full-screen performance

The suite measures four 40×25 workloads on each machine model. Each plays two loops, checks all 1,000 glyphs and colors after every copy, measures decoder time with the real KERNAL clock, and checks cumulative frame deadlines and return to BASIC.

| Workload | Frame duration | Maximum copy time, PAL / NTSC | PRG size |
| --- | --- | --- | --- |
| Whole screen changes to one repeated glyph and color | 100 ms | 1 / 1 tick | 500 bytes |
| Every glyph and color changes to differing adjacent values | 8 ticks (about 133 ms) | 6 / 6 ticks | 6,500 bytes |
| One vertical stripe moves across a mostly unchanged screen | 50 ms | ≤1 / ≤1 tick | 2,112 bytes |
| Detailed full-screen changes with unequal holds | 500, 400, 450 ms | 6 / 6 ticks | 8,536 bytes |

One tick is 1/60 second. Measurements have one-tick granularity; a zero-tick result would not mean a free copy. The tests pause emulation at decoder entry and completion, so host debugger latency is excluded. They also verify that decoder entry and the final hold stay within one tick of cumulative deadlines. Initial decoding happens before the loop clock starts and is excluded from the update maximum.

Before literal runs were added, the two-picture fragmented workload took up to **18 PAL ticks / 17 NTSC ticks** per update and produced a **24,381-byte PRG**, at a 22-tick frame duration. The new player groups different adjacent bytes into literal runs; that sample now needs **6 ticks** and **6,500 bytes**, and passes at an 8-tick frame duration. The unequal-hold sample fell from 32,385 to 8,536 bytes. These are measured samples, not size or speed guarantees for every drawing.

### Raster timing decision

A six-tick copy lasts about 0.1 seconds and spans several video refreshes. Waiting for one preferred raster position before such a copy cannot make it atomic. Keep the existing player unsynchronized until a measured implementation can preserve PAL/NTSC deadlines, keep RUN/STOP responsive, and account for both screen memory and color RAM. Evaluate faster decoding, staged updates, or procedural native effects before promising tear-free full-screen playback.

These tests verify completed memory states and bounded timing, not intermediate animated pixels or absence of tearing. Still-image pixel checks remain separate.

## Reference ROM fingerprints

SHA-256 values for the local validation setup:

```text
basic-901226-01.bin
89878cea0a268734696de11c4bae593eaaa506465d2029d619c0e0cbccdfa62d

kernal-901227-03.bin
83c60d47047d7beab8e5b7bf6f67f80daa088b7a6a27de0d7e016f6484042721

chargen-901225-01.bin
fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420

dos1541ii-251968-03.bin
326c289c38753323d7e8167897447cf61ef35189d82eb8d75210ece949adda7c
```

## What remains

- Physical PAL/NTSC C64 playback, RUN/STOP key handling, and transfer to real storage devices.
- Broader performance and tearing checks with complex, high-change animations.
- Raster-synchronized updates and smaller procedural effect routines.

Protocol reference: [VICE binary monitor](https://vice-emu.sourceforge.io/vice_13.html). See [C64 output](c64-output.md) for ordinary loading instructions.
