import {test} from 'node:test';
import assert from 'node:assert/strict';
import {animationCells} from '../animation-frames.js';
import {validateProject} from '../project-validation.js';

const cycle = [0, 11, 12, 15, 1, 7, 13, 5, 3, 14, 6, 4, 2, 10, 8, 9];
const glow = [9, 8, 2, 10, 7, 1, 7, 10, 2, 8];
const plasma = [6, 4, 2, 8, 7, 13, 3, 14];
const baseProject = {
  format: 'petscii-stencil-lab',
  version: 3,
  columns: 2,
  rows: 2,
  grid: [160, '', 0, 64],
  selectedGlyph: 160,
  colors: {ink: 14, background: 6},
};

function picture(extra) {
  return {
    W: 4,
    H: 1,
    grid: [160, '', 81, ''],
    inks: [1, 0, 2, 0],
    colors: {ink: 1, background: 6},
    effect: 'none',
    backgroundEffect: 'none',
    colorEffect: 'none',
    backgroundCycles: 1,
    seconds: 1,
    scale: 1,
    background: 'dark',
    motionCycles: 1,
    colorCycles: 1,
    ...extra,
  };
}

test('backdrop color cycle and warm glow use spatial wave bands', () => {
  const cycle = animationCells(0, picture({
    W: 4,
    H: 2,
    grid: Array(8).fill(''),
    inks: Array(8).fill(0),
    backgroundEffect: 'field',
    fieldRamp: 'cycle',
    colorWaveDirection: 'left',
    seconds: 1,
  }));
  assert.ok(cycle.backgroundMatte);
  assert.notEqual(cycle.backgroundMatte[0], cycle.backgroundMatte[3]);

  const glow = animationCells(0, picture({
    W: 4,
    H: 1,
    grid: ['', '', '', ''],
    inks: [0, 0, 0, 0],
    colors: {ink: 1, background: 9},
    backgroundEffect: 'field',
    fieldRamp: 'glow',
    colorWaveDirection: 'left',
    seconds: 1,
  }));
  assert.ok(glow.backgroundMatte);
  assert.ok(glow.backgroundMatte.some((ink, index) => index > 0 && ink !== glow.backgroundMatte[0]));
});

test('backdrop bonfire paints a spatial matte', () => {
  const frame = animationCells(0, picture({
    W: 6,
    H: 8,
    grid: Array(48).fill(''),
    inks: Array(48).fill(0),
    backgroundEffect: 'field',
    fieldRamp: 'bonfire',
    seconds: 1,
  }));
  assert.ok(frame.backgroundMatte);
  const unique = new Set(frame.backgroundMatte);
  assert.ok(unique.size > 1);
  for (const ink of frame.backgroundMatte) {
    assert.ok(ink >= 0 && ink <= 15);
  }
});

test('backdrop rainbow wave paints a spatial matte', () => {
  const wide = picture({
    W: 4,
    H: 1,
    grid: ['', '', '', ''],
    inks: [1, 1, 1, 1],
    backgroundEffect: 'field',
    fieldRamp: 'color-wave',
    colorWaveDirection: 'left',
    seconds: 1,
  });
  const frame = animationCells(0, wide);
  assert.ok(frame.backgroundMatte);
  assert.notEqual(frame.backgroundMatte[0], frame.backgroundMatte[3]);
  assert.deepEqual(frame.cells, ['', '', '', '']);
});

