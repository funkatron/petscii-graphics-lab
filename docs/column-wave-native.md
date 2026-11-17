# Column-wave — native export notes

**Status:** Research (2026-11-16). **`column-wave` is not in the Movement menu.** Browser validation: [`tests/column-wave.spec.cjs`](../tests/column-wave.spec.cjs).

## What the browser exports today

The editor uses the **adaptive sampled-frame player** (`createC64AdaptiveProgram`) like other derived motions. Each animation sample is a full cell/ink snapshot; the encoder picks generic, row, or paired strategies from **actual** frame diffs.

## Fixture: 8 × 5, sparse columns, amplitude 50 %, 24 samples

Measured in CI/browser and reproducible with `createC64AdaptiveProgram({ analyze: true })` on the same frames as GIF export (see Playwright spot-check in `column-wave.spec.cjs`).

| Metric | Typical result |
| --- | --- |
| Frame count | `max(24, W)` → 24 |
| Adaptive fit | Passes memory and timing budgets on fixture (`fits: true`) |
| Renderer | `generic` or row strategy depending on diff pattern |

Recorded Node run (same fixture, 2026-11-16): `programBytes` 2371, `memoryLimit` 38911, `worstUpdateRatio` ~0.05, renderer `paired`, fits memory and timing on the 8×5 sparse grid.

## Worst-case cost model

Per frame, **every destination cell** can sample a different source address (horizontal scroll plus per-column bend). Upper bound: **W × H** glyph/ink writes per sample if the drawing is dense. Compare:

| Effect | Typical touched cells (dense 40×24) |
| --- | --- |
| `scroll-x` | Often approaches W × H when all cells painted |
| `column-wave` | Same worst case; bend increases **per-cell** remap diversity vs scroll |

Sparse art (checker columns) keeps many cells empty; native cost tracks **painted** cells × frames, not empty grid slots.

## 40 × 24 capacity matrix (2026-11-17)

Reproduce with the same fixtures as [`c64-capacity.spec.cjs`](../tests/c64-capacity.spec.cjs):

```sh
npx playwright test tests/research-motion-capacity.spec.cjs --workers=1
```

Playwright attaches `research-motion-capacity.json` (Chromium/WebKit use the real `capacityInput()` sampler).

| Finding | Detail |
| --- | --- |
| Sample count | `max(24, W)` → **40 frames** at 40 columns (unlike `wave` at 24) |
| Sparse @ 2 s (replay) | `generic` ~31k bytes, `worstUpdateRatio` > 1 without `motionSource` — **playback speed** |
| Sparse @ 2 s (procedural-v2) | With `motionSource`, adaptive export selects **`procedural-v2`** (~3.4k bytes, timing fits) via `c64-procedural-vic.js` |
| Sparse @ 12 s | Longer ticks still help replay timing; procedural timing estimate is already within budget at 2 s |
| `native-rows` fallback | Meets timing on sparse art but **~220k program bytes** — not selected when procedural-v2 fits |

**Download:** procedural analysis passes readiness checks, but PRG/D64 still require the v2 6502 runtime (download throws until codegen lands). Small canvases (8×5) continue to pass replay adaptive export.

Table encoding and round-trip: `tests/c64-procedural-vic.unit.mjs`.

## UI ship gate

Do **not** add a Movement menu entry until at least one of:

1. **Bounded native profile** is documented and tested (e.g. per-column offset table replayed in the [procedural player](native-player-rewrite.md), not 40 full-screen diffs on a 40×24 loop), **or**
2. Adaptive export is proven on **representative dense** 40×24 column-wave projects with margin under [`c64-capacity.md`](c64-capacity.md) (not only sparse 8×5).

Until then, `column-wave` remains a **validated research effect** loadable from v3 JSON only.

## Related

- [column-wave-spike.md](column-wave-spike.md) — behavior summary  
- [algorithmic-vic-feasibility.md](algorithmic-vic-feasibility.md) — DYCP / column-wave rating  