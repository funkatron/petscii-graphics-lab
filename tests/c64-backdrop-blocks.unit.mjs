import assert from 'node:assert/strict';
import test from 'node:test';
import {animationCells} from '../animation-frames.js';
import {
  C64_BACKDROP_BLOCK,
  backdropExportActive,
  createC64Program,
  prepareC64BackdropFrames,
} from '../c64-export.js';

test('backdropExportActive follows backgroundEffect', () => {
  assert.equal(backdropExportActive({backgroundEffect: 'field'}), true);
  assert.equal(backdropExportActive({backgroundEffect: 'plus4-field'}), true);
  assert.equal(backdropExportActive({backgroundEffect: 'none'}), false);
});

test('prepareC64BackdropFrames fills empty cells with block and matte ink', () => {
  const source = {
    W: 2,
    H: 1,
    grid: [160, ''],
    inks: [3, 0],
    colors: {ink: 1, background: 6},
    effect: 'none',
    colorEffect: 'none',
    backgroundEffect: 'field',
    fieldRamp: 'color-wave',
    fieldWaveDirection: 'left',
    seconds: 1,
  };
  const frame = animationCells(0, source);
  const [prepared] = prepareC64BackdropFrames([{...frame, durationMs: 1000}]);
  assert.equal(prepared.cells[0], 160);
  assert.equal(prepared.cells[1], C64_BACKDROP_BLOCK);
  assert.equal(prepared.inks[1], frame.backgroundMatte[1]);
  assert.notEqual(prepared.inks[0], prepared.inks[1]);
});

test('C64 program encodes backdrop paper as block plus color RAM', () => {
  const source = {
    W: 2,
    H: 1,
    grid: ['', ''],
    inks: [0, 0],
    colors: {ink: 1, background: 6},
    effect: 'none',
    colorEffect: 'none',
    backgroundEffect: 'field',
    fieldRamp: 'cycle',
    seconds: 1,
  };
  const frame = animationCells(0, source);
  const [prepared] = prepareC64BackdropFrames([{...frame, durationMs: 1000}]);
  const result = createC64Program({
    columns: 2,
    rows: 1,
    background: 6,
    ink: 1,
    frames: [prepared],
    repetitions: 1,
    analyze: true,
  });
  assert.ok(result.diagnostics.programBytes > 0);
  assert.ok(result.diagnostics.streamBytes.color > 0);
});