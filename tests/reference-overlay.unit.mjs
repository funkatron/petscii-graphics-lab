import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  cellBitmapFromRegion,
  convertImageToGrid,
  nearestPaletteIndex,
  REFERENCE_EMPTY_FILL,
} from '../reference-overlay.js';

const PAL = ['#000000', '#ffffff', '#ff0000', '#00ff00'];

function solidRows(fill) {
  const byte = fill ? 0xff : 0x00;
  return Array(8).fill(byte);
}

test('nearestPaletteIndex picks closest hex', () => {
  assert.equal(nearestPaletteIndex(10, 10, 10, PAL), 0);
  assert.equal(nearestPaletteIndex(250, 250, 250, PAL), 1);
});

test('convertImageToGrid maps a 2×2 checker to glyphs and inks', () => {
  const w = 16;
  const h = 16;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const light = (x < w / 2) !== (y < h / 2);
      const v = light ? 255 : 0;
      const o = (y * w + x) * 4;
      data[o] = v;
      data[o + 1] = v;
      data[o + 2] = v;
      data[o + 3] = 255;
    }
  }
  const glyphRowsFor = (id) => (id === 160 ? solidRows(1) : id === 32 ? solidRows(0) : solidRows(1));
  const {cells, inks} = convertImageToGrid({
    data,
    width: w,
    height: h,
    columns: 2,
    rows: 2,
    paletteHex: PAL,
    candidateGlyphs: [32, 160],
    glyphRowsFor,
  });
  assert.equal(cells.length, 4);
  assert.ok(cells.every((c) => c === 160 || c === 32));
  assert.ok(inks.every((i) => i >= 0 && i < PAL.length));
  assert.ok(REFERENCE_EMPTY_FILL < 0.5);
  const {fill} = cellBitmapFromRegion(data, w, 0, 0, w / 2, h / 2);
  assert.ok(fill > REFERENCE_EMPTY_FILL);
});