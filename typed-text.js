/** Map a typed character to an atlas glyph ID, or null when unsupported. */
export function typedGlyph(character) {
  const code = character.codePointAt(0);
  if (code >= 65 && code <= 90) {
    return code - 64;
  }
  if (code >= 97 && code <= 122) {
    return 256 + code - 96;
  }
  if (code >= 32 && code <= 63) {
    return code;
  }
  if (character === '@') {
    return 0;
  }
  if (character === '[') {
    return 27;
  }
  if (character === ']') {
    return 29;
  }
  return null;
}

/**
 * Lay out typed text on a grid from a starting cell. Returns cells/inks or an error string.
 */
export function planTypedText(text, origin, columns, rows, cells, inks, brushInk) {
  const nextCells = cells.slice();
  const nextInks = inks.slice();
  let column = origin[0];
  let row = origin[1];
  let characterCount = 0;
  const normalized = text.replace(/\r\n?/g, '\n');

  for (const character of normalized) {
    if (character === '\n') {
      column = origin[0];
      row += 1;
      continue;
    }
    const glyphId = typedGlyph(character);
    if (glyphId === null) {
      return {error: `Unsupported character: ${character}. Use A–Z, a–z, 0–9 or C64 punctuation.`};
    }
    if (column >= columns) {
      column = origin[0];
      row += 1;
    }
    if (row >= rows) {
      return {error: 'Text does not fit. Shorten it or tap an earlier starting cell.'};
    }
    const index = row * columns + column;
    nextCells[index] = glyphId;
    nextInks[index] = brushInk;
    column += 1;
    characterCount += 1;
  }
  return {cells: nextCells, inks: nextInks, count: characterCount};
}
