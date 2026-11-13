import {bonfireFrame, bonfireHeat, BONFIRE_COLORS} from './bonfire.js';
import {spaceWarpFrame} from './space-warp.js';
import {depthSurfaceFrame} from './depth-surfaces.js';
import {solidMotionFrame, SOLID_EFFECTS} from './solid-motion.js';
import {DEPTH_EFFECTS, INTRO_MOTIONS, DIAGONAL_DIRECTIONS} from './project-validation.js';
import {
  PLUS4_COLOR_CYCLES,
  c64InkToTed,
  isPlus4ColorEffect,
} from './plus4-colors.js';

const COLOR_CYCLES = {
  bonfire: BONFIRE_COLORS,
  'raster-bars': [0, 6, 14, 3, 1, 3, 14, 6],
  plasma: [6, 4, 2, 8, 7, 13, 3, 14],
  'color-cycle': [0, 11, 12, 15, 1, 7, 13, 5, 3, 14, 6, 4, 2, 10, 8, 9],
  'color-wave': [2, 8, 7, 13, 3, 14, 6, 4],
  'color-glow': [9, 8, 2, 10, 7, 1, 7, 10, 2, 8],
  ...PLUS4_COLOR_CYCLES,
};

function colorFamily(effect) {
  if (effect === 'plus4-wave' || effect === 'color-wave') {
    return 'color-wave';
  }
  if (effect === 'plus4-raster' || effect === 'raster-bars') {
    return 'raster-bars';
  }
  if (effect === 'plus4-plasma' || effect === 'plasma') {
    return 'plasma';
  }
  if (effect === 'plus4-bonfire' || effect === 'bonfire') {
    return 'bonfire';
  }
  if (effect === 'plus4-cycle' || effect === 'color-cycle') {
    return 'color-cycle';
  }
  if (effect === 'plus4-glow' || effect === 'color-glow') {
    return 'color-glow';
  }
  return effect;
}

const FRAME_BUDGET_MS = 20;

function wrapIndex(value, size) {
  return (value % size + size) % size;
}

export function waveValue(shape, phase) {
  const t = ((phase % 1) + 1) % 1;
  if (shape === 'triangle') {
    return 1 - 4 * Math.abs(((t + 0.25) % 1) - 0.5);
  }
  if (shape === 'square') {
    return t < 0.5 ? 1 : -1;
  }
  if (shape === 'sawtooth') {
    return 2 * t - 1;
  }
  if (shape === 'reverse-sawtooth') {
    return 1 - 2 * t;
  }
  return Math.sin(t * Math.PI * 2);
}

export function scrollDirection(source) {
  if (source.scrollDirection !== undefined) {
    return source.scrollDirection;
  }
  if (source.effect === 'scroll-diagonal') {
    return 'up-left';
  }
  if (source.effect === 'scroll-y') {
    return 'up';
  }
  return 'left';
}

export function effectCycles(source) {
  const motion = source.effect === 'none' ? 1 : (source.motionCycles ?? 1);
  const color = source.colorEffect === 'none' ? 1 : (source.colorCycles ?? 1);
  return {motion, color};
}

function colorStepsFor(source) {
  const family = colorFamily(source.colorEffect);
  const ramp = COLOR_CYCLES[source.colorEffect];
  if (family === 'bonfire') {
    // Keep a dense fire timeline; never shorter than the ramp itself.
    return Math.max(48, ramp ? ramp.length : 0);
  }
  if (family === 'plasma') {
    // C64 plasma stays on the classic 24-sample loop; Plus/4 uses the
    // expanded TED ramp length so gap-filled colors actually appear.
    if (ramp && ramp.length > 8) {
      return ramp.length;
    }
    return 24;
  }
  return ramp ? ramp.length : 1;
}

