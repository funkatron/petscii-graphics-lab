import assert from 'node:assert/strict';
import test from 'node:test';

import {animationCells, animationCount} from '../animation-frames.js';
import {validateProject} from '../project-validation.js';

const grid = Array.from({length: 48 }, (_, i) => (Math.floor(i / 8) % 2 === 0 ? 160 : ''));
const base = {
  W: 8,
  H: 6,
  grid,
  inks: grid.map((_, i) => (i % 16)),
  effect: 'fld-blinds',
  waveShape: 'sine',
  waveAmplitude: 75,
  waveLength: 50,
  colorEffect: 'none',
  seconds: 2,
  motionCycles: 1,
};

test('fld-blinds closes loops and validates in v3 projects', () => {
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
      effect: 'fld-blinds',
      waveAmplitude: 75,
      waveLength: 50,
      seconds: 2,
      scale: 1,
      background: 'dark',
      colorEffect: 'none',
    },
  });
});

test('fld-blinds expands rows differently from static drawing', () => {
  const still = {...base, effect: 'none'};
  const mid = Math.floor(animationCount(base) / 3);
  const blind = animationCells(mid, base);
  const staticCells = still.grid;
  assert.notDeepEqual(blind.cells, staticCells);
  assert.ok(blind.cells.some((c, i) => c === '' && staticCells[i] !== ''));
});