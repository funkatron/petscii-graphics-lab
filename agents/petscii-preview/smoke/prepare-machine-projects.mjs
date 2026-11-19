#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertColorsObject, convertInkArray, MACHINE } from '../../../machine-modes.js';
import { convertGlyphArray } from '../../../glyph-map.js';

const SOURCE_MACHINE = MACHINE.C64;

const here = dirname(fileURLToPath(import.meta.url));
const src = JSON.parse(
  readFileSync(resolve(here, '../out/gallery/renders/surprise-carpet.json'), 'utf8'),
);
const outDir = resolve(here, '../out/gallery/renders');

const machines = [MACHINE.C64, MACHINE.C128, MACHINE.C128_80, MACHINE.PLUS4];

for (const machine of machines) {
  const data = structuredClone(src);
  data.machine = machine;
  data.palette = machine === MACHINE.PLUS4 ? 'pepto' : 'pepto';
  if (machine === MACHINE.C128_80 && data.columns < 80) {
    // Keep 40-col art centered when previewing VDC host (editor allows <80 on VDC).
    data.name = `${data.name || 'Surprise'} (VDC host)`;
  }
  data.colors = convertColorsObject(data.colors, SOURCE_MACHINE, machine);
  data.cellColors = convertInkArray(data.cellColors, SOURCE_MACHINE, machine);
  if (data.drawingReplay) {
    const dr = data.drawingReplay;
    if (dr.baseColors) {
      dr.baseColors = convertInkArray(dr.baseColors, SOURCE_MACHINE, machine);
    }
    if (dr.eventColors) {
      dr.eventColors = convertInkArray(dr.eventColors, SOURCE_MACHINE, machine);
    }
    if (machine === MACHINE.PLUS4) {
      dr.base = convertGlyphArray(dr.base, SOURCE_MACHINE, machine);
      dr.events = dr.events.map(([i, g]) => [i, convertGlyphArray([g], SOURCE_MACHINE, machine)[0]]);
    }
  }
  if (machine === MACHINE.PLUS4) {
    data.grid = convertGlyphArray(data.grid, SOURCE_MACHINE, machine);
    if (Number.isInteger(data.selectedGlyph)) {
      data.selectedGlyph = convertGlyphArray([data.selectedGlyph], SOURCE_MACHINE, machine)[0];
    }
  }
  writeFileSync(resolve(outDir, `surprise-carpet-${machine}.json`), JSON.stringify(data, null, 2) + '\n');
  console.log('wrote', machine);
}