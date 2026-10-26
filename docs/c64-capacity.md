# Full-screen combined-wave capacity

The existing player supports some 40 × 24 movement/color-wave pictures, but size alone cannot predict whether a picture will fit. Slowing a fixed-frame animation helps its timing budget; it does not reduce stored frame data.

The original measurements below establish the baseline. The packed-color implementation described next expands the set of pictures that fit; it does not establish physical-hardware performance.

## Reproduce the measurements

```sh
npx playwright test tests/c64-capacity.spec.cjs --workers=1
```

Each browser attaches `c64-wave-capacity.json` to its Playwright result. The fixtures are deterministic and use the editor's actual frame sampling and exporter. There is no second implementation of wave math.

## Faster decoder — implemented

Ordinary literals now copy with indexed addressing and advance the source pointer once per run. Packed colors inline each input-byte read and the two nibble writes, avoiding three helper calls per pair. Repeated-value runs are unchanged. Stream contents, samples and timing remain the same; generated code grows by four bytes without packing, or ten bytes with packing.

The measured decoder-only CPU work for deterministic 40 × 25 two-state fixtures is:

| Update workload | Previous maximum cycles | Faster maximum cycles | Reduction |
| --- | ---: | ---: | ---: |
| Differing glyph bytes, unchanged inks | 48,639 | 19,277 | 60.4% |
| Packed color changes, unchanged glyphs | 54,333 | 34,301 | 36.9% |
| Combined glyph/color changes | 103,171 | 53,865 | 47.8% |
| Repeated glyph/color fills | 27,119 | 27,119 | Unchanged |

`tests/c64-decoder.spec.cjs` records frame-entry and completed-copy cycle counts in independent py65 execution, compares all 1,000 glyph and color cells, and checks two loops. It also checks literal lengths around 255-byte boundaries, small literals, packed odd tails and untouched cells. Earlier long-loop regressions still check ROM/RAM paths, references, register/stack restoration and PAL/NTSC CPU speeds. These cycle counts exclude KERNAL interrupt/chip stalls and are not full VICE or physical-hardware measurements.

The conservative work model is now 20 cycles per ordinary literal cell plus 220 per run, and 40 per packed-color cell plus 320 per run. Repeated runs, frame overhead and reference overhead retain their existing charges. Estimates still govern exporter acceptance; lowering them alone is not the optimization.

Latest full-screen results supersede the historical stage measurements below:

| Workload | Program bytes | Estimated budget at 2 s | At 4 s | At 8 s |
| --- | ---: | ---: | ---: | ---: |
| Sparse diagonals | 12,424 | 46.5% | 23.3% | 11.6% |
| Repeated two-glyph pattern | 32,486 | 99.0% | 49.5% | 24.7% |
| Detailed numeric-code pattern | 21,518 | 55.1% | 27.5% | 13.8% |
| Mixed-bank eight-glyph pattern | 21,630 | 55.1% | 27.5% | 13.8% |
| Detailed, four cycles (96 frames) | 22,279 | 277.1% | 138.5% | 55.4% |

The repeated-pattern two-second loop now passes both exporter and two-loop CPU checks. Its one-second version still needs a longer loop; the readiness panel offers the tested two-second remedy. The four-cycle example still rejects two/four seconds, but eight seconds now has more estimated headroom; twelve seconds uses about 38.7% of the worst-frame budget.

The optional packed decoder is now 51 bytes and is still omitted when its stream savings do not exceed its code cost. Shared calls remain 41 bytes. Timing-based fallback selection still uses actual compiled sizes, with a new 40 × 4 fast-animation regression preserving viable unshared output.

## Shared update blocks — earlier baseline

The exporter can now store an identical sequence of frame-update instructions once and call it from multiple frames. It compares exact encoded instructions, including destination addresses, rather than just comparing visible pictures. Each frame retains its own duration. Shared blocks contain no further calls, so stack nesting is bounded to one level.

The four-cycle 40 × 24 workload falls from **80,257 to 22,269 program bytes**, a further **72.3% reduction** after color packing. It uses 24 shared blocks and 96 references, while preserving all 96 sampled frames. Including the original uncompressed-color baseline, it falls from 107,234 to 22,269 bytes.

| Four-cycle loop duration | Memory | Estimated timing | Exporter result |
| --- | --- | --- | --- |
| 2 seconds | Fits | About 500% of budget | Rejected for timing |
| 4 seconds | Fits | About 250% | Rejected for timing |
| 8 seconds | Fits | Just below 100% | Accepted, little estimated headroom |
| 12 seconds | Fits | About 67% | Accepted |

The eight-second result is **99.995%** of the conservative estimate; a displayed rounded 100% is not an additional margin or a hardware guarantee. CPU regressions execute all 96 samples twice at PAL/NTSC CPU speeds, checking every screen/color cell, cumulative decoder start times and copies within each frame budget. Smaller regressions cover unequal holds, independent movement/color rates, finite and continuous loops, ROM/RAM characters, stack restoration and the size threshold. A D64 regression independently extracts and executes the same shared-block player.

The other four one-cycle workloads have no profitable exact update repetition and retain their packed-color sizes. Sharing adds a 41-byte call/return routine only when net stream savings exceed that cost. Each reference is charged an additional conservative 300 CPU cycles in the readiness estimate. If sharing exceeds the timing estimate while the unshared program fits both timing and memory, keep that viable unshared program. Both analysis and download use the same selection. Shared calls, block terminators and frame timing count toward framing bytes; screen/color/character counts reflect stored unique data.

This is exact instruction reuse, not procedural approximation or reduced sampling. Full VICE and physical-hardware validation of the shared decoder remain open.

## Packed colors — earlier baseline

