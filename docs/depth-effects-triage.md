# Depth effects triage (floor, road, tunnel)

**Status:** Shipped in the Movement menu; this note records **export and adaptive C64** behavior on representative art so we can polish or defer without guessing.

## What to compare

| Profile | Grid | Art | Purpose |
| --- | --- | --- | --- |
| **Sparse** | 4×4 | Alternating glyph on ink checker | Motion visible with few painted cells; cheap GIF |
| **Dense** | 7×5 | Full-screen single glyph | Stresses per-frame remap diversity |

Run the matrix:

```sh
npx playwright test tests/depth-triage.spec.cjs --workers=1
```

Chromium attaches `depth-triage-report.json` (frame counts, C64 `renderer`, `fits`, `error`).

## Current findings (2026-11-17)

| Effect | Sparse GIF frames @ 2s | Dense GIF frames | C64 adaptive (sparse) | Notes |
| --- | ---: | ---: | --- | --- |
| **Perspective floor** | 48 | 48 | `generic` / paired-style replay | Floor row always reaches top band on dense export (`depth-surfaces.spec.cjs`) |
| **Curved road** | 48 | 48 | Same class as floor | Road band motion; symmetric tunnel test is separate |
| **Tunnel flight** | 48 | 48 | Same class as floor | Left/right mirror parity on narrow grid (`depth-surfaces.spec.cjs`) |

All three remain **sampled-frame** adaptive exports (no procedural shortcut). Timing/memory warnings on dense 40×24 combined art still follow the global capacity rules (`c64-capacity.spec.cjs`).

## Product decision (provisional)

- **Keep** all three: distinct motion language vs **Space warp**; regression coverage is strong.
- **Polish later:** on-device readability at default scale on iPad (road vs tunnel silhouette).
- **Do not** block menu on native procedural players unless a bounded table-driven design is written (`native-player-rewrite.md`).

## Related

- [animation-types-research.md](animation-types-research.md) — rank **A** depth review  
- [tests/depth-surfaces.spec.cjs](../tests/depth-surfaces.spec.cjs) — GIF/ZIP parity  
- [tests/depth-triage.spec.cjs](../tests/depth-triage.spec.cjs) — sparse vs dense + C64 analyze snapshot  