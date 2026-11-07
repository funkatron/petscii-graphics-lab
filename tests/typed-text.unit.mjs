import {test} from 'node:test';
import assert from 'node:assert/strict';
import {typedGlyph, planTypedText} from '../typed-text.js';

test('typedGlyph maps ASCII and C64 punctuation', () => {
  assert.equal(typedGlyph('A'), 1);
  assert.equal(typedGlyph('a'), 256 + 1);
  assert.equal(typedGlyph('@'), 0);
  assert.equal(typedGlyph('…'), null);
});

test('planTypedText wraps at right edge and honors newlines', () => {
  const cells = Array(6).fill('');
  const inks = Array(6).fill(14);
  const result = planTypedText('AB\nC', [1, 0], 3, 2, cells, inks, 5);
  assert.ifError(result.error);
  assert.equal(result.count, 3);
  assert.deepEqual(result.cells, ['', 1, 2, '', 3, '']);
  assert.deepEqual(result.inks, [14, 5, 5, 14, 5, 14]);
});
