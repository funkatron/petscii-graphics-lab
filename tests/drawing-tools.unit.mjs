import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyToolPreview, normalizeSelectionRect } from '../editor/drawing-tools.js';

const grid = Array(16).fill('');
const inks = Array(16).fill(1);

test('normalizeSelectionRect orders corners', () => {
  assert.deepEqual(normalizeSelectionRect([3, 5], [1, 2]), { x: 1, y: 2, w: 3, h: 4 });
});

test('applyToolPreview outlines a 3×3 hollow rectangle', () => {
  const drag = { kind: 'rectangle', start: [1, 1] };
  const { cells } = applyToolPreview(drag, [3, 3], {
    columns: 4,
    rows: 4,
    grid,
    cellInks: inks,
    glyph: 160,
    ink: 5,
    selection: null,
  });
  assert.equal(cells[5], 160);
  assert.equal(cells[7], 160);
  assert.equal(cells[9], 160);
  assert.equal(cells[11], 160);
  assert.equal(cells[6], 160);
  assert.equal(cells[10], '');
});

test('applyToolPreview draws a horizontal line', () => {
  const drag = { kind: 'line', start: [0, 2] };
  const { cells } = applyToolPreview(drag, [3, 2], {
    columns: 4,
    rows: 4,
    grid,
    cellInks: inks,
    glyph: 42,
    ink: 3,
    selection: null,
  });
  for (let x = 0; x <= 3; x++) assert.equal(cells[2 * 4 + x], 42);
});

test('applyToolPreview move clears source selection cells', () => {
  const sourceGrid = Array(16).fill('');
  sourceGrid[5] = 99;
  const drag = {
    kind: 'move',
    start: [0, 0],
    offset: [0, 0],
    data: { w: 1, h: 1, cells: [99], inks: [2] },
  };
  const selection = { x: 1, y: 1, w: 1, h: 1 };
  const { cells } = applyToolPreview(drag, [3, 3], {
    columns: 4,
    rows: 4,
    grid: sourceGrid,
    cellInks: inks,
    glyph: 1,
    ink: 1,
    selection,
  });
  assert.equal(cells[5], '');
  assert.equal(cells[15], 99);
});