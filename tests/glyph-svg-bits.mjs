/**
 * Reconstruct 4 KB charset bitmaps from built-in SVG glyph sheets.
 * Layout matches loadGlyphSheet / maintainer-reference: bank*2048 + code*8, MSB = left pixel.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {'c64'|'ted'} prefix
 * @returns {{bytes: Uint8Array, sha256: string, desc: string, svgPath: string}}
 */
export function loadGlyphSheetBits(prefix) {
  const fileName = prefix === 'ted' ? 'ted-glyphs.svg' : 'c64-glyphs.svg';
  const svgPath = path.join(root, 'assets', fileName);
  const svg = fs.readFileSync(svgPath, 'utf8');
  const bytes = new Uint8Array(4096);
  for (let bank = 0; bank < 2; bank++) {
    for (let code = 0; code < 256; code++) {
      const re = new RegExp(`<symbol id="${prefix}-${bank}-${code}"[^>]*>([\\s\\S]*?)</symbol>`);
      const match = svg.match(re);
      if (!match) {
        throw new Error(`Missing symbol ${prefix}-${bank}-${code} in ${fileName}`);
      }
      for (const rect of match[1].matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g)) {
        const x = Number(rect[1]);
        const y = Number(rect[2]);
        const width = Number(rect[3]);
        for (let xx = x; xx < x + width; xx++) {
          bytes[bank * 2048 + code * 8 + y] |= 128 >> xx;
        }
      }
    }
  }
  const descMatch = svg.match(/<desc>([\s\S]*?)<\/desc>/);
  const desc = descMatch ? descMatch[1] : '';
  return {
    bytes,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    desc,
    svgPath,
  };
}

/** @param {Uint8Array} a @param {Uint8Array} b */
export function differingAtlasIds(a, b) {
  const ids = [];
  for (let id = 0; id < 512; id++) {
    let same = true;
    for (let row = 0; row < 8; row++) {
      if (a[id * 8 + row] !== b[id * 8 + row]) {
        same = false;
        break;
      }
    }
    if (!same) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Expected C64↔TED differing atlas IDs for the shipped sheets.
 * Bank 0 matches except atlas 128 (C64 soft-inverse @ quirk vs TED XOR).
 * Bank 1 (256–511) is TED’s alternate set — same slots, different pixels.
 */
export function expectedC64TedDifferingIds() {
  return [128, ...Array.from({length: 256}, (_, i) => 256 + i)];
}
