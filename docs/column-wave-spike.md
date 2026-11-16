# Column-wave spike (DYCP-like)

**Status:** Research spike (2026-11-16). **Not in the Movement menu.**

## Behavior

`column-wave` scrolls horizontally and applies an independent **per-column vertical sine offset** (classic DYCP-style motion on a coarse grid). Uses existing `waveShape`, `waveAmplitude`, `waveLength`, and `scrollDirection` (`left` / `right` only).

## Native export

Requires a [native player plan](native-player-rewrite.md) before any UI ship; worst case is full-screen updates each sample ([algorithmic VIC feasibility](algorithmic-vic-feasibility.md)).

## Tests

`tests/column-wave.unit.mjs` — loop closure, validation, and distinction from `scroll-x`.