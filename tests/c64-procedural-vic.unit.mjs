import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLUMN_WAVE_EFFECT,
  FLD_BLINDS_EFFECT,
} from '../project-validation.js';
import {
  PROCEDURAL_VIC_RUNTIME_BYTES,
  columnWavePhaseTables,
  decodeColumnWaveTables,
  encodeColumnWaveTables,
  decodeFldBlindsTables,
  encodeFldBlindsTables,
  fldBlindsGapTables,
  proceduralVicEligible,
  createC64ProceduralVicProgram,
} from '../c64-procedural-vic.js';
import {animationCells, animationCount, animationDelay} from '../animation-frames.js';
import {createC64AdaptiveProgram, createC64Program} from '../c64-export.js';
import {
  compileProceduralVicProgram,
  expectedProceduralVicLayout,
  proceduralFramePicture,
} from '../c64-procedural-codegen.js';

const ramp = [2, 8, 7, 13, 3, 14, 6, 4];
const sparseGrid = Array.from({length: 40 * 24}, (_, i) => {
  const x = i % 40;
  const y = Math.floor(i / 40);
  return x === y || x === 39 - y ? 160 : '';
});
const sparseInks = sparseGrid.map((_, i) => ramp[(i % 40 + Math.floor(i / 40) * 3) % 8]);

function motion(extra) {
  return {
    W: 40,
    H: 24,
    grid: sparseGrid,
    inks: sparseInks.slice(),
    colors: {background: 6, ink: 14},
    colorEffect: 'none',
    backgroundEffect: 'none',
    seconds: 2,
    motionCycles: 1,
  waveShape: 'sine',
    waveLength: 50,
    waveAmplitude: 50,
    ...extra,
  };
}

test('column-wave and fld-blinds tables round-trip', () => {
  const column = columnWavePhaseTables(motion({effect: COLUMN_WAVE_EFFECT, scrollDirection: 'left'}));
  assert.equal(decodeColumnWaveTables(encodeColumnWaveTables(column)).frameCount, column.frameCount);
  const blinds = fldBlindsGapTables(motion({effect: FLD_BLINDS_EFFECT}));
  assert.equal(decodeFldBlindsTables(encodeFldBlindsTables(blinds)).frameCount, blinds.frameCount);
});

test('procedural eligibility rejects color motion', () => {
  assert.equal(proceduralVicEligible(motion({effect: COLUMN_WAVE_EFFECT, colorEffect: 'color-wave'})), false);
  assert.equal(proceduralVicEligible(motion({effect: FLD_BLINDS_EFFECT})), true);
});

function exportFrames(source) {
  const n = animationCount(source);
  let elapsed = 0;
  const frames = [];
  for (let index = 0; index < n; index++) {
    const startMs = Math.round(elapsed / 10) * 10;
    elapsed += animationDelay(index, source);
    frames.push({
      ...animationCells(index, source),
      durationMs: Math.round(elapsed / 10) * 10 - startMs,
    });
  }
  return frames;
}

test('40×24 column-wave procedural profile fits export-rounded replay', () => {
  const motionSource = motion({effect: COLUMN_WAVE_EFFECT, scrollDirection: 'left'});
  const frames = exportFrames(motionSource);
  const replay = createC64Program({
    columns: 40,
    rows: 24,
    background: 6,
    ink: 14,
    frames,
    analyze: true,
  });
  assert.ok(replay.diagnostics.worstUpdateRatio > 1 || replay.diagnostics.programBytes > 20000);
  const adaptive = createC64AdaptiveProgram({
    columns: 40,
    rows: 24,
    background: 6,
    ink: 14,
    frames,
    motionSource,
    analyze: true,
  });
  assert.equal(adaptive.diagnostics.renderer, 'procedural-v2');
  assert.ok(adaptive.diagnostics.programBytes <= adaptive.diagnostics.memoryLimit);
  assert.ok(adaptive.diagnostics.worstUpdateRatio <= 1);
  assert.ok(adaptive.diagnostics.proceduralTableBytes > 0);
  assert.ok(adaptive.diagnostics.proceduralRuntimeBytes >= PROCEDURAL_VIC_RUNTIME_BYTES);
});

test('createC64ProceduralVicProgram analyze:false returns PRG bytes', () => {
  const motionSource = {
    ...motion({effect: COLUMN_WAVE_EFFECT, scrollDirection: 'left'}),
    W: 8,
    H: 5,
    grid: Array.from({length: 40}, (_, i) => (i % (8 + 1) === 0 ? 160 : '')),
    inks: Array(40).fill(2),
  };
  const frames = exportFrames(motionSource).slice(0, 3);
  const program = createC64ProceduralVicProgram({
    columns: 8,
    rows: 5,
    background: 6,
    ink: 2,
    motionSource,
    frames,
    analyze: false,
  });
  assert.ok(program.bytes.length > 200);
  assert.equal(program.diagnostics.renderer, 'procedural-v2');
  assert.ok(program.diagnostics.proceduralRuntimeBytes > 0);
});

test('proceduralFramePicture matches animationCells on sample frames', () => {
  const motionSource = motion({effect: COLUMN_WAVE_EFFECT, scrollDirection: 'left'});
  for (const frameIndex of [0, 3, 7]) {
    const fromPicture = proceduralFramePicture(motionSource, frameIndex);
    const fromAnim = animationCells(frameIndex, motionSource);
    assert.deepEqual(fromPicture.cells, fromAnim.cells);
    assert.deepEqual(fromPicture.inks, fromAnim.inks);
    const layout = expectedProceduralVicLayout({
      columns: 40,
      rows: 24,
      ink: 14,
      motionSource,
      frameIndex,
    });
    assert.equal(layout.screen.filter(v => v === 160).length, fromAnim.cells.filter(c => c === 160).length);
  }
});