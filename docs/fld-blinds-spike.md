# FLD blinds spike (row gaps)

**Status:** Shipped in the Movement menu (2026-11-17) as **Row blinds (FLD-style)**.

## Behavior

`fld-blinds` keeps the project grid at **W × H** but vertically **stretches** artwork with blank rows between source rows. Per-row gap size follows `waveValue` along Y plus motion phase (Venetian-blind / FLD *stylization*, not hardware badlines).

Uses existing `waveShape`, `waveAmplitude` (max gap depth), and `waveLength` (row stagger).

## Native export

See [fld-blinds-native.md](fld-blinds-native.md). Movement menu entry shipped 2026-11-17.

## Tests

| Suite | Coverage |
| --- | --- |
| `tests/fld-blinds.unit.mjs` | Loop closure, validation, inserts blanks |
| `tests/fld-blinds.spec.cjs` | GIF/ZIP parity, persistence, C64 adaptive spot-check |

Loads via v3 JSON; `researchMotionEffect` handles export without a menu entry.