import assert from 'node:assert/strict';
import test from 'node:test';
import {animationCells} from '../animation-frames.js';
import {
  NATIVE_BACKDROP_BLOCK,
  backdropExportActive,
  prepareNativeBackdropFrames,
} from '../native-backdrop-export.js';
import {tedIndex} from '../plus4-colors.js';
import {createPlus4AdaptiveProgram} from '../plus4-export.js';

test('backdropExportActive includes plus4-field', () => {
  assert.equal(backdropExportActive({backgroundEffect: 'plus4-field'}), true);
});

test('prepareNativeBackdropFrames fills Plus/4 empty cells with TED matte inks', () => {
  const bg = tedIndex(1, 5);
  const source = {
    machine: 'plus4',
    W: 2,
    H: 1,
    grid: [160, ''],
    inks: [tedIndex(2, 4), 0],
    colors: {ink: tedIndex(2, 4), background: bg},
    effect: 'none',
    colorEffect: 'none',
    backgroundEffect: 'plus4-field',
    fieldRamp: 'color-wave',
    fieldWaveDirection: 'left',
    seconds: 1,
  };
  const frame = animationCells(0, source);
  const [prepared] = prepareNativeBackdropFrames([{...frame, durationMs: 1000}]);
  assert.equal(prepared.cells[0], 160);
  assert.equal(prepared.cells[1], NATIVE_BACKDROP_BLOCK);
  assert.equal(prepared.inks[1], frame.backgroundMatte[1]);
  assert.ok(prepared.inks[1] >= 0 && prepared.inks[1] <= 120);
  assert.notEqual(prepared.inks[0], prepared.inks[1]);
});

test('Plus/4 program encodes backdrop paper as block plus TED attributes', () => {
  const bg = tedIndex(1, 5);
  const source = {
    machine: 'plus4',
    W: 2,
    H: 1,
    grid: ['', ''],
    inks: [0, 0],
    colors: {ink: tedIndex(2, 4), background: bg},
    effect: 'none',
    colorEffect: 'none',
    backgroundEffect: 'plus4-field',
    fieldRamp: 'cycle',
    seconds: 1,
  };
  const frame = animationCells(0, source);
  const [prepared] = prepareNativeBackdropFrames([{...frame, durationMs: 1000}]);
  const result = createPlus4AdaptiveProgram({
    columns: 2,
    rows: 1,
    background: bg,
    ink: tedIndex(2, 4),
    frames: [prepared],
    repetitions: 1,
  });
  assert.equal(result.diagnostics.machine, 'plus4');
  assert.ok(result.diagnostics.programBytes > 0);
  assert.ok(result.diagnostics.streamBytes.color > 0);
});