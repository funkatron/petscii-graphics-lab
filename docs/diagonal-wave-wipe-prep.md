# Diagonal wave / wipe — implementation prep (roadmap #1)

**Status:** Prep only — no Animation menu entry until owner approves spike and native path.

**Rank:** [animation-types-research.md](animation-types-research.md) places **diagonal wave** and **diagonal wipe patterns** in tier A/B after validation debt closes.

## Already shipped (do not duplicate)

| Feature | Location | Notes |
| --- | --- | --- |
| Diagonal **scroll** | `scroll` + eight directions | `tests/diagonal-scroll.spec.cjs` |
| Diagonal **wave direction** on row/column wave | `#waveDirection` | `tests/diagonal-wave.spec.cjs` |
| Diagonal **wipe direction** | `#scrollDirection` on wipe | Eight directions, corner-weighted ranks |

This prep covers **new ranking / phase behavior**, not re-adding direction options.

## Candidate A — Diagonal wave (movement)

**User-visible idea:** Color-wave-style **bands that run along a diagonal** across the whole grid, while glyphs may stay still or combine with existing movement.

**Technical sketch**

1. New movement id (proposal): `diagonal-wave` — distinct from `wave` (axis displacement) and from color `color-wave`.
2. Reuse `colorWaveDirection` diagonals for **phase gradient**; displacement is **along** the diagonal normal or along travel — pick one rule in spike and document in maintainer-reference.
3. `animationPlan`: sample budget `max(24, max(W,H))` per motion cycle; shared warning if loop timing tight.
4. **Native gate:** default to **sampled-frame player** (GIF ≡ PRG). Procedural C64 only if movement is scroll-like and passes `c64-capacity.md`; otherwise forbid procedural profile in export check UI.

**Spike acceptance**

- Unit: deterministic frames for 4×4 and 40×25 on `up-left` and `down-right`.
- Playwright: one GIF + one PRG byte fixture on 8×8 art.
- No v3 field additions until id and validation lists are final.

### Spike result (2026-11-27)

**Rule chosen: longitudinal.** **Wave** with a diagonal **Wave direction** already displaces cells *perpendicular* to travel (transverse). The spike adds the missing counterpart: cells sample *along* the travel diagonal, so artwork bunches and spreads as bands pass.

| Item | Spike |
| --- | --- |
| Id | `diagonal-wave` (`DIAGONAL_WAVE_EFFECT` in `project-validation.js`); **not** in `MOTION_EFFECTS`, so no menu entry and no project-file support |
| Direction | `waveDirection`, diagonals only; anything else falls back to `down-right` |
| Shift | `round(waveValue(shape, position − phase) × min(3, max(1, min(W, H) / 4)) × amplitude / 100)`, where `position = (dx·x/W + dy·y/H) / 2 × 50 / waveLength` |
| Sample | `(x − dx·shift, y − dy·shift)`, wrapped; source glyph and ink move together |
| Frames | `max(24, W, H)` per motion cycle; minimum 4 per cycle, like other wave-like effects |
| Tests | `tests/diagonal-wave-longitudinal.unit.mjs`: source pairs, along-travel sampling only, shift rule, band travel direction, loop closure, determinism, fallback |

**Owner review:** preview GIF of 40×25 colored columns, down-right, sine, 100 % amplitude (attached to the PR conversation).

**Not done until approved:** Movement menu entry, `MOTION_EFFECTS` / v3 validation, Playwright GIF and PRG byte fixtures, native player (sampled-frame by default), README and maintainer contract.

## Candidate B — Diagonal wipe patterns

**User-visible idea:** Reveal/hold/hide cycles where **rank** follows diagonal, checker, or blinds — orthogonal to direction picker.

**Technical sketch**

1. Extend `wipePattern` enum (today: `diagonal`, `checkerboard`, `blinds`) with at least one new pattern **or** document that `diagonal` + eight directions already satisfies “diagonal wipe” and close rank B as docs-only.
2. If new pattern: `animationCells` rank function must be **loop-closed** at sample count from `animationCount`.
3. Native: same sampled player; no new fields in ZIP timing beyond existing `wipePattern`.

**Spike acceptance**

- Extend `tests/diagonal-scroll.spec.cjs` wipe block or add `diagonal-wipe-pattern.spec.cjs` with frozen PNG for one pattern × one direction.

## Recommended order

1. **Spike Candidate A** in a branch (`animation-frames.js` + unit test only, feature behind `researchMotionEffect` or unpromoted id).
2. Owner review GIF + maintainer contract paragraph.
3. **Candidate B** only if A ships or is rejected with reason recorded here.

## Out of scope for first spike

- Star Wars crawl, orbital field, IRQ raster bars, FLI/DYCP hardware emulation.

## Links

- [diagonal-movement.md](diagonal-movement.md)
- [product gate](animation-types-research.md#product-gate--real-hardware)
- [native-player-rewrite.md](native-player-rewrite.md)