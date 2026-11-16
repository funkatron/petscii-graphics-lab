import assert from 'node:assert/strict';
import test from 'node:test';
import {animationCells} from '../animation-frames.js';
import {backdropInkBrightness, paletteColors} from '../c64-colors.js';

function picture(overrides = {}) {
  return {
    W: 4,
    H: 1,
    grid: ['', '', '', ''],
    inks: [0, 0, 0, 0],
    colors: {ink: 1, background: 6},
    effect: 'none',
    colorEffect: 'none',
    backgroundEffect: 'field',
    fieldRamp: 'color-wave',
    seconds: 1,
    ...overrides,
  };
}

test('backdropInkBrightness is identity at 100%', () => {
  const table = paletteColors('pepto');
  for (let ink = 0; ink < 16; ink++) {
    assert.equal(backdropInkBrightness(ink, 100, table), ink);
  }
});

test('low backdrop brightness remaps paper inks toward darker palette entries', () => {
  const table = paletteColors('pepto');
  const yellow = 7;
  const dim = backdropInkBrightness(yellow, 10, table);
  assert.ok(dim !== yellow);
  assert.ok(dim === 0 || dim === 11 || dim === 13);
});

test('field brightness darkens matte and scalar background, not glyph inks', () => {
  const full = animationCells(0, picture({
    grid: [160, '', '', ''],
    inks: [3, 0, 0, 0],
    fieldBrightness: 100,
  }));
  const dim = animationCells(0, picture({
    grid: [160, '', '', ''],
    inks: [3, 0, 0, 0],
    fieldBrightness: 10,
  }));
  assert.deepEqual(full.inks, dim.inks);
  assert.notDeepEqual(full.backgroundMatte, dim.backgroundMatte);
  assert.notEqual(full.background, dim.background);
});

test('identical matte at default brightness when field is omitted', () => {
  const withDefault = animationCells(0, picture({fieldBrightness: 100}));
  const omitted = animationCells(0, picture({}));
  assert.deepEqual(withDefault.backgroundMatte, omitted.backgroundMatte);
});