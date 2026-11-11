/**
 * Commodore Plus/4 / TED exploratory palette (121 colors).
 *
 * TED encodes chroma (0–15) and luma (0–7). Black (chroma 0) stays black at
 * every luma. Indices here are: 0 = black, then chroma 1–15 × luma 0–7.
 *
 * RGB is a YPbPr→RGB approximation for feel-finding, not a unique hardware
 * specification. Drawing/ink UI remains Pepto C64; these colors are for
 * Plus/4 color-animation effects only.
 */

import {colorRGB} from './c64-colors.js';

const CHROMA_NAMES = [
  'Black',
  'White',
  'Red',
  'Cyan',
  'Purple',
  'Green',
  'Blue',
  'Yellow',
  'Orange',
  'Brown',
  'Yellow-green',
  'Pink',
  'Blue-green',
  'Light blue',
  'Dark blue',
  'Light green',
];

// Relative Pb/Pr from TED documentation / Wikipedia (MOS TED).
const CHROMA_PB_PR = [
  [0, 0],
  [0, 0],
  [-0.3826834, 0.9238795],
  [0.3826834, -0.9238795],
  [0.7071068, 0.7071068],
  [-0.7071068, -0.7071068],
  [1, 0],
  [-1, 0],
  [-0.7071068, 0.7071068],
  [-0.9238795, 0.3826834],
  [-0.9238795, -0.3826834],
  [0, 1],
  [0, -1],
  [0.7071068, -0.7071068],
  [0.9238795, 0.3826834],
  [-0.3826834, -0.9238795],
];

const LUMA_LEVELS = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function ypbprToHex(y, pb, pr) {
  const r = y + 1.402 * pr;
  const g = y - 0.344136 * pb - 0.714136 * pr;
  const b = y + 1.772 * pb;
  const hex = (n) => clampByte(n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** TED index: black=0, else 1 + (chroma-1)*8 + luma */
export function tedIndex(chroma, luma) {
  if (chroma <= 0) {
    return 0;
  }
  return 1 + (chroma - 1) * 8 + luma;
}

function buildPlus4Colors() {
  const colors = [['Black', '#000000']];
  for (let chroma = 1; chroma <= 15; chroma++) {
    const [pb, pr] = CHROMA_PB_PR[chroma];
    for (let luma = 0; luma < 8; luma++) {
      const name = `${CHROMA_NAMES[chroma]} L${luma}`;
      colors.push([name, ypbprToHex(LUMA_LEVELS[luma], pb, pr)]);
    }
  }
  return colors;
}

export const PLUS4_COLORS = buildPlus4Colors();

export function plus4Hex(index) {
  return PLUS4_COLORS[index][1];
}

export function plus4RGB(index) {
  return colorRGB(plus4Hex(index));
}

/** Map a C64 ink (0–15) onto a mid-luma TED cousin for ramp starts. */
export function c64InkToTed(ink, luma = 4) {
  if (!Number.isInteger(ink) || ink <= 0) {
    return 0;
  }
  if (ink > 15) {
    return tedIndex(1, luma);
  }
  return tedIndex(ink, luma);
}

export const PLUS4_COLOR_EFFECTS = Object.freeze([
  'plus4-cycle',
  'plus4-wave',
  'plus4-glow',
  'plus4-raster',
  'plus4-plasma',
  'plus4-bonfire',
]);

export function isPlus4ColorEffect(effect) {
  return PLUS4_COLOR_EFFECTS.includes(effect);
}

/**
 * TED ramps for Plus/4 twins of the C64 color animations.
 * Values are PLUS4_COLORS indices.
 */
export const PLUS4_COLOR_CYCLES = Object.freeze({
  // Soft gray→pastel walk, then chromatic mid-lumas.
  'plus4-cycle': Object.freeze([
    0,
    tedIndex(1, 2),
    tedIndex(1, 4),
    tedIndex(1, 6),
    tedIndex(3, 5),
    tedIndex(13, 5),
    tedIndex(6, 4),
    tedIndex(4, 4),
    tedIndex(11, 4),
    tedIndex(2, 4),
    tedIndex(8, 4),
    tedIndex(7, 5),
    tedIndex(5, 4),
    tedIndex(15, 5),
    tedIndex(12, 4),
    tedIndex(14, 3),
  ]),
  // Pastel chroma ribbon at a steady mid luma.
  'plus4-wave': Object.freeze([
    tedIndex(2, 4),
    tedIndex(8, 4),
    tedIndex(7, 5),
    tedIndex(10, 4),
    tedIndex(3, 5),
    tedIndex(13, 5),
    tedIndex(6, 4),
    tedIndex(4, 4),
  ]),
  // Warm paper glow with a return path.
  'plus4-glow': Object.freeze([
    tedIndex(9, 2),
    tedIndex(8, 3),
    tedIndex(2, 4),
    tedIndex(8, 5),
    tedIndex(7, 6),
    tedIndex(1, 7),
    tedIndex(7, 6),
    tedIndex(8, 5),
    tedIndex(2, 4),
    tedIndex(8, 3),
  ]),
  // Soft TED raster bars (dark → bright → dark).
  'plus4-raster': Object.freeze([
    0,
    tedIndex(6, 2),
    tedIndex(13, 4),
    tedIndex(3, 5),
    tedIndex(1, 7),
    tedIndex(3, 5),
    tedIndex(13, 4),
    tedIndex(6, 2),
  ]),
  // Pastel plasma field.
  'plus4-plasma': Object.freeze([
    tedIndex(6, 3),
    tedIndex(4, 4),
    tedIndex(2, 4),
    tedIndex(8, 4),
    tedIndex(7, 5),
    tedIndex(15, 4),
    tedIndex(3, 5),
    tedIndex(13, 5),
  ]),
  // Fire ramp on TED luminances.
  'plus4-bonfire': Object.freeze([
    tedIndex(9, 1),
    tedIndex(2, 3),
    tedIndex(8, 4),
    tedIndex(8, 5),
    tedIndex(7, 6),
    tedIndex(1, 7),
  ]),
});
