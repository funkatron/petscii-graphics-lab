/**
 * VIC-II 16-color display palettes (names shared; RGB varies by preset).
 *
 * Pepto PAL is the editor default. Colodore and VICE come from common emulator
 * tables. RGB is a brighter web-style interpretation for comparison, not a
 * claim of official VIC hardware RGB.
 *
 * References:
 * - Pepto: https://www.pepto.de/projects/colorvic/2001/
 * - Colodore / VICE colodore.vpl: https://www.colodore.com/
 * - VICE default.vpl (C128 data palette family)
 */

const COLOR_NAMES = Object.freeze([
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
  'Light red',
  'Dark gray',
  'Gray',
  'Light green',
  'Light blue',
  'Light gray',
]);

function tableFromHex(hexes) {
  return Object.freeze(hexes.map((hex, index) => Object.freeze([COLOR_NAMES[index], hex])));
}

/** Pepto PAL (legacy editor default). */
export const PEPTO_COLORS = tableFromHex([
  '#000000',
  '#ffffff',
  '#68372b',
  '#70a4b2',
  '#6f3d86',
  '#588d43',
  '#352879',
  '#b8c76f',
  '#6f4f25',
  '#433900',
  '#9a6759',
  '#444444',
  '#6c6c6c',
  '#9ad284',
  '#6c5eb5',
  '#959595',
]);

/** Colodore (VICE colodore.vpl). */
export const COLODORE_COLORS = tableFromHex([
  '#000000',
  '#ffffff',
  '#96282e',
  '#5bd6ce',
  '#9f2dad',
  '#41b936',
  '#2724c4',
  '#eff347',
  '#9f4815',
  '#5e3500',
  '#da5f66',
  '#474747',
  '#787878',
  '#91ff84',
  '#6864ff',
  '#aeaeae',
]);

/** VICE default-style brighter table. */
export const VICE_COLORS = tableFromHex([
  '#000000',
  '#fdfefc',
  '#be1a24',
  '#30e6c6',
  '#b41ae2',
  '#1fd21e',
  '#211bae',
  '#dff60a',
  '#b84104',
  '#6a3304',
  '#fe4a57',
  '#424540',
  '#70746f',
  '#59fe59',
  '#5f53fe',
  '#a4a7a2',
]);

/** Bright RGB / CSS-style display interpretation. */
export const RGB_COLORS = tableFromHex([
  '#000000',
  '#ffffff',
  '#ff0000',
  '#00ffff',
  '#ff00ff',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ffa000',
  '#804000',
  '#ff8080',
  '#404040',
  '#808080',
  '#80ff80',
  '#8080ff',
  '#c0c0c0',
]);

export const DISPLAY_PALETTES = Object.freeze({
  pepto: Object.freeze({id: 'pepto', label: 'Pepto PAL', colors: PEPTO_COLORS}),
  colodore: Object.freeze({id: 'colodore', label: 'Colodore', colors: COLODORE_COLORS}),
  vice: Object.freeze({id: 'vice', label: 'VICE', colors: VICE_COLORS}),
  rgb: Object.freeze({id: 'rgb', label: 'RGB', colors: RGB_COLORS}),
});

export const DISPLAY_PALETTE_IDS = Object.freeze(Object.keys(DISPLAY_PALETTES));

/** @deprecated Prefer paletteColors('pepto') — kept for existing imports. */
export const C64_COLORS = PEPTO_COLORS;

export function colorRGB(hex) {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

export function paletteColors(paletteId = 'pepto') {
  const palette = DISPLAY_PALETTES[paletteId];
  if (!palette) {
    return PEPTO_COLORS;
  }
  return palette.colors;
}

export function inkHex(inkIndex, paletteId = 'pepto') {
  const colors = paletteColors(paletteId);
  return colors[inkIndex][1];
}

export function inkName(inkIndex, paletteId = 'pepto') {
  const colors = paletteColors(paletteId);
  return colors[inkIndex][0];
}

export function isDisplayPaletteId(value) {
  return typeof value === 'string' && Object.hasOwn(DISPLAY_PALETTES, value);
}
