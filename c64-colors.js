/** Pepto PAL names and RGB hex approximations (see README). */
export const C64_COLORS = [
  ['Black', '#000000'],
  ['White', '#ffffff'],
  ['Red', '#68372b'],
  ['Cyan', '#70a4b2'],
  ['Purple', '#6f3d86'],
  ['Green', '#588d43'],
  ['Blue', '#352879'],
  ['Yellow', '#b8c76f'],
  ['Orange', '#6f4f25'],
  ['Brown', '#433900'],
  ['Light red', '#9a6759'],
  ['Dark gray', '#444444'],
  ['Gray', '#6c6c6c'],
  ['Light green', '#9ad284'],
  ['Light blue', '#6c5eb5'],
  ['Light gray', '#959595'],
];

export function colorRGB(hex) {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

export function inkHex(inkIndex) {
  return C64_COLORS[inkIndex][1];
}
