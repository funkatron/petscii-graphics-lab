import {spawnSync} from 'node:child_process';
import {test, expect} from '@playwright/test';
import {
  compileProceduralVicProgram,
  expectedProceduralVicLayout,
  proceduralFramePicture,
} from '../c64-procedural-codegen.js';
import {
  COLUMN_WAVE_EFFECT,
  FLD_BLINDS_EFFECT,
} from '../project-validation.js';
import {animationCount, animationDelay} from '../animation-frames.js';

function stopTickForFrame(motionSource, frameIndex) {
  let ticks = 0;
  for (let i = 0; i <= frameIndex; i++) {
    ticks += Math.max(1, Math.round(animationDelay(i, motionSource) * 60 / 1000));
  }
  return Math.max(1, ticks - 1);
}

function emulatePy65(prg, stopAfterTicks) {
  const result = spawnSync('python3', ['tests/c64-emulate.py'], {
    input: JSON.stringify({prg: [...prg], stopAfterTicks, maxSteps: 8_000_000}),
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
  if (result.stderr) {
    expect(result.stderr).toBe('');
  }
  return JSON.parse(result.stdout);
}

function canvasOffset(rows, columns) {
  return Math.floor((25 - rows) / 2) * 40 + Math.floor((40 - columns) / 2);
}

function compareLayout(snap, exp, rows, columns) {
  const off = canvasOffset(rows, columns);
  let bad = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const d = off + y * 40 + x;
      if (snap.screen[d] !== exp.screen[d] || snap.colors[d] !== exp.colors[d]) {
        bad++;
      }
    }
  }
  return bad;
}

test.describe('procedural v2 PRG playback (py65)', () => {
  test('8×5 column-wave matches export-rounded layout', () => {
    const grid = Array.from({length: 40}, (_, i) => (i % (8 + 1) === 0 ? 160 : ''));
    const motionSource = {
      W: 8,
      H: 5,
      grid,
      inks: grid.map((_, i) => (i + 2) % 16),
      colors: {background: 6, ink: 2},
      effect: COLUMN_WAVE_EFFECT,
      scrollDirection: 'left',
      waveShape: 'sine',
      waveAmplitude: 50,
      waveLength: 50,
      seconds: 2,
      motionCycles: 1,
      colorEffect: 'none',
      backgroundEffect: 'none',
    };
    const program = compileProceduralVicProgram({
      columns: 8,
      rows: 5,
      background: 6,
      ink: 2,
      charset: 0,
      repetitions: 1,
      motionSource,
    });
  const mid = Math.floor(animationCount(motionSource) / 2);
    for (const frameIndex of [0, mid]) {
      const stop = stopTickForFrame(motionSource, frameIndex);
      const out = emulatePy65(program.bytes, stop);
      const snap = out.snapshots.at(-1);
      const exp = expectedProceduralVicLayout({
        columns: 8,
        rows: 5,
        ink: 2,
        motionSource,
        frameIndex,
      });
      expect(compareLayout(snap, exp, 5, 8)).toBe(0);
    }
    expect(program.bytes.length).toBeGreaterThan(800);
    expect(program.bytes.length).toBeLessThan(1200);
  });

  test('8×6 fld-blinds sparse spot-check', () => {
    const motionSource = {
      W: 8,
      H: 6,
      grid: Array.from({length: 48}, (_, i) => (i % 2 === 0 ? 160 : '')),
      inks: Array.from({length: 48}, (_, i) => i % 16),
      colors: {background: 6, ink: 2},
      effect: FLD_BLINDS_EFFECT,
      waveShape: 'sine',
      waveAmplitude: 50,
      waveLength: 50,
      seconds: 2,
      motionCycles: 1,
      colorEffect: 'none',
      backgroundEffect: 'none',
    };
    const program = compileProceduralVicProgram({
      columns: 8,
      rows: 6,
      background: 6,
      ink: 2,
      charset: 0,
      repetitions: 1,
      motionSource,
    });
    const frameIndex = 6;
    const stop = stopTickForFrame(motionSource, frameIndex);
    const out = emulatePy65(program.bytes, stop);
    const snap = out.snapshots.at(-1);
    const exp = expectedProceduralVicLayout({
      columns: 8,
      rows: 6,
      ink: 2,
      motionSource,
      frameIndex,
    });
    const bad = compareLayout(snap, exp, 6, 8);
    expect(bad).toBe(0);
    const picture = proceduralFramePicture(motionSource, frameIndex);
    const off = canvasOffset(6, 8);
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 8; x++) {
        const d = off + y * 40 + x;
        const glyph = picture.cells[y * 8 + x] === '' ? 32 : picture.cells[y * 8 + x];
        expect(snap.screen[d]).toBe(glyph);
      }
    }
  });
});