function samplesPerMotionCycle(source) {
  const direction = scrollDirection(source);
  const horizontal = direction === 'left' || direction === 'right';

  if (source.effect === 'bonfire') {
    return 48;
  }
  if (DEPTH_EFFECTS.includes(source.effect) || SOLID_EFFECTS.includes(source.effect)) {
    return 48;
  }
  if (source.effect === 'starfield') {
    const axis = DIAGONAL_DIRECTIONS.includes(direction)
      ? Math.max(source.W, source.H)
      : (horizontal ? source.W : source.H);
    return Math.max(24, axis * 3);
  }
  if (INTRO_MOTIONS.includes(source.effect)) {
    return 24;
  }
  if (source.effect === 'scroll-diagonal') {
    return Math.max(source.W, source.H);
  }
  if (source.effect === 'scroll-x' || source.effect === 'scroll-y') {
    return horizontal ? source.W : source.H;
  }
  if (source.effect === 'inverse') {
    return 2;
  }
  if (source.effect === 'sine-scroll') {
    if (DIAGONAL_DIRECTIONS.includes(direction)) {
      return Math.max(24, Math.max(source.W, source.H));
    }
    return Math.max(24, horizontal ? source.W : source.H);
  }
  if (source.effect === 'wave' || source.effect === 'ripple') {
    return 24;
  }
  if (source.effect === 'replay') {
    return Math.max(4, Math.min(48, Math.ceil(source.events.length / 0.75) + 1));
  }
  return 1;
}

function minimumFrameCount(source, motionCycles, colorSteps, colorCycles) {
  let motionMinimum = 1;
  if (source.effect !== 'none') {
    const needsManySamples =
      source.effect === 'bonfire'
      || source.effect === 'starfield'
      || DEPTH_EFFECTS.includes(source.effect)
      || SOLID_EFFECTS.includes(source.effect);
    const intro = INTRO_MOTIONS.includes(source.effect);
    const waveLike = ['wave', 'ripple', 'replay', 'sine-scroll'].includes(source.effect);
    if (needsManySamples) {
      motionMinimum = 12;
    } else if (intro) {
      motionMinimum = 8;
    } else if (waveLike) {
      motionMinimum = 4;
    } else {
      motionMinimum = 2;
    }
    motionMinimum *= motionCycles;
  }

  let colorMinimum = 1;
  if (colorSteps > 1) {
    const family = colorFamily(source.colorEffect);
    const perCycle = (family === 'plasma' || family === 'bonfire') ? 4 : 2;
    colorMinimum = colorCycles * perCycle;
  }
  return Math.max(motionMinimum, colorMinimum);
}

export function animationPlan(source) {
  const colorSteps = colorStepsFor(source);
  const {motion, color} = effectCycles(source);
  const frameBudget = Math.floor(source.seconds * 1000 / FRAME_BUDGET_MS);

  if (source.effect === 'replay' && colorSteps === 1 && motion === 1) {
    const fromDuration = Math.floor(source.seconds * 750 / FRAME_BUDGET_MS) + 1;
    const count = Math.max(2, Math.min(48, fromDuration, source.events.length + 1));
    return {count, warning: ''};
  }

  const stepsPerCycle = samplesPerMotionCycle(source);
  if (motion === 1 && color === 1) {
    const replayCap = source.effect === 'replay' ? 48 : Infinity;
    const count = Math.max(1, Math.min(replayCap, Math.max(stepsPerCycle, colorSteps), frameBudget));
    return {count, warning: ''};
  }

  const subdivision = Math.max(motion, color);
  const wanted = Math.max(stepsPerCycle * motion, colorSteps * color);
  const minimum = minimumFrameCount(source, motion, colorSteps, color);
  const divisible = Math.floor(Math.min(wanted, frameBudget) / subdivision) * subdivision;
  const count = Math.max(subdivision, divisible);
  const warning = count < minimum
    ? 'Too many cycles for this loop duration. Increase Loop duration or reduce cycles per loop.'
    : '';
  return {count: Math.max(count, minimum), warning};
}

export function animationCount(source) {
  return animationPlan(source).count;
}

