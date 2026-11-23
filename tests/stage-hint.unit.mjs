import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDrawingHintText,
  syncTapEndpointsChrome,
  symmetryHintSuffix,
} from '../editor/stage-hint.js';

const modes = [{ id: 'both', label: 'Glyph and ink' }];
const toolNames = { line: '╱ Line', paint: 'Paint' };

function baseState(overrides = {}) {
  return {
    animationPreview: false,
    drawingTool: 'paint',
    erasing: false,
    toolDrag: null,
    tapPoints: false,
    toolNames,
    fillMode: 'both',
    fillModes: modes,
    paintMode: 'both',
    paintModes: modes,
    pickerMode: 'ink',
    pickerModes: [{ id: 'ink', label: 'Pick ink from canvas' }],
    symmetryValue: 'none',
    symmetryOptionText: 'Off',
    editorZoomed: false,
    inkLabelText: ' · Cyan',
    ...overrides,
  };
}

test('buildDrawingHintText shows preview banner copy', () => {
  const text = buildDrawingHintText(baseState({ animationPreview: true }));
  assert.equal(text, 'Preview (read-only) · Tools are off; editing returns to drawing');
});

test('buildDrawingHintText includes tap endpoints for line', () => {
  const text = buildDrawingHintText(
    baseState({ drawingTool: 'line', tapPoints: true }),
  );
  assert.match(text, /Tap endpoints/);
});

test('buildDrawingHintText warns when tool drag is active', () => {
  const text = buildDrawingHintText(
    baseState({ drawingTool: 'rectangle', toolDrag: { kind: 'rectangle' } }),
  );
  assert.match(text, /Cancel to abandon/);
});

test('syncTapEndpointsChrome clears tap when tool does not support it', () => {
  let tap = true;
  const checkbox = { checked: true };
  const slot = { inert: false, classList: { toggle() {} } };
  syncTapEndpointsChrome({ slot, checkbox }, 'paint', (on) => {
    tap = on;
  });
  assert.equal(checkbox.checked, false);
  assert.equal(tap, false);
});

test('symmetryHintSuffix empty when off', () => {
  assert.equal(symmetryHintSuffix('none', 'Off'), '');
  assert.match(symmetryHintSuffix('horizontal', 'Left/right'), /Left\/right/);
});
test('hint names the tool first for every tool (Raskin review H3)', () => {
  const names = { picker: 'Pick', fill: 'Fill', line: '╱ Line', rectangle: '□ Rectangle', select: '⬚ Select', text: 'Text' };
  const cases = [
    [{ drawingTool: 'paint' }, 'Paint · Glyph and ink · Cyan · Drag to draw'],
    [{ drawingTool: 'paint', paintMode: 'glyph' }, 'Paint · Glyph only · Drag to draw'],
    [{ drawingTool: 'paint', paintMode: 'ink' }, 'Paint · Ink only · Cyan · Drag to draw'],
    [{ drawingTool: 'erase', erasing: true }, 'Eraser · Drag to erase'],
    [{ drawingTool: 'fill', fillMode: 'ink' }, 'Fill · Ink only · Cyan · Tap a matching region'],
    [{ drawingTool: 'picker', pickerMode: 'background' }, 'Pick · Background · Tap a cell'],
    [{ drawingTool: 'line' }, 'Line · Cyan · Drag'],
    [{ drawingTool: 'rectangle', tapPoints: true }, 'Rectangle · Cyan · Tap endpoints'],
    [{ drawingTool: 'select' }, 'Select · Drag'],
    [{ drawingTool: 'move' }, 'Move · Drag destination'],
    [{ drawingTool: 'text' }, 'Text · Cyan · Tap a starting cell'],
  ];
  for (const [over, expected] of cases) {
    assert.equal(buildDrawingHintText(baseState({ toolNames: names, inkLabelText: 'Cyan', ...over })), expected);
  }
});

test('symmetry and zoom extend the hint with the same separator', () => {
  const text = buildDrawingHintText(baseState({ inkLabelText: 'Cyan', symmetryValue: 'horizontal', symmetryOptionText: 'Left/right', mirrorGlyphs: true, editorZoomed: true }));
  assert.equal(text, 'Paint · Glyph and ink · Cyan · Drag to draw · Symmetry: Left/right, mirrored glyphs · Two-finger drag pans');
});
