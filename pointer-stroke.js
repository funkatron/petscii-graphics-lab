/** Map a pointer position to a grid cell index pair [x, y]. */
export function canvasCell(canvas, columns, rows, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left) * columns / rect.width);
  const y = Math.floor((clientY - rect.top) * rows / rect.height);
  return [
    Math.max(0, Math.min(columns - 1, x)),
    Math.max(0, Math.min(rows - 1, y)),
  ];
}

/** Symmetric copies of a cell, each with the reflections that produced it. */
function symmetryCopies(x, y, columns, rows, mode) {
  const points = [[x, y, false, false]];
  if (mode === 'horizontal' || mode === 'both') {
    points.push([columns - 1 - x, y, true, false]);
  }
  if (mode === 'vertical' || mode === 'both') {
    points.push([x, rows - 1 - y, false, true]);
  }
  if (mode === 'both') {
    points.push([columns - 1 - x, rows - 1 - y, true, true]);
  }
  return points;
}

/**
 * Brush painting with optional symmetry. The host supplies grid dimensions and
 * receives one callback per cell that actually changes. With `getMirrorGlyph`,
 * each reflected copy asks the host for the glyph to use (for example the
 * mirrored partner from glyph-mirror.js); without it every copy uses the brush glyph.
 */
export function createPainter(options) {
  const {
    getW,
    getH,
    getSymmetry,
    getGlyph,
    getErasing,
    getInk,
    onCell,
    getMirrorGlyph = null,
  } = options;

  function paint(x, y) {
    const columns = getW();
    const rows = getH();
    if (x < 0 || y < 0 || x >= columns || y >= rows) {
      return;
    }
    const glyph = getErasing() ? '' : getGlyph();
    const ink = getInk();
    const points = symmetryCopies(x, y, columns, rows, getSymmetry());
    for (const [px, py, flipX, flipY] of points) {
      const index = py * columns + px;
      const copyGlyph = getMirrorGlyph && (flipX || flipY) ? getMirrorGlyph(glyph, flipX, flipY) : glyph;
      onCell(index, copyGlyph, ink);
    }
  }

  function stroke(from, to) {
    const steps = Math.max(
      Math.abs(to[0] - from[0]),
      Math.abs(to[1] - from[1]),
      1,
    );
    for (let step = 0; step <= steps; step++) {
      const x = Math.round(from[0] + (to[0] - from[0]) * step / steps);
      const y = Math.round(from[1] + (to[1] - from[1]) * step / steps);
      paint(x, y);
    }
  }

  return {paint, stroke};
}
