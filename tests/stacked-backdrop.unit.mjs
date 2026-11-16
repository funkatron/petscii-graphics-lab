import {test} from 'node:test';
import assert from 'node:assert/strict';
import {animationCells} from '../animation-frames.js';

const wave = [2, 8, 7, 13, 3, 14, 6, 4];

function picture(extra) {
  return {
    W: 2,
    H: 1,
    grid: [160, ''],
    inks: [1, 0],
    colors: {ink: 1, background: 6},
    effect: 'none',
    colorEffect: 'color-wave',
    backgroundEffect: 'field',
    fieldRamp: 'cycle',
    fieldDirection: 'forward',
    fieldLead: 0,
    seconds: 1,
    scale: 1,
    background: 'dark',
    motionCycles: 1,
    colorCycles: 1,
    backgroundCycles: 1,
    colorWaveShape: 'sawtooth',
    colorWaveDirection: 'up-left',
    colorWaveLength: 50,
    colorWaveAmplitude: 100,
    ...extra,
  };
}

test('cell color and backdrop animate independently', () => {
  const source = picture();
  const start = animationCells(0, source);
  const inkChanged = [1, 2, 3, 4, 5, 6, 7].some(
    (f) => animationCells(f, source).inks[0] !== start.inks[0],
  );
  const bgChanged = [1, 2, 3, 4, 5, 6, 7].some(
    (f) => animationCells(f, source).background !== start.background,
  );
  assert.equal(start.background, 6);
  assert.ok(inkChanged);
  assert.ok(bgChanged);
});