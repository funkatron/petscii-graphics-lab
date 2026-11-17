import {
  animationCount,
  animationDelay,
  cyclePhase,
  effectCycles,
  fldBlindsFrame,
  scrollDirection,
  waveValue,
} from './animation-frames.js';
import {COLUMN_WAVE_EFFECT, FLD_BLINDS_EFFECT} from './project-validation.js';
import {createC64Program, nativeMemoryLimit} from './c64-export.js';
import {MACHINE} from './machine-modes.js';

/** Estimated 6502 column-wave / row-gap interpreter (not yet wired to codegen). */
export const PROCEDURAL_VIC_RUNTIME_BYTES = 540;
const CYCLES_PER_CELL = 45;
const FRAME_OVERHEAD_CYCLES = 1400;

const PROCEDURAL_EFFECTS = new Set([COLUMN_WAVE_EFFECT, FLD_BLINDS_EFFECT]);

export function proceduralVicEligible(motionSource) {
  return motionSource
    && PROCEDURAL_EFFECTS.has(motionSource.effect)
    && motionSource.colorEffect === 'none'
    && !backgroundActive(motionSource);
}

function backgroundActive(source) {
  const effect = source.backgroundEffect ?? 'none';
  return effect !== 'none';
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}

function frameTicks(source, frameIndex) {
  return Math.max(1, Math.round(animationDelay(frameIndex, source) * 60 / 1000));
}

function columnWaveBendScale(source) {
  const amp = source.waveAmplitude ?? 100;
  return Math.min(3, Math.max(1, source.H / 4)) * 2 * (amp / 100);
}

export function columnWavePhaseTables(motionSource) {
  const W = motionSource.W;
  const H = motionSource.H;
  const frameCount = animationCount(motionSource);
  const cycles = effectCycles(motionSource);
  const direction = scrollDirection(motionSource);
  const sign = direction === 'right' ? -1 : 1;
  const spacing = 50 / (motionSource.waveLength ?? 50);
  const shape = motionSource.waveShape ?? 'sine';
  const bendScale = columnWaveBendScale(motionSource);
  const frames = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const phase = cyclePhase(frame, frameCount, cycles.motion);
    const travel = Math.floor(phase * W) * sign;
    const bends = new Int8Array(W);
    for (let x = 0; x < W; x++) {
      bends[x] = Math.round(
        waveValue(shape, (x / W) * spacing + phase) * bendScale,
      );
    }
    frames.push({travel, bends});
  }
  return {effect: COLUMN_WAVE_EFFECT, W, H, frameCount, direction, frames};
}

export function encodeColumnWaveTables(tables) {
  const bytes = [0x56, 0x32, tables.frameCount & 255, tables.frameCount >> 8, tables.W, tables.H, tables.direction === 'right' ? 1 : 0];
  for (const frame of tables.frames) {
    bytes.push((frame.travel + 128) & 255);
    for (let x = 0; x < tables.W; x++) {
      bytes.push((frame.bends[x] + 128) & 255);
    }
  }
  return Uint8Array.from(bytes);
}

export function decodeColumnWaveTables(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 7 || bytes[0] !== 0x56 || bytes[1] !== 0x32) {
    throw Error('Invalid column-wave procedural table');
  }
  const frameCount = bytes[2] | (bytes[3] << 8);
  const W = bytes[4];
  const H = bytes[5];
  const direction = bytes[6] === 1 ? 'right' : 'left';
  const rowBytes = 1 + W;
  const expected = 7 + frameCount * rowBytes;
  if (bytes.length !== expected) {
    throw Error('Column-wave table length mismatch');
  }
  const frames = [];
  let offset = 7;
  for (let f = 0; f < frameCount; f++) {
    const travel = bytes[offset++] - 128;
    const bends = new Int8Array(W);
    for (let x = 0; x < W; x++) {
      bends[x] = bytes[offset++] - 128;
    }
    frames.push({travel, bends});
  }
  return {effect: COLUMN_WAVE_EFFECT, W, H, frameCount, direction, frames};
}

export function fldBlindsGapTables(motionSource) {
  const H = motionSource.H;
  const frameCount = animationCount(motionSource);
  const cycles = effectCycles(motionSource);
  const amplitude = (motionSource.waveAmplitude ?? 100) / 100;
  const maxGap = Math.min(3, Math.max(0, Math.round((H / 3) * amplitude)));
  const spacing = 50 / (motionSource.waveLength ?? 50);
  const shape = motionSource.waveShape ?? 'sine';
  const frames = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const phase = cyclePhase(frame, frameCount, cycles.motion);
    const gaps = new Uint8Array(H);
    for (let sy = 0; sy < H; sy++) {
      const openness = (waveValue(shape, sy / Math.max(1, H) * spacing + phase) + 1) / 2;
      gaps[sy] = sy === 0 ? 0 : Math.round(maxGap * (1 - openness));
    }
    frames.push({gaps, maxGap});
  }
  return {effect: FLD_BLINDS_EFFECT, W: motionSource.W, H, frameCount, frames};
}

export function encodeFldBlindsTables(tables) {
  const bytes = [0x46, 0x32, tables.frameCount & 255, tables.frameCount >> 8, tables.W, tables.H];
  for (const frame of tables.frames) {
    bytes.push(frame.maxGap & 255);
    bytes.push(...frame.gaps);
  }
  return Uint8Array.from(bytes);
}

