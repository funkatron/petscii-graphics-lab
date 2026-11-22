/**
 * Editor-equivalent helpers for the MCP Node bridges.
 *
 * Each function mirrors a specific piece of index.html so MCP output matches the
 * editor: project load (drawingReplay), animationSource(), animationRaster() colour
 * tables, animationExportFrames() timing, loadGlyphSheet(), exportCellSize() and the
 * native PRG/D64 routing in the Download panel. Keep them in step with the editor.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const load = (name) => import(pathToFileURL(join(ROOT, name)).href);

const { validateProject, normalizeAnimation } = await load('project-validation.js');
const { animationCells, animationCount, animationPlan, animationDelay } = await load('animation-frames.js');
const { paletteColors, isDisplayPaletteId } = await load('c64-colors.js');
const { PLUS4_COLORS, isPlus4ColorEffect } = await load('plus4-colors.js');
const { VDC_COLORS } = await load('vdc-colors.js');
const {
  MACHINE, CELL_ASPECT, getMachine, isTedMachine, isVdcMachine, cellAspectUnits, isCellAspectId,
} = await load('machine-modes.js');
const { backdropExportActive, prepareNativeBackdropFrames } = await load('native-backdrop-export.js');

export { animationPlan, animationCount, validateProject };

/** Read and validate a v3 project (throws the editor's validation message). */
export function loadProject(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  validateProject(data);
  return data;
}

export function projectMachine(data) {
  return getMachine(data.machine ?? MACHINE.C64).id;
}

export function projectPalette(data) {
  return isDisplayPaletteId(data.palette) ? data.palette : 'pepto';
}

/** Editor control defaults for fields a project's animation object may omit. */
export const ANIMATION_DEFAULTS = Object.freeze({
  effect: 'none', colorEffect: 'none', seconds: 2, scale: 2, background: 'dark',
  motionCycles: 1, colorCycles: 1,
  cameraDistance: 4, cameraOrbit: 0, cameraElevation: 0, cameraMotion: 0,
  scrollDirection: 'left', waveDirection: 'up', waveShape: 'sine', waveAmplitude: 100, waveLength: 50,
  colorWaveDirection: 'up-left', colorWaveShape: 'sawtooth', colorWaveAmplitude: 100, colorWaveLength: 50,
  fieldBrightness: 100, wipePattern: 'diagonal', depthTravel: 'toward', depthWaveShape: 'sawtooth',
  fieldRamp: 'cycle', fieldDirection: 'forward', fieldLead: 1,
  parallaxGroup: 'ink', parallaxSpread: 1, parallaxTravel: 'same',
});

/** Settings overrides merged over project.animation, as the editor normalizes them. */
export function mergeAnimationSettings(data, settings = {}) {
  const anim = { ...(data.animation || {}), ...settings };
  if (settings.motionEffect !== undefined) anim.effect = settings.motionEffect;
  if (settings.motion !== undefined && settings.motionEffect === undefined) anim.effect = settings.motion;
  return { ...ANIMATION_DEFAULTS, ...normalizeAnimation(anim) };
}

/**
 * index.html load + resetReplay(): a project without drawingReplay replays every
 * painted cell in index order from an empty base.
 */
function replayFields(data, colors) {
  const cellCount = data.columns * data.rows;
  const grid = data.grid;
  const inks = data.cellColors || Array(cellCount).fill(colors.ink);
  const replay = data.drawingReplay;
  if (replay) {
    return {
      base: replay.base.slice(),
      events: replay.events.map((event) => event.slice()),
      baseColors: replay.baseColors?.slice() ?? Array(cellCount).fill(colors.ink),
      eventColors: replay.eventColors?.slice() ?? Array(replay.events.length).fill(colors.ink),
    };
  }
  const events = [];
  const eventColors = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== '') {
      events.push([i, grid[i]]);
      eventColors.push(inks[i]);
    }
  }
  return { base: Array(cellCount).fill(''), events, baseColors: inks.slice(), eventColors };
}

