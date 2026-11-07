import {depthPhase} from './depth-phase.js';

function wrapIndex(n, size) {
  return (n % size + size) % size;
}

function perspectiveStrength(distance, heightPercent) {
  if (heightPercent === 1) {
    return distance;
  }
  return 1 + (distance - 1) * heightPercent;
}

/** Repeating whole-cell depth textures (floor, road, tunnel); glyphs stay unscaled. */
export function depthSurfaceFrame(phase, source) {
  const travel = depthPhase(phase, source.depthWaveShape);
  const alongDepth = (source.depthTravel === 'away' ? -1 : 1) * travel;
  const heightPercent = (source.waveAmplitude ?? 100) / 100;
  const spacing = 50 / (source.waveLength ?? 50);
  const cells = Array(source.W * source.H).fill('');
  const inks = source.inks.slice();

  for (let y = 0; y < source.H; y++) {
    for (let x = 0; x < source.W; x++) {
      const u = (x + 0.5) / source.W;
      const v = (y + 0.5) / source.H;
      let textureX;
      let textureY;

      if (source.effect === 'tunnel-flight') {
        const nx = (2 * x + 1 - source.W) / source.W;
        const ny = (2 * y + 1 - source.H) / source.H;
        const radius = Math.hypot(nx, ny);
        if (radius < 0.12) {
          continue;
        }
        textureX = (Math.atan2(ny, nx) / (2 * Math.PI) + 0.5) * source.W * spacing;
        textureY = (
          perspectiveStrength(Math.min(8, 0.7 / radius), heightPercent) * spacing + alongDepth
        ) * source.H;
      } else {
        const distance = v;
        const depth = perspectiveStrength(Math.min(8, 0.6 / v), heightPercent);
        let lateral = u - 0.5;

        if (source.effect === 'curved-road') {
          const bend = 0.18 * heightPercent
            * Math.sin(alongDepth * 2 * Math.PI + depth * spacing * 0.7)
            * (1 - distance);
          const halfWidth = Math.max(0.5 / source.W, 0.12 + 0.32 * distance);
          lateral -= bend;
          if (Math.abs(lateral) > halfWidth) {
            continue;
          }
          lateral = lateral / (2 * halfWidth);
        }

        textureX = (0.5 + lateral * depth * spacing) * source.W;
        textureY = (depth * spacing + alongDepth) * source.H;
      }

      const sourceIndex = wrapIndex(Math.floor(textureY), source.H) * source.W
        + wrapIndex(Math.floor(textureX), source.W);
      const destination = y * source.W + x;
      cells[destination] = source.grid[sourceIndex];
      inks[destination] = source.inks[sourceIndex];
    }
  }
  return {cells, inks};
}
