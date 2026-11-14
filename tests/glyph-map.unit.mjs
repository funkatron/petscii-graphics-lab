import assert from 'node:assert/strict';
import test from 'node:test';
import {c64GlyphToTed, convertGlyph, convertGlyphArray, tedGlyphToC64} from '../glyph-map.js';

test('glyph map is identity for normal atlas IDs and empty cells', () => {
  assert.equal(c64GlyphToTed(64), 64);
  assert.equal(tedGlyphToC64(320), 320);
  assert.equal(c64GlyphToTed(''), '');
  assert.equal(convertGlyph(160, 'c64', 'plus4'), 160);
  assert.equal(convertGlyph(160, 'plus4', 'c64'), 160);
  assert.equal(convertGlyph(160, 'c64', 'c128'), 160);
  assert.deepEqual(convertGlyphArray([1, '', 400], 'c64', 'plus4'), [1, '', 400]);
});

test('rejects out-of-range glyph IDs', () => {
  assert.throws(() => c64GlyphToTed(512), /Invalid atlas glyph ID/);
  assert.throws(() => tedGlyphToC64(-1), /Invalid atlas glyph ID/);
});
