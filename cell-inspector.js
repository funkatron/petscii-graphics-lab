/** Helpers for per-cell inspector edits (no DOM). */

export function cellIndex(columns, x, y) {
  return y * columns + x;
}

/** Match Eraser stroke: empty glyph, current brush ink. */
export function erasedCellValue(brushInk) {
  return { glyph: '', ink: brushInk };
}

export function formatCellLabel(x, y) {
  return `Column ${x + 1}, row ${y + 1}`;
}