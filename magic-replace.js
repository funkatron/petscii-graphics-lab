/** Whole-drawing ink/glyph replace (Wizard-style magic replace). */

export function replaceInkInGrid(grid, cellColors, fromInk, toInk, recordCell) {
  if (fromInk === toInk) {
    return 0;
  }
  let count = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== '' && cellColors[i] === fromInk) {
      cellColors[i] = toInk;
      recordCell(i);
      count++;
    }
  }
  return count;
}

export function replaceGlyphInGrid(grid, fromGlyph, toGlyph, recordCell) {
  if (fromGlyph === toGlyph) {
    return 0;
  }
  let count = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === fromGlyph) {
      grid[i] = toGlyph;
      recordCell(i);
      count++;
    }
  }
  return count;
}