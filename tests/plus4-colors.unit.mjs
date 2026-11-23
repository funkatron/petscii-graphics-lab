import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLUS4_COLORS,
  PLUS4_COLOR_CYCLES,
  PLUS4_COLOR_EFFECTS,
  C64_COLOR_RAMPS,
  c64InkToTed,
  expandC64RampFillingTedGaps,
  fullTedPaletteRamp,
  isPlus4ColorEffect,
  tedIndex,
} from '../plus4-colors.js';
import {animationCells, animationCount} from '../animation-frames.js';
import {validateProject, COLOR_EFFECTS} from '../project-validation.js';

test('TED palette has black plus 120 chroma/luma colors', () => {
  assert.equal(PLUS4_COLORS.length, 121);
  assert.equal(PLUS4_COLORS[0][1], '#000000');
  assert.equal(tedIndex(0, 7), 0);
  assert.equal(tedIndex(1, 0), 1);
  assert.equal(tedIndex(15, 7), 120);
});

test('TED colors come from measured parameters: distinct, rising luma, no hue collapse', () => {
  const luma = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // The earlier unit-length Pb/Pr model clipped hues (purple L0–L5 were all #ff00ff).
  assert.equal(new Set(PLUS4_COLORS.slice(1).map(([, hex]) => hex)).size, 120, 'every chroma/luma pair is distinct');
  for (let chroma = 1; chroma <= 15; chroma++) {
    const ramp = Array.from({length: 8}, (_, l) => luma(PLUS4_COLORS[tedIndex(chroma, l)][1]));
    for (let l = 1; l < 8; l++) assert.ok(ramp[l] > ramp[l - 1], `${PLUS4_COLORS[tedIndex(chroma, l)][0]} brighter than L${l - 1}`);
  }
  // Anchors: grey ramp, dark level 0, measured hue angle (−9.5° phase).
  assert.equal(PLUS4_COLORS[tedIndex(1, 0)][1], '#202020');
  assert.equal(PLUS4_COLORS[tedIndex(1, 7)][1], '#ffffff');
  assert.equal(PLUS4_COLORS[tedIndex(2, 0)][1], '#520c06');
  assert.equal(PLUS4_COLORS[tedIndex(6, 3)][1], '#483ec1');
  assert.ok(luma(PLUS4_COLORS[tedIndex(4, 0)][1]) < 40, 'level 0 is dark, not saturated');
});

test('Plus/4 cycle uses the entire TED palette', () => {
  assert.deepEqual(PLUS4_COLOR_CYCLES['plus4-cycle'], fullTedPaletteRamp());
  assert.equal(PLUS4_COLOR_CYCLES['plus4-cycle'].length, 121);
  assert.equal(new Set(PLUS4_COLOR_CYCLES['plus4-cycle']).size, 121);
});

test('Plus/4 constrained effects expand C64 ramps with TED luma gap-fills', () => {
  const raster = PLUS4_COLOR_CYCLES['plus4-raster'];
  const wave = PLUS4_COLOR_CYCLES['plus4-wave'];
  assert.ok(raster.length > C64_COLOR_RAMPS['raster-bars'].length);
  assert.ok(wave.length > C64_COLOR_RAMPS['color-wave'].length);
  // Raster keeps the C64 bar chromas, with multiple TED lumas each.
  for (const ink of C64_COLOR_RAMPS['raster-bars']) {
    if (ink === 0) {
      assert.ok(raster.includes(0));
      continue;
    }
    assert.ok(
      raster.some((ted) => ted === tedIndex(ink, 0) || ted === tedIndex(ink, 4) || ted === tedIndex(ink, 7)),
      `missing TED gap-fill for C64 ink ${ink}`,
    );
  }
  const expanded = expandC64RampFillingTedGaps([6, 14], {lumas: [0, 4, 7]});
  assert.deepEqual(expanded, [tedIndex(6, 0), tedIndex(6, 4), tedIndex(6, 7), tedIndex(14, 0), tedIndex(14, 4), tedIndex(14, 7)]);
});

test('Plus/4 color effects are validated and detected', () => {
  for (const effect of PLUS4_COLOR_EFFECTS) {
    assert.equal(isPlus4ColorEffect(effect), true);
    assert.ok(COLOR_EFFECTS.includes(effect));
    // Backdrop reuses the Plus/4 cycle and glow ramps. It is not a cell-color cycle.
    if (effect === 'plus4-field') {
      assert.equal(PLUS4_COLOR_CYCLES[effect], undefined);
      continue;
    }
    assert.ok(PLUS4_COLOR_CYCLES[effect].length >= 6);
  }
  assert.equal(isPlus4ColorEffect('color-wave'), false);
});

test('Plus/4 plasma animation returns TED palette inks', () => {
  const source = {
    W: 4,
    H: 2,
    grid: [160, 160, 160, 160, 160, 160, 160, 160],
    inks: [2, 3, 4, 5, 6, 7, 8, 9],
    base: Array(8).fill(''),
    baseColors: Array(8).fill(14),
    events: [],
    eventColors: [],
    colors: {ink: 14, background: 6},
    effect: 'none',
    colorEffect: 'plus4-plasma',
    seconds: 2,
    scale: 1,
    background: 'dark',
    colorWaveDirection: 'up-left',
    colorWaveShape: 'sine',
    colorWaveAmplitude: 100,
    colorWaveLength: 50,
    motionCycles: 1,
    colorCycles: 1,
  };
  assert.equal(animationCount(source), PLUS4_COLOR_CYCLES['plus4-plasma'].length);
  const frame = animationCells(0, source);
  assert.equal(frame.colorPalette, 'ted-pal');
  assert.ok(frame.inks.every((ink) => Number.isInteger(ink) && ink >= 0 && ink < 121));
  assert.ok(frame.inks.some((ink) => ink > 15));
});

test('Plus/4 cycle projects validate', () => {
  validateProject({
    format: 'petscii-stencil-lab',
    version: 3,
    columns: 2,
    rows: 1,
    grid: [160, 160],
    cellColors: [2, 14],
    selectedGlyph: 160,
    colors: {ink: 14, background: 6},
    animation: {
      effect: 'none',
      colorEffect: 'plus4-cycle',
      seconds: 4,
      scale: 2,
      background: 'dark',
    },
  });
  assert.equal(c64InkToTed(14), tedIndex(14, 4));
});
