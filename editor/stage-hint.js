/** Stage foot hint and stage-bar tool chrome (modularization slice 3). */

export function fillHintText(fillMode, modes) {
  const mode = modes.find((m) => m.id === fillMode);
  const label = mode?.label ?? 'Fill';
  let suffix = '';
  if (fillMode === 'glyph') suffix = ' Changes glyph only.';
  else if (fillMode === 'ink') suffix = ' Changes ink only.';
  return `${label} · Tap a connected region of matching glyph and ink.${suffix}`;
}

export function paintHintText(paintMode, modes) {
  const mode = modes.find((m) => m.id === paintMode);
  const label = mode?.label ?? 'Paint';
  let detail = '';
  if (paintMode === 'glyph') detail = 'Changes glyph only.';
  else if (paintMode === 'ink') detail = 'Changes ink on existing cells only.';
  return `${label} · ${detail}`;
}

export function pickerHintText(pickerMode, modes) {
  const mode = modes.find((m) => m.id === pickerMode);
  const label = mode?.label ?? 'Pick';
  return `${label} · Tap a cell on the canvas.`;
}

export function symmetryHintSuffix(symmetryValue, symmetryOptionText) {
  if (symmetryValue === 'none') return '';
  return ` Symmetry: ${symmetryOptionText}.`;
}

export function zoomPanHintSuffix(editorZoomed) {
  return editorZoomed ? ' Two-finger drag pans when zoomed.' : '';
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
 * @param {boolean} state.editorZoomed
 * @param {string} state.inkLabelText
 */
export function buildDrawingHintText(state) {
  if (state.animationPreview) return 'Preview (read-only)';

  const pan = zoomPanHintSuffix(state.editorZoomed);
  const sym = symmetryHintSuffix(state.symmetryValue, state.symmetryOptionText);

  if (!['paint', 'erase'].includes(state.drawingTool)) {
    const name = state.toolNames[state.drawingTool] ?? state.drawingTool;
    let hint = name;
    if (state.drawingTool === 'fill') {
      hint = fillHintText(state.fillMode, state.fillModes);
    } else if (state.drawingTool === 'picker') {
      hint = pickerHintText(state.pickerMode, state.pickerModes);
    } else if (['line', 'rectangle', 'select'].includes(state.drawingTool)) {
      const tap =
        state.tapPoints && ['line', 'rectangle'].includes(state.drawingTool)
          ? ' · Tap endpoints'
          : ' · Drag';
      hint = name + tap;
      if (state.toolDrag) hint += ' · Cancel to abandon';
    } else if (['move', 'duplicate'].includes(state.drawingTool)) {
      hint = name + (state.tapPoints ? ' · Tap destination' : ' · Drag destination');
    }
    return hint + pan;
  }

  if (state.erasing) return `Eraser${sym}${pan}`;
  return `${paintHintText(state.paintMode, state.paintModes)}${state.inkLabelText}${sym}${pan}`;
}

/**
 * @param {object} refs
 * @param {HTMLDetailsElement} refs.menu
 * @param {HTMLElement} refs.summary
 * @param {HTMLSelectElement} refs.symSelect
 * @param {boolean} brushToolActive
 */
export function syncSymmetryChrome(refs, brushToolActive) {
  const { menu, summary, symSelect } = refs;
  const show = brushToolActive;
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