/** index.html animationSource(): project fields + machine + display palette + animation. */
export function animationSource(data, settings = {}) {
  const machine = getMachine(data.machine ?? MACHINE.C64);
  const colors = {
    ink: data.colors?.ink ?? machine.defaultInk,
    background: data.colors?.background ?? machine.defaultBackground,
  };
  const anim = mergeAnimationSettings(data, settings);
  const cellCount = data.columns * data.rows;
  return {
    W: data.columns,
    H: data.rows,
    grid: data.grid.slice(),
    inks: (data.cellColors || Array(cellCount).fill(colors.ink)).slice(),
    ...replayFields(data, colors),
    colors,
    machine: machine.id,
    palette: projectPalette(data),
    ...anim,
  };
}

/** index.html animationRaster(): the colour table every ink index is looked up in. */
export function colorTable(machineId, paletteId, colorEffect = 'none') {
  if (isTedMachine(machineId) || isPlus4ColorEffect(colorEffect)) {
    return { id: 'ted', colors: PLUS4_COLORS };
  }
  if (isVdcMachine(machineId)) {
    return { id: 'vdc', colors: VDC_COLORS };
  }
  const palette = isDisplayPaletteId(paletteId) ? paletteId : 'pepto';
  return { id: palette, colors: paletteColors(palette) };
}

/** Glyph sheet the editor's selectActiveRom() uses for this machine. */
export function glyphSheet(machineId) {
  return isTedMachine(machineId) ? 'ted' : 'c64';
}

/** index.html exportCellSize() in glyph-pixel units: square 8×8, CRT 5×6 (VIC/TED) or 5×12 (VDC). */
export function cellShape(machineId, aspect) {
  const shape = isCellAspectId(aspect) ? aspect : CELL_ASPECT.SQUARE;
  if (shape === CELL_ASPECT.SQUARE) return { id: shape, unitW: 8, unitH: 8 };
  const units = cellAspectUnits(machineId, shape);
  return { id: shape, unitW: units.aw, unitH: units.ah };
}

/** index.html animationExportFrames(): start times and durations rounded to 10 ms. */
export function exportFrameTimes(source) {
  let elapsed = 0;
  return Array.from({ length: animationCount(source) }, (_, index) => {
    const startMs = Math.round(elapsed / 10) * 10;
    elapsed += animationDelay(index, source);
    return { index, startMs, durationMs: Math.round(elapsed / 10) * 10 - startMs };
  });
}

/** index.html loadGlyphSheet(): 4096 bytes (2 banks × 256 glyphs × 8 rows) from the SVG atlas. */
export function glyphBits(sheet) {
  const text = readFileSync(join(ROOT, 'assets', `${sheet}-glyphs.svg`), 'utf8');
  const bytes = new Uint8Array(4096);
  const symbols = [...text.matchAll(/<symbol id="(\w+)-(\d)-(\d+)"[^>]*>([\s\S]*?)<\/symbol>/g)];
  if (symbols.length !== 512) throw Error(`Invalid ${sheet} glyph sheet`);
  for (const [, prefix, bank, code, body] of symbols) {
    if (prefix !== sheet) throw Error(`Unexpected glyph id prefix ${prefix}`);
    for (const rect of body.matchAll(/<rect\s+x="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="(\d+)"\s*\/>/g)) {
      const [x, y, w, h] = rect.slice(1).map(Number);
      if (x + w > 8 || y + h > 8) throw Error('Invalid glyph geometry');
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) bytes[Number(bank) * 2048 + Number(code) * 8 + yy] |= 128 >> xx;
      }
    }
  }
  return bytes;
}

/**
 * Frames for rasterizing. Each frame lists glyph ids, ink indices, a background index and an
 * optional per-cell backdrop matte, all indices into `table`.
 */
