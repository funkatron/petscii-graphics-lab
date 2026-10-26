# Native row renderer

This prototype targets full-screen animations with repeated row patterns. It preserves the browser's complete sampled frames and timing. The editor tries it when the generic renderer exceeds timing or memory limits. It selects native rows only when that candidate fits both limits; otherwise the original blockers remain. Previously accepted generic exports retain identical bytes.

## What changed

The generic player interprets changed-run commands. The prototype instead compiles each unique row state into a short 6502 drawing routine, groups writes by value, and selects the correct routine from a frame table. It draws both glyph and color planes. No floating-point wave approximation or sample reduction is introduced.

A routine is shared only when its physical destination page and complete row values match. The canvas is centered within 40 × 25 cells; its origin is added before calculating each row’s physical page and offset. The Y register supplies the row's offset within that page, including rows crossing page boundaries. The X register holds the distinct-picture lookup index. Call operands are patched from low/high address tables before each row call; row kernels preserve X and Y. This uses writable program RAM and is not a reentrant renderer.

The existing player initializes all 1,000 cells and any RAM character set before starting its clock. A reserved update command, `[2,0,stateIndex]`, invokes the native renderer. Frame durations, the final-to-first transition, finite/continuous repeats, RUN/STOP polling and machine-state restoration retain the existing player structure.

## Original reference result, before picture lookup reuse

A private five-glyph 40 × 24 project requests four movement cycles and two color cycles in a two-second loop, sampled into 96 frames. Its original artwork is not included in the public repository.

| Measurement | Result |
| --- | --- |
| Program data, excluding two-byte PRG load address | 27,479 bytes / 38,911 available |
| Unique native row routines | 109 |
| Worst estimated timing-budget use | 86.7% |
| Maximum measured completed-copy work | 11,879 CPU cycles |
| Decoder-entry error versus cumulative deadlines | 0 ticks in both CPU models |

Independent py65 checks execute the extracted disk program continuously through more than two loops: 204 observed frames at PAL CPU speed and 203 at NTSC CPU speed before the test's stop time. Every observed glyph bitmap and cell color matches its original browser frame. Register/scratch state, sprite-pointer boundaries and stack balance pass the shared harness assertions.

The prototype disk holds one continuously looping program named `ANIMATION`. With the disk mounted as drive 8, load with `LOAD"ANIMATION",8,1`, then `RUN`. RUN/STOP exits.

## Eight-cycle reference and picture lookup reuse

A second private 40 × 24, five-glyph project runs eight movement cycles and eight downward color-wave cycles in an eight-second timeline. Its 192 sampled frames contain only 24 distinct complete glyph/color pictures. Reuse each distinct picture’s lookup column while retaining all original timed dispatches. No durations or samples are dropped or combined, and finite repetitions still count complete eight-second loops.

| Measurement | Before lookup reuse | After |
| --- | --- | --- |
| Program bytes, excluding PRG load address | 32,978 | 16,850 |
| Native code and table bytes | 29,931 | 13,803 |
| Distinct row routines | 84 | 84 |
| Worst estimated timing use | 42.3% | 42.3% |
| Timed samples / duration | 192 / 8 seconds | 192 / 8 seconds |

The optimized disk was independently extracted and executed continuously at both CPU speeds: 386 observed frames at PAL speed and 387 at NTSC speed through the stop time. Every checked glyph and ink matched the private source; maximum copy work was 11,511 cycles and decoder-entry drift was zero ticks. This CPU model does not include VIC-II/CIA/ROM behavior.

The 16,128-byte reduction comes entirely from lookup columns: 48 row calls × two address bytes × (192 − 24). Drawing work remains the same. The compact generic candidate is 13,930 bytes but exceeds its estimated timing budget at 121.1%, so adaptive export selects native rows.

Complete-state keys include glyphs and inks; empty glyphs normalize to the renderer’s blank slot. Sharing also works for nonadjacent repeats and unequal holds. Initial state remains index zero; loop transitions preserve their original duration. `diagnostics.nativeFrameStates` reports the number of lookup columns, separately from `frameCount`.

## API and constraints

```js
import {createC64RowProgram, createD64Disk} from './c64-export.js';
const program = createC64RowProgram(input);
const disk = createD64Disk(program.bytes, 'ANIMATION');
```

Use the existing exporter input schema: sampled frames, dimensions, colors, repetitions and runtime glyph bits for mixed-bank artwork. The prototype supports 2–256 sampled frames and the existing 40-column, 25-row geometry limit. Too many distinct row states can exceed memory; the ordinary call rejects memory or timing overflow. `analyze:true` reports diagnostics but must not be used to create a playback download that bypasses rejection.

`diagnostics.renderer` is `native-rows`; `nativeBytes` counts its row code and lookup tables, already included in `playerBytes`. Stream counts cover first-frame initialization and frame dispatch records. The total accounting still equals `programBytes`. The generic exporter retains `renderer: generic` and unchanged output bytes. `createC64AdaptiveProgram` shares candidate selection between readiness, longer-loop remedies and ordinary PRG/D64 downloads. Analysis and downloads select identical program bytes.

The work model includes 2,500 cycles of frame overhead, 32 per row dispatch, two per distinct value loaded and five per stored cell. It includes worst-case indexed table reads, but does not model VIC-II bus contention or real KERNAL interrupt latency.

## Validation and integration gate

`tests/c64-native.spec.cjs` uses generated artwork rather than the private reference drawing. It verifies all 96 samples twice at two seconds and both CPU speeds; ROM/RAM glyphs; small widths; full height; zero and empty cells; destination-page crossings; finite/continuous playback; byte accounting; analysis identity; input preservation; and memory/frame-count rejection. The ordinary browser/export regressions remain enabled.

The prototype passed **46 targeted Chromium tests** before integration. On October 26, 2026, the owner loaded the private reference D64 in Poke on iPad and reported correct playback and RUN/STOP return to BASIC. This is a manual check of that project; the emulator model and an exact timed run were not recorded. Full VICE checks with IRQ/chip behavior, VIC-II pixels and 1541 loading, followed by physical-hardware checks, are required before claiming equivalent hardware playback. VICE was unavailable in the current runtime; the attempted package setup failed before installation. The prototype is not raster synchronized and may show intermediate updates/tearing.

Follow-up: broaden full-machine PAL/NTSC coverage and measure physical-machine headroom. Preserve the exact two-second reference target and retain the generic path when the native candidate is unsuitable. Integration regressions exercise the ordinary Download action, compare PRG/D64 bytes with the selected candidate, execute the downloaded PRG at both CPU speeds, and preserve accepted generic output and rejection behavior.
