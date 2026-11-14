/**
 * VDC 8563/8568 RGBI drawing palette (16 colors).
 *
 * Attribute low nibble is the foreground RGBI index. Background is global.
 * Hex values follow a CGA-like RGBI presentation for the editor (not Pepto).
 *
 * Bit packing in the attribute byte (bits 3–0): typically I/R/G/B family;
 * we treat the index 0–15 as the hardware color number used in attr & $0F.
 */

const VDC_COLOR_NAMES = Object.freeze([
  'Black',
  'Blue',
  'Green',
  'Cyan',
  'Red',
  'Magenta',
  'Brown',
  'Light gray',
  'Dark gray',
  'Light blue',
  'Light green',
  'Light cyan',
  'Light red',
  'Light magenta',
  'Yellow',
  'White',
]);

/** CGA-style RGBI swatches for editor drawing. */
export const VDC_COLORS = Object.freeze([
  '#000000',
  '#0000aa',
  '#00aa00',
  '#00aaaa',
  '#aa0000',
  '#aa00aa',
  '#aa5500',
  '#aaaaaa',
  '#555555',
  '#5555ff',
  '#55ff55',
  '#55ffff',
  '#ff5555',
  '#ff55ff',
  '#ffff55',
  '#ffffff',
].map((hex, index) => Object.freeze([VDC_COLOR_NAMES[index], hex])));

export function vdcHex(index) {
  if (!Number.isInteger(index) || index < 0 || index > 15) {
    return VDC_COLORS[0][1];
  }
  return VDC_COLORS[index][1];
}

export function vdcName(index) {
  if (!Number.isInteger(index) || index < 0 || index > 15) {
    return VDC_COLOR_NAMES[0];
  }
  return VDC_COLOR_NAMES[index];
}

/**
 * Map a VIC ink (0–15) onto a cousin RGBI index for machine switches.
 * Pepto/VIC numbering is not RGBI; this is a chroma/brightness cousin, not identity.
 */
const VIC_TO_VDC = Object.freeze([
  0,  // black
  15, // white
  4,  // red
  3,  // cyan
  5,  // purple -> magenta
  2,  // green
  1,  // blue
  14, // yellow
  6,  // orange -> brown
  6,  // brown
  12, // light red
  8,  // dark gray
  7,  // gray -> light gray
  10, // light green
  9,  // light blue
  7,  // light gray
]);

/** Inverse cousin: RGBI → VIC (best-effort; not a perfect inverse of VIC_TO_VDC). */
const VDC_TO_VIC = Object.freeze([
  0,  // black
  6,  // blue
  5,  // green
  3,  // cyan
  2,  // red
  4,  // magenta -> purple
  9,  // brown
  12, // light gray -> gray
  11, // dark gray
  14, // light blue
  13, // light green
  3,  // light cyan -> cyan
  10, // light red
  4,  // light magenta -> purple
  7,  // yellow
  1,  // white
]);

export function vicInkToVdc(ink) {
  if (!Number.isInteger(ink) || ink <= 0) {
    return 0;
  }
  if (ink > 15) {
    return 15;
  }
  return VIC_TO_VDC[ink];
}

export function vdcInkToVic(ink) {
  if (!Number.isInteger(ink) || ink <= 0) {
    return 0;
  }
  if (ink > 15) {
    return 1;
  }
  return VDC_TO_VIC[ink];
}

/**
 * Pack atlas glyph ID into VDC screen code + attribute high bits.
 * bit7 = alternate charset (bank 1), bit6 = reverse (atlas code >= 128).
 * Blink/underline left clear for v1.
 */
export function atlasIdToVdcCell(glyphId) {
  if (!Number.isInteger(glyphId) || glyphId < 0 || glyphId > 511) {
    throw Error('Invalid atlas glyph ID');
  }
  const bank = glyphId > 255 ? 1 : 0;
  const code = glyphId & 255;
  const reverse = code >= 128 ? 1 : 0;
  const screen = reverse ? code - 128 : code;
  const attrHi = (bank << 7) | (reverse << 6);
  return {screen, attrHi};
}

/** Combine RGBI ink with reverse/bank bits into a full attribute byte. */
export function vdcAttr(ink, attrHi = 0) {
  if (!Number.isInteger(ink) || ink < 0 || ink > 15) {
    throw Error('Invalid VDC ink');
  }
  return (attrHi & 0xc0) | (ink & 0x0f);
}
