import {SOLID_EFFECTS} from './solid-motion.js';

export const ANIMATION_CYCLES = [1, 2, 4, 8, 16];
export const DEPTH_EFFECTS = ['space-warp', 'perspective-floor', 'curved-road', 'tunnel-flight'];
export const INTRO_MOTIONS = ['logo-bounce', 'logo-stretch', 'starfield', 'wipe'];
export const WIPE_PATTERNS = ['diagonal', 'checkerboard', 'blinds'];
export const WAVE_AMPLITUDES = [10, 25, 50, 75, 100];
export const WAVE_LENGTHS = [10, 25, 50, 75, 100];
export const WAVE_SHAPES = ['sine', 'triangle', 'square', 'sawtooth', 'reverse-sawtooth'];
export const WAVE_DIRECTIONS = ['left', 'right', 'up', 'down'];
export const DIAGONAL_DIRECTIONS = ['up-left', 'up-right', 'down-left', 'down-right'];
export const COLOR_WAVE_DIRECTIONS = [
  ...WAVE_DIRECTIONS,
  'up-left', 'up-right', 'down-left', 'down-right',
];
export const SOLID_CAMERA_VALUES = {
  cameraDistance: [4, 5, 3.25, 2.5],
  cameraOrbit: [0, 45, 90, 135, 180, 225, 270, 315],
  cameraElevation: [0, -60, -30, 30, 60],
  cameraMotion: [0, 1, 2, 3],
};
export const MOTION_EFFECTS = [
  'none', 'bonfire', 'replay', 'scroll-x', 'scroll-y', 'scroll-diagonal',
  'wave', 'inverse', 'sine-scroll', 'ripple',
  ...DEPTH_EFFECTS,
  ...SOLID_EFFECTS,
  ...INTRO_MOTIONS,
];
export const COLOR_EFFECTS = [
  'none', 'bonfire', 'raster-bars', 'plasma', 'color-cycle', 'color-wave', 'color-glow',
  'plus4-cycle', 'plus4-wave', 'plus4-glow', 'plus4-raster', 'plus4-plasma', 'plus4-bonfire',
];

const ALLOWED_SECONDS = [0.5, 1, 2, 4, 8, 12];
const ALLOWED_SCALE = [1, 2, 4];
const ALLOWED_BACKGROUNDS = ['dark', 'white', 'transparent'];

function isValidC64Color(value) {
  return Number.isInteger(value) && value >= 0 && value < 16;
}

function isValidGlyphId(value) {
  return value === '' || (Number.isInteger(value) && value >= 0 && value <= 511);
}

function validateColorsField(data) {
  if (data.colors === undefined) {
    return;
  }
  const colors = data.colors;
  if (!colors) {
    throw Error('Invalid C64 colors');
  }
  for (const key of ['ink', 'background']) {
    if (!isValidC64Color(colors[key])) {
      throw Error('Invalid C64 colors');
    }
  }
}

function validateGrid(data) {
  if (!Number.isInteger(data.columns) || !Number.isInteger(data.rows)) {
    throw Error('Invalid dimensions');
  }
  if (data.columns < 1 || data.columns > 40 || data.rows < 1 || data.rows > 40) {
    throw Error('Invalid dimensions');
  }
  const cellCount = data.columns * data.rows;
  if (!Array.isArray(data.grid) || data.grid.length !== cellCount) {
    throw Error('Invalid glyph grid: use numeric atlas glyph IDs or empty cells');
  }
  if (data.grid.some((g) => g !== '' && !isValidGlyphId(g))) {
    throw Error('Invalid glyph grid: use numeric atlas glyph IDs or empty cells');
  }
  if (data.cellColors !== undefined) {
    if (!Array.isArray(data.cellColors) || data.cellColors.length !== cellCount) {
      throw Error('Invalid cell colors');
    }
    if (!data.cellColors.every(isValidC64Color)) {
      throw Error('Invalid cell colors');
    }
  }
}

function validateDrawingReplay(data) {
  if (data.drawingReplay === undefined) {
    return;
  }
  const replay = data.drawingReplay;
  const cellCount = data.grid.length;
  if (!replay || !Array.isArray(replay.base) || replay.base.length !== cellCount) {
    throw Error('Invalid drawing replay');
  }
  if (replay.base.some((g) => !isValidGlyphId(g))) {
    throw Error('Invalid drawing replay');
  }
  if (!Array.isArray(replay.events) || replay.events.length > 20000) {
    throw Error('Invalid drawing replay');
  }
  for (const event of replay.events) {
    if (!Array.isArray(event) || event.length !== 2) {
      throw Error('Invalid drawing replay');
    }
    const [index, glyph] = event;
    if (!Number.isInteger(index) || index < 0 || index >= cellCount || !isValidGlyphId(glyph)) {
      throw Error('Invalid drawing replay');
    }
  }
  const reconstructed = replay.base.slice();
  for (const [index, glyph] of replay.events) {
    reconstructed[index] = glyph;
  }
  if (reconstructed.some((g, i) => g !== data.grid[i])) {
    throw Error('Replay does not match drawing');
  }

  const defaultInk = data.colors?.ink ?? 14;
  if (replay.baseColors !== undefined) {
    if (!Array.isArray(replay.baseColors) || replay.baseColors.length !== cellCount) {
      throw Error('Invalid replay colors');
    }
    if (!replay.baseColors.every(isValidC64Color)) {
      throw Error('Invalid replay colors');
    }
  }
  if (replay.eventColors !== undefined) {
    if (!Array.isArray(replay.eventColors) || replay.eventColors.length !== replay.events.length) {
      throw Error('Invalid replay colors');
    }
    if (!replay.eventColors.every(isValidC64Color)) {
      throw Error('Invalid replay colors');
    }
  }
  const inkTrail = replay.baseColors?.slice() ?? Array(cellCount).fill(defaultInk);
  replay.events.forEach(([index], eventIndex) => {
    inkTrail[index] = replay.eventColors?.[eventIndex] ?? defaultInk;
  });
  if (inkTrail.some((ink, i) => ink !== (data.cellColors?.[i] ?? defaultInk))) {
    throw Error('Replay colors do not match drawing');
  }
}

