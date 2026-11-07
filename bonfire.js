// Stateless periodic fire: no random state, warm-up, or dependence on frame order.
export const BONFIRE_COLORS = Object.freeze([9, 2, 10, 8, 7, 1]);

const TAU = Math.PI * 2;

function wrapPhase(phase) {
  return ((phase % 1) + 1) % 1;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/** Heat at grid position (x, y); height rises from the bottom. */
export function bonfireHeat(x, y, width, height, phase) {
  const t = wrapPhase(phase);
  const u = (x + 0.5) / width * 2 - 1;
  const v = (height - 1 - y) / Math.max(1, height);
  let heat = 0;

  for (let tongue = 0; tongue < 5; tongue++) {
    const offset = (tongue - 2) * 0.22;
    let flameTop = 0.65 + 0.16 * Math.sin(TAU * (t + tongue * 0.19));
    if (tongue === 2) {
      flameTop += 0.16;
    }
    if (v >= flameTop) {
      continue;
    }

    const rise = t * 2 - v * 2.5 + tongue * 0.23;
    const center = offset
      + 0.10 * v * Math.sin(TAU * rise)
      + 0.045 * Math.sin(TAU * (3 * t + tongue * 0.31));
    const widthFactor = (0.27 + 0.035 * Math.sin(TAU * (t * 2 + tongue * 0.17)))
      * (1 - v / flameTop) + 0.025;
    const core = Math.max(0, 1 - ((u - center) / widthFactor) ** 2);
    heat = Math.max(heat, core * (1 - v / flameTop));
  }

  return clamp01(heat * 1.35);
}

export function bonfireFrame(phase, source) {
  const t = wrapPhase(phase);
  const cells = Array(source.W * source.H).fill('');
  const inks = source.inks.slice();
  const occupied = [];

  for (let index = 0; index < source.grid.length; index++) {
    if (source.grid[index] !== '') {
      occupied.push(index);
    }
  }
  if (!occupied.length) {
    return {cells, inks};
  }

  for (let y = 0; y < source.H; y++) {
    for (let x = 0; x < source.W; x++) {
      if (bonfireHeat(x, y, source.W, source.H, t) <= 0.10) {
        continue;
      }
      const scrollRow = (y + Math.floor(t * source.H * 2)) % source.H;
      const sourceIndex = occupied[(scrollRow * source.W + x) % occupied.length];
      const destination = y * source.W + x;
      cells[destination] = source.grid[sourceIndex];
      inks[destination] = source.inks[sourceIndex];
    }
  }
  return {cells, inks};
}
