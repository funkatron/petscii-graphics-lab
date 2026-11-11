#!/usr/bin/env node
/**
 * Headless PGL animation frame exporter.
 * Usage:
 *   node export_animation.mjs --project=path.json [--out=frames.json] [--settings='{...}']
 *
 * Settings merge over project.animation. Keys match project JSON animation fields
 * plus optional motionEffect/colorEffect aliases for effect/colorEffect.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const here = dirname(fileURLToPath(import.meta.url));

const { animationCells, animationCount, animationPlan, animationDelay } = await import(
  pathToFileURL(join(root, 'animation-frames.js')).href
);
const { C64_COLORS } = await import(pathToFileURL(join(root, 'c64-colors.js')).href);
const {
  PLUS4_COLORS,
  isPlus4ColorEffect,
} = await import(pathToFileURL(join(root, 'plus4-colors.js')).href);
const {
  validateProject,
  MOTION_EFFECTS,
  COLOR_EFFECTS,
  SOLID_CAMERA_VALUES,
  WAVE_DIRECTIONS,
  WAVE_SHAPES,
  WAVE_AMPLITUDES,
  WAVE_LENGTHS,
  COLOR_WAVE_DIRECTIONS,
  WIPE_PATTERNS,
  DEPTH_EFFECTS,
  INTRO_MOTIONS,
  ANIMATION_CYCLES,
} = await import(pathToFileURL(join(root, 'project-validation.js')).href);
const { SOLID_EFFECTS } = await import(pathToFileURL(join(root, 'solid-motion.js')).href);

const FRAME_BUDGET_MS = 20;

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const has = (name) => args.includes(`--${name}`);

if (has('list-effects')) {
  console.log(JSON.stringify({
    motionEffects: MOTION_EFFECTS,
    colorEffects: COLOR_EFFECTS,
    animationCycles: ANIMATION_CYCLES,
    waveDirections: WAVE_DIRECTIONS,
    waveShapes: WAVE_SHAPES,
    waveAmplitudes: WAVE_AMPLITUDES,
    waveLengths: WAVE_LENGTHS,
    colorWaveDirections: COLOR_WAVE_DIRECTIONS,
    wipePatterns: WIPE_PATTERNS,
    depthEffects: DEPTH_EFFECTS,
    introMotions: INTRO_MOTIONS,
    solidEffects: SOLID_EFFECTS,
    solidCamera: SOLID_CAMERA_VALUES,
    allowedSeconds: [0.5, 1, 2, 4, 8, 12],
    allowedScale: [1, 2, 4],
    allowedBackgrounds: ['dark', 'white', 'transparent'],
  }));
  process.exit(0);
}

const projectPath = flag('project') || join(here, 'examples', 'golden-fuzzy-raven.json');
const outPath = flag('out') || join(here, 'out', 'workspace', 'frames.json');
const settingsRaw = flag('settings');
const settings = settingsRaw ? JSON.parse(settingsRaw) : {};

const data = JSON.parse(readFileSync(projectPath, 'utf8'));
validateProject(data);

const anim = { ...(data.animation || {}), ...settings };
if (settings.motionEffect !== undefined) {
  anim.effect = settings.motionEffect;
}
if (settings.colorEffect !== undefined) {
  anim.colorEffect = settings.colorEffect;
}
if (settings.motion !== undefined && settings.motionEffect === undefined) {
  anim.effect = settings.motion;
}

const columns = data.columns;
const rows = data.rows;
const cellCount = columns * rows;
const colors = {
  ink: data.colors?.ink ?? 14,
  background: data.colors?.background ?? 0,
};
const grid = data.grid.slice();
const inks = (data.cellColors || Array(cellCount).fill(colors.ink)).slice();

function resolveSeconds(desired, motion, colorEffect) {
  let seconds = desired ?? anim.seconds ?? 2;
  const probe = buildSource(seconds);
  const plan = animationPlan(probe);
  if (!plan.warning) {
    return { seconds, plan };
  }
  for (const candidate of [4, 8, 12, 16, 24, 32]) {
    if (candidate <= seconds) {
      continue;
    }
    const next = animationPlan(buildSource(candidate));
    if (!next.warning) {
      return { seconds: candidate, plan: next };
    }
  }
  return { seconds, plan };
}

function buildSource(seconds) {
  return {
    W: columns,
    H: rows,
    grid,
    inks,
    base: (data.replayBase || Array(cellCount).fill('')).slice(),
    baseColors: (data.replayBaseColors || Array(cellCount).fill(colors.ink)).slice(),
    events: (data.replayEvents || []).map((e) => e.slice()),
    eventColors: (data.replayEventColors || []).slice(),
    colors: { ...colors },
    effect: anim.effect ?? 'none',
    colorEffect: anim.colorEffect ?? 'none',
    seconds,
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

if (has('plan-only')) {
  const { seconds, plan } = resolveSeconds(anim.seconds);
  console.log(JSON.stringify({
    project: projectPath,
    effect: anim.effect ?? 'none',
    colorEffect: anim.colorEffect ?? 'none',
    seconds,
    frameCount: plan.count,
    warning: plan.warning || '',
    frameBudget: Math.floor(seconds * 1000 / FRAME_BUDGET_MS),
  }));
  process.exit(0);
}

const { seconds, plan } = resolveSeconds(anim.seconds);
const source = buildSource(seconds);
const frameCount = animationCount(source);
const ted = isPlus4ColorEffect(source.colorEffect);
const palette = ted
  ? PLUS4_COLORS.map(([, hex]) => hex)
  : C64_COLORS.map(([, hex]) => hex);

let backgroundHex = '#000000';
if (source.background === 'white') {
  backgroundHex = '#ffffff';
} else if (source.background === 'transparent') {
  backgroundHex = '#000000';
} else {
  backgroundHex = C64_COLORS[colors.background]?.[1] || '#000000';
}

const frames = [];
let startMs = 0;
for (let i = 0; i < frameCount; i++) {
  const picture = animationCells(i, source);
  const durationMs = Math.max(10, Math.round(animationDelay(i, source)));
  frames.push({
    index: i,
    startMs,
    durationMs,
    cells: picture.cells,
    inks: picture.inks,
  });
  startMs += durationMs;
}

const payload = {
  project: projectPath,
  effect: source.colorEffect,
  motionEffect: source.effect,
  colorPalette: ted ? 'ted-pal' : 'pepto-pal',
  columns,
  rows,
  background: backgroundHex,
  backgroundMode: source.background,
  transparent: source.background === 'transparent',
  palette,
  colors,
  frameCount,
  seconds,
  warning: plan.warning || '',
  durationMs: Math.round((seconds * 1000) / Math.max(1, frameCount)),
  frames,
  animation: {
    effect: source.effect,
    colorEffect: source.colorEffect,
    seconds: source.seconds,
    scale: source.scale,
    background: source.background,
    motionCycles: source.motionCycles,
    colorCycles: source.colorCycles,
    cameraDistance: source.cameraDistance,
    cameraOrbit: source.cameraOrbit,
    cameraElevation: source.cameraElevation,
    cameraMotion: source.cameraMotion,
    scrollDirection: source.scrollDirection,
    waveDirection: source.waveDirection,
    waveShape: source.waveShape,
    waveAmplitude: source.waveAmplitude,
    waveLength: source.waveLength,
    colorWaveDirection: source.colorWaveDirection,
    colorWaveShape: source.colorWaveShape,
    colorWaveAmplitude: source.colorWaveAmplitude,
    colorWaveLength: source.colorWaveLength,
    wipePattern: source.wipePattern,
    depthTravel: source.depthTravel,
    depthWaveShape: source.depthWaveShape,
  },
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
console.log(JSON.stringify({
  outPath,
  project: projectPath,
  motionEffect: source.effect,
  colorEffect: source.colorEffect,
  frameCount,
  seconds,
  warning: plan.warning || '',
  colorPalette: payload.colorPalette,
  columns,
  rows,
}));
