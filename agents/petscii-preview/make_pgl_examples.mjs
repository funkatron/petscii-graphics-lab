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

function projectFromRows(rows, colors, name) {
  const columns = rows[0].length;
  const gridRows = rows.length;
  const grid = flatten(rows);
  const cellColors = grid.map((g) => (g === SPACE ? colors.background : colors.ink));
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
];

mkdirSync(outDir, { recursive: true });
for (const piece of pieces) {
  const data = projectFromRows(piece.rows, piece.colors, piece.name);
  const path = join(outDir, piece.file);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log('wrote', path, `${data.columns}x${data.rows}`);
}

console.log('validated', pieces.length, 'PGL projects');
