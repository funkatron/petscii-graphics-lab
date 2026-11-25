/** Editor canvas zoom, fit, and frame pan (modularization slices 1a–1b). */

export function editorZoomed(canvasZoom) {
  return canvasZoom > 1.001;
}

export function centerFrameScroll(frame, canvasZoom) {
  if (canvasZoom <= 1) return;
  const left = Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2);
  const top = Math.max(0, (frame.scrollHeight - frame.clientHeight) / 2);
  const behavior = 'instant' in window ? 'instant' : 'auto';
  frame.scrollTo({ left, top, behavior });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 */
export function drawCenterGuides(ctx, canvas, columns, rows, enabled, animationPreview) {
  if (!enabled || animationPreview) return;
  const cellW = canvas.width / columns;
  const cellH = canvas.height / rows;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const stroke = Math.max(1, Math.min(cellW, cellH) / 10);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,132,48,.85)';
  ctx.lineWidth = stroke;
  const dash = Math.max(3, Math.round(Math.min(cellW, cellH) / 4));
  ctx.setLineDash([dash, dash]);
  ctx.beginPath();
  ctx.moveTo(cx + 0.5, 0);
  ctx.lineTo(cx + 0.5, canvas.height);
  ctx.moveTo(0, cy + 0.5);
  ctx.lineTo(canvas.width, cy + 0.5);
  ctx.stroke();
  ctx.restore();
}

/** Pure fit math for unit tests. */
export function computeFitLayout({ availableW, availableH, columns, rows, aw, ah, canvasZoom, dpr = 1 }) {
  const fitScale = Math.max(1, Math.min(availableW / (columns * aw), availableH / (rows * ah)));
  const scale = fitScale * canvasZoom;
  const width = Math.round(columns * aw * scale);
  const height = Math.round(rows * ah * scale);
  const safeDpr = Math.min(dpr || 1, 3);
  return {
    width,
    height,
    styleW: width + 'px',
    styleH: height + 'px',
    pixelWidth: Math.round(width * safeDpr),
    pixelHeight: Math.round(height * safeDpr),
    unit: width / columns,
  };
}

export function nextCanvasZoomFromWheel(zoomLevels, currentZoom, deltaY) {
  let index = zoomLevels.indexOf(currentZoom);
  if (index < 0) {
    index = Math.max(0, zoomLevels.findIndex((z) => z >= currentZoom));
  }
  const step = deltaY < 0 ? 1 : -1;
  const next = index + step;
  const clamped = Math.max(0, Math.min(zoomLevels.length - 1, next));
  return zoomLevels[clamped];
}

/**
 * @param {object} options
 * @param {HTMLElement} options.frame
 * @param {HTMLCanvasElement} options.canvas
 * @param {HTMLSelectElement} options.editorZoom
 * @param {readonly number[]} options.zoomLevels
 * @param {(value: unknown) => boolean} options.isCanvasZoom
 * @param {() => number} options.getCanvasZoom
 * @param {(zoom: number) => void} options.setCanvasZoomState
 * @param {() => void} [options.persistZoom]
 * @param {() => { columns: number, rows: number, machine: string, cellAspect: string }} options.getGridContext
 * @param {(machine: string, aspect: string) => { aw: number, ah: number }} options.cellAspectUnits
 * @param {() => void} options.redraw
 * @param {() => void} options.updateDrawingHint
 * @param {() => boolean} options.getAnimationPreview
 * @param {() => void} options.onCancelStroke
 * @param {(unit: number) => void} options.setUnit
 */
