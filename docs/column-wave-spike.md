# Column-wave spike (DYCP-like)

**Status:** Shipped in the Movement menu (2026-11-17) as **Column wave (DYCP-style)**. C64 export still favors movement-only loops for procedural-v2 PRGs.

## Behavior

`column-wave` scrolls horizontally and applies an independent **per-column vertical sine offset** (classic DYCP-style motion on a coarse grid). Uses existing `waveShape`, `waveAmplitude`, `waveLength`, and `scrollDirection` (`left` / `right` only).

## Native export

See [column-wave-native.md](column-wave-native.md). UI ship remains blocked until dense-grid native margin or a procedural player profile is specified ([native player rewrite](native-player-rewrite.md)).

## Tests

| Suite | Coverage |
| --- | --- |
| `tests/column-wave.unit.mjs` | Loop closure, validation, ≠ `scroll-x` |
| `tests/column-wave.spec.cjs` | GIF/ZIP parity, reload, C64 adaptive spot-check (Chromium + iPad WebKit in CI) |

Research projects load via JSON; `index.html` keeps `researchMotionEffect` so exports use the saved effect without a menu option.