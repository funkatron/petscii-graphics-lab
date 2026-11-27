import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTabIndex, clickedBackdrop } from '../editor/download-shell.js';

test('nextTabIndex wraps arrows and jumps with Home/End', () => {
  assert.equal(nextTabIndex(0, 'ArrowRight', 3), 1);
  assert.equal(nextTabIndex(2, 'ArrowRight', 3), 0);
  assert.equal(nextTabIndex(0, 'ArrowLeft', 3), 2);
  assert.equal(nextTabIndex(1, 'ArrowLeft', 3), 0);
  assert.equal(nextTabIndex(1, 'Home', 3), 0);
  assert.equal(nextTabIndex(0, 'End', 3), 2);
});

test('nextTabIndex ignores other keys and empty tab lists', () => {
  assert.equal(nextTabIndex(1, 'Enter', 3), -1);
  assert.equal(nextTabIndex(1, 'a', 3), -1);
  assert.equal(nextTabIndex(0, 'ArrowRight', 0), -1);
});

test('clickedBackdrop is true only outside the dialog box', () => {
  const rect = { left: 10, right: 110, top: 20, bottom: 220 };
  assert.equal(clickedBackdrop(rect, 50, 50), false);
  assert.equal(clickedBackdrop(rect, 10, 20), false);
  assert.equal(clickedBackdrop(rect, 5, 50), true);
  assert.equal(clickedBackdrop(rect, 50, 221), true);
});
