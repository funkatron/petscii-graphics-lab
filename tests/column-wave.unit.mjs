import assert from 'node:assert/strict';
import test from 'node:test';

import {animationCells, animationCount} from '../animation-frames.js';
import {validateProject} from '../project-validation.js';

const grid = Array.from({length: 40}, (_, i) => (i % 5 === 0 ? 160 : ''));
const base = {
  W: 8,
  H: 5,
  grid,
  inks: grid.map((_, i) => (i % 16)),
  effect: 'column-wave',
  scrollDirection: 'left',
  waveShape: 'sine',
  waveAmplitude: 50,
  waveLength: 50,
  colorEffect: 'none',
  seconds: 2,
  motionCycles: 1,
};

test('column-wave closes loops and validates in v3 projects', () => {
  const count = animationCount(base);
  assert.equal(count, 24);
  const first = animationCells(0, base);
  const last = animationCells(count, base);
  assert.deepEqual(first.cells, last.cells);
  assert.deepEqual(first.inks, last.inks);
  validateProject({
    format: 'petscii-stencil-lab',
    version: 3,
    columns: base.W,
    rows: base.H,
    grid,
    cellColors: base.inks,
    animation: {
      effect: 'column-wave',
      scrollDirection: 'left',
      seconds: 2,
      scale: 1,
      background: 'dark',
      colorEffect: 'none',
    },
  });
  assert.throws(() => validateProject({
    format: 'petscii-stencil-lab',
    version: 3,
    columns: base.W,
    rows: base.H,
    grid,
    cellColors: base.inks,
    animation: {
      effect: 'column-wave',
      scrollDirection: 'up-left',
      seconds: 2,
      scale: 1,
      background: 'dark',
      colorEffect: 'none',
    },
  }));
});

test('column-wave bend differs from plain horizontal scroll', () => {
  const scroll = {...base, effect: 'scroll-x'};
  const wave = {...base};
  const mid = Math.floor(animationCount(base) / 2);
  const scrollFrame = animationCells(mid, scroll);
  const waveFrame = animationCells(mid, wave);
  assert.notDeepEqual(scrollFrame.cells, waveFrame.cells);
});