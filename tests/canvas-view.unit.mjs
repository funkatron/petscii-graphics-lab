import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  editorZoomed,
  computeFitLayout,
  nextCanvasZoomFromWheel,
} from '../editor/canvas-view.js';

test('editorZoomed treats 1 and below as not zoomed', () => {
  assert.equal(editorZoomed(1), false);
  assert.equal(editorZoomed(0.5), false);
  assert.equal(editorZoomed(1.25), true);
});

test('computeFitLayout doubles CSS size at 2× editor zoom', () => {
  const base = computeFitLayout({
    availableW: 320,
    availableH: 240,
    columns: 16,
    rows: 16,
    aw: 1,
    ah: 1,
    canvasZoom: 1,
    dpr: 1,
  });
  const zoomed = computeFitLayout({
    availableW: 320,
    availableH: 240,
    columns: 16,
    rows: 16,
    aw: 1,
    ah: 1,
    canvasZoom: 2,
    dpr: 1,
  });
  assert.equal(zoomed.width, base.width * 2);
  assert.equal(zoomed.unit, base.unit * 2);
});

test('nextCanvasZoomFromWheel steps along CANVAS_ZOOM_LEVELS', () => {
  const levels = [1, 1.25, 1.5, 2, 3];
  assert.equal(nextCanvasZoomFromWheel(levels, 1, -1), 1.25);
  assert.equal(nextCanvasZoomFromWheel(levels, 1.25, 1), 1);
  assert.equal(nextCanvasZoomFromWheel(levels, 3, -1), 3);
});