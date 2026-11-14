/**
 * C64 ↔ TED atlas glyph mapping for mid-drawing machine switches.
 *
 * Default is identity by atlas ID (bank × 256 + screen code). Sparse exceptions
 * can be added if a future ROM layout mismatch is found; pixel redesigns
 * (especially TED lowercase) stay on the same ID on purpose.
 */

/** @type {ReadonlyMap<number, number>} */
const C64_TO_TED_EXCEPTIONS = Object.freeze(new Map());

/** @type {ReadonlyMap<number, number>} */
const TED_TO_C64_EXCEPTIONS = Object.freeze(new Map(
  [...C64_TO_TED_EXCEPTIONS.entries()].map(([from, to]) => [to, from]),
));

function mapGlyph(id, exceptions) {
  if (id === '' || id === null || id === undefined) {
    return id;
  }
  if (!Number.isInteger(id) || id < 0 || id > 511) {
    throw Error('Invalid atlas glyph ID');
  }
  if (exceptions.has(id)) {
    return exceptions.get(id);
  }
  return id;
}

export function c64GlyphToTed(id) {
  return mapGlyph(id, C64_TO_TED_EXCEPTIONS);
}

export function tedGlyphToC64(id) {
  return mapGlyph(id, TED_TO_C64_EXCEPTIONS);
}

export function convertGlyph(id, fromMachine, toMachine) {
  if (fromMachine === toMachine) {
    return id;
  }
  const fromTed = fromMachine === 'plus4';
  const toTed = toMachine === 'plus4';
  if (!fromTed && toTed) {
    return c64GlyphToTed(id);
  }
  if (fromTed && !toTed) {
    return tedGlyphToC64(id);
  }
  return id;
}

export function convertGlyphArray(glyphs, fromMachine, toMachine) {
  return glyphs.map((glyph) => convertGlyph(glyph, fromMachine, toMachine));
}
