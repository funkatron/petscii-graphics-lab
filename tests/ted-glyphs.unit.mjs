import assert from 'node:assert/strict';
import test from 'node:test';
import {c64GlyphToTed, tedGlyphToC64} from '../glyph-map.js';
import {
  differingAtlasIds,
  expectedC64TedDifferingIds,
  loadGlyphSheetBits,
} from './glyph-svg-bits.mjs';

const TED_DISPLAY_SHA =
  '279b70a29c84aee936db10dbe8d797600ab2fb4f39807bef738f9affa7d5cf2e';
const TED_SOURCE_SHA =
  '978c07ee0c9c30ad7fa2193e64e4196da8d10d614554132741f0033d1a0872a8';
const C64_DISPLAY_SHA =
  'fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420';

test('TED display atlas SHA matches the SVG desc fingerprint', () => {
  const ted = loadGlyphSheetBits('ted');
  assert.equal(ted.sha256, TED_DISPLAY_SHA);
  assert.match(ted.desc, new RegExp(TED_DISPLAY_SHA));
  assert.match(ted.desc, new RegExp(TED_SOURCE_SHA));
  assert.match(ted.desc, /2048 bytes/);
  assert.match(ted.desc, /hardware-inverse/i);
});

test('C64 display atlas SHA stays locked for cross-sheet diffs', () => {
  const c64 = loadGlyphSheetBits('c64');
  assert.equal(c64.sha256, C64_DISPLAY_SHA);
});

test('TED codes 128–255 are hardware inverses of 0–127 in both banks', () => {
  const {bytes} = loadGlyphSheetBits('ted');
  for (let bank = 0; bank < 2; bank++) {
    for (let code = 0; code < 128; code++) {
      for (let row = 0; row < 8; row++) {
        const lo = bytes[bank * 2048 + code * 8 + row];
        const hi = bytes[bank * 2048 + (code + 128) * 8 + row];
        assert.equal(
          hi,
          lo ^ 0xff,
          `bank ${bank} code ${code + 128} row ${row}`,
        );
      }
    }
  }
});

test('TED bank 1 lowercase a matches the authentic chargen half', () => {
  const {bytes} = loadGlyphSheetBits('ted');
  // Atlas ID 257 = bank 1 code 1 ('a' in lowercase set).
  assert.deepEqual(
    [...bytes.subarray(257 * 8, 257 * 8 + 8)],
    [0, 0, 60, 6, 62, 102, 62, 0],
  );
});

test('C64↔TED pixel diffs match the locked identity-by-slot expectation', () => {
  const c64 = loadGlyphSheetBits('c64');
  const ted = loadGlyphSheetBits('ted');
  const differing = differingAtlasIds(c64.bytes, ted.bytes);
  const expected = expectedC64TedDifferingIds();
  assert.equal(differing.length, 34);
  assert.equal(512 - differing.length, 478);
  assert.deepEqual(differing, expected);
  // Bank 0 low half is shared graphics alphabet.
  for (let id = 0; id < 128; id++) {
    assert.ok(!differing.includes(id), `unexpected bank0 low diff at ${id}`);
  }
});

test('glyph-map stays identity for every atlas ID', () => {
  for (let id = 0; id < 512; id++) {
    assert.equal(c64GlyphToTed(id), id);
    assert.equal(tedGlyphToC64(id), id);
  }
});
