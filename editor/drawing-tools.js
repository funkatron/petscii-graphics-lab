/** Vector drawing tools: preview math and canvas drag handling (mod slice 2). */

/**
 * @param {[number, number]} start
 * @param {[number, number]} end
 */
export function normalizeSelectionRect(start, end) {
  const x0 = Math.min(start[0], end[0]);
  const y0 = Math.min(start[1], end[1]);
  const x1 = Math.max(start[0], end[0]);
  const y1 = Math.max(start[1], end[1]);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Pure preview grid for line / rectangle / select / move / duplicate drags.
 * @param {object} drag
 * @param {[number, number]} pointer Cell coords [x, y]
 * @param {object} ctx
 * @param {number} ctx.columns
 * @param {number} ctx.rows
 * @param {readonly unknown[]} ctx.grid
 * @param {readonly unknown[]} ctx.cellInks
 * @param {unknown} ctx.glyph
 * @param {unknown} ctx.ink
 * @param {{ x: number, y: number, w: number, h: number } | null} ctx.selection
 */
export function applyToolPreview(drag, pointer, ctx) {
  const W = ctx.columns;
  const H = ctx.rows;
  const cells = ctx.grid.slice();
  const inks = ctx.cellInks.slice();
  const glyph = ctx.glyph;
  const ink = ctx.ink;
  const selection = ctx.selection;

  const put = (x, y, g = glyph, c = ink) => {
    if (x >= 0 && y >= 0 && x < W && y < H) {
      cells[y * W + x] = g;
      inks[y * W + x] = c;
    }
  };

  const x0 = Math.min(drag.start[0], pointer[0]);
  const y0 = Math.min(drag.start[1], pointer[1]);
  const x1 = Math.max(drag.start[0], pointer[0]);
  const y1 = Math.max(drag.start[1], pointer[1]);

  let rect;

  if (drag.kind === 'select') {
    rect = normalizeSelectionRect(drag.start, pointer);
  } else if (drag.kind === 'line') {
    const n = Math.max(x1 - x0, y1 - y0, 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(drag.start[0] + ((pointer[0] - drag.start[0]) * i) / n);
      const y = Math.round(drag.start[1] + ((pointer[1] - drag.start[1]) * i) / n);
      put(x, y);
    }
  } else if (drag.kind === 'rectangle') {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x === x0 || x === x1 || y === y0 || y === y1) put(x, y);
      }
    }
  } else if (drag.data && selection) {
    const s = drag.data;
    const x = Math.max(0, Math.min(W - s.w, pointer[0] - (drag.offset?.[0] ?? 0)));
    const y = Math.max(0, Math.min(H - s.h, pointer[1] - (drag.offset?.[1] ?? 0)));
    rect = { x, y, w: s.w, h: s.h };
    if (drag.kind === 'move') {
      for (let yy = selection.y; yy < selection.y + selection.h; yy++) {
        for (let xx = selection.x; xx < selection.x + selection.w; xx++) {
          put(xx, yy, '');
        }
      }
    }
    s.cells.forEach((g, i) => {
      if (g !== '' || drag.kind === 'move') {
        put(x + (i % s.w), y + Math.floor(i / s.w), g, s.inks[i]);
      }
    });
  }

  return { cells, inks, rect };
}

/**
 * Dashed marquee in backing-store pixels (not exported).
 */
export function strokeToolOutline(ctx, canvas, rect, columns, rows) {
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(
    rect.x * (canvas.width / columns) + 1,
    rect.y * (canvas.height / rows) + 1,
    rect.w * (canvas.width / columns) - 2,
    rect.h * (canvas.height / rows) - 2,
  );
  ctx.restore();
}

/**
 * @param {object} options
 */
export function initDrawingTools(options) {
  const {
    canvas,
    getToolDrag,
    setToolDrag,
    getDrawingTool,
    setDrawingTool,
    setErasing,
    getTapPoints,
    getAnimationPreview,
    getRomReady,
    isContextHelpOpen,
    positionFromEvent,
    getPreviewContext,
    onPreviewFrame,
    commitTool,
    afterToolCommit,
    onSelectionFromDrag,
    redraw,
    onTextCell,
    onPickerCell,
    onFillCell,
    getSelection,
    setSelection,
    selectionData,
    clearSelection,
  } = options;

  function toolPreview(p) {
    const d = getToolDrag();
    if (!d) return;
    const result = applyToolPreview(d, p, getPreviewContext());
    d.cells = result.cells;
    d.inks = result.inks;
    d.rect = result.rect;
    onPreviewFrame(result);
  }

  function onPointerDown(e) {
    if (isContextHelpOpen()) return;
    const drawingTool = getDrawingTool();
    if (drawingTool === 'paint' || drawingTool === 'erase') return;
    e.stopImmediatePropagation();
    const toolDrag = getToolDrag();
    if (toolDrag?.anchor) {
      if (getAnimationPreview() || !getRomReady() || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) {
        return;
      }
      toolDrag.id = e.pointerId;
      toolDrag.anchor = false;
      toolDrag.second = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      toolPreview(positionFromEvent(e));
      return;
    }
    if (getAnimationPreview() || !getRomReady() || toolDrag || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) {
      return;
    }
    e.preventDefault();
    const p = positionFromEvent(e);
    if (drawingTool === 'text') {
      onTextCell(p);
      return;
    }
    if (drawingTool === 'picker') {
      onPickerCell(p);
      return;
    }
    if (drawingTool === 'fill') {
      onFillCell(p);
      return;
    }
    let kind = drawingTool;
    let data;
    let offset;
    const selection = getSelection();
    if (
      ['select', 'move', 'duplicate'].includes(kind) &&
      selection &&
      p[0] >= selection.x &&
      p[0] < selection.x + selection.w &&
      p[1] >= selection.y &&
      p[1] < selection.y + selection.h
    ) {
      data = selectionData();
      offset = [p[0] - selection.x, p[1] - selection.y];
      if (kind !== 'duplicate') kind = 'move';
    } else if (['select', 'move', 'duplicate'].includes(kind)) {
      kind = 'select';
      clearSelection();
    }
    setToolDrag({ kind, data, offset, start: p, id: e.pointerId });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    toolPreview(p);
  }

  function onPointerMove(e) {
    const toolDrag = getToolDrag();
    if (!toolDrag || toolDrag.anchor || toolDrag.id !== e.pointerId) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    toolPreview(positionFromEvent(e));
  }

  function onPointerEnd(e) {
    const toolDrag = getToolDrag();
    if (!toolDrag || toolDrag.id !== e.pointerId || (toolDrag.anchor && e.type === 'lostpointercapture')) return;
    e.stopImmediatePropagation();
    const d = toolDrag;
    if (e.type === 'pointerup' && getTapPoints() && !d.second) {
      d.anchor = true;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (e.type === 'pointerup') toolPreview(positionFromEvent(e));
    setToolDrag(null);
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (e.type === 'pointerup') {
      if (d.kind !== 'select') commitTool(d.cells, d.inks);
      if (d.rect && ['select', 'move', 'duplicate'].includes(d.kind)) {
        setSelection(d.rect);
        setDrawingTool('select');
        setErasing(false);
        onSelectionFromDrag();
      }
      afterToolCommit();
      redraw();
    }
  }

  function attachToolListeners() {
    canvas.addEventListener('pointerdown', onPointerDown, true);
    canvas.addEventListener('pointermove', onPointerMove, true);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(type, onPointerEnd, true);
    }
  }

  return { toolPreview, attachToolListeners, clearDrag: () => setToolDrag(null) };
}