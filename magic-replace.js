/** Whole-drawing ink/glyph replace (Wizard-style magic replace). */

/** `inScope(index)` limits the change, e.g. to a selection; defaults to every cell. */
export function replaceInkInGrid(grid, cellColors, fromInk, toInk, recordCell, inScope = () => true) {
  if (fromInk === toInk) {
    return 0;
  }
  let count = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== '' && cellColors[i] === fromInk && inScope(i)) {
      cellColors[i] = toInk;
      recordCell(i);
      count++;
    }
  }
  return count;
}

export function replaceGlyphInGrid(grid, fromGlyph, toGlyph, recordCell, inScope = () => true) {
  if (fromGlyph === toGlyph) {
    return 0;
  }
  let count = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === fromGlyph && inScope(i)) {
      grid[i] = toGlyph;
      recordCell(i);
      count++;
    }
  }
  return count;
}