function scrollDirectionChoices(effect) {
  if (effect === 'scroll-diagonal') {
    return DIAGONAL_DIRECTIONS;
  }
  if (effect === 'starfield' || effect === 'sine-scroll') {
    return COLOR_WAVE_DIRECTIONS;
  }
  return WAVE_DIRECTIONS;
}

function validateAnimationField(data) {
  if (data.animation === undefined) {
    return;
  }
  const animation = data.animation;
  if (!animation) {
    throw Error('Invalid animation settings');
  }

  for (const [key, allowed] of Object.entries(SOLID_CAMERA_VALUES)) {
    if (animation[key] !== undefined && !allowed.includes(animation[key])) {
      throw Error('Invalid animation settings');
    }
  }
  if (animation.depthWaveShape !== undefined && !WAVE_SHAPES.includes(animation.depthWaveShape)) {
    throw Error('Invalid animation settings');
  }
  if (animation.depthTravel !== undefined && !['toward', 'away'].includes(animation.depthTravel)) {
    throw Error('Invalid animation settings');
  }
  for (const key of ['waveLength', 'colorWaveLength']) {
    if (animation[key] !== undefined && !WAVE_LENGTHS.includes(animation[key])) {
      throw Error('Invalid animation settings');
    }
  }
  if (animation.wipePattern !== undefined && !WIPE_PATTERNS.includes(animation.wipePattern)) {
    throw Error('Invalid animation settings');
  }
  for (const key of ['waveAmplitude', 'colorWaveAmplitude']) {
    if (animation[key] !== undefined && !WAVE_AMPLITUDES.includes(animation[key])) {
      throw Error('Invalid animation settings');
    }
  }
  for (const key of ['motionCycles', 'colorCycles']) {
    if (animation[key] !== undefined && !ANIMATION_CYCLES.includes(animation[key])) {
      throw Error('Invalid animation settings');
    }
  }

  const directionFields = {
    scrollDirection: scrollDirectionChoices(animation.effect),
    waveDirection: WAVE_DIRECTIONS,
    waveShape: WAVE_SHAPES,
    colorWaveDirection: COLOR_WAVE_DIRECTIONS,
    colorWaveShape: WAVE_SHAPES,
  };
  for (const [key, allowed] of Object.entries(directionFields)) {
    if (animation[key] !== undefined && !allowed.includes(animation[key])) {
      throw Error('Invalid animation settings');
    }
  }

  if (!MOTION_EFFECTS.includes(animation.effect)) {
    throw Error('Invalid animation settings');
  }
  if (animation.colorEffect !== undefined && !COLOR_EFFECTS.includes(animation.colorEffect)) {
    throw Error('Invalid animation settings');
  }
  if (!ALLOWED_SECONDS.includes(animation.seconds)) {
    throw Error('Invalid animation settings');
  }
  if (!ALLOWED_SCALE.includes(animation.scale)) {
    throw Error('Invalid animation settings');
  }
  if (!ALLOWED_BACKGROUNDS.includes(animation.background)) {
    throw Error('Invalid animation settings');
  }
  if (animation.videoRepeats !== undefined) {
    const repeats = animation.videoRepeats;
    if (!Number.isInteger(repeats) || repeats < 1 || repeats > 100) {
      throw Error('Invalid animation settings');
    }
  }
}

export function validateProject(data) {
  validateColorsField(data);
  if (data && data.glyphSource !== undefined && data.glyphSource !== 'builtin') {
    throw Error('Only built-in C64 glyph projects are supported');
  }
  if (data?.selectedGlyph !== undefined) {
    const id = data.selectedGlyph;
    if (!Number.isInteger(id) || id < 0 || id > 511) {
      throw Error('Invalid selected C64 glyph');
    }
  }
  if (!data || data.format !== 'petscii-stencil-lab' || data.version !== 3) {
    throw Error('Only version 3 unified glyph projects are supported');
  }
  if (data.charset !== undefined) {
    throw Error('Whole-drawing character sets are no longer supported');
  }
  validateGrid(data);
  validateDrawingReplay(data);
  validateAnimationField(data);
}
