import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMirrorTables, mirrorGlyph, GLYPH_COUNT} from '../glyph-mirror.js';
import {createPainter} from '../pointer-stroke.js';
import {glyphBits} from '../agents/petscii-preview/pgl-shared.mjs';

const c64Bits = glyphBits('c64');
const tedBits = glyphBits('ted');
const c64 = buildMirrorTables(c64Bits);
const ted = buildMirrorTables(tedBits);

const rows = (bits, id) => Array.from(bits.subarray(id * 8, id * 8 + 8));
const distance = (a, b) => a.reduce((n, row, i) => n + [...(row ^ b[i]).toString(2)].filter((c) => c === '1').length, 0);
const same = (a, b) => a.every((row, i) => row === b[i]);
// The flipped shape moved one pixel (the edge it leaves must be blank; the entering edge may differ).
const shiftedMatch = (candidate, flipped, vertical) => {
  if (vertical) {
    return (flipped[7] === 0 && same(candidate.slice(1), flipped.slice(0, 7)))
      || (flipped[0] === 0 && same(candidate.slice(0, 7), flipped.slice(1)));
  }
  return (flipped.every((b) => !(b & 1)) && candidate.every((b, i) => (b & 0x7f) === flipped[i] >> 1))
    || (flipped.every((b) => !(b & 0x80)) && candidate.every((b, i) => (b & 0xfe) === ((flipped[i] << 1) & 0xff)));
};
const flipH = (r) => r.map((byte) => parseInt(byte.toString(2).padStart(8, '0').split('').reverse().join(''), 2));

test('known C64 shapes find their mirrored partners', () => {
  // 233 lower-right triangle, 223 lower-left, 95 upper-right, 105 upper-left.
  assert.equal(c64.horizontal[233], 223);
  assert.equal(c64.horizontal[223], 233);
  assert.equal(c64.vertical[233], 95, 'one pixel off from an exact mirror, still the right partner');
  assert.equal(c64.vertical[223], 105);
  assert.equal(mirrorGlyph(233, true, true, c64), 105);
  // 225 right half, 97 left half; 226 top half, 98 bottom half.
  assert.equal(c64.horizontal[225], 97);
  assert.equal(c64.vertical[226], 98);
  // Diagonals swap; symmetric shapes map to themselves.
  assert.equal(c64.horizontal[77], 78);
  assert.equal(c64.horizontal[160], 160);
  assert.equal(c64.vertical[81], 81);
});

test('empty cells and glyphs without a close partner keep their glyph', () => {
  assert.equal(mirrorGlyph('', true, true, c64), '');
  const loners = [];
  for (let id = 0; id < GLYPH_COUNT; id++) if (c64.vertical[id] < 0) loners.push(id);
  assert.ok(loners.length > 0, 'some letters have no upside-down glyph');
  for (const id of loners) assert.equal(mirrorGlyph(id, false, true, c64), id);
});

test('every partner is an exact or one-pixel-shifted mirror', () => {
  for (const [bits, tables] of [[c64Bits, c64], [tedBits, ted]]) {
    for (let id = 0; id < GLYPH_COUNT; id++) {
      const h = tables.horizontal[id];
      const v = tables.vertical[id];
      const fh = flipH(rows(bits, id));
      const fv = rows(bits, id).reverse();
      if (h >= 0) assert.ok(same(rows(bits, h), fh) || shiftedMatch(rows(bits, h), fh, false), `h ${id}`);
      if (v >= 0) assert.ok(same(rows(bits, v), fv) || shiftedMatch(rows(bits, v), fv, true), `v ${id}`);
    }
  }
});

test('letters only swap with true mirror letters', () => {
  // Upper/lowercase banks: M↔W top-bottom, b↔p and d↔q top-bottom; A keeps its glyph.
  assert.equal(c64.vertical[13], 23);
  assert.equal(c64.vertical[256 + 2], 256 + 16);
  assert.equal(c64.vertical[256 + 4], 256 + 17);
  assert.equal(mirrorGlyph(1, true, true, c64), 1, 'A has no upside-down partner');
  for (let id = 1; id <= 26; id++) {
    const v = c64.vertical[id];
    assert.ok(v < 0 || v === id || (v >= 1 && v <= 26), `uppercase ${id} → ${v}`);
  }
});

test('exact mirrors are preferred and exact pairs are involutions', () => {
  let exact = 0;
  for (let id = 0; id < GLYPH_COUNT; id++) {
    const h = c64.horizontal[id];
    if (h < 0 || distance(rows(c64Bits, h), flipH(rows(c64Bits, id))) !== 0) continue;
    exact++;
    assert.deepEqual(rows(c64Bits, c64.horizontal[h]), rows(c64Bits, id), `h∘h ${id}`);
  }
  assert.ok(exact > 100, `${exact} exact left-right pairs`);
});

test('Plus/4 tables come from TED shapes', () => {
  // The TED character ROM differs from the C64 one (for example lowercase 258 'b'),
  // so some partners differ; using the C64 table on a Plus/4 would mirror the wrong shapes.
  let differs = 0;
  for (let id = 0; id < GLYPH_COUNT; id++) {
    if (ted.vertical[id] !== c64.vertical[id] || ted.horizontal[id] !== c64.horizontal[id]) differs++;
  }
  assert.ok(differs > 0, 'TED and C64 partners differ for some glyphs');
  assert.equal(ted.horizontal[160], 160);
});

test('painter passes reflection flags so copies can use mirrored glyphs', () => {
  const cells = new Map();
  createPainter({
    getW: () => 4, getH: () => 2, getSymmetry: () => 'both', getGlyph: () => 233,
    getErasing: () => false, getInk: () => 1,
    getMirrorGlyph: (glyph, flipX, flipY) => mirrorGlyph(glyph, flipX, flipY, c64),
    onCell: (index, glyph) => cells.set(index, glyph),
  }).paint(0, 0);
  assert.deepEqual(Object.fromEntries(cells), {0: 233, 3: 223, 4: 95, 7: 105});
  const plain = new Map();
  createPainter({
    getW: () => 4, getH: () => 2, getSymmetry: () => 'both', getGlyph: () => 233,
    getErasing: () => false, getInk: () => 1, onCell: (index, glyph) => plain.set(index, glyph),
  }).paint(0, 0);
  assert.deepEqual([...new Set(plain.values())], [233], 'without the option every copy keeps the brush glyph');
});
