# Validation debt status (roadmap #2 / phase 1b)

Tracks automated evidence for **shipped** effects called out in [animation-types-research.md](animation-types-research.md#recommended-sequence-research--build). This is not a substitute for physical iPad or C64 hardware checks.

## Spec matrix

| Area | Specs | What they prove |
| --- | --- | --- |
| Sine scroller | `tests/sine-scroll.spec.cjs`, `tests/sine-scroll.unit.mjs` | Diagonal travel/bend, persistence, GIF/ZIP/PRG/D64 bytes |
| Diagonal scroll / wave / wipe dirs | `tests/diagonal-scroll.spec.cjs`, `tests/diagonal-wave.spec.cjs` | Eight directions, loop closure, native exports |
| Bonfire | `tests/bonfire.spec.cjs`, `tests/bonfire.unit.mjs` | Movement + color combos, preview vs export pixels |
| Depth pacing | `tests/depth-preview-pacing.spec.cjs` | Live preview advances; artwork unchanged after stop |
| Depth geometry | `tests/depth-triage.spec.cjs`, `tests/depth-exports.spec.cjs` | Sparse/dense fixtures, export preservation |

## Commands (focused CI default)

```bash
node --test tests/sine-scroll.unit.mjs tests/bonfire.unit.mjs

npx playwright test tests/sine-scroll.spec.cjs tests/diagonal-scroll.spec.cjs \
  tests/bonfire.spec.cjs tests/depth-preview-pacing.spec.cjs --project=chromium

npx playwright test tests/bonfire.spec.cjs tests/depth-preview-pacing.spec.cjs \
  tests/sine-scroll.spec.cjs --project=ipad-touch

npx playwright test tests/bonfire.spec.cjs tests/depth-preview-pacing.spec.cjs \
  tests/sine-scroll.spec.cjs --project=ipad-portrait
```

Full export/native matrix remains opt-in (`ci: full` / workflow_dispatch).

## Last recorded run (cloud agent, 2026-11-20, America/Indianapolis)

| Command | Result |
| --- | --- |
| Chromium: sine-scroll + diagonal-scroll + bonfire + depth-preview-pacing | **36 passed** (~51 s) |
| iPad touch WebKit | Run in CI only (agent VM lacks Playwright WebKit system deps) |

## Still manual

- Finger reach / 200% text on physical iPad ([physical-device-checklist.md](physical-device-checklist.md)).
- Bonfire and depth **visual** quality on device ([bonfire-release-checklist.md](bonfire-release-checklist.md)).
- C64/PAL/NTSC VICE and hardware ([c64-output.md](c64-output.md), `npm run test:vice:hosts` when configured).

## Doc follow-ups

When this matrix is green on all three Playwright projects on `main`, treat sine scroller browser validation as **closed** in [diagonal-movement.md](diagonal-movement.md).