test('backdrop keeps cells and walks the chosen ramp', () => {
  const ramp = {backgroundEffect: 'field'};
  const first = animationCells(0, picture(ramp));
  const next = animationCells(1, picture(ramp));
  assert.deepEqual(first.cells, [160, '', 81, '']);
  assert.deepEqual(first.inks, [1, 0, 2, 0]);
  assert.equal(first.background, 6);
  assert.equal(first.border, 4);
  assert.equal(next.background, 4);
  assert.equal(next.border, 2);
  assert.equal(animationCells(1, picture({...ramp, fieldDirection: 'reverse'})).background, 14);
  assert.equal(animationCells(0, picture({...ramp, fieldLead: 0})).border, 6);
  assert.equal(animationCells(0, picture({...ramp, fieldLead: 4})).border, cycle[14]);
  const warm = animationCells(1, picture({...ramp, fieldRamp: 'glow'}));
  assert.equal(warm.background, glow[0]);
  assert.equal(animationCells(1, picture({...ramp, fieldRamp: 'glow', fieldDirection: 'reverse'})).background, glow[glow.length - 1]);
  const plasma0 = animationCells(0, picture({...ramp, fieldRamp: 'plasma'}));
  const plasma1 = animationCells(1, picture({...ramp, fieldRamp: 'plasma'}));
  assert.equal(plasma0.background, 6);
  assert.ok(plasma0.backgroundMatte);
  assert.ok(plasma0.backgroundMatte.some((ink, index) => index > 0 && ink !== plasma0.backgroundMatte[0]));
  assert.notEqual(
    JSON.stringify(plasma0.backgroundMatte),
    JSON.stringify(plasma1.backgroundMatte),
  );
  for (const ink of plasma0.backgroundMatte) {
    assert.ok(plasma.includes(ink));
  }
});

test('VDC backdrop border matches the background', () => {
  const frame = animationCells(1, picture({backgroundEffect: 'field', machine: 'c128-80', fieldLead: 4}));
  assert.equal(frame.border, frame.background);
  assert.notEqual(frame.background, 6);
});

test('parallax spread, travel, and glyph groups', () => {
  const together = animationCells(1, picture({
    effect: 'parallax',
    colorEffect: 'none',
    scrollDirection: 'left',
    parallaxSpread: 0,
  }));
  assert.deepEqual(together.cells, ['', 81, '', 160]);
  assert.equal(together.inks[1], 2);
  assert.equal(together.inks[3], 1);

  const drift = animationCells(1, picture({
    effect: 'parallax',
    colorEffect: 'none',
    scrollDirection: 'left',
    parallaxSpread: 1,
  }));
  assert.deepEqual(drift.cells, [160, 81, '', '']);
  assert.equal(drift.inks[0], 1);
  assert.equal(drift.inks[1], 2);

  const opposite = animationCells(1, picture({
    effect: 'parallax',
    colorEffect: 'none',
    grid: [160, 81, '', ''],
    inks: [1, 2, 0, 0],
    scrollDirection: 'left',
    parallaxSpread: 0,
    parallaxTravel: 'opposite',
  }));
  assert.deepEqual(opposite.cells, ['', '', 81, 160]);

  const glyphs = animationCells(1, picture({
    effect: 'parallax',
    colorEffect: 'none',
    grid: [160, '', 81, ''],
    inks: [7, 0, 3, 0],
    scrollDirection: 'left',
    parallaxGroup: 'glyph',
    parallaxSpread: 1,
  }));
  assert.deepEqual(glyphs.cells, ['', '', 81, 160]);
  assert.equal(glyphs.inks[2], 3);
  assert.equal(glyphs.inks[3], 7);
});

test('backdrop and parallax settings validate as a closed list', () => {
  const animation = {effect: 'parallax', backgroundEffect: 'field', colorEffect: 'none', seconds: 1, scale: 1, background: 'dark'};
  assert.doesNotThrow(() => validateProject({...baseProject, animation}));
  assert.throws(
    () => validateProject({...baseProject, animation: {...animation, fieldLead: 3}}),
    /animation settings/,
  );
  assert.throws(
    () => validateProject({...baseProject, animation: {...animation, parallaxGroup: 'layer'}}),
    /animation settings/,
  );
  assert.throws(
    () => validateProject({...baseProject, animation: {...animation, effect: 'moire'}}),
    /animation settings/,
  );
});
