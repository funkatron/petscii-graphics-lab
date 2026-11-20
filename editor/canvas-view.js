/** Editor canvas zoom and center guides (modularization slice 1a). */

export function editorZoomed(canvasZoom) {
  return canvasZoom > 1.001;
}

export function centerFrameScroll(frame, canvasZoom) {
  if (canvasZoom <= 1) return;
  const left = Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2);
  const top = Math.max(0, (frame.scrollHeight - frame.clientHeight) / 2);
  const behavior = 'instant' in window ? 'instant' : 'auto';
  frame.scrollTo({left, top, behavior});
}

/**
 * Dashed orange axes through canvas center (editor only; not in exports).
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