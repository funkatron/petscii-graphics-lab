import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editorZoomed} from '../editor/canvas-view.js';

test('editorZoomed treats 1 and below as not zoomed', () => {
  assert.equal(editorZoomed(1), false);
  assert.equal(editorZoomed(0.5), false);
  assert.equal(editorZoomed(1.25), true);
});