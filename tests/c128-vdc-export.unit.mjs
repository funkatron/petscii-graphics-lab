import assert from 'node:assert/strict';
import test from 'node:test';
import {createC128VdcAdaptiveProgram, createC128VdcProgram, createD64Disk} from '../c128-vdc-export.js';

const ORIGIN = 0x1c01;

/**
 * Decode the first frame of the stream into a sparse VDC RAM image.
 * Plane format: [lo, hi, count, value] | [lo, hi, 0, length, ...bytes]; $FFFF ends.
 */
function firstFrameVdcRam(result) {
  const bytes = result.bytes;
  let p = 2 + result.diagnostics.playerBytes;
  const ticks = bytes[p] + (bytes[p + 1] << 8);
  p += 2;
  const ram = new Map();
  for (;;) {
    const address = bytes[p] + (bytes[p + 1] << 8);
    p += 2;
    if (address === 0xffff) {
      break;
    }
    const count = bytes[p++];
    if (count === 0) {
      const length = bytes[p++];
      for (let i = 0; i < length; i++) {
        ram.set(address + i, bytes[p++]);
      }
    } else {
      const value = bytes[p++];
      for (let i = 0; i < count; i++) {
        ram.set(address + i, value);
      }
    }
  }
  return {ticks, ram};
}

function stillInput(overrides = {}) {
  return {
    columns: 2,
    rows: 1,
    background: 0,
    ink: 15,
    frames: [{cells: [1, ''], inks: [14, 3], durationMs: 1000}],
    repetitions: 1,
    ...overrides,
  };
}

function blankGlyphBits() {
  return new Uint8Array(4096);
}

test('C128 VDC still loads at $1C01 with c128-80 diagnostics and a full D64', () => {
  const result = createC128VdcProgram(stillInput());
  assert.equal(result.bytes[0] + (result.bytes[1] << 8), ORIGIN);
  assert.equal(result.diagnostics.machine, 'c128-80');
  assert.equal(result.diagnostics.renderer, 'vdc');
  assert.equal(result.diagnostics.customCharset, false);
  assert.equal(result.frameCount, 1);
  assert.equal(createD64Disk(result.bytes, 'PICTURE').length, 174848);
});

test('C128 VDC adaptive v1 matches the plain program', () => {
  const input = stillInput();
  assert.deepEqual([...createC128VdcAdaptiveProgram(input).bytes], [...createC128VdcProgram(input).bytes]);
});

test('C128 VDC accepts 80 columns and rejects 81', () => {
  const wide = (columns) => stillInput({
    columns,
    frames: [{cells: Array(columns).fill(1), inks: Array(columns).fill(14), durationMs: 1000}],
  });
  assert.doesNotThrow(() => createC128VdcProgram(wide(80)));
  assert.throws(() => createC128VdcProgram(wide(81)), /80 columns/);
});

test('C128 VDC centers artwork in the 80x25 plane', () => {
  const result = createC128VdcProgram(stillInput());
  const {ram} = firstFrameVdcRam(result);
  // 2x1 art: row offset floor(24/2)=12, column offset floor(78/2)=39.
  const offset = 12 * 80 + 39;
  assert.equal(ram.get(0x0000 + offset), 1);
  assert.equal(ram.get(0x0000 + offset + 1), 32);
  assert.equal(ram.get(0x0800 + offset), 14);
  assert.equal(ram.get(0x0800 + offset + 1), 15);
  // Margin: blank screen code with the default ink.
  assert.equal(ram.get(0x0000), 32);
  assert.equal(ram.get(0x0800), 15);
});

test('C128 VDC ROM path rejects mixed character banks without glyphBits', () => {
  const input = stillInput({frames: [{cells: [1, 256 + 1], inks: [1, 2], durationMs: 1000}]});
  assert.throws(() => createC128VdcProgram(input), /one character set at a time/);
});