C64 inks need four bits each. The exporter now packs two inks per byte in color literal runs, with the low nibble first. It retains ordinary repeat instructions and emits the extra decoder only when the total stream saving exceeds its 45-byte code cost. Small exports retain the original encoding.

The same 20-case matrix now reports:

| Picture | Original program bytes | Packed program bytes | Result |
| --- | ---: | ---: | --- |
| Sparse crossing diagonals | 18,253 | 12,414 | Fits at all four durations |
| Repeated two-glyph pattern | 39,542 | 32,476 | Now fits at 4, 8 and 12 seconds; 2 seconds still exceeds timing |
| Detailed numeric-code pattern | 28,574 | 21,508 | Fits at all four durations |
| Mixed-bank eight-glyph pattern | 28,686 | 21,620 | Fits at all four durations |
| Detailed pattern, four cycles | 107,234 | 80,257 | Packed colors alone remain over memory; shared blocks above resolve this |

The formerly oversized repeated pattern shrinks by **7,066 bytes (17.9%)**, without changing any sample, ink or duration. Its color stream falls from 15,056 to 7,945 bytes. The optional decoder grows from 384 to 429 bytes. Its estimated timing use is 116.5% at two seconds and 58.2% at four seconds. The detailed and mixed-bank two-second cases remain close to the timing limit at 99.6%.

CPU regressions execute packed odd/even runs, 255-cell runs, page crossings, unchanged gaps, both ROM/RAM display paths, clock wrap and loop transitions. A full-screen regression runs the newly accepted four-second animation through two loops at PAL/NTSC CPU speeds, checking all screen/color cells and decoder start/completion times. The simulator uses stubbed KERNAL calls and clock ticks. These checks do not substitute for full VICE or physical-hardware validation of the new decoder.

## Original workloads and results

All pictures use 40 × 24 cells, an upward sine movement wave and an up-left sawtooth color wave. Initial inks repeat the eight-color rainbow ramp across both axes. Test loop durations are 2, 4, 8 and 12 seconds. The first four cases sample 24 frames with one movement and one color cycle; the last samples 96 frames with four cycles of each.

Measured in Chromium on 25 October 2026:

| Picture | Program bytes | Timing budget at 2 s | Timing budget at 4 s | Exporter acceptance |
| --- | ---: | ---: | ---: | --- |
| Sparse crossing diagonals | 18,253 | 61% | 30% | All four durations |
| Repeated two-glyph pattern | 39,542 | 116% | 58% | None: memory; also timing at 2 s |
| Detailed numeric-code pattern | 28,574 | 99% | 50% | All four durations |
| Mixed-bank eight-glyph pattern | 28,686 | 99% | 50% | All four durations |
| Detailed pattern, four cycles | 107,234 | 495% | 248% | None: memory; also timing at 2/4 s |

Program sizes exclude the two-byte PRG load address. The memory limit is **38,911 bytes**. Timing percentages are the existing conservative PAL CPU estimate for the worst update, including the loop transition; values below 100% mean only that the exporter accepts that estimate. The detailed cases have little predicted headroom at two seconds.

The four-cycle case falls to 99% at eight seconds and 66% at twelve seconds, but remains over memory. Within each workload, every tested duration has exactly the same program size. The repeated pattern needs 631 fewer bytes to reach the existing memory limit.

“Detailed” describes the fixture, not a universal ordering of complexity. A repeating motif can change more adjacent cells between samples than a picture with many glyphs, producing larger deltas.

## Where the bytes go

Counts include initial setup and the final-to-first transition. “Framing” includes durations, terminators and the stream redirect. The player itself occupies 384 bytes in each case.

| Picture | Screen stream | Color stream | Character setup | Framing |
| --- | ---: | ---: | ---: | ---: |
| Sparse | 3,670 | 14,093 | 0 | 106 |
| Repeated | 23,996 | 15,056 | 0 | 106 |
| Detailed | 13,028 | 15,056 | 0 | 106 |
| Mixed-bank | 13,028 | 15,056 | 112 | 106 |
| Detailed, four cycles | 49,172 | 57,284 | 0 | 394 |

The mixed-bank fixture needs only a small number of unique RAM patterns, so its 256-pattern capacity is a separate issue from the frame-stream limits. Its compact character setup is the compressed initialization stream, not the size of the 2 KB character RAM area.

## Next implementation experiments

1. **Extend shared update blocks.** Exact complete update-body reuse is implemented. Compare reuse of individual screen/color blocks where complete updates differ. Retain every sample and cumulative tick boundary; independent cycle rates can prevent whole-cycle reuse.
2. **Extend color-stream compression.** Packed color literals and exact complete update-body reuse are implemented. Compare reusable color-only blocks next for pictures without identical complete updates.
3. **Measure faster decoding.** This can improve the timing percentage, but cannot by itself make an oversized program fit. Preserve conservative work estimation and test its actual CPU cost.
4. **Evaluate procedural effects.** Native movement/color routines could avoid storing full deltas, but must reproduce browser rounding, wrapping, per-cell inks, directions and independent rates exactly. Treat approximation as a separate product decision.
5. **Validate promising candidates in full VICE.** Check ROM and RAM character paths, every completed frame, two-loop timing/drift, finite/continuous playback, RUN/STOP and machine-state restoration on PAL and NTSC. Physical hardware remains a later check.

Raster synchronization and staged updates can affect tearing and pacing; neither automatically reduces stored bytes. The packed decoder retains the existing memory boundary and sampling rate. Its conservative work estimate includes the extra decoding overhead. Existing [VICE results](vice-validation.md#full-screen-performance) cover earlier workloads, not these new combined-wave fixtures.
