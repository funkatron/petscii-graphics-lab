// Research spike (roadmap #1, owner queue phase 2): longitudinal diagonal wave.
// See docs/diagonal-wave-wipe-prep.md, Candidate A.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {animationCells, animationPlan, diagonalWaveVector, waveValue} from '../animation-frames.js';
import {DIAGONAL_WAVE_EFFECT, MOTION_EFFECTS} from '../project-validation.js';

const DIAGONALS = ['up-left', 'up-right', 'down-left', 'down-right'];
const SHAPES = ['sine', 'triangle', 'square', 'sawtooth', 'reverse-sawtooth'];
const SIZES = [[1, 1], [1, 7], [7, 1], [4, 4], [5, 3], [8, 8], [40, 25]];

// Every cell gets a unique (glyph, ink) pair, so an output cell names its source index.
function source(W, H, extra = {}) {
  return {
    W,
    H,
    grid: Array.from({length: W * H}, (_, i) => i % 512),
    inks: Array.from({length: W * H}, (_, i) => Math.floor(i / 512)),
    effect: DIAGONAL_WAVE_EFFECT,
    waveDirection: 'down-right',
    colorEffect: 'none',
    seconds: 2,
    ...extra,
  };
}
const sourceIndex = (glyph, ink) => ink * 512 + glyph;
const mod = (v, n) => ((v % n) + n) % n;

// Signed shift k (cells along the travel vector) for each output cell, decoded from the frame.
function shifts(frame, s) {
  const {dx, dy} = diagonalWaveVector(s);
  const out = [];
  for (let y = 0; y < s.H; y++) {
    for (let x = 0; x < s.W; x++) {
      const i = y * s.W + x;
      const from = sourceIndex(frame.cells[i], frame.inks[i]);
      const fx = from % s.W;
      const fy = Math.floor(from / s.W);
      const k = [-3, -2, -1, 0, 1, 2, 3].find(c => mod(x - dx * c, s.W) === fx && mod(y - dy * c, s.H) === fy);
      out.push(k);
    }
  }
  return out;
}

test('diagonal-wave is a research spike: no project files, no menu', () => {
  assert.equal(DIAGONAL_WAVE_EFFECT, 'diagonal-wave');
  assert.ok(!MOTION_EFFECTS.includes(DIAGONAL_WAVE_EFFECT));
});

for (const [W, H] of SIZES) {
  test(`diagonal-wave plans max(24, W, H) frames on ${W}x${H}`, () => {
    assert.deepEqual(animationPlan(source(W, H)), {count: Math.max(24, W, H), warning: ''});
  });

  test(`diagonal-wave keeps source pairs and samples only along travel on ${W}x${H}`, () => {
    for (const waveDirection of DIAGONALS) {
      for (const waveShape of SHAPES) {
        const s = source(W, H, {waveDirection, waveShape});
        const before = JSON.stringify(s);
        const n = animationPlan(s).count;
        for (let f = 0; f < n; f++) {
          const frame = animationCells(f, s);
          assert.equal(frame.cells.length, W * H);
          // Each output cell is an unmodified source (glyph, ink) pair, displaced along
          // the travel diagonal by at most 3 cells: longitudinal, never sideways.
          for (const k of shifts(frame, s)) {
            assert.notEqual(k, undefined, `${waveDirection} ${waveShape} frame ${f}: sideways sample`);
          }
        }
        assert.equal(JSON.stringify(s), before, 'source is not mutated');
      }
    }
  });
}

for (const [W, H] of [[4, 4], [40, 25]]) {
  for (const waveDirection of ['up-left', 'down-right']) {
    test(`diagonal-wave is deterministic and loop-closed on ${W}x${H} ${waveDirection}`, () => {
      const s = source(W, H, {waveDirection});
      const n = animationPlan(s).count;
      for (let f = 0; f < n; f++) {
        assert.deepEqual(animationCells(f, s), animationCells(f, structuredClone(s)));
        // The next loop repeats exactly.
        assert.deepEqual(animationCells(f + n, s).cells, animationCells(f, s).cells);
      }
    });
  }
}

test('diagonal-wave matches the documented shift rule (40x25, all diagonals and shapes)', () => {
  for (const waveDirection of DIAGONALS) {
    for (const waveShape of SHAPES) {
      for (const [waveAmplitude, waveLength] of [[100, 50], [50, 25], [10, 100]]) {
        const s = source(40, 25, {waveDirection, waveShape, waveAmplitude, waveLength});
        const {dx, dy} = diagonalWaveVector(s);
        const n = animationPlan(s).count;
        for (const f of [0, 1, Math.floor(n / 3), n - 1]) {
          const got = shifts(animationCells(f, s), s);
          for (let y = 0; y < 25; y++) {
            for (let x = 0; x < 40; x++) {
              const position = (dx * x / 40 + dy * y / 25) / 2 * (50 / waveLength);
              const want = Math.round(waveValue(waveShape, position - f / n) * 3 * waveAmplitude / 100) + 0;
              assert.equal(got[y * 40 + x], want, `${waveDirection} ${waveShape} f${f} (${x},${y})`);
            }
          }
        }
      }
    }
  }
});

test('diagonal-wave bands travel toward the chosen corner', () => {
  // Down the main diagonal of a square grid, the strongest forward shift should move
  // toward the corner the direction names as frames advance.
  for (const waveDirection of DIAGONALS) {
    const s = source(24, 24, {waveDirection, waveShape: 'sine', waveLength: 50});
    const {dx, dy} = diagonalWaveVector(s);
    const diagonal = Array.from({length: 24}, (_, i) => {
      const x = dx > 0 ? i : 23 - i;
      const y = dy > 0 ? i : 23 - i;
      return y * 24 + x;
    });
    const peak = f => {
      const k = shifts(animationCells(f, s), s);
      let best = 0;
      for (let i = 1; i < 24; i++) {
        if (k[diagonal[i]] > k[diagonal[best]]) best = i;
      }
      return best;
    };
    const steps = mod(peak(4) - peak(0), 24);
    assert.ok(steps > 0 && steps < 12, `${waveDirection}: peak moved ${steps} cells toward the corner`);
  }
});

test('diagonal-wave leaves uniform artwork unchanged and falls back to down-right', () => {
  const uniform = {...source(6, 5), grid: Array(30).fill(81), inks: Array(30).fill(7)};
  for (let f = 0; f < 24; f++) {
    assert.deepEqual(animationCells(f, uniform).cells, uniform.grid);
  }
  for (const waveDirection of [undefined, 'up', 'left']) {
    const s = source(8, 8, {waveDirection});
    assert.equal(diagonalWaveVector(s).direction, 'down-right');
    assert.deepEqual(animationCells(5, s), animationCells(5, source(8, 8)));
  }
});
