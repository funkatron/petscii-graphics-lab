#!/usr/bin/env node
/**
 * Export color-animation frame data for MCP GIF rendering.
 * Usage:
 *   node export_color_animation.mjs <colorEffect> [out.json]
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

// Load as ESM via dynamic import from repo root.
const { animationCells, animationCount } = await import(pathToFileURL(join(root, 'animation-frames.js')).href);
const { C64_COLORS } = await import(pathToFileURL(join(root, 'c64-colors.js')).href);
const {
  PLUS4_COLORS,
  PLUS4_COLOR_CYCLES,
  isPlus4ColorEffect,
} = await import(pathToFileURL(join(root, 'plus4-colors.js')).href);

const effect = process.argv[2] || 'plus4-cycle';
const outPath = process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), 'out', 'examples', `${effect}.frames.json`);

const C64_RAMP_LENGTHS = {
  'color-cycle': 16,
  'color-wave': 8,
  'color-glow': 10,
  'raster-bars': 8,
  plasma: 8,
  bonfire: 6,
};

function secondsForEffect(name) {
  const ted = isPlus4ColorEffect(name);
  const rampLen = ted
    ? (PLUS4_COLOR_CYCLES[name]?.length || 16)
    : (C64_RAMP_LENGTHS[name] || 16);
  // ~50ms per ramp step, with a floor so short ramps still loop nicely.
  return Math.max(2, Math.ceil((rampLen * 50) / 1000));
}

const columns = 16;
const rows = 8;
const cellCount = columns * rows;

function buildDemoGrid() {
  const grid = Array(cellCount).fill('');
  const inks = Array(cellCount).fill(14);
  const put = (x, y, code, ink = 14) => {
    if (x < 0 || y < 0 || x >= columns || y >= rows) return;
    grid[y * columns + x] = code;
    inks[y * columns + x] = ink;
  };

  // Checkerboard of solid blocks so wave/plasma spatial shifts read clearly.
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < columns - 1; x++) {
      put(x, y, 160, (x + y) % 2 === 0 ? 14 : 3);
    }
  }
  // Corners / frame
  put(0, 0, 0x70, 14);
  put(columns - 1, 0, 0x6e, 14);
  put(0, rows - 1, 0x6d, 14);
  put(columns - 1, rows - 1, 0x7d, 14);
  for (let x = 1; x < columns - 1; x++) {
    put(x, 0, 0x40, 14);
    put(x, rows - 1, 0x40, 14);
  }
  for (let y = 1; y < rows - 1; y++) {
    put(0, y, 0x5d, 14);
    put(columns - 1, y, 0x5d, 14);
  }

  // Label glyphs: C Y C L E
  const label = [3, 25, 3, 12, 5]; // C Y C L E
  label.forEach((code, i) => put(5 + i, 3, code, 1));
  return { grid, inks };
}

const { grid, inks } = buildDemoGrid();
const source = {
  W: columns,
  H: rows,
  grid,
  inks,
  base: Array(cellCount).fill(''),
  baseColors: Array(cellCount).fill(14),
  events: [],
  eventColors: [],
  colors: { ink: 14, background: 0 },
  effect: 'none',
  colorEffect: effect,
  seconds: secondsForEffect(effect),
  scale: 1,
  background: 'dark',
  motionCycles: 1,
  colorCycles: 1,
  colorWaveDirection: effect.includes('raster') ? 'up' : 'up-left',
  colorWaveShape: effect.includes('plasma') ? 'sine' : 'sawtooth',
  colorWaveAmplitude: 100,
  colorWaveLength: 50,
};

const frameCount = animationCount(source);
const ted = isPlus4ColorEffect(effect);
const palette = ted
  ? PLUS4_COLORS.map(([, hex]) => hex)
  : C64_COLORS.map(([, hex]) => hex);

const frames = [];
for (let i = 0; i < frameCount; i++) {
  const picture = animationCells(i, source);
  frames.push({
    cells: picture.cells,
    inks: picture.inks,
  });
}

const payload = {
  effect,
  colorPalette: ted ? 'ted-pal' : 'pepto-pal',
  columns,
  rows,
  background: '#000000',
  palette,
  frameCount,
  durationMs: Math.round((source.seconds * 1000) / frameCount),
  frames,
};

writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
console.log(JSON.stringify({ outPath, effect, frameCount, colorPalette: payload.colorPalette }));
