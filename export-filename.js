/** Filename slugs for artwork downloads (session project stem + effect tags). */

/** Between movement / color / backdrop ids in export filenames (not UI labels). */
export const EXPORT_EFFECT_SEPARATOR = '_';

function activeEffect(id) {
  return id && id !== 'none';
}

/** Movement, color, and backdrop identifiers for GIF/video/ZIP and animated natives. */
export function exportAnimationEffectSlug(s) {
  const parts = [];
  if (activeEffect(s.effect)) parts.push(s.effect);
  if (activeEffect(s.colorEffect)) parts.push(s.colorEffect);
  if (activeEffect(s.backgroundEffect)) parts.push(s.backgroundEffect);
  return parts.length ? parts.join(EXPORT_EFFECT_SEPARATOR) : 'still';
}

/**
 * @param {string} stem `projectStem()` value
 * @param {string} machine MACHINE.* id
 * @param {object} s animation source snapshot
 * @param {{moving: boolean, columns: number, rows: number, extension: string}} opts
 */
export function nativeProgramFilename(stem, machine, s, {moving, columns, rows, extension}) {
  const slug = moving ? exportAnimationEffectSlug(s) : 'still';
  return `${stem}-${machine}-${slug}-${columns}x${rows}.${extension}`;
}

/** Still PNG download stem (matches index.html PNG export). */
export function stillPngFilename(stem, width, height) {
  return `${stem}-${width}x${height}.png`;
}

/** GIF / video / frame ZIP outer download name (before extension suffix). */
export function animationRasterFilename(stem, s, width, height, kind, repetitions = 1, videoExtension = 'webm') {
  const slug = exportAnimationEffectSlug(s);
  const size = `${width}x${height}`;
  const loops = kind === 'video' && repetitions > 1 ? `-${repetitions}x` : '';
  if (kind === 'gif') return `${stem}-${slug}-${size}${loops}.gif`;
  if (kind === 'video') return `${stem}-${slug}-${size}${loops}.${videoExtension}`;
  return `${stem}-${slug}-${size}-frames.zip`;
}