#!/usr/bin/env node
/**
 * Small Node bridge for MCP: validate, text-grid, C64 export, place-text.
 * Usage: node pgl_cli.mjs <command> [--flags]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const command = process.argv[2];
const args = process.argv.slice(3);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const { validateProject } = await import(pathToFileURL(join(root, 'project-validation.js')).href);
const { formatTextGrid, parseTextGrid } = await import(pathToFileURL(join(root, 'text-grid.js')).href);
const { planTypedText } = await import(pathToFileURL(join(root, 'typed-text.js')).href);
const { animationCells, animationCount, animationPlan, animationDelay } = await import(
  pathToFileURL(join(root, 'animation-frames.js')).href
);
const { createC64AdaptiveProgram, createD64Disk } = await import(
  pathToFileURL(join(root, 'c64-export.js')).href
);

function loadProject(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  validateProject(data);
  return data;
}

function animationSource(data, overrides = {}) {
  const anim = { ...(data.animation || {}), ...overrides };
  const cellCount = data.columns * data.rows;
  const colors = {
    ink: data.colors?.ink ?? 14,
    background: data.colors?.background ?? 0,
  };
  return {
    W: data.columns,
    H: data.rows,
    grid: data.grid.slice(),
    inks: (data.cellColors || Array(cellCount).fill(colors.ink)).slice(),
    base: (data.replayBase || Array(cellCount).fill('')).slice(),
    baseColors: (data.replayBaseColors || Array(cellCount).fill(colors.ink)).slice(),
    events: (data.replayEvents || []).map((e) => e.slice()),
    eventColors: (data.replayEventColors || []).slice(),
    colors,
    effect: anim.effect ?? 'none',
    colorEffect: anim.colorEffect ?? 'none',
    seconds: anim.seconds ?? 2,
    scale: anim.scale ?? 1,
    background: anim.background ?? 'dark',
    motionCycles: anim.motionCycles ?? 1,
    colorCycles: anim.colorCycles ?? 1,
    cameraDistance: anim.cameraDistance ?? 4,
    cameraOrbit: anim.cameraOrbit ?? 0,
    cameraElevation: anim.cameraElevation ?? 0,
    cameraMotion: anim.cameraMotion ?? 0,
    scrollDirection: anim.scrollDirection ?? 'left',
    waveDirection: anim.waveDirection ?? 'up',
    waveShape: anim.waveShape ?? 'sine',
    waveAmplitude: anim.waveAmplitude ?? 100,
    waveLength: anim.waveLength ?? 50,
    colorWaveDirection: anim.colorWaveDirection ?? 'up-left',
    colorWaveShape: anim.colorWaveShape ?? 'sawtooth',
    colorWaveAmplitude: anim.colorWaveAmplitude ?? 100,
    colorWaveLength: anim.colorWaveLength ?? 50,
    wipePattern: anim.wipePattern ?? 'diagonal',
    depthTravel: anim.depthTravel ?? 'toward',
    depthWaveShape: anim.depthWaveShape ?? 'sawtooth',
  };
}

if (command === 'validate') {
  const path = flag('project');
  try {
    loadProject(path);
    console.log(JSON.stringify({ ok: true, project: path }));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, project: path, error: error.message }));
    process.exitCode = 1;
  }
} else if (command === 'export-text-grid') {
  const data = loadProject(flag('project'));
  const includeColors = flag('include-colors') !== '0';
  const text = formatTextGrid({
    columns: data.columns,
    rows: data.rows,
    grid: data.grid,
    cellColors: data.cellColors || Array(data.columns * data.rows).fill(data.colors?.ink ?? 14),
    colors: data.colors || { ink: 14, background: 0 },
    includeColors,
  });
  const out = flag('out');
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${text}\n`);
  }
  console.log(JSON.stringify({ ok: true, out, text: out ? undefined : text }));
} else if (command === 'import-text-grid') {
  const textPath = flag('text');
  const projectPath = flag('project');
  const out = flag('out') || projectPath;
  const text = readFileSync(textPath, 'utf8');
  const existing = projectPath ? JSON.parse(readFileSync(projectPath, 'utf8')) : null;
  const defaults = existing?.colors || { ink: 14, background: 0 };
  const parsed = parseTextGrid(text, defaults);
  const next = {
    format: 'petscii-stencil-lab',
    version: 3,
    columns: parsed.columns,
    rows: parsed.rows,
    grid: parsed.grid,
    cellColors: parsed.cellColors,
    colors: parsed.colors,
    animation: existing?.animation || {
      effect: 'none',
      colorEffect: 'none',
      seconds: 2,
      scale: 2,
      background: 'dark',
      motionCycles: 1,
      colorCycles: 1,
    },
    name: existing?.name || 'Imported text grid',
  };
  validateProject(next);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(next, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, out, columns: next.columns, rows: next.rows }));
} else if (command === 'place-text') {
  const projectPath = flag('project');
  const out = flag('out') || projectPath;
  const data = loadProject(projectPath);
  const x = Number(flag('x') || 0);
  const y = Number(flag('y') || 0);
  let text = flag('text') ?? '';
  const textB64 = flag('text-b64');
  if (textB64) {
    text = Buffer.from(textB64, 'base64').toString('utf8');
  }
  const ink = Number(flag('ink') ?? data.colors?.ink ?? 14);
  const plan = planTypedText(
    text,
    [x, y],
    data.columns,
    data.rows,
    data.grid,
    data.cellColors || Array(data.columns * data.rows).fill(ink),
    ink,
  );
  if (plan.error) {
    console.log(JSON.stringify({ ok: false, error: plan.error }));
    process.exitCode = 1;
  } else {
    data.grid = plan.cells;
    data.cellColors = plan.inks;
    validateProject(data);
    writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, out, count: plan.count }));
  }
} else if (command === 'export-c64') {
  try {
    const projectPath = flag('project');
    const out = flag('out');
    const format = flag('format') || 'prg';
    const mode = flag('mode') || 'still';
    const repetitions = Number(flag('repetitions') || 1);
    const allowTimingOverrun = flag('allow-timing-overrun') === '1';
    const settings = flag('settings') ? JSON.parse(flag('settings')) : {};
    const data = loadProject(projectPath);
    const source = animationSource(data, settings);
    const moving = mode === 'animation';
    if (moving) {
      const plan = animationPlan(source);
      if (plan.warning && !allowTimingOverrun) {
        console.log(JSON.stringify({ ok: false, error: plan.warning, readiness: 'needs_adjustment' }));
        process.exit(1);
      }
    }
    const frames = [];
    if (moving) {
      const count = animationCount(source);
      for (let i = 0; i < count; i++) {
        const picture = animationCells(i, source);
        frames.push({
          cells: picture.cells,
          inks: picture.inks,
          durationMs: Math.max(10, Math.round(animationDelay(i, source))),
        });
      }
    } else {
      frames.push({ cells: source.grid, inks: source.inks, durationMs: 1000 / 60 });
    }
    const result = createC64AdaptiveProgram({
      columns: source.W,
      rows: source.H,
      charset: 0,
      background: source.colors.background,
      ink: source.colors.ink,
      frames,
      repetitions: moving ? repetitions : 1,
      allowTimingOverrun,
    });
    const bytes = format === 'd64'
      ? createD64Disk(result.bytes, moving ? 'ANIMATION' : 'PICTURE')
      : result.bytes;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(bytes));
    console.log(JSON.stringify({
      ok: true,
      out,
      format,
      mode,
      frameCount: result.frameCount,
      bytes: bytes.length,
      readiness: 'ready',
    }));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: error.message, readiness: 'needs_adjustment' }));
    process.exitCode = 1;
  }
} else {
  console.error(JSON.stringify({ error: `unknown command: ${command}` }));
  process.exit(2);
}
