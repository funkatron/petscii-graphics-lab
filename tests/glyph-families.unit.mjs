import {test} from 'node:test';
import assert from 'node:assert/strict';
import {graphicsCode, familyGlyphCodes, buildGlyphCatalog} from '../glyph-families.js';

test('graphicsCode hides letter and digit screen codes', () => {
  assert.equal(graphicsCode(64), true);
  assert.equal(graphicsCode(1), false);
  assert.equal(graphicsCode(256 + 65), false);
});

test('familyGlyphCodes pairs inverses for shape families', () => {
  const blocks = familyGlyphCodes('blocks', [], []);
  assert.ok(blocks.includes(32));
  assert.ok(blocks.includes(32 + 128));
});

test('buildGlyphCatalog deduplicates bank-1 copies', () => {
  const catalog = buildGlyphCatalog((id) => (id < 128 ? 'a' : 'b'));
  assert.ok(catalog.includes(0));
  assert.equal(catalog.filter((id) => id === 256).length, 0);
});
