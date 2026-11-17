# Column-wave spike (DYCP-like)

**Status:** Shipped in the Movement menu (2026-11-17) as **Column wave (DYCP-style)**. C64 export still favors movement-only loops for procedural-v2 PRGs.

## Behavior

`column-wave` scrolls horizontally and applies an independent **per-column vertical sine offset** (classic DYCP-style motion on a coarse grid). Uses existing `waveShape`, `waveAmplitude`, `waveLength`, and `scrollDirection` (`left` / `right` only).

## Native export

See [column-wave-native.md](column-wave-native.md). Movement menu entry shipped 2026-11-17; dense full-screen C64 exports may still need longer loops or sampled-frame fallback when color/backdrop layers are active.

## Tests

| Suite | Coverage |
| --- | --- |
| `tests/column-wave.unit.mjs` | Loop closure, validation, ≠ `scroll-x` |
| `tests/column-wave.spec.cjs` | GIF/ZIP parity, reload, C64 adaptive spot-check (Chromium + iPad WebKit in CI) |

Research projects load via JSON; `index.html` keeps `researchMotionEffect` so exports use the saved effect without a menu option.