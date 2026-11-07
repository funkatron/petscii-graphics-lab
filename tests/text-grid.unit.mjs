import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatTextGrid, parseTextGrid, TEXT_GRID_MAX_BYTES} from '../text-grid.js';

const defaults = {ink: 14, background: 6};

test('TEXT_GRID_MAX_BYTES matches file import limit', () => {
  assert.equal(TEXT_GRID_MAX_BYTES, 65536);
});

test('formatTextGrid v1 and parse round-trip', () => {
  const grid = [256, '', 160, 0];
  const cellColors = [2, 14, 14, 14];
  const text = formatTextGrid({
    columns: 2,
    rows: 2,
    grid,
    cellColors,
    colors: defaults,
    includeColors: false,
  });
  assert.equal(text, '# PETSCII-GLYPHS 1 2 2\n100 --\n0A0 000');
  const parsed = parseTextGrid(text, defaults);
  assert.deepEqual(parsed.grid, grid);
  assert.deepEqual(parsed.cellColors, [14, 14, 14, 14]);
  assert.deepEqual(parsed.colors, defaults);
});

test('formatTextGrid v2 preserves per-cell ink and background', () => {
  const grid = [0, 511, '', 160];
  const cellColors = [0, 15, 7, 2];
  const colors = {ink: 9, background: 0};
  const text = formatTextGrid({
    columns: 2,
    rows: 2,
    grid,
    cellColors,
    colors,
    includeColors: true,
  });
  assert.equal(text, '# PETSCII-GLYPHS 2 2 2 0\n000:0 1FF:F\n--:7 0A0:2');
  const parsed = parseTextGrid(text, {ink: 3, background: 6});
  assert.deepEqual(parsed.grid, grid);
  assert.deepEqual(parsed.cellColors, cellColors);
  assert.equal(parsed.colors.background, 0);
  assert.equal(parsed.colors.ink, 3);
});

test('parseTextGrid rejects malformed headers and grids', () => {
  assert.throws(() => parseTextGrid('hello', defaults), /PETSCII-GLYPHS/);
  assert.throws(
    () => parseTextGrid('# PETSCII-GLYPHS 2 2 1\n000:F 200:0', defaults),
    /PETSCII-GLYPHS/,
  );
  assert.throws(
    () => parseTextGrid('# PETSCII-GLYPHS 1 2 2\n000 --', defaults),
    /row count/i,
  );
  assert.throws(
    () => parseTextGrid('# PETSCII-GLYPHS 1 2 1\n000', defaults),
    /column count/i,
  );
  assert.throws(
    () => parseTextGrid('# PETSCII-GLYPHS 1 1 1\nZZZ', defaults),
    /Invalid glyph ID/,
  );
});

test('parseTextGrid accepts CRLF-normalized input', () => {
  const text = '# PETSCII-GLYPHS 1 2 1\r\n180 --\r\n';
  const parsed = parseTextGrid(text, defaults);
  assert.deepEqual(parsed.grid, [384, '']);
});
