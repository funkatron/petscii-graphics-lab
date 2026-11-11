/**
 * Commodore Plus/4 / TED exploratory palette (121 colors).
 *
 * TED encodes chroma (0–15) and luma (0–7). Black (chroma 0) stays black at
 * every luma. Indices here are: 0 = black, then chroma 1–15 × luma 0–7.
 *
 * RGB is a YPbPr→RGB approximation for feel-finding, not a unique hardware
 * specification. Drawing/ink UI remains Pepto C64; these colors are for
 * Plus/4 color-animation effects only.
 *
 * Plus/4 animation ramps either walk the full TED set, or expand a C64 ramp
 * by inserting TED luma steps that fill the gaps between discrete VIC colors
 * and the richer TED continuum.
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

/** C64 Pepto ramps mirrored from animation-frames.js / COLOR_CYCLES. */
export const C64_COLOR_RAMPS = Object.freeze({
  'color-cycle': Object.freeze([0, 11, 12, 15, 1, 7, 13, 5, 3, 14, 6, 4, 2, 10, 8, 9]),
  'color-wave': Object.freeze([2, 8, 7, 13, 3, 14, 6, 4]),
  'color-glow': Object.freeze([9, 8, 2, 10, 7, 1, 7, 10, 2, 8]),
  'raster-bars': Object.freeze([0, 6, 14, 3, 1, 3, 14, 6]),
  plasma: Object.freeze([6, 4, 2, 8, 7, 13, 3, 14]),
  bonfire: Object.freeze([9, 2, 10, 8, 7, 1]),
});

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

/** Full TED set: black, then chroma 1–15 × luma 0–7. */
export function fullTedPaletteRamp() {
  const ramp = [0];
  for (let chroma = 1; chroma <= 15; chroma++) {
    for (let luma = 0; luma < 8; luma++) {
      ramp.push(tedIndex(chroma, luma));
    }
  }
  return ramp;
}

/**
 * Expand a C64 ramp into TED colors by inserting luma steps for each stop.
 * That fills the visual gaps between discrete VIC colors and TED’s continuum
 * without abandoning the original ramp’s hue path (e.g. raster bars).
 *
 * @param {readonly number[]} c64Ramp C64 palette indices
 * @param {object} [options]
 * @param {number[]} [options.lumas] luma sequence for each non-black stop
 * @param {'up'|'down'|'up-down'} [options.lumaTravel] direction through lumas
 */
export function expandC64RampFillingTedGaps(c64Ramp, options = {}) {
  const travel = options.lumaTravel || 'up';
  let lumas = options.lumas;
  if (!lumas) {
    if (travel === 'down') {
      lumas = [7, 6, 5, 4, 3, 2, 1, 0];
    } else if (travel === 'up-down') {
      lumas = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];
    } else {
      lumas = [0, 1, 2, 3, 4, 5, 6, 7];
    }
  }

  const out = [];
  for (const ink of c64Ramp) {
    if (ink === 0) {
      out.push(0);
      continue;
    }
    for (const luma of lumas) {
      out.push(tedIndex(ink, luma));
    }
  }
  return out;
}

/**
 * Unique TED colors touched by expanding a C64 ramp (for coverage checks).
 */
export function tedCoverageFromC64Ramp(c64Ramp, options) {
  return [...new Set(expandC64RampFillingTedGaps(c64Ramp, options))];
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
 * - cycle: entire 121-color TED set
 * - others: C64 ramp path with TED luma gap-fills
 */
export const PLUS4_COLOR_CYCLES = Object.freeze({
  'plus4-cycle': Object.freeze(fullTedPaletteRamp()),
  'plus4-wave': Object.freeze(
    expandC64RampFillingTedGaps(C64_COLOR_RAMPS['color-wave'], {lumaTravel: 'up'}),
  ),
  'plus4-glow': Object.freeze(
    expandC64RampFillingTedGaps(C64_COLOR_RAMPS['color-glow'], {
      // Warm glow: keep mid→bright emphasis, still fill luma gaps.
      lumas: [1, 2, 3, 4, 5, 6, 7],
    }),
  ),
  'plus4-raster': Object.freeze(
    expandC64RampFillingTedGaps(C64_COLOR_RAMPS['raster-bars'], {
      // Classic bar path with smooth TED luma bridges between VIC stops.
      lumaTravel: 'up-down',
    }),
  ),
  'plus4-plasma': Object.freeze(
    expandC64RampFillingTedGaps(C64_COLOR_RAMPS.plasma, {lumaTravel: 'up'}),
  ),
  'plus4-bonfire': Object.freeze(
    expandC64RampFillingTedGaps(C64_COLOR_RAMPS.bonfire, {
      lumas: [0, 1, 2, 3, 4, 5, 6, 7],
    }),
  ),
});