export function animationDelay(frameIndex, source) {
  const frameCount = animationCount(source);
  const motionOnlyReplay =
    source.effect === 'replay'
    && source.colorEffect === 'none'
    && (source.motionCycles ?? 1) === 1;
  if (motionOnlyReplay) {
    if (frameIndex === frameCount - 1) {
      return source.seconds * 250;
    }
    return source.seconds * 750 / (frameCount - 1);
  }
  return source.seconds * 1000 / frameCount;
}

export function cyclePhase(frame, frameCount, cycles) {
  const samplesPerCycle = frameCount / cycles;
  return (frame % samplesPerCycle) / samplesPerCycle;
}

export function introMotionFrame(phase, source) {
  const cells = Array(source.W * source.H).fill('');
  const inks = source.inks.slice();

  function copyCell(destination, sourceIndex) {
    cells[destination] = source.grid[sourceIndex];
    inks[destination] = source.inks[sourceIndex];
  }

  if (source.effect === 'starfield') {
    const direction = scrollDirection(source);
    const horizontal = direction === 'left' || direction === 'right';
    const size = horizontal ? source.W : source.H;
    const sign = (direction === 'left' || direction === 'up') ? -1 : 1;

    for (let depth = 1; depth <= 3; depth++) {
      for (let index = 0; index < source.grid.length; index++) {
        if (source.grid[index] === '') {
          continue;
        }
        const layer = 1 + ((index % source.W) * 17 + Math.floor(index / source.W) * 31) % 3;
        if (layer !== depth) {
          continue;
        }
        const x = index % source.W;
        const y = Math.floor(index / source.W);
        const travel = Math.floor(phase * size * depth) * sign;

        if (DIAGONAL_DIRECTIONS.includes(direction)) {
          const dx = Math.floor(phase * source.W * depth) * (direction.endsWith('left') ? -1 : 1);
          const dy = Math.floor(phase * source.H * depth) * (direction.startsWith('up') ? -1 : 1);
          const destY = ((y + dy) % source.H + source.H) % source.H;
          const destX = ((x + dx) % source.W + source.W) % source.W;
          copyCell(destY * source.W + destX, index);
        } else if (horizontal) {
          const destX = wrapIndex(x + travel, source.W);
          copyCell(y * source.W + destX, index);
        } else {
          const destY = wrapIndex(y + travel, source.H);
          copyCell(destY * source.W + x, index);
        }
      }
    }
    return {cells, inks};
  }

  if (source.effect === 'wipe') {
    const direction = scrollDirection(source);
    const horizontal = direction === 'left' || direction === 'right';
    const size = horizontal ? source.W : source.H;
    const reverse = direction === 'left' || direction === 'up';
    const progress = Math.min(1, phase / 0.35, (1 - phase) / 0.35);
    const pattern = source.wipePattern ?? 'diagonal';

    for (let y = 0; y < source.H; y++) {
      for (let x = 0; x < source.W; x++) {
        const axis = horizontal ? x : y;
        const along = (axis + 0.5) / size;
        const u = reverse ? 1 - along : along;
        const v = horizontal ? (y + 0.5) / source.H : (x + 0.5) / source.W;
        const stripe = Math.min(4, size);
        const blind = (axis % stripe + 0.5) / stripe;
        let rank;
        if (pattern === 'checkerboard') {
          rank = ((x + y) % 2 + u) / 2;
        } else if (pattern === 'blinds') {
          rank = reverse ? 1 - blind : blind;
        } else {
          rank = (u + v) / 2;
        }
        if (rank <= progress) {
          copyCell(y * source.W + x, y * source.W + x);
        }
      }
    }
    return {cells, inks};
  }

  let left = source.W;
  let top = source.H;
  let right = -1;
  let bottom = -1;
  for (let index = 0; index < source.grid.length; index++) {
    if (source.grid[index] === '') {
      continue;
    }
    const x = index % source.W;
    const y = Math.floor(index / source.W);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  if (right < 0) {
    return {cells, inks};
  }

  const width = right - left + 1;
  const height = bottom - top + 1;
  const amount = (source.waveAmplitude ?? 100) / 100;

  if (source.effect === 'logo-bounce') {
    const dx = Math.round((source.W - width) / 2 * (1 - Math.sin(phase * Math.PI * 2) * amount)) - left;
    const dy = Math.round((source.H - height) / 2 * (1 - Math.cos(phase * Math.PI * 4) * amount)) - top;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        copyCell((y + dy) * source.W + x + dx, y * source.W + x);
      }
    }
    return {cells, inks};
  }

  const w = Math.max(1, Math.round(width * (1 - amount * 0.25 * (1 - Math.cos(phase * Math.PI * 2)))));
  const h = Math.max(1, Math.round(height * (1 - amount * 0.25 * (1 - Math.cos(phase * Math.PI * 4)))));
  const dx = left + Math.floor((width - w) / 2);
  const dy = top + Math.floor((height - h) / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sourceY = top + Math.min(height - 1, Math.floor((y + 0.5) * height / h));
      const sourceX = left + Math.min(width - 1, Math.floor((x + 0.5) * width / w));
      copyCell((dy + y) * source.W + dx + x, sourceY * source.W + sourceX);
    }
  }
  return {cells, inks};
}

