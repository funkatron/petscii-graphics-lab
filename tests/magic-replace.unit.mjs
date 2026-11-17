import {test} from 'node:test';
import assert from 'node:assert/strict';
import {replaceGlyphInGrid, replaceInkInGrid} from '../magic-replace.js';

test('replaceInkInGrid skips empty cells and matching ink only', () => {
  const grid = [160, '', 160];
  const inks = [1, 1, 2];
  const recorded = [];
  const n = replaceInkInGrid(grid, inks, 1, 3, (i) => recorded.push(i));
  assert.equal(n, 1);
  assert.deepEqual(inks, [3, 1, 2]);
  assert.deepEqual(recorded, [0]);
});

test('replaceGlyphInGrid swaps glyph id and records', () => {
  const grid = [102, 102, 160];
  const recorded = [];
  const n = replaceGlyphInGrid(grid, 102, 160, (i) => recorded.push(i));
  assert.equal(n, 2);
  assert.deepEqual(grid, [160, 160, 160]);
  assert.deepEqual(recorded, [0, 1]);
});