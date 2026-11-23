#!/usr/bin/env node
/**
 * Node bridge for the MCP: validate, text grids, typed text, render plans, plans, native export.
 * Usage: node pgl_cli.mjs <command> [--flags]
 * Every command prints one JSON line: {ok: true, ...} or {ok: false, error}.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ROOT, loadProject, validateProject, renderPlan, nativeProgram, animationSource, animationPlan,
  colorTable, glyphSheet, glyphBits,
} from './pgl-shared.mjs';

const command = process.argv[2];
const args = process.argv.slice(3);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const settingsFlag = () => (flag('settings') ? JSON.parse(flag('settings')) : {});

const { formatTextGrid, parseTextGrid } = await import(pathToFileURL(join(ROOT, 'text-grid.js')).href);
const { planTypedText } = await import(pathToFileURL(join(ROOT, 'typed-text.js')).href);

function writeOut(out, contents) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, contents);
}

const validation = await import(pathToFileURL(join(ROOT, 'project-validation.js')).href);
const { MACHINES, maxInkIndex, convertInk } = await import(pathToFileURL(join(ROOT, 'machine-modes.js')).href);
const { DISPLAY_PALETTE_IDS } = await import(pathToFileURL(join(ROOT, 'c64-colors.js')).href);
const { SOLID_EFFECTS } = await import(pathToFileURL(join(ROOT, 'solid-motion.js')).href);
const { buildMirrorTables } = await import(pathToFileURL(join(ROOT, 'glyph-mirror.js')).href);

const commands = {
  /** Enumerations the editor accepts in project.animation. */
  'list-effects'() {
    return {
      ok: true,
      motionEffects: validation.MOTION_EFFECTS,
      colorEffects: validation.COLOR_EFFECTS,
      backgroundEffects: validation.BACKGROUND_EFFECTS,
      fieldRamps: validation.FIELD_RAMPS,
      animationCycles: validation.ANIMATION_CYCLES,
      waveDirections: validation.WAVE_DIRECTIONS,
      waveShapes: validation.WAVE_SHAPES,
      waveAmplitudes: validation.WAVE_AMPLITUDES,
      waveLengths: validation.WAVE_LENGTHS,
      colorWaveDirections: validation.COLOR_WAVE_DIRECTIONS,
      wipePatterns: validation.WIPE_PATTERNS,
      depthEffects: validation.DEPTH_EFFECTS,
      introMotions: validation.INTRO_MOTIONS,
      solidEffects: SOLID_EFFECTS,
      solidCamera: validation.SOLID_CAMERA_VALUES,
      allowedSeconds: [0.5, 1, 2, 4, 8, 12],
      allowedScale: [1, 2, 4, 8],
      allowedBackgrounds: ['dark', 'white', 'transparent'],
      fieldDirections: validation.FIELD_DIRECTIONS,
      fieldLeads: validation.FIELD_LEADS,
      parallaxGroups: validation.PARALLAX_GROUPS,
      parallaxSpreads: validation.PARALLAX_SPREADS,
      parallaxTravels: validation.PARALLAX_TRAVELS,
      depthTravels: ['toward', 'away'],
      machines: Object.fromEntries(Object.values(MACHINES).map((m) => [m.id, {
        label: m.label,
        maxColumns: m.maxColumns,
        maxRows: 40,
        defaultInk: m.defaultInk,
        defaultBackground: m.defaultBackground,
        maxInk: maxInkIndex(m.id),
        glyphSheet: glyphSheet(m.id),
        colorTable: colorTable(m.id, 'pepto').id,
      }])),
      displayPalettes: DISPLAY_PALETTE_IDS,
      cellShapes: ['square', 'crt'],
    };
  },

  /** Mirrored glyph partners for the machine's glyph sheet (editor's glyph-mirror.js; -1 = keep glyph). */
  'mirror-tables'() {
    const sheet = glyphSheet(flag('machine') || 'c64');
    const { horizontal, vertical } = buildMirrorTables(glyphBits(sheet));
    return { ok: true, sheet, horizontal: Array.from(horizontal), vertical: Array.from(vertical) };
  },

  /** The machine's inks with measured brightness (Rec. 709 luma of the editor's colour table), darkest first. */
  'color-luminance'() {
    const machine = flag('machine') || 'c64';
    const table = colorTable(machine, flag('palette') || 'pepto');
    const inks = table.colors.map(([name, hex], ink) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return { ink, name, hex, luminance: Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 10) / 10 };
    });
    return { ok: true, machine, colorTable: table.id, inks };
  },

  validate() {
    const path = flag('project');
    try {
      loadProject(path);
      return { ok: true, project: path };
    } catch (error) {
      process.exitCode = 1;
      return { ok: false, project: path, error: error.message };
    }
  },

  'export-text-grid'() {
    const data = loadProject(flag('project'));
    const text = formatTextGrid({
      columns: data.columns,
      rows: data.rows,
      grid: data.grid,
      cellColors: data.cellColors || Array(data.columns * data.rows).fill(data.colors?.ink ?? 14),
      colors: data.colors || { ink: 14, background: 0 },
      includeColors: flag('include-colors') !== '0',
      // index.html textGrid(): TED inks (0–120) need two hex digits (PETSCII-GLYPHS 3).
      colorDigits: glyphSheet(data.machine ?? 'c64') === 'ted' ? 2 : 1,
    });
    const out = flag('out');
    if (out) writeOut(out, `${text}\n`);
    return { ok: true, out, text: out ? undefined : text };
  },

  'import-text-grid'() {
    const projectPath = flag('project');
    const out = flag('out') || projectPath;
    const text = readFileSync(flag('text'), 'utf8');
    const existing = projectPath ? JSON.parse(readFileSync(projectPath, 'utf8')) : null;
    const parsed = parseTextGrid(text, existing?.colors || { ink: 14, background: 0 });
    const next = {
      format: 'petscii-stencil-lab',
      version: 3,
      ...(existing?.machine ? { machine: existing.machine } : {}),
      ...(existing?.palette ? { palette: existing.palette } : {}),
      columns: parsed.columns,
      rows: parsed.rows,
      grid: parsed.grid,
      cellColors: parsed.cellColors,
      colors: parsed.colors,
      animation: existing?.animation || { effect: 'none', colorEffect: 'none', backgroundEffect: 'none', seconds: 2, scale: 2, background: 'dark' },
      name: existing?.name || 'Imported text grid',
    };
    validateProject(next);
    writeOut(out, `${JSON.stringify(next, null, 2)}\n`);
    return { ok: true, out, columns: next.columns, rows: next.rows };
  },

  /** VIC ink numbers (recipe defaults) to the machine's index space with the editor's convertInk(). */
  'convert-inks'() {
    const machine = flag('machine') || 'c64';
    const inks = (flag('inks') || '').split(',').filter(Boolean).map(Number);
    return { ok: true, machine, inks: Object.fromEntries(inks.map((ink) => [ink, convertInk(ink, 'c64', machine)])) };
  },

  /** Typed C64 text using the editor's typed-text.js; prints the planned cells, writes nothing. */
  'plan-text'() {
    const data = loadProject(flag('project'));
    const text = Buffer.from(flag('text-b64') || '', 'base64').toString('utf8');
    const ink = Number(flag('ink') ?? data.colors?.ink ?? 14);
    const cellCount = data.columns * data.rows;
    const plan = planTypedText(
      text,
      [Number(flag('x') || 0), Number(flag('y') || 0)],
      data.columns,
      data.rows,
      data.grid,
      data.cellColors || Array(cellCount).fill(ink),
      ink,
    );
    if (plan.error) return { ok: false, error: plan.error };
    return { ok: true, cells: plan.cells, inks: plan.inks, count: plan.count };
  },

  /** Frames, colour table, glyph sheet and cell shape for the Python rasterizer. */
  'render-plan'() {
    const data = loadProject(flag('project'));
    const mode = flag('mode') || 'still';
    const plan = renderPlan(data, { mode, settings: settingsFlag(), cellAspect: flag('cell-shape') || 'square' });
    if (mode === 'animation' && plan.warning) {
      return { ok: false, error: plan.warning, readiness: 'needs_adjustment' };
    }
    writeOut(flag('out'), `${JSON.stringify(plan)}\n`);
    const { frames, ...summary } = plan;
    return { ok: true, out: flag('out'), ...summary };
  },

  /** Frame count and readiness for the requested settings (nothing is changed or bumped). */
  plan() {
    const data = loadProject(flag('project'));
    const source = animationSource(data, settingsFlag());
    const plan = animationPlan(source);
    let suggestedSeconds = null;
    if (plan.warning) {
      for (const seconds of [0.5, 1, 2, 4, 8, 12]) {
        if (seconds > source.seconds && !animationPlan({ ...source, seconds }).warning) {
          suggestedSeconds = seconds;
          break;
        }
      }
    }
    return {
      ok: true,
      machine: source.machine,
      effect: source.effect,
      colorEffect: source.colorEffect,
      backgroundEffect: source.backgroundEffect,
      seconds: source.seconds,
      frameCount: plan.count,
      warning: plan.warning || '',
      readiness: plan.warning ? 'needs_adjustment' : 'ready',
      suggestedSeconds,
    };
  },

  /** Native PRG or D64 for the project's machine (C64, C128 40/80-col, Plus/4). */
  async 'export-native'() {
    const data = loadProject(flag('project'));
    const format = flag('format') || 'prg';
    const mode = flag('mode') || 'still';
    const { machine, result, createD64Disk, moving } = await nativeProgram(data, {
      mode,
      settings: settingsFlag(),
      repetitions: Number(flag('repetitions') ?? 1),
      allowTimingOverrun: flag('allow-timing-overrun') === '1',
    });
    const bytes = format === 'd64' ? createD64Disk(result.bytes, moving ? 'ANIMATION' : 'PICTURE') : result.bytes;
    writeOut(flag('out'), Buffer.from(bytes));
    return { ok: true, out: flag('out'), machine, format, mode, frameCount: result.frameCount, bytes: bytes.length, readiness: 'ready' };
  },
};

const run = commands[command];
if (!run) {
  console.log(JSON.stringify({ ok: false, error: `unknown command: ${command}` }));
  process.exit(2);
}
try {
  const result = await run();
  if (result.ok === false && !process.exitCode) process.exitCode = 1;
  console.log(JSON.stringify(result));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: error.message, readiness: 'needs_adjustment' }));
  process.exitCode = 1;
}