export function initCanvasView(options) {
  const {
    frame,
    canvas,
    editorZoom,
    zoomLevels,
    isCanvasZoom,
    getCanvasZoom,
    setCanvasZoomState,
    persistZoom,
    getGridContext,
    cellAspectUnits,
    redraw,
    updateDrawingHint,
    getAnimationPreview,
    onCancelStroke,
    setUnit,
  } = options;

  let fittedGridKey = '';
  const panPointers = new Map();
  let panScrollAnchor = null;
  let listenersAttached = false;

  function isEditorZoomed() {
    return editorZoomed(getCanvasZoom());
  }

  function panPointerCount() {
    return panPointers.size;
  }

  function panCentroid() {
    let x = 0;
    let y = 0;
    for (const p of panPointers.values()) {
      x += p.x;
      y += p.y;
    }
    const n = panPointers.size;
    if (!n) {
      return { x: 0, y: 0 };
    }
    return { x: x / n, y: y / n };
  }

  function syncPanScrollAnchor() {
    const c = panCentroid();
    panScrollAnchor = { sl: frame.scrollLeft, st: frame.scrollTop, x: c.x, y: c.y };
  }

  function applyZoomPan() {
    if (!panScrollAnchor || panPointers.size < 2) return;
    const c = panCentroid();
    frame.scrollLeft = Math.max(0, panScrollAnchor.sl - (c.x - panScrollAnchor.x));
    frame.scrollTop = Math.max(0, panScrollAnchor.st - (c.y - panScrollAnchor.y));
  }

  function trackPanPointer(e) {
    panPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (panPointers.size >= 2) {
      onCancelStroke();
      if (!panScrollAnchor) syncPanScrollAnchor();
      try {
        frame.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  function releasePanPointer(e) {
    panPointers.delete(e.pointerId);
    try {
      frame.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (panPointers.size < 2) panScrollAnchor = null;
  }

  function updateCanvasViewChrome() {
    const canvasZoom = getCanvasZoom();
    const zoomed = editorZoomed(canvasZoom);
    frame.classList.toggle('canvas-zoomed', zoomed);
    frame.setAttribute('data-zoom', String(canvasZoom));
    if (editorZoom.value !== String(canvasZoom)) editorZoom.value = String(canvasZoom);
    updateDrawingHint();
    if (zoomed) requestAnimationFrame(() => centerFrameScroll(frame, canvasZoom));
  }

  function fit() {
    // Fit inside the frame's content box. The bevel border and padding vary by
    // breakpoint, so measure them; a fixed inset let the canvas overshoot and CSS
    // max-width/max-height then squashed one axis, distorting the cell shape.
    const r = frame.getBoundingClientRect();
    const cs = getComputedStyle(frame);
    const px = (name) => parseFloat(cs[name]) || 0;
    const insetX = px('borderLeftWidth') + px('borderRightWidth') + px('paddingLeft') + px('paddingRight');
    const insetY = px('borderTopWidth') + px('borderBottomWidth') + px('paddingTop') + px('paddingBottom');
    const availableW = Math.max(20, r.width - insetX - 4);
    const availableH = Math.max(20, r.height - insetY - 4);
    const { columns, rows, machine, cellAspect } = getGridContext();
    const { aw, ah } = cellAspectUnits(machine, cellAspect);
    const canvasZoom = getCanvasZoom();
    const layout = computeFitLayout({
      availableW,
      availableH,
      columns,
      rows,
      aw,
      ah,
      canvasZoom,
      dpr: devicePixelRatio,
    });
    const unchangedSize =
      canvas.style.width === layout.styleW &&
      canvas.style.height === layout.styleH &&
      canvas.width === layout.pixelWidth &&
      canvas.height === layout.pixelHeight;
    setUnit(layout.unit);
    if (!unchangedSize) {
      canvas.style.width = layout.styleW;
      canvas.style.height = layout.styleH;
      if (canvas.width !== layout.pixelWidth) canvas.width = layout.pixelWidth;
      if (canvas.height !== layout.pixelHeight) canvas.height = layout.pixelHeight;
    }
    const gridKey = `${columns}x${rows}x${cellAspect}x${machine}x${canvasZoom}`;
    if (unchangedSize && fittedGridKey === gridKey) return;
    fittedGridKey = gridKey;
    redraw();
    updateCanvasViewChrome();
  }

  function setCanvasZoom(next, opts = { persist: true, scroll: true }) {
    const value = isCanvasZoom(next) ? Number(next) : 1;
    if (value === getCanvasZoom()) return;
    setCanvasZoomState(value);
    if (opts.persist && persistZoom) persistZoom();
    fittedGridKey = '';
    fit();
    if (opts.scroll && value > 1) {
      requestAnimationFrame(() => centerFrameScroll(frame, value));
    }
  }

  function populateZoomSelect() {
    editorZoom.replaceChildren(
      ...zoomLevels.map((z) => new Option(z === 1 ? 'Fit (100%)' : Math.round(z * 100) + '%', String(z))),
    );
    editorZoom.value = String(getCanvasZoom());
    editorZoom.onchange = () => setCanvasZoom(editorZoom.value);
  }

  function attachWheelAndPan() {
    if (listenersAttached) return;
    listenersAttached = true;

    frame.addEventListener(
      'wheel',
      (e) => {
        if (getAnimationPreview() || (!e.ctrlKey && !e.metaKey)) return;
        e.preventDefault();
        setCanvasZoom(nextCanvasZoomFromWheel(zoomLevels, getCanvasZoom(), e.deltaY));
      },
      { passive: false },
    );

    frame.addEventListener(
      'pointerdown',
      (e) => {
        if (!isEditorZoomed() || getAnimationPreview() || e.pointerType === 'mouse') return;
        trackPanPointer(e);
        if (panPointers.size >= 2 && e.cancelable) e.preventDefault();
      },
      true,
    );
    frame.addEventListener(
      'pointermove',
      (e) => {
        if (panPointers.size < 2 || !panPointers.has(e.pointerId)) return;
        panPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        applyZoomPan();
        if (e.cancelable) e.preventDefault();
      },
      true,
    );
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      frame.addEventListener(
        type,
        (e) => {
          if (panPointers.has(e.pointerId)) releasePanPointer(e);
        },
        true,
      );
    }

    frame.addEventListener(
      'touchstart',
      (e) => {
        if (getAnimationPreview()) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (!isEditorZoomed()) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (e.touches.length >= 2) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (e.target === canvas && e.cancelable) e.preventDefault();
      },
      { passive: false },
    );
    frame.addEventListener(
      'touchmove',
      (e) => {
        if (getAnimationPreview()) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (!isEditorZoomed()) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (e.touches.length >= 2) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (e.target === canvas && e.cancelable) e.preventDefault();
      },
      { passive: false },
    );
    for (const type of ['gesturestart', 'gesturechange']) {
      frame.addEventListener(type, (e) => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
    }
  }

  return {
    fit,
    setCanvasZoom,
    updateCanvasViewChrome,
    isEditorZoomed,
    panPointerCount,
    populateZoomSelect,
    attachWheelAndPan,
    invalidateFittedKey: () => {
      fittedGridKey = '';
    },
  };
}