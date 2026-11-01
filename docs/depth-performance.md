# Depth projection performance baseline

Run `node scripts/benchmark-depth.mjs` from the repository root to produce JSON. This diagnostic has no timing pass/fail gate.

## Scope

Measure pure geometry on 40 × 25 artwork: empty, sparse, dense mixed-bank and asymmetric fixtures; both travel directions; all five travel waveforms. Height is fixed at 100% and wavelength at 50%. Each of 160 cases warms up for 96 frames, then records 480 frames across ten complete motion cycles. Check frame dimensions and unchanged source settings outside timed sections. A checksum consumes projected glyph values.

This baseline excludes color calculation, glyph rasterization, DOM/layout, export encoding and device performance. It cannot establish an iPad frame budget or justify increasing sampling limits. Height/wavelength extremes and browser rendering remain follow-ups.

## Recorded local result

Node v24.22.1, linux x64, AMD EPYC 9V74 80-Core Processor. Full results and kernel hashes are in [the baseline JSON](depth-performance-baseline.json). These numbers describe one run on a shared development host.

| Effect | Largest case median (ms) | Largest case p95 (ms) | Largest single sample (ms) |
| --- | ---: | ---: | ---: |
| space-warp | 0.1711 | 0.6888 | 2.39 |
| perspective-floor | 0.0538 | 0.101 | 1.298 |
| curved-road | 0.0414 | 0.0641 | 0.626 |
| tunnel-flight | 0.0779 | 0.1314 | 2.3604 |

Across these workloads, pure projection p95 stays below 0.7 ms on this host. Individual outliers are retained; no timing threshold or sampling change follows from this measurement.

## Next checks

- Measure full preview frame time in Chromium and both iPad WebKit layouts, then on a physical iPad.
- Include color effects, glyph rendering, both height/wavelength extremes and high cycle rates.
- Review depth readability, clipping and stepping before adding Orbital field or more depth controls.
