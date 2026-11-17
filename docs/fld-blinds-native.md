# FLD blinds — native export notes

**Status:** Research. **No Movement menu entry.**

## Browser behavior

Derived frames vary **which cells are empty** row-to-row as gaps open and close. Adaptive export encodes sampled full screens like other motion effects.

## Fixture: 8 × 6, alternating rows, amplitude 50 %, 24 frames

Node `createC64AdaptiveProgram({ analyze: true })` on the same frames as GIF export (see `fld-blinds.spec.cjs`):

Typical sparse checker rows: fits memory and timing (`fits: true`); renderer usually `generic` or `paired` with modest `worstUpdateRatio`.

Dense full-screen art approaches **W × H** painted cells per frame when gaps are small — same worst-case class as column-wave.

## 40 × 24 capacity matrix (2026-11-17)

```sh
npx playwright test tests/research-motion-capacity.spec.cjs --workers=1
```

Uses the shared [`c64-capacity-fixtures.cjs`](../tests/c64-capacity-fixtures.cjs) profiles; result attachment `research-motion-capacity.json`.

| Finding | Detail |
| --- | --- |
| Sample count | **24 frames** (same family as `wave`, independent of width) |
| Sparse checker @ 2 s | Adaptive export **fits** memory and timing (CI assertion in `research-motion-capacity.spec.cjs`) |
| Dense / mixed-bank | Treat like other full-screen motions: watch `worstUpdateRatio` and custom `glyphBits` paths in the JSON matrix |

## Procedural-v2 PRG

C64 downloads with `motionSource` use the **fld-blinds gap table player** (`c64-procedural-codegen.js`) when adaptive export picks `procedural-v2`. Spot-check: [`tests/c64-procedural-playback.spec.cjs`](../tests/c64-procedural-playback.spec.cjs) (8×6 sparse, frame 6).

## UI ship gate

Do not expose in the Movement menu until:

1. A **procedural row-gap player** or bounded gap table is specified ([native player rewrite](native-player-rewrite.md)), **and**
2. Dense **40 × 24** fixtures pass [`c64-capacity.md`](c64-capacity.md) with margin.

## Related

- [algorithmic-vic-feasibility.md](algorithmic-vic-feasibility.md) — FLD row section  
- [fld-blinds-spike.md](fld-blinds-spike.md)