function applyGridMotion(frame, phase, source, cells, inks) {
  const wrap = wrapIndex;
  for (let y = 0; y < source.H; y++) {
    for (let x = 0; x < source.W; x++) {
      let sampleX = x;
      let sampleY = y;

      if (source.effect === 'scroll-diagonal') {
        const direction = scrollDirection(source);
        sampleX = wrap(x + Math.floor(phase * source.W) * (direction.endsWith('right') ? -1 : 1), source.W);
        sampleY = wrap(y + Math.floor(phase * source.H) * (direction.startsWith('down') ? -1 : 1), source.H);
      }

      if (source.effect === 'scroll-x' || source.effect === 'scroll-y') {
        const direction = scrollDirection(source);
        const horizontal = direction === 'left' || direction === 'right';
        const step = Math.floor(phase * (horizontal ? source.W : source.H))
          * ((direction === 'right' || direction === 'down') ? -1 : 1);
        if (horizontal) {
          sampleX = wrap(x + step, source.W);
        } else {
          sampleY = wrap(y + step, source.H);
        }
      }

      if (source.effect === 'sine-scroll') {
        const direction = scrollDirection(source);
        if (DIAGONAL_DIRECTIONS.includes(direction)) {
          const dx = direction.endsWith('right') ? 1 : -1;
          const dy = direction.startsWith('down') ? 1 : -1;
          const length = Math.hypot(source.W, source.H);
          // A stationary bend perpendicular to the canvas diagonal, in cell coordinates.
          const position = (x / source.W + dx * dy * y / source.H) / 2
            * (50 / (source.waveLength ?? 50));
          const bend = Math.sin(position * Math.PI * 2)
            * Math.min(3, Math.max(1, Math.min(source.W, source.H) / 4)) * 2
            * ((source.waveAmplitude ?? 100) / 100);
          sampleX = wrap(
            x - dx * Math.floor(phase * source.W) + Math.round(-dy * source.H / length * bend),
            source.W,
          );
          sampleY = wrap(
            y - dy * Math.floor(phase * source.H) + Math.round(dx * source.W / length * bend),
            source.H,
          );
        } else {
          const horizontal = direction === 'left' || direction === 'right';
          const sign = (direction === 'right' || direction === 'down') ? -1 : 1;
          const travel = Math.floor(phase * (horizontal ? source.W : source.H)) * sign;
          const position = (horizontal ? x / source.W : y / source.H)
            * (50 / (source.waveLength ?? 50));
          const crossAxis = horizontal ? source.H : source.W;
          const bend = Math.round(
            Math.sin(position * Math.PI * 2)
            * Math.min(3, Math.max(1, crossAxis / 4)) * 2
            * ((source.waveAmplitude ?? 100) / 100),
          );
          if (horizontal) {
            sampleX = wrap(x + travel, source.W);
            sampleY = wrap(y + bend, source.H);
          } else {
            sampleY = wrap(y + travel, source.H);
            sampleX = wrap(x + bend, source.W);
          }
        }
      }

      if (source.effect === 'ripple') {
        const dx = x - (source.W - 1) / 2;
        const dy = y - (source.H - 1) / 2;
        const radius = Math.hypot(dx, dy);
        const reach = Math.max(1, Math.hypot((source.W - 1) / 2, (source.H - 1) / 2));
        if (radius > 0) {
          const value = waveValue(
            source.waveShape ?? 'sine',
            radius / reach * (50 / (source.waveLength ?? 50)) - phase,
          );
          const shift = value
            * Math.min(3, Math.max(1, Math.min(source.W, source.H) / 4)) * 2
            * ((source.waveAmplitude ?? 100) / 100);
          sampleX = Math.round(x + dx / radius * shift);
          sampleY = Math.round(y + dy / radius * shift);
        }
        if (sampleX < 0 || sampleX >= source.W || sampleY < 0 || sampleY >= source.H) {
          continue;
        }
      }

      if (source.effect === 'wave') {
        const direction = source.waveDirection ?? 'up';
        const rowWave = direction === 'up' || direction === 'down';
        const position = (rowWave ? y / Math.max(1, source.H) : x / Math.max(1, source.W))
          * (50 / (source.waveLength ?? 50));
        const crossSize = rowWave ? source.W : source.H;
        const sign = (direction === 'down' || direction === 'right') ? -1 : 1;
        let value;
        if ((source.waveShape ?? 'sine') === 'sine') {
          value = Math.sin(phase * Math.PI * 2 * sign + position * Math.PI * 2);
        } else {
          value = waveValue(source.waveShape, position + phase * sign);
        }
        const shift = Math.round(
          value * Math.min(3, Math.max(1, crossSize / 4)) * 2 * ((source.waveAmplitude ?? 100) / 100),
        );
        if (rowWave) {
          sampleX = wrap(x + shift, source.W);
        } else {
          sampleY = wrap(y + shift, source.H);
        }
      }

      let glyph = source.grid[sampleY * source.W + sampleX];
      if (source.effect === 'inverse' && Math.floor(phase * 2) && glyph !== '') {
        glyph = glyph ^ 128;
      }
      const destination = y * source.W + x;
      cells[destination] = glyph;
      inks[destination] = source.inks[sampleY * source.W + sampleX];
    }
  }
}

