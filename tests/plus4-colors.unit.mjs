import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLUS4_COLORS,
  PLUS4_COLOR_CYCLES,
  PLUS4_COLOR_EFFECTS,
  c64InkToTed,
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

test('Plus/4 color effects are validated and detected', () => {
  for (const effect of PLUS4_COLOR_EFFECTS) {
    assert.equal(isPlus4ColorEffect(effect), true);
    assert.ok(COLOR_EFFECTS.includes(effect));
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
    seconds: 1,
    scale: 1,
    background: 'dark',
    colorWaveDirection: 'up-left',
    colorWaveShape: 'sine',
    colorWaveAmplitude: 100,
    colorWaveLength: 50,
    motionCycles: 1,
    colorCycles: 1,
  };
  assert.equal(animationCount(source), 24);
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
      seconds: 2,
      scale: 2,
      background: 'dark',
    },
  });
  assert.equal(c64InkToTed(14), tedIndex(14, 4));
});
