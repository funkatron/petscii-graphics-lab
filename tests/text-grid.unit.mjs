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

test('formatTextGrid v3 round-trips a TED ink above 15', () => {
  const grid = [160, ''];
  const cellColors = [80, 0];
  const colors = {ink: 1, background: 80};
  const text = formatTextGrid({
    columns: 2,
    rows: 1,
    grid,
    cellColors,
    colors,
    includeColors: true,
    colorDigits: 2,
  });
  assert.equal(text, '# PETSCII-GLYPHS 3 2 1 50\n0A0:50 --:00');
  const parsed = parseTextGrid(text, {ink: 3, background: 6});
  assert.deepEqual(parsed.grid, grid);
  assert.deepEqual(parsed.cellColors, cellColors);
  assert.equal(parsed.colors.background, 80);
  assert.equal(parsed.colors.ink, 3);
});

test('parseTextGrid rejects a TED ink above 120 and keeps v2 as one nibble', () => {
  assert.throws(
    () => parseTextGrid('# PETSCII-GLYPHS 3 1 1 00\n000:79', defaults),
    /TED ink must be 00–78/,
  );
  assert.throws(
    () => parseTextGrid('# PETSCII-GLYPHS 3 1 1 79\n000:00', defaults),
    /TED ink must be 00–78/,
  );
  const parsed = parseTextGrid('# PETSCII-GLYPHS 2 1 1 F\n0A0:A', defaults);
  assert.deepEqual(parsed.cellColors, [10]);
  assert.equal(parsed.colors.background, 15);
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