export function renderPlan(data, { mode = 'still', settings = {}, cellAspect = 'square' } = {}) {
  const source = animationSource(data, settings);
  const moving = mode === 'animation';
  const plan = moving ? animationPlan(source) : { count: 1, warning: '' };
  const table = colorTable(source.machine, source.palette, moving ? source.colorEffect : 'none');
  let frames;
  if (moving) {
    frames = exportFrameTimes(source).map(({ index, startMs, durationMs }) => {
      const picture = animationCells(index, source);
      const matte = picture.backgroundMatte;
      return {
        index,
        startMs,
        durationMs,
        cells: picture.cells,
        inks: picture.inks,
        background: picture.background ?? source.colors.background,
        matte: matte && matte.length === source.W * source.H ? Array.from(matte) : null,
      };
    });
  } else {
    frames = [{
      index: 0, startMs: 0, durationMs: 0, cells: source.grid, inks: source.inks,
      background: source.colors.background, matte: null,
    }];
  }
  return {
    machine: source.machine,
    palette: source.palette,
    table: table.id,
    colors: table.colors.map(([, hex]) => hex),
    glyphSheet: glyphSheet(source.machine),
    cell: cellShape(source.machine, cellAspect),
    columns: source.W,
    rows: source.H,
    backgroundMode: moving ? source.background : 'dark',
    projectBackground: source.colors.background,
    seconds: source.seconds,
    warning: plan.warning || '',
    motionEffect: source.effect,
    colorEffect: source.colorEffect,
    backgroundEffect: source.backgroundEffect,
    frameCount: frames.length,
    frames,
  };
}

/** index.html $('exportC64').onclick: PRG bytes for the project's machine. */
export async function nativeProgram(data, { mode = 'still', settings = {}, repetitions = 1, allowTimingOverrun = false } = {}) {
  const source = animationSource(data, settings);
  const moving = mode === 'animation';
  if (moving && animationPlan(source).warning && !allowTimingOverrun) {
    throw Error(animationPlan(source).warning);
  }
  const timed = () => exportFrameTimes(source).map((f) => ({ ...animationCells(f.index, source), durationMs: f.durationMs }));
  let frames;
  if (backdropExportActive(source)) {
    frames = prepareNativeBackdropFrames(moving ? timed() : [{ ...animationCells(0, source), durationMs: 1000 / 60 }]);
  } else {
    frames = moving ? timed() : [{ cells: source.grid, inks: source.inks, durationMs: 1000 / 60 }];
  }
  const needsGlyphBits = frames.some((frame) => frame.cells.some((glyph) => glyph > 255));
  const bits = needsGlyphBits ? { glyphBits: glyphBits(glyphSheet(source.machine)) } : {};
  const reps = moving ? repetitions : 1;
  const common = {
    columns: source.W, rows: source.H, background: source.colors.background, ink: source.colors.ink,
    frames, repetitions: reps, allowTimingOverrun: moving && allowTimingOverrun, ...bits,
  };
  let mod;
  let result;
  if (source.machine === MACHINE.PLUS4) {
    mod = await load('plus4-export.js');
    result = mod.createPlus4AdaptiveProgram(common);
  } else if (source.machine === MACHINE.C128_80) {
    mod = await load('c128-vdc-export.js');
    result = mod.createC128VdcAdaptiveProgram(common);
  } else {
    mod = await load('c64-export.js');
    const motionSource = needsGlyphBits ? null : motionSourceForExport(source);
    result = mod.createC64AdaptiveProgram({
      machine: source.machine, charset: 0, ...common, ...(motionSource ? { motionSource } : {}),
    });
  }
  return { machine: source.machine, result, createD64Disk: mod.createD64Disk, moving };
}

/** index.html motionSourceForExport(): procedural VIC playback for column-wave / FLD blinds. */
function motionSourceForExport(s) {
  const effect = s.effect;
  if ((effect !== 'column-wave' && effect !== 'fld-blinds') || s.colorEffect !== 'none' || (s.backgroundEffect ?? 'none') !== 'none') {
    return null;
  }
  return {
    W: s.W, H: s.H, grid: s.grid, inks: s.inks, colors: s.colors, effect,
    scrollDirection: s.scrollDirection, waveShape: s.waveShape, waveAmplitude: s.waveAmplitude,
    waveLength: s.waveLength, seconds: s.seconds, motionCycles: s.motionCycles ?? 1,
    colorEffect: 'none', backgroundEffect: 'none',
  };
}
