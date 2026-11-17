import {
  animationCount,
  cyclePhase,
  effectCycles,
  scrollDirection,
  waveValue,
} from './animation-frames.js';
import {COLUMN_WAVE_EFFECT, FLD_BLINDS_EFFECT} from './project-validation.js';
import {compileProceduralVicProgram} from './c64-procedural-codegen.js';
import {MACHINE} from './machine-modes.js';

/** Fallback estimate until compile; real programs use measured proceduralRuntimeBytes. */
export const PROCEDURAL_VIC_RUNTIME_BYTES = 540;
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

/** Build or analyze a procedural VIC player for research motions. */
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
  const result = compileProceduralVicProgram({...input, machine});
  const {diagnostics} = result;
  if (!input.analyze) {
    if (diagnostics.worstUpdateRatio > 1) {
      throw Error('Procedural VIC playback exceeds the estimated timing budget');
    }
    if (diagnostics.programBytes > diagnostics.memoryLimit) {
      throw Error('Procedural VIC export exceeds the memory budget');
    }
  }
  return result;
}