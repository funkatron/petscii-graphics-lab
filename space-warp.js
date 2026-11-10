import {depthPhase} from './depth-phase.js';

/** Whole-cell perspective projection; pure phase keeps preview and export aligned. */
export function spaceWarpFrame(phase, source) {
  const travel = depthPhase(phase, source.depthWaveShape);
  const cells = Array(source.W * source.H).fill('');
  const inks = source.inks.slice();
  const objects = [];

  const heightStrength = (source.waveAmplitude ?? 100) / 100;
  const lengthScale = (source.waveLength ?? 50) / 50;
  const centerX = (source.W - 1) / 2;
  const centerY = (source.H - 1) / 2;
  const depthSign = source.depthTravel === 'away' ? 1 : -1;

  for (let index = 0; index < source.grid.length; index++) {
    if (source.grid[index] === '') {
      continue;
    }
    const seed = ((index * 37) % 101 + 0.5) / 101;
    const depth = 0.35 + 1.4 * lengthScale * ((seed + depthSign * travel + 1) % 1);
    const dx = (index % source.W) - centerX;
    const dy = Math.floor(index / source.W) - centerY;
    const scale = 1 + heightStrength * (0.8 / depth - 1);
    const x = Math.round(centerX + (heightStrength === 1 ? dx * 0.8 / depth : dx * scale));
    const y = Math.round(centerY + (heightStrength === 1 ? dy * 0.8 / depth : dy * scale));

    if (x >= 0 && x < source.W && y >= 0 && y < source.H) {
      objects.push({sourceIndex: index, depth, destination: y * source.W + x});
    }
  }

  objects.sort((a, b) => b.depth - a.depth || a.sourceIndex - b.sourceIndex);
  for (const {sourceIndex, destination} of objects) {
    cells[destination] = source.grid[sourceIndex];
    inks[destination] = source.inks[sourceIndex];
  }
  return {cells, inks};
}
