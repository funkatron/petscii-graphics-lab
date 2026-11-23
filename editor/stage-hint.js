/** Stage foot hint and stage-bar tool chrome (modularization slice 3). */

/**
 * Canvas hint grammar (Raskin review H3): every tool reads
 * `Tool · option · ink · action`, omitting parts that do not apply.
 */
const SHORT_MODE = Object.freeze({
  both: 'Glyph and ink',
  glyph: 'Glyph only',
  ink: 'Ink only',
});
const PICK_MODE = Object.freeze({ ink: 'Ink', glyph: 'Glyph', background: 'Background' });

function joinHint(parts) {
  return parts.filter(Boolean).join(' · ');
}

export function fillHintText(fillMode, _modes, inkLabelText = '') {
  return joinHint(['Fill', SHORT_MODE[fillMode] ?? SHORT_MODE.both, fillMode === 'glyph' ? '' : inkLabelText, 'Tap a matching region']);
}

export function paintHintText(paintMode, _modes, inkLabelText = '') {
  return joinHint(['Paint', SHORT_MODE[paintMode] ?? SHORT_MODE.both, paintMode === 'glyph' ? '' : inkLabelText, 'Drag to draw']);
}

export function pickerHintText(pickerMode) {
  return joinHint(['Pick', PICK_MODE[pickerMode] ?? PICK_MODE.ink, 'Tap a cell']);
}

export function symmetryHintSuffix(symmetryValue, symmetryOptionText, mirrorGlyphs = false) {
  if (symmetryValue === 'none') return '';
  return ` · Symmetry: ${symmetryOptionText}${mirrorGlyphs ? ', mirrored glyphs' : ''}`;
}

export function zoomPanHintSuffix(editorZoomed) {
  return editorZoomed ? ' · Two-finger drag pans' : '';
}

/** Plain tool name without the decorative glyph prefix used on some labels. */
function plainToolName(toolNames, tool) {
  const name = toolNames[tool] ?? tool.charAt(0).toUpperCase() + tool.slice(1);
  return String(name).replace(/^[^A-Za-z]+\s*/, '');
}

/**
 * @param {object} state
 * @param {boolean} state.animationPreview
 * @param {string} state.drawingTool
 * @param {boolean} state.erasing
 * @param {object | null} state.toolDrag
 * @param {boolean} state.tapPoints
 * @param {Record<string, string>} state.toolNames
 * @param {string} state.fillMode
 * @param {readonly {id: string, label: string}[]} state.fillModes
 * @param {string} state.paintMode
 * @param {readonly {id: string, label: string}[]} state.paintModes
 * @param {string} state.pickerMode
 * @param {readonly {id: string, label: string}[]} state.pickerModes
 * @param {string} state.symmetryValue
 * @param {string} state.symmetryOptionText
 * @param {boolean} [state.mirrorGlyphs]
 * @param {boolean} state.editorZoomed
 * @param {string} state.inkLabelText
 */
export function buildDrawingHintText(state) {
  if (state.animationPreview) return 'Preview (read-only) · Tools are off; editing returns to drawing';

  const pan = zoomPanHintSuffix(state.editorZoomed);
  const sym = symmetryHintSuffix(state.symmetryValue, state.symmetryOptionText, state.mirrorGlyphs);
  const ink = state.inkLabelText;
  const tool = state.drawingTool;

  if (tool === 'erase' || (tool === 'paint' && state.erasing)) return joinHint(['Eraser', 'Drag to erase']) + sym + pan;
  if (tool === 'paint') return paintHintText(state.paintMode, state.paintModes, ink) + sym + pan;
  if (tool === 'fill') return fillHintText(state.fillMode, state.fillModes, ink) + pan;
  if (tool === 'picker') return pickerHintText(state.pickerMode) + pan;

  const name = plainToolName(state.toolNames, tool);
  if (['line', 'rectangle'].includes(tool)) {
    let hint = joinHint([name, ink, state.tapPoints ? 'Tap endpoints' : 'Drag']);
    if (state.toolDrag) hint += ' · Cancel to abandon';
    return hint + pan;
  }
  if (tool === 'select') {
    let hint = joinHint([name, 'Drag']);
    if (state.toolDrag) hint += ' · Cancel to abandon';
    return hint + pan;
  }
  if (['move', 'duplicate'].includes(tool)) {
    return joinHint([name, state.tapPoints ? 'Tap destination' : 'Drag destination']) + pan;
  }
  if (tool === 'text') return joinHint([name, ink, 'Tap a starting cell']) + pan;
  return name + pan;
}

/**
 * @param {object} refs
 * @param {HTMLDetailsElement} refs.menu
 * @param {HTMLElement} refs.summary
 * @param {HTMLSelectElement} refs.symSelect
 * @param {HTMLInputElement} [refs.mirror] Mirror glyph shapes checkbox
 * @param {HTMLElement} [refs.mirrorRow] Its label; stays in place, dimmed while Symmetry is Off
 * @param {boolean} brushToolActive
 */
export function syncSymmetryChrome(refs, brushToolActive) {
  const { menu, summary, symSelect, mirror, mirrorRow } = refs;
  const show = brushToolActive;
  if (mirror) {
    const off = symSelect.value === 'none';
    mirror.disabled = off;
    mirrorRow?.classList.toggle('tool-slot-inactive', off);
    if (mirrorRow) mirrorRow.title = off ? 'Choose a Symmetry option first' : 'Copies use the reflected glyph shape';
  }
  menu.inert = !show;
  summary.setAttribute('aria-disabled', String(!show));
  menu.classList.toggle('tool-slot-inactive', !show);
  if (!show) {
    menu.open = false;
    summary.title = 'Symmetry: Paint or Eraser only';
    summary.setAttribute('aria-label', 'Symmetry: Paint or Eraser only');
    return;
  }
  const optionText = symSelect.selectedOptions[0]?.textContent ?? '';
  summary.title = `Symmetry: ${optionText}`;
  summary.classList.toggle('symmetry-on', symSelect.value !== 'none');
  summary.setAttribute('aria-label', `Symmetry: ${optionText}`);
}

const TAP_TOOLS = Object.freeze(['line', 'rectangle', 'select', 'move', 'duplicate']);

/**
 * @param {object} refs
 * @param {HTMLElement} refs.slot Tap endpoints label wrapper
 * @param {HTMLInputElement} refs.checkbox
 * @param {string} drawingTool
 * @param {(next: boolean) => void} setTapPoints
 */
export function syncTapEndpointsChrome(refs, drawingTool, setTapPoints) {
  const { slot, checkbox } = refs;
  const tapOn = TAP_TOOLS.includes(drawingTool);
  slot.inert = !tapOn;
  slot.classList.toggle('tool-slot-inactive', !tapOn);
  if (!tapOn && checkbox.checked) {
    checkbox.checked = false;
    setTapPoints(false);
  }
}