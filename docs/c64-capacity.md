# Full-screen combined-wave capacity

The existing player supports some 40 × 24 movement/color-wave pictures, but size alone cannot predict whether a picture will fit. Slowing a fixed-frame animation helps its timing budget; it does not reduce stored frame data.

These measurements establish a baseline for the next encoding changes. They do not expand the current limits or establish physical-hardware performance.

## Reproduce the measurements

```sh
npx playwright test tests/c64-capacity.spec.cjs --workers=1
```

Each browser attaches `c64-wave-capacity.json` to its Playwright result. The fixtures are deterministic and use the editor's actual frame sampling and exporter. There is no second implementation of wave math.

## Workloads and results

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

1. **Compress repeated frame content.** Compare reusable frame/delta blocks and repeated-cycle storage. Retain every shared sample and cumulative tick boundary; independent cycle rates can prevent whole-cycle reuse.
2. **Measure color-stream encoding.** Color data is at least half the detailed cases. Compare compact color-specific runs against the present literal/repeated encoding before adding a new decoder.
3. **Measure faster decoding.** This can improve the timing percentage, but cannot by itself make an oversized program fit. Preserve conservative work estimation and test its actual CPU cost.
4. **Evaluate procedural effects.** Native movement/color routines could avoid storing full deltas, but must reproduce browser rounding, wrapping, per-cell inks, directions and independent rates exactly. Treat approximation as a separate product decision.
5. **Validate promising candidates in full VICE.** Check ROM and RAM character paths, every completed frame, two-loop timing/drift, finite/continuous playback, RUN/STOP and machine-state restoration on PAL and NTSC. Physical hardware remains a later check.

Raster synchronization and staged updates can affect tearing and pacing; neither automatically reduces stored bytes. No decoder, memory boundary, sampling rate or output-acceptance rule changed in this baseline pass. Existing [VICE results](vice-validation.md#full-screen-performance) cover earlier workloads, not these new combined-wave fixtures.
