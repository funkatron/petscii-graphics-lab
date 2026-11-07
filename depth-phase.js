/** Normalized depth-travel phase for perspective effects (0–1 within each loop). */
export function depthPhase(phase, shape = 'sawtooth') {
  const p = ((phase % 1) + 1) % 1;

  if (shape === 'sine') {
    if (p === 0.25 || p === 0.75) {
      return 0.5;
    }
    return ((1 - Math.cos(2 * Math.PI * p)) / 2) % 1;
  }
  if (shape === 'triangle') {
    return (p < 0.5 ? 2 * p : 2 - 2 * p) % 1;
  }
  if (shape === 'reverse-sawtooth') {
    return (1 - p) % 1;
  }
  if (shape === 'square') {
    return p < 0.5 ? 0 : 0.5;
  }
  return p;
}