test('C128 VDC glyphBits path allows mixed banks and reports a custom charset', () => {
  const input = stillInput({
    frames: [{cells: [1, 256 + 1], inks: [1, 2], durationMs: 1000}],
    glyphBits: blankGlyphBits(),
  });
  const result = createC128VdcProgram(input);
  assert.equal(result.diagnostics.customCharset, true);
  assert.ok(result.diagnostics.streamBytes.characters > 0);
});

test('C128 VDC custom charset uses 16-byte glyphs with ink-only attributes', () => {
  const glyphBits = blankGlyphBits();
  glyphBits.set([1, 2, 3, 4, 5, 6, 7, 8], 5 * 8);
  const input = stillInput({
    frames: [{cells: [5, 128 + 5], inks: [9, 10], durationMs: 1000}],
    glyphBits,
  });
  const {ram} = firstFrameVdcRam(createC128VdcProgram(input));
  // Both atlas IDs share one slot only if their patterns match: 5 is patterned, 133 is blank.
  const offset = 12 * 80 + 39;
  const slotA = ram.get(offset);
  const slotB = ram.get(offset + 1);
  assert.notEqual(slotA, slotB);
  const slotBytes = [];
  for (let i = 0; i < 16; i++) {
    slotBytes.push(ram.get(0x2000 + slotA * 16 + i) ?? 0);
  }
  assert.deepEqual(slotBytes, [1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 0, 0, 0, 0, 0]);
  // Attributes are plain ink: no reverse (bit 6) or alternate bank (bit 7).
  assert.equal(ram.get(0x0800 + offset), 9);
  assert.equal(ram.get(0x0800 + offset + 1), 10);
});

test('C128 VDC analyze mode returns diagnostics when timing is too high', () => {
  const cells = (glyph) => Array(80 * 25).fill(glyph);
  const input = {
    columns: 80,
    rows: 25,
    background: 0,
    ink: 15,
    frames: [
      {cells: cells(1), inks: Array(2000).fill(1), durationMs: 1000 / 60},
      {cells: cells(2), inks: Array(2000).fill(2), durationMs: 1000 / 60},
    ],
  };
  assert.throws(() => createC128VdcProgram(input), /changes too much/);
  const analyzed = createC128VdcProgram({...input, analyze: true});
  assert.ok(analyzed.diagnostics.worstUpdateRatio > 1);
  assert.equal(analyzed.diagnostics.machine, 'c128-80');
  const overrun = createC128VdcProgram({...input, allowTimingOverrun: true});
  assert.ok(overrun.diagnostics.worstUpdateRatio > 1);
});

test('C128 VDC ROM path maps atlas glyphs 128+ to hardware reverse', () => {
  const input = stillInput({
    frames: [{cells: [128 + 1, 1], inks: [7, 7], durationMs: 1000}],
  });
  let result;
  assert.doesNotThrow(() => {
    result = createC128VdcProgram(input);
  });
  const {ram} = firstFrameVdcRam(result);
  const offset = 12 * 80 + 39;
  // Same screen code, reverse (attr bit 6) only on the 128+ glyph.
  assert.equal(ram.get(offset), 1);
  assert.equal(ram.get(offset + 1), 1);
  assert.equal(ram.get(0x0800 + offset), 0x40 | 7);
  assert.equal(ram.get(0x0800 + offset + 1), 7);
});

test('C128 VDC ROM path selects the alternate charset bank via attribute bit 7', () => {
  const input = stillInput({
    frames: [{cells: [256 + 1, ''], inks: [7, 7], durationMs: 1000}],
  });
  const {ram} = firstFrameVdcRam(createC128VdcProgram(input));
  const offset = 12 * 80 + 39;
  assert.equal(ram.get(0x0800 + offset), 0x80 | 7);
  assert.equal(createC128VdcProgram(input).diagnostics.charset, 1);
});

test('C128 VDC rejects invalid colors', () => {
  assert.throws(() => createC128VdcProgram(stillInput({background: 16})), /display colors/);
  assert.throws(() => createC128VdcProgram(stillInput({
    frames: [{cells: [1, ''], inks: [16, 0], durationMs: 1000}],
  })), /cell colors/);
});
