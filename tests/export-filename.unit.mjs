import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  exportAnimationEffectSlug,
  nativeProgramFilename,
  animationRasterFilename,
} from '../export-filename.js';

test('effect slug lists movement, color, and backdrop', () => {
  assert.equal(
    exportAnimationEffectSlug({effect: 'scroll-x', colorEffect: 'color-wave', backgroundEffect: 'none'}),
    'scroll-x+color-wave',
  );
  assert.equal(exportAnimationEffectSlug({effect: 'none', colorEffect: 'none', backgroundEffect: 'none'}), 'still');
  assert.equal(exportAnimationEffectSlug({effect: 'inverse', colorEffect: 'none'}), 'inverse');
});

test('native program name includes machine and effect slug', () => {
  const s = {effect: 'scroll-x', colorEffect: 'color-wave', backgroundEffect: 'none'};
  assert.equal(
    nativeProgramFilename('demo', 'c64', s, {moving: true, columns: 4, rows: 1, extension: 'prg'}),
    'demo-c64-scroll-x+color-wave-4x1.prg',
  );
  assert.equal(
    nativeProgramFilename('demo', 'plus4', s, {moving: false, columns: 2, rows: 2, extension: 'd64'}),
    'demo-plus4-still-2x2.d64',
  );
});

test('raster animation name uses shared slug', () => {
  const s = {effect: 'inverse', colorEffect: 'none', backgroundEffect: 'plasma'};
  assert.equal(animationRasterFilename('Art', s, 64, 32, 'gif'), 'Art-inverse+plasma-64x32.gif');
  assert.equal(animationRasterFilename('Art', s, 64, 32, 'video', 3, 'mp4'), 'Art-inverse+plasma-64x32-3x.mp4');
});