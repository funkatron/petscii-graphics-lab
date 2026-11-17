import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cellIndex, erasedCellValue, formatCellLabel} from '../cell-inspector.js';

test('cellIndex maps x,y to flat index', () => {
  assert.equal(cellIndex(40, 0, 0), 0);
  assert.equal(cellIndex(40, 39, 1), 79);
});

test('erasedCellValue matches eraser empty + brush ink', () => {
  assert.deepEqual(erasedCellValue(5), {glyph: '', ink: 5});
});

test('formatCellLabel is one-based for screen readers', () => {
  assert.equal(formatCellLabel(4, 2), 'Column 5, row 3');
});