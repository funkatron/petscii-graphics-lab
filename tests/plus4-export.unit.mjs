import assert from 'node:assert/strict';
import test from 'node:test';
import {attrToTed, tedIndex, tedToAttr} from '../plus4-colors.js';
import {createD64Disk, createPlus4AdaptiveProgram, createPlus4Program} from '../plus4-export.js';

test('tedToAttr / attrToTed round-trip for black and chroma×luma', () => {
  assert.equal(tedToAttr(0), 0);
  assert.equal(attrToTed(0), 0);
  const pinkL4 = tedIndex(11, 4);
  const attr = tedToAttr(pinkL4);
  assert.equal(attr, (4 << 4) | 11);
  assert.equal(attrToTed(attr), pinkL4);
});

test('Plus/4 still loads at $1001 with SYS stub and D64 packaging', () => {
  const frame = {cells: [160, ''], inks: [0, tedIndex(1, 5)], durationMs: 1000 / 60};
  const result = createPlus4Program({
    columns: 2,
    rows: 1,
    background: tedIndex(1, 5),
    ink: 0,
    frames: [frame],
    repetitions: 1,
  });
  assert.equal(result.bytes[0] + (result.bytes[1] << 8), 0x1001);
  assert.equal(result.diagnostics.machine, 'plus4');
  assert.equal(result.diagnostics.customCharset, false);
  assert.equal(String.fromCharCode(...result.bytes.slice(7, 11)), '4109');
  assert.equal(result.debugSymbols.entry, 4109);
  assert.equal(createD64Disk(result.bytes, 'PICTURE').length, 174848);
  const adaptive = createPlus4AdaptiveProgram({
    columns: 2,
    rows: 1,
    background: tedIndex(1, 5),
    ink: 0,
    frames: [frame],
    repetitions: 1,
  });
  assert.deepEqual([...adaptive.bytes], [...result.bytes]);
});

test('Plus/4 ROM path rejects mixed banks without glyphBits', () => {
  assert.throws(
    () =>
      createPlus4Program({
        columns: 2,
        rows: 1,
        background: 0,
        ink: 0,
        frames: [{cells: [1, 257], inks: [0, 0], durationMs: 1000}],
        repetitions: 1,
      }),
    /one character set/,
  );
});

test('Plus/4 animation with TED glyphBits builds a custom charset program', () => {
  const glyphBits = new Uint8Array(4096);
  glyphBits[8] = 0xff; // bank0 code 1 distinct
  glyphBits[256 * 8 + 8] = 0x0f; // bank1 code 1 distinct
  const result = createPlus4Program({
    columns: 2,
    rows: 1,
    background: 0,
    ink: tedIndex(2, 4),
    frames: [
      {cells: [1, 257], inks: [tedIndex(2, 4), tedIndex(3, 4)], durationMs: 1000 / 60},
      {cells: [257, 1], inks: [tedIndex(3, 4), tedIndex(2, 4)], durationMs: 1000 / 60},
    ],
    repetitions: 0,
    glyphBits,
  });
  assert.equal(result.diagnostics.customCharset, true);
  assert.equal(result.frameCount, 2);
  assert.ok(result.diagnostics.programBytes <= result.diagnostics.memoryLimit);
});
