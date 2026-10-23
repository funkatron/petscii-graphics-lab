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

**Eight integration scenarios passed, with no skips**, covering PAL (`c64`) and NTSC models with both character sets:

- Load PRGs through VICE autostart and D64s through hardware-level 1541-II emulation. Virtual-device shortcuts are disabled for disk loading. Compare loaded memory with the original program bytes.
- Display all 256 screen codes in each character set, including code 0 and inverse slots. Compare every artwork pixel from VIC-II output against the reference character ROM and contrasting foreground inks.
- Check all 1,000 screen and color cells, including blank space outside the artwork and the 40-byte row stride.
- Run a sampled movement/color combination for two finite loops or at least three continuous loops. Check every frame and its cumulative duration against the real KERNAL clock, including low-byte wrap.
- Hold the final frame after finite playback. Execute the real KERNAL STOP and clear-screen routines, restore display/scratch state, balance the SYS stack, and reach BASIC's `READY.` prompt.

Breakpoints observe completed frame copies; they do not replace the clock, interrupts, player instructions, or ROM routines. Test-only debug addresses are returned as host metadata and add no bytes to the generated program.

The stop check injects the KERNAL's RUN/STOP scan result at `$91`. It does **not** simulate a physical key or independently verify keyboard-matrix scanning. PRG autostart uses VICE's memory-injection mode; D64 tests use the emulated drive. Pixel checks use stable stills, not a claim that animated updates are free of tearing.

VICE 3.7's display response can omit four trailing border bytes and report the inner screen one raster line late. The test handles those two debugger-format details while requiring an exact match for every artwork pixel.

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
