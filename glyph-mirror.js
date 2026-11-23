/**
 * Mirrored glyph partners for symmetric painting.
 *
 * A symmetry brush copies strokes to mirrored cells. Glyphs with a direction
 * (triangles, arcs, corners, half blocks) only look mirrored if each copy uses
 * the glyph whose pixels are the reflection of the painted one. These tables
 * find that partner by comparing bitmaps in the active glyph data, so C64/C128
 * and Plus/4 (TED) artwork each use their own shapes.
 */

/** Number of glyphs in a two-bank atlas (bank × 256 + screen code). */
export const GLYPH_COUNT = 512;

function reverseBits(byte) {
  let out = 0;
  for (let bit = 0; bit < 8; bit++) {
    if (byte & (1 << bit)) out |= 0x80 >> bit;
  }
  return out;
}

function sameRows(glyphBits, candidate, rows) {
  for (let row = 0; row < 8; row++) {
    if (glyphBits[candidate * 8 + row] !== rows[row]) return false;
  }
  return true;
}

/**
 * Alignments of a flipped shape to try after an exact match fails: the same shape moved one
 * pixel toward either side, when the pixels that would fall off that side are blank. The
 * ROM draws some mirrored pairs one pixel apart (233 lower-right triangle starts in row 1;
 * its top↔bottom partner 95 ends in row 7). Moved rows or columns entering from the far
 * side may hold anything, so `masks` marks which bits must agree.
 */
function shiftedTargets(rows, vertical) {
  const out = [];
  if (vertical) {
    if (rows[7] === 0) out.push({rows: [0, ...rows.slice(0, 7)], skipRow: 0});
    if (rows[0] === 0) out.push({rows: [...rows.slice(1), 0], skipRow: 7});
  } else {
    if (rows.every((byte) => (byte & 1) === 0)) out.push({rows: rows.map((byte) => byte >> 1), mask: 0x7f});
    if (rows.every((byte) => (byte & 0x80) === 0)) out.push({rows: rows.map((byte) => (byte << 1) & 0xff), mask: 0xfe});
  }
  return out;
}

function matchesShift(glyphBits, candidate, shift) {
  for (let row = 0; row < 8; row++) {
    if (row === shift.skipRow) continue;
    const mask = shift.mask ?? 0xff;
    if ((glyphBits[candidate * 8 + row] & mask) !== shift.rows[row]) return false;
  }
  return true;
}

/**
 * Build mirror tables from 4096 bytes of glyph rows (2 banks × 256 glyphs × 8 rows).
 * `horizontal[id]` is the glyph drawn as `id` flipped left↔right; `vertical[id]` as `id`
 * flipped top↔bottom. An exact pixel match wins. Otherwise a glyph that matches the flip
 * moved by one pixel is accepted (see shiftedTargets), because the ROM offsets some pairs
 * such as the corner triangles. Same-bank partners win ties; then the lowest id.
 * -1 means no partner, so the glyph keeps its orientation.
 * @param {Uint8Array} glyphBits
 * @returns {{horizontal: Int16Array, vertical: Int16Array}}
 */
export function buildMirrorTables(glyphBits) {
  if (!(glyphBits instanceof Uint8Array) || glyphBits.length !== GLYPH_COUNT * 8) {
    throw Error('Glyph data must be 4096 bytes');
  }
  const pick = (id, test) => {
    const bank = id >> 8;
    if (test(id)) return id;
    let fallback = -1;
    for (let candidate = 0; candidate < GLYPH_COUNT; candidate++) {
      if (!test(candidate)) continue;
      if (candidate >> 8 === bank) return candidate;
      if (fallback < 0) fallback = candidate;
    }
    return fallback;
  };
  const partner = (id, flipped, vertical) => {
    const exact = pick(id, (candidate) => sameRows(glyphBits, candidate, flipped));
    if (exact >= 0) return exact;
    for (const shift of shiftedTargets(flipped, vertical)) {
      const near = pick(id, (candidate) => matchesShift(glyphBits, candidate, shift));
      if (near >= 0) return near;
    }
    return -1;
  };
  const horizontal = new Int16Array(GLYPH_COUNT);
  const vertical = new Int16Array(GLYPH_COUNT);
  for (let id = 0; id < GLYPH_COUNT; id++) {
    const rows = Array.from(glyphBits.subarray(id * 8, id * 8 + 8));
    horizontal[id] = partner(id, rows.map(reverseBits), false);
    vertical[id] = partner(id, rows.slice().reverse(), true);
  }
  return {horizontal, vertical};
}

/**
 * The glyph to paint in a mirrored copy. `flipX` for copies reflected left↔right,
 * `flipY` for top↔bottom. Empty cells and glyphs without a partner are returned
 * unchanged, so letters and asymmetric shapes keep their orientation.
 * @param {number|''} glyph
 * @param {boolean} flipX
 * @param {boolean} flipY
 * @param {{horizontal: Int16Array, vertical: Int16Array}} tables
 */
export function mirrorGlyph(glyph, flipX, flipY, tables) {
  if (typeof glyph !== 'number' || !tables) return glyph;
  let id = glyph;
  if (flipX) {
    const next = tables.horizontal[id];
    if (next < 0) return glyph;
    id = next;
  }
  if (flipY) {
    const next = tables.vertical[id];
    if (next < 0) return glyph;
    id = next;
  }
  return id;
}