function applyColorPass(colorPhase, source, cells, inks) {
  const effect = source.colorEffect;
  const family = colorFamily(effect);
  const ramp = COLOR_CYCLES[effect];
  if (!ramp) {
    return;
  }
  const ted = isPlus4ColorEffect(effect);

  for (let index = 0; index < cells.length; index++) {
    if (cells[index] === '') {
      continue;
    }
    const fixedRamp = family === 'raster-bars' || family === 'plasma';
    let start = 0;
    if (!fixedRamp) {
      if (ted) {
        const cousin = c64InkToTed(inks[index]);
        start = Math.max(0, ramp.indexOf(cousin));
      } else {
        start = Math.max(0, ramp.indexOf(inks[index]));
      }
    }
    let step = Math.floor(colorPhase * ramp.length);

    if (family === 'color-wave' || family === 'raster-bars') {
      const direction = source.colorWaveDirection
        ?? (family === 'raster-bars' ? 'up' : 'up-left');
      const x = index % source.W;
      const y = Math.floor(index / source.W);
      const offset = (
        (direction.includes('left') ? x : direction.includes('right') ? -x : 0)
        + (direction.includes('up') ? y : direction.includes('down') ? -y : 0)
      ) * (50 / (source.colorWaveLength ?? 50));
      const t = colorPhase + offset / ramp.length;
      const shape = source.colorWaveShape ?? 'sawtooth';
      if (shape === 'sawtooth') {
        step = Math.floor(offset + Math.floor(colorPhase * ramp.length));
      } else {
        step = Math.min(ramp.length - 1, Math.floor((waveValue(shape, t) + 1) / 2 * ramp.length));
      }
      step = Math.floor(
        ((step % ramp.length) + ramp.length) % ramp.length * ((source.colorWaveAmplitude ?? 100) / 100),
      );
    }

    if (family === 'plasma') {
      const direction = source.colorWaveDirection ?? 'up-left';
      const dx = direction.includes('left') ? 1 : direction.includes('right') ? -1 : 0;
      const dy = direction.includes('up') ? 1 : direction.includes('down') ? -1 : 0;
      const spatial = 50 / (source.colorWaveLength ?? 50);
      const nx = (index % source.W) / source.W * spatial;
      const ny = Math.floor(index / source.W) / source.H * spatial;
      const shape = source.colorWaveShape ?? 'sine';
      const value = (
        waveValue(shape, nx + dx * colorPhase)
        + waveValue(shape, ny + dy * colorPhase)
        + waveValue(shape, nx + ny + (dx + dy) * colorPhase)
      ) / 3;
      step = Math.min(
        ramp.length - 1,
        Math.floor(
          Math.max(0, Math.min(1, (value + 1) / 2))
          * ((source.colorWaveAmplitude ?? 100) / 100)
          * ramp.length
          + 1e-10,
        ),
      );
    }

    if (family === 'bonfire') {
      const heat = bonfireHeat(index % source.W, Math.floor(index / source.W), source.W, source.H, colorPhase);
      const fireRamp = ted ? ramp : BONFIRE_COLORS;
      inks[index] = fireRamp[
        Math.min(fireRamp.length - 1, Math.floor(heat * fireRamp.length))
      ];
    } else {
      inks[index] = ramp[((start + step) % ramp.length + ramp.length) % ramp.length];
    }
  }
}