export function decodeFldBlindsTables(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 6 || bytes[0] !== 0x46 || bytes[1] !== 0x32) {
    throw Error('Invalid fld-blinds procedural table');
  }
  const frameCount = bytes[2] | (bytes[3] << 8);
  const W = bytes[4];
  const H = bytes[5];
  const rowBytes = 1 + H;
  const expected = 6 + frameCount * rowBytes;
  if (bytes.length !== expected) {
    throw Error('Fld-blinds table length mismatch');
  }
  const frames = [];
  let offset = 6;
  for (let f = 0; f < frameCount; f++) {
    const maxGap = bytes[offset++];
    const gaps = bytes.subarray(offset, offset + H);
    offset += H;
    frames.push({gaps: Uint8Array.from(gaps), maxGap});
  }
  return {effect: FLD_BLINDS_EFFECT, W, H, frameCount, frames};
}

function countColumnWaveWrites(motionSource, frameIndex) {
  const W = motionSource.W;
  const H = motionSource.H;
  const tables = columnWavePhaseTables(motionSource);
  const {travel, bends} = tables.frames[frameIndex];
  let writes = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = wrap(x + travel, W);
      const sy = wrap(y + bends[x], H);
      const si = sy * W + sx;
      if (motionSource.grid[si] !== '') {
        writes++;
      }
    }
  }
  return writes;
}

function countFldBlindsWrites(motionSource, frameIndex) {
  const cycles = effectCycles(motionSource);
  const frameCount = animationCount(motionSource);
  const phase = cyclePhase(frameIndex, frameCount, cycles.motion);
  const picture = fldBlindsFrame(phase, motionSource);
  return picture.cells.filter(c => c !== '').length + picture.cells.filter(c => c === '').length;
}

function proceduralTableBytes(motionSource) {
  if (motionSource.effect === COLUMN_WAVE_EFFECT) {
    return encodeColumnWaveTables(columnWavePhaseTables(motionSource)).length;
  }
  if (motionSource.effect === FLD_BLINDS_EFFECT) {
    return encodeFldBlindsTables(fldBlindsGapTables(motionSource)).length;
  }
  throw Error('Unsupported procedural motion');
}

function proceduralWorstUpdateRatio(motionSource) {
  const frameCount = animationCount(motionSource);
  const cpuHz = 985248;
  let worst = 0;
  const counter = motionSource.effect === COLUMN_WAVE_EFFECT
    ? countColumnWaveWrites
    : countFldBlindsWrites;
  for (let frame = 0; frame < frameCount; frame++) {
    const ticks = frameTicks(motionSource, frame);
    const writes = counter(motionSource, frame);
    const cost = FRAME_OVERHEAD_CYCLES + writes * CYCLES_PER_CELL;
    worst = Math.max(worst, cost / (ticks * cpuHz / 60));
  }
  return worst;
}

function proceduralDurationTicks(motionSource) {
  const frameCount = animationCount(motionSource);
  let total = 0;
  for (let i = 0; i < frameCount; i++) {
    total += frameTicks(motionSource, i);
  }
  return total;
}

/**
 * Analyze (or estimate) a procedural VIC profile for research motions.
 * Downloadable PRG bytes are not emitted until the v2 runtime is codegen-complete.
 */
export function createC64ProceduralVicProgram(input) {
  const motionSource = input.motionSource;
  if (!proceduralVicEligible(motionSource)) {
    throw Error('Motion is not eligible for procedural VIC export');
  }
  if (input.glyphBits !== undefined) {
    throw Error('Procedural VIC export does not support custom glyph ROM data yet');
  }
  if (!input.frames?.length) {
    throw Error('Procedural VIC export requires a static frame snapshot');
  }
  const machine = input.machine ?? MACHINE.C64;
  const init = createC64Program({
    columns: input.columns,
    rows: input.rows,
    charset: input.charset ?? 0,
    background: input.background,
    ink: input.ink,
    frames: [input.frames[0]],
    repetitions: input.repetitions ?? 0,
    machine,
    analyze: true,
  });
  const tableBytes = proceduralTableBytes(motionSource);
  const programBytes = init.diagnostics.programBytes + PROCEDURAL_VIC_RUNTIME_BYTES + tableBytes;
  const worstUpdateRatio = proceduralWorstUpdateRatio(motionSource);
  const memoryLimit = nativeMemoryLimit(machine, {custom: false});
  const frameCount = animationCount(motionSource);
  const durationTicks = proceduralDurationTicks(motionSource);
  const fits = programBytes <= memoryLimit && worstUpdateRatio <= 1;
  if (!input.analyze) {
    if (!fits) {
      if (worstUpdateRatio > 1) {
        throw Error('Procedural VIC playback exceeds the estimated timing budget');
      }
      throw Error('Procedural VIC export exceeds the memory budget');
    }
    throw Error('Procedural VIC player v2 is not downloadable yet; analysis-only profile');
  }
  const bytes = new Uint8Array(Math.min(programBytes, init.bytes.length));
  bytes.set(init.bytes.subarray(0, bytes.length));
  return {
    bytes,
    frameCount,
    durationTicks,
    diagnostics: {
      ...init.diagnostics,
      machine,
      renderer: 'procedural-v2',
      programBytes,
      memoryLimit,
      worstUpdateRatio,
      proceduralTableBytes: tableBytes,
      proceduralRuntimeBytes: PROCEDURAL_VIC_RUNTIME_BYTES,
      nativeBytes: 0,
      nativeRowKernels: 0,
      nativeFrameStates: 0,
      sharedBlockCount: 0,
    },
  };
}