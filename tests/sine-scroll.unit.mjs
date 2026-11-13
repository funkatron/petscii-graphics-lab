import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {animationCells, animationPlan} from '../animation-frames.js';

const {reference} = createRequire(import.meta.url)('./sine-scroll-reference.cjs');
const directions = ['left', 'right', 'up', 'down', 'up-left', 'up-right', 'down-left', 'down-right'];

for (const [W, H] of [[1, 1], [1, 7], [7, 1], [5, 3], [3, 5], [8, 8], [40, 25]]) {
  test(`Sine scroller preserves all eight directions, source pairs and loops on ${W}x${H}`, () => {
    for (const scrollDirection of directions) {
      for (const waveAmplitude of [10, 50, 100]) {
        for (const waveLength of [10, 50, 100]) {
          const s = {
            W,
            H,
            grid: Array.from({length: W * H}, (_, i) => (i % 7 === 2 ? '' : i % 512)),
            inks: Array.from({length: W * H}, (_, i) => i % 16),
            effect: 'sine-scroll',
            scrollDirection,
            colorEffect: 'none',
            seconds: 2,
            waveAmplitude,
            waveLength,
          };
          const before = JSON.stringify(s);
          const p = {columns: W, rows: H, grid: s.grid, cellColors: s.inks, animation: s};
          const n = animationPlan(s).count;
          const expectedCount = Math.max(
            24,
            scrollDirection.includes('-')
              ? Math.max(W, H)
              : (['left', 'right'].includes(scrollDirection) ? W : H),
          );
          assert.equal(n, expectedCount);
          for (let f = 0; f < n; f++) {
            const frame = animationCells(f, s);
            // animationCells also reports colorPalette; VIC sine scroll stays pepto-pal.
            assert.equal(frame.colorPalette, 'pepto-pal');
            assert.deepEqual(
              {cells: frame.cells, inks: frame.inks},
              reference(p, scrollDirection, f / n),
            );
          }
          assert.equal(JSON.stringify(animationCells(n, s)), JSON.stringify(animationCells(0, s)));
          assert.equal(JSON.stringify(s), before);
        }
      }
    }
  });
}

test('rectangular diagonal sampling and independent rates retain the warning boundary', () => {
  const s = {
    effect: 'sine-scroll',
    W: 40,
    H: 3,
    scrollDirection: 'down-right',
    colorEffect: 'none',
    seconds: 2,
    motionCycles: 2,
  };
  assert.equal(animationPlan(s).count, 80);
  assert.equal(
    animationPlan({...s, seconds: 0.5, motionCycles: 16}).warning,
    'Too many cycles for this loop duration. Increase Loop duration or reduce cycles per loop.',
  );
  assert.equal(animationPlan({...s, seconds: 2, motionCycles: 16}).warning, '');
});

test('diagonal bend uses a perpendicular vector on square artwork', () => {
  const s = {
    effect: 'sine-scroll',
    W: 8,
    H: 8,
    grid: Array.from({length: 64}, (_, i) => i),
    inks: Array(64).fill(7),
    scrollDirection: 'down-right',
    colorEffect: 'none',
    seconds: 2,
    waveAmplitude: 100,
    waveLength: 50,
  };
  // Destination (2,2) is at the sine crest: round(-4/sqrt(2),4/sqrt(2))=(-3,3).
  assert.equal(animationCells(0, s).cells[18], 5 * 8 + 7);
  // At a quarter cycle both source coordinates retreat two cells, closing by a full cycle.
  assert.equal(animationCells(6, s).cells[18], 3 * 8 + 5);
});
