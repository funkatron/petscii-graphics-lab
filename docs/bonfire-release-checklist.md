# Bonfire release checklist

Bonfire movement and Bonfire colors are implemented in `bonfire.js` and wired through `animation-frames.js`. Use this gate before calling the effect stable on main.

## Automated (required)

Run locally or wait for CI on the branch:

```bash
npm ci
npm test -- tests/bonfire.spec.cjs tests/bonfire.unit.mjs --project=chromium
npm test -- tests/bonfire.spec.cjs --project=ipad-touch
npm test -- tests/bonfire.spec.cjs --project=ipad-portrait
node --test tests/bonfire.unit.mjs
```

| Check | Spec / module |
| --- | --- |
| Preview vs all GIF/ZIP frames | `bonfire.spec.cjs` (three movement/color combos) |
| Independent rates, empty grid, undo | `bonfire.spec.cjs` second test |
| Deterministic heat / frame math | `bonfire.unit.mjs` |

All nine CI shards must pass on merge (see `.github/workflows/ci.yml`).

## Visual (recommended)

1. Load a 7×5 or larger canvas with block glyphs (e.g. solid block 160).
2. **Movement:** Bonfire only → Play → confirm rising flame shape without editing source art.
3. **Color:** Bonfire colors only → warm tips and light cores on occupied cells.
4. **Combined:** Bonfire + Bonfire colors → motion and color cycles independent (e.g. 2× / 4×).
5. **Return to drawing** → original grid unchanged.

## C64 export (optional follow-up)

Representative animated Bonfire exports are not blocking merge unless playback limits regress. See [c64-output.md](c64-output.md) and `tests/c64-capacity.spec.cjs` when evaluating real-hardware fit.

## Roadmap link

When this checklist is satisfied on main, mark Bonfire validation items complete in [roadmap.md](roadmap.md).
