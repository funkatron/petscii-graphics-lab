#!/usr/bin/env node
/**
 * Build a few exploratory PGL v3 projects for machine-mode feel.
 * Open them in the lab via Project → Open.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateProject } from '../../project-validation.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'examples');

const TL = 0x70;
const TR = 0x6e;
const BL = 0x6d;
const BR = 0x7d;
const H = 0x40; // full-width horizontal bar
const V = 0x5d; // vertical bar
const SPACE = 0x20;
const SOLID = 0xa0;

function charCode(ch) {
  if (ch === ' ') return SPACE;
  if (ch >= 'a' && ch <= 'z') return ch.charCodeAt(0) - 96;
  if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 64;
  const code = ch.charCodeAt(0);
  if (code >= 33 && code <= 63) return code;
  return SPACE;
}

function textRow(text, width) {
  const row = Array.from({ length: width }, () => SPACE);
  const start = Math.max(0, Math.floor((width - text.length) / 2));
  for (let i = 0; i < text.length && start + i < width; i++) {
    row[start + i] = charCode(text[i]);
  }
  return row;
}

function boxRow(inner, width) {
  const contentWidth = width - 2;
  const padded = Array.from({ length: contentWidth }, (_, i) => {
    if (i < inner.length) return inner[i];
    return SPACE;
  });
  return [V, ...padded, V];
}

function hBar(width, left, right) {
  return [left, ...Array.from({ length: width - 2 }, () => H), right];
}

function paintCard(lines, width) {
  const rows = [];
  rows.push(hBar(width, TL, TR));
  for (const line of lines) {
    const inner = Array.from(line.padEnd(width - 2).slice(0, width - 2), charCode);
    rows.push(boxRow(inner, width));
  }
  rows.push(hBar(width, BL, BR));
  return rows;
}

function flatten(rows) {
  return rows.flat();
}

function projectFromRows(rows, colors, name, cellColorFn) {
  const columns = rows[0].length;
  const gridRows = rows.length;
  const grid = flatten(rows);
  const cellColors = grid.map((g, i) => {
    if (cellColorFn) return cellColorFn(g, i, columns);
    if (g === SPACE) return colors.background;
    return colors.ink;
  });
  const data = {
    format: 'petscii-stencil-lab',
    version: 3,
    columns,
    rows: gridRows,
    grid,
    cellColors,
    selectedGlyph: SOLID,
    symmetry: 'none',
    colors: { ink: colors.ink, background: colors.background },
    animation: {
      effect: 'none',
      seconds: 4,
      scale: 2,
      background: 'dark',
    },
    glyphSource: 'builtin',
    _exploreNote: name,
  };
  validateProject(data);
  delete data._exploreNote;
  return data;
}

function fillRow(glyph, width) {
  return Array.from({ length: width }, () => glyph);
}

function labeledSwatch(label, width, { reverseText = false } = {}) {
  const inner = Array.from({ length: width - 2 }, () => SOLID);
  const text = label.slice(0, width - 2);
  const mid = Array.from({ length: width - 2 }, (_, i) => {
    if (i < text.length) {
      const code = charCode(text[i]);
      // Reverse glyphs read as paper cutouts when ink is light and canvas bg is dark.
      if (reverseText) return code | 0x80;
      return code;
    }
    return SOLID;
  });
  return [
    [V, ...inner, V],
    [V, ...mid, V],
    [V, ...inner, V],
  ];
}

const pieces = [
  {
    file: 'c64-ready-card.json',
    name: 'C64 ready card',
    colors: { ink: 14, background: 6 }, // light blue on blue
    rows: [
      textRow('COMMODORE 64', 20),
      textRow('', 20),
      ...paintCard([' READY.', ' LIGHT BLUE', ' ON BLUE'], 20),
      textRow('', 20),
      textRow('PETSCII LAB', 20),
    ],
  },
  {
    file: 'c128-ready-card.json',
    name: 'C128 ready card',
    colors: { ink: 3, background: 6 }, // cyan on blue
    rows: [
      textRow('COMMODORE 128', 20),
      textRow('40 COL MODE', 20),
      textRow('', 20),
      ...paintCard([' READY.', ' CYAN INK', ' VIC-II'], 20),
      textRow('', 20),
      textRow('PETSCII LAB', 20),
    ],
  },
  {
    file: 'plus4-ready-card.json',
    name: 'Plus/4 ready card',
    // Approximate TED paper with C64 light gray + black.
    colors: { ink: 0, background: 15 },
    rows: [
      textRow('COMMODORE PLUS/4', 22),
      textRow('', 22),
      ...paintCard([' READY.', ' BLACK ON', ' LIGHT GRAY'], 22),
      textRow('', 22),
      textRow('TED PAPER FEEL', 22),
    ],
  },
  {
    file: 'pgl-wordmark.json',
    name: 'PGL wordmark',
    colors: { ink: 7, background: 0 }, // yellow on black
    rows: [
      hBar(18, TL, TR),
      boxRow(Array.from('  PETSCII LAB ', charCode), 18),
      boxRow(Array.from('  DRAW. PLAY. ', charCode), 18),
      hBar(18, BL, BR),
      Array.from({ length: 18 }, () => SPACE),
      textRow('C64 GLYPHS', 18),
    ],
  },
  {
    // One canvas, three ink moods. Shared black paper; swatches carry the feel.
    file: 'mode-swatches.json',
    name: 'Mode swatches',
    colors: { ink: 1, background: 0 },
    rows: [
      textRow('SAME GLYPHS', 24),
      textRow('', 24),
      hBar(24, TL, TR),
      ...labeledSwatch(' C64 LIGHTBLUE ', 24),
      [V, ...fillRow(SPACE, 22), V],
      ...labeledSwatch(' C128 CYAN     ', 24),
      [V, ...fillRow(SPACE, 22), V],
      ...labeledSwatch(' PLUS4 PAPER   ', 24, { reverseText: true }),
      hBar(24, BL, BR),
      textRow('', 24),
      textRow('PALETTE ONLY', 24),
    ],
    cellColorFn(g, i, columns) {
      const y = Math.floor(i / columns);
      // Row map inside the 24-wide card:
      // 0 title, 1 blank, 2 top bar,
      // 3-5 C64, 6 gap, 7-9 C128, 10 gap, 11-13 Plus4, 14 bottom bar, ...
      const isText = g !== SOLID && g !== V && g !== H && g !== TL && g !== TR && g !== BL && g !== BR && g !== SPACE;
      if (y >= 3 && y <= 5) {
        if (g === SOLID) return 6; // blue fill
        return 14; // light blue text/frame
      }
      if (y >= 7 && y <= 9) {
        if (g === SOLID) return 6;
        return 3; // cyan text/frame
      }
      if (y >= 11 && y <= 13) {
        // Reverse text + solids in light gray → gray paper with dark cutouts.
        return 15;
      }
      if (g === SPACE) return 0;
      if (isText) return 1;
      return 1; // white labels/frame
    },
  },
];

mkdirSync(outDir, { recursive: true });
for (const piece of pieces) {
  const data = projectFromRows(piece.rows, piece.colors, piece.name, piece.cellColorFn);
  const path = join(outDir, piece.file);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log('wrote', path, `${data.columns}x${data.rows}`);
}

console.log('validated', pieces.length, 'PGL projects');
