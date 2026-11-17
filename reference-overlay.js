/** Reference image → grid conversion (approximate PETSCII; not photo-accurate). */

export const REFERENCE_EMPTY_FILL = 0.12;

const SAMPLE = 8;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function nearestPaletteIndex(r, g, b, paletteHex) {
  let best = 0;
  let dist = Infinity;
  for (let i = 0; i < paletteHex.length; i++) {
    const [pr, pg, pb] = hexToRgb(paletteHex[i]);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < dist) {
      dist = d;
      best = i;
    }
  }
  return best;
}

export function cellBitmapFromRegion(data, imgWidth, x0, y0, pw, ph) {
  const bits = Array(SAMPLE * SAMPLE).fill(0);
  let sum = 0;
  let count = 0;
  for (let sy = 0; sy < SAMPLE; sy++) {
    for (let sx = 0; sx < SAMPLE; sx++) {
      const px = Math.min(imgWidth - 1, Math.floor(x0 + ((sx + 0.5) / SAMPLE) * pw));
      const py = Math.min(data.length / (imgWidth * 4) - 1, Math.floor(y0 + ((sy + 0.5) / SAMPLE) * ph));
      const o = (py * imgWidth + px) * 4;
      const lum = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
      sum += lum;
      count++;
    }
  }
  const mean = sum / count;
  let on = 0;
  for (let sy = 0; sy < SAMPLE; sy++) {
    for (let sx = 0; sx < SAMPLE; sx++) {
      const px = Math.min(imgWidth - 1, Math.floor(x0 + ((sx + 0.5) / SAMPLE) * pw));
      const py = Math.min(data.length / (imgWidth * 4) - 1, Math.floor(y0 + ((sy + 0.5) / SAMPLE) * ph));
      const o = (py * imgWidth + px) * 4;
      const lum = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
      const bit = lum >= mean ? 1 : 0;
      bits[sy * SAMPLE + sx] = bit;
      on += bit;
    }
  }
  return {bits, fill: on / (SAMPLE * SAMPLE)};
}

export function glyphPatternBits(rows) {
  const bits = [];
  for (let row = 0; row < 8; row++) {
    let byte = rows[row] ?? 0;
    for (let bit = 0; bit < 8; bit++) {
      bits.push(byte & (0x80 >> bit) ? 1 : 0);
    }
  }
  return bits;
}

function patternDistance(a, b) {
  let d = 0;
  for (let i = 0; i < 64; i++) d += a[i] === b[i] ? 0 : 1;
  return d;
}

export function pickGlyphForBitmap(bits, candidates, glyphRowsFor) {
  let best = 160;
  let dist = Infinity;
  for (const id of candidates) {
    const rows = glyphRowsFor(id);
    if (!rows) continue;
    const gBits = glyphPatternBits(rows);
    const d = patternDistance(bits, gBits);
    if (d < dist) {
      dist = d;
      best = id;
    }
  }
  return best;
}

export function averageRgbOnBits(data, imgWidth, x0, y0, pw, ph, bits) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let sy = 0; sy < SAMPLE; sy++) {
    for (let sx = 0; sx < SAMPLE; sx++) {
      if (!bits[sy * SAMPLE + sx]) continue;
      const px = Math.min(imgWidth - 1, Math.floor(x0 + ((sx + 0.5) / SAMPLE) * pw));
      const py = Math.min(data.length / (imgWidth * 4) - 1, Math.floor(y0 + ((sy + 0.5) / SAMPLE) * ph));
      const o = (py * imgWidth + px) * 4;
      r += data[o];
      g += data[o + 1];
      b += data[o + 2];
      n++;
    }
  }
  if (!n) {
    const cx = Math.floor(x0 + pw / 2);
    const cy = Math.floor(y0 + ph / 2);
    const o = (cy * imgWidth + cx) * 4;
    return [data[o], data[o + 1], data[o + 2]];
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/**
 * @param {object} opts
 * @param {Uint8ClampedArray} opts.data - RGBA pixels
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {number} opts.columns
 * @param {number} opts.rows
 * @param {string[]} opts.paletteHex - 16 #rrggbb
 * @param {number[]} opts.candidateGlyphs
 * @param {(id:number)=>number[]|null} opts.glyphRowsFor
 */
export function convertImageToGrid(opts) {
  const {data, width, height, columns, rows, paletteHex, candidateGlyphs, glyphRowsFor} = opts;
  const cellW = width / columns;
  const cellH = height / rows;
  const cells = Array(columns * rows).fill('');
  const inks = Array(columns * rows).fill(1);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const i = y * columns + x;
      const x0 = x * cellW;
      const y0 = y * cellH;
      const {bits, fill} = cellBitmapFromRegion(data, width, x0, y0, cellW, cellH);
      if (fill < REFERENCE_EMPTY_FILL) continue;
      const [r, g, b] = averageRgbOnBits(data, width, x0, y0, cellW, cellH, bits);
      inks[i] = nearestPaletteIndex(r, g, b, paletteHex);
      cells[i] = pickGlyphForBitmap(bits, candidateGlyphs, glyphRowsFor);
    }
  }
  return {cells, inks};
}

/** Default graphics-first candidates (bank 0 solids + blocks). */
export const DEFAULT_REFERENCE_GLYPHS = [
  32, 160, 102, 111, 96, 97, 98, 99, 100, 101, 103, 104, 106,
  126, 127, 224, 225, 226, 227, 32 + 128, 160 + 128, 102 + 128,
];