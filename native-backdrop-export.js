/** PETSCII solid block — shared screen code on VIC and TED ROM exports. */
export const NATIVE_BACKDROP_BLOCK = 160;

/** @deprecated */ export const C64_BACKDROP_BLOCK = NATIVE_BACKDROP_BLOCK;

export function backdropExportActive(source) {
  return source?.backgroundEffect === 'field' || source?.backgroundEffect === 'plus4-field';
}

/**
 * Map empty cells to a solid block and per-cell backdrop ink for native players.
 * VIC: color RAM nibbles 0–15. Plus/4: TED indices 0–120 encoded later via `tedToAttr`.
 */
export function prepareNativeBackdropFrames(frames, block = NATIVE_BACKDROP_BLOCK) {
  return frames.map((frame) => {
    const matte = frame.backgroundMatte;
    if (!matte || matte.length !== frame.cells.length) {
      return frame;
    }
    const cells = frame.cells.slice();
    const inks = frame.inks.slice();
    for (let index = 0; index < cells.length; index++) {
      if (cells[index] === '') {
        const ink = matte[index];
        if (!Number.isInteger(ink) || ink < 0 || ink > 120) {
          throw Error('Invalid backdrop ink for native export');
        }
        cells[index] = block;
        inks[index] = ink;
      }
    }
    return {cells, inks, durationMs: frame.durationMs};
  });
}

/** @deprecated */ export const prepareC64BackdropFrames = prepareNativeBackdropFrames;