export function animationCells(frame, source) {
  const frameCount = animationCount(source);
  const cycles = effectCycles(source);
  const phase = cyclePhase(frame, frameCount, cycles.motion);
  const colorPhase = cyclePhase(frame, frameCount, cycles.color);

  const cells = source.effect === 'replay'
    ? source.base.slice()
    : Array(source.W * source.H).fill('');
  const inks = source.effect === 'replay'
    ? source.baseColors.slice()
    : source.inks.slice();

  if (source.effect === 'replay') {
    const motionOnly = source.colorEffect === 'none' && cycles.motion === 1;
    const progress = motionOnly ? frame / (frameCount - 1) : Math.min(1, phase / 0.75);
    const eventsToShow = Math.floor(progress * source.events.length);
    for (let j = 0; j < eventsToShow; j++) {
      const [cellIndex, glyph] = source.events[j];
      cells[cellIndex] = glyph;
      inks[cellIndex] = source.eventColors[j];
    }
  } else if (source.effect === 'bonfire') {
    const picture = bonfireFrame(phase, source);
    cells.splice(0, cells.length, ...picture.cells);
    inks.splice(0, inks.length, ...picture.inks);
  } else if (SOLID_EFFECTS.includes(source.effect)) {
    const picture = solidMotionFrame(phase, source);
    cells.splice(0, cells.length, ...picture.cells);
    inks.splice(0, inks.length, ...picture.inks);
  } else if (DEPTH_EFFECTS.includes(source.effect)) {
    const picture = source.effect === 'space-warp'
      ? spaceWarpFrame(phase, source)
      : depthSurfaceFrame(phase, source);
    cells.splice(0, cells.length, ...picture.cells);
    inks.splice(0, inks.length, ...picture.inks);
  } else if (INTRO_MOTIONS.includes(source.effect)) {
    const picture = introMotionFrame(phase, source);
    cells.splice(0, cells.length, ...picture.cells);
    inks.splice(0, inks.length, ...picture.inks);
  } else {
    applyGridMotion(frame, phase, source, cells, inks);
  }

  applyColorPass(colorPhase, source, cells, inks);
  const tedMachine = source.machine === 'plus4';
  return {
    cells,
    inks,
    colorPalette: tedMachine || isPlus4ColorEffect(source.colorEffect) ? 'ted-pal' : 'pepto-pal',
  };
}
