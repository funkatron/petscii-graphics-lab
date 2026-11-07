/** Screen codes treated as letters or digits in the graphics-first palette. */
export function alphanumericCode(code) {
  const withinBank = code % 128;
  const isLetter = withinBank >= 1 && withinBank <= 26;
  const isDigit = withinBank >= 48 && withinBank <= 57;
  const isUppercaseInBank1 = code >= 256 && withinBank >= 65 && withinBank <= 90;
  return isLetter || isDigit || isUppercaseInBank1;
}

export function graphicsCode(code) {
  return !alphanumericCode(code);
}

/** Curated shape families on the built-in ROM layout (bank 0 + inverse pairs). */
export const GLYPH_FAMILY_GROUPS = {
  blocks: [32, 96, 97, 98, 99, 100, 101, 102, 103, 104, 106, 111, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127],
  lines: [64, 66, 67, 68, 69, 70, 71, 72, 82, 91, 93, 107, 112, 113, 114, 115],
  corners: [73, 74, 75, 76, 79, 80, 85, 108, 109, 110],
  diagonals: [77, 78, 86, 92, 95, 105],
  symbols: [65, 81, 83, 87, 88, 90, 94],
};

export function familyGlyphCodes(family, recentGlyphs, favoriteGlyphs) {
  if (family === 'recent' || family === 'favorites') {
    const list = family === 'recent' ? recentGlyphs : favoriteGlyphs;
    return list.filter((entry) => entry[0] === 0).map((entry) => entry[1]);
  }
  const base = GLYPH_FAMILY_GROUPS[family];
  if (!base) {
    return [];
  }
  return base.flatMap((code) => [code, code + 128]).filter(graphicsCode);
}

/**
 * Build selectable atlas IDs: bank 0, then unique bank-1 shapes with inverses.
 * `romKey` maps an atlas ID to an 8-byte pattern fingerprint string.
 */
export function buildGlyphCatalog(romKey) {
  const codes = Array.from({length: 128}, (_, screen) => [screen, screen + 128]).flat();
  if (!romKey) {
    return codes;
  }
  const seen = new Set(codes.map(romKey));
  for (let code = 256; code < 384; code++) {
    const needsPrimary = !seen.has(romKey(code));
    const needsInverse = !seen.has(romKey(code + 128));
    if (needsPrimary || needsInverse) {
      codes.push(code, code + 128);
      seen.add(romKey(code));
      seen.add(romKey(code + 128));
    }
  }
  return codes;
}
