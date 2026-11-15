// A quiet picture of an old screen. One glyph row is one scanline.
// Amounts are fractions of a glyph pixel, kept small so the inks stay readable.

export const SCREEN_LOOKS = ['none', 'monitor', 'tv', 'green', 'amber'];

const PROFILES = {
  monitor: {scan: 0.16, glow: 0.22, radius: 0.35, shift: 0.12},
  tv: {scan: 0.2, glow: 0.34, radius: 0.55, shift: 0.32},
  green: {scan: 0.16, glow: 0.22, radius: 0.35, shift: 0, phosphor: [120, 255, 90]},
  amber: {scan: 0.16, glow: 0.22, radius: 0.35, shift: 0, phosphor: [255, 176, 40]},
};

function profileFor(look) {
  if (look === 'tv') return PROFILES.tv;
  if (look === 'green') return PROFILES.green;
  if (look === 'amber') return PROFILES.amber;
  return PROFILES.monitor;
}

function paintPhosphor(rgb, alpha, count, peak) {
  for (let index = 0; index < count; index += 1) {
    if (alpha[index] === 0) continue;
    const red = rgb[index * 3];
    const green = rgb[index * 3 + 1];
    const blue = rgb[index * 3 + 2];
    const luma = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    rgb[index * 3] = peak[0] * luma;
    rgb[index * 3 + 1] = peak[1] * luma;
    rgb[index * 3 + 2] = peak[2] * luma;
  }
}

function smoothstep(edge0, edge1, value) {
  const span = edge1 - edge0;
  const t = Math.min(1, Math.max(0, (value - edge0) / span));
  return t * t * (3 - 2 * t);
}

function gaussianKernel(radiusPx) {
  const sigma = Math.max(radiusPx, 0.01);
  const support = Math.max(1, Math.ceil(radiusPx * 2));
  const weights = [];
  let sum = 0;
  for (let offset = -support; offset <= support; offset += 1) {
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    weights.push(weight);
    sum += weight;
  }
  return {support, weights: weights.map(weight => weight / sum)};
}

function sampleChannel(rgb, alpha, width, height, x, y, channel) {
  const clampedX = Math.min(width - 1, Math.max(0, x));
  const clampedY = Math.min(height - 1, Math.max(0, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = clampedX - x0;
  const ty = clampedY - y0;
  const taps = [
    {index: y0 * width + x0, weight: (1 - tx) * (1 - ty)},
    {index: y0 * width + x1, weight: tx * (1 - ty)},
    {index: y1 * width + x0, weight: (1 - tx) * ty},
    {index: y1 * width + x1, weight: tx * ty},
  ];
  let color = 0;
  let cover = 0;
  for (const tap of taps) {
    if (alpha[tap.index] === 0) continue;
    color += rgb[tap.index * 3 + channel] * tap.weight;
    cover += tap.weight;
  }
  if (cover === 0) return 0;
  return color / cover;
}

function blurAxis(source, alpha, width, height, horizontal, kernel) {
  const {support, weights} = kernel;
  const output = new Float32Array(source.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (alpha[index] === 0) continue;
      let red = 0;
      let green = 0;
      let blue = 0;
      let cover = 0;
      for (let tap = -support; tap <= support; tap += 1) {
        let sampleX = x;
        let sampleY = y;
        if (horizontal) sampleX = x + tap;
        else sampleY = y + tap;
        if (sampleX < 0 || sampleY < 0 || sampleX >= width || sampleY >= height) continue;
        const sampleIndex = sampleY * width + sampleX;
        if (alpha[sampleIndex] === 0) continue;
        const weight = weights[tap + support];
        red += source[sampleIndex * 3] * weight;
        green += source[sampleIndex * 3 + 1] * weight;
        blue += source[sampleIndex * 3 + 2] * weight;
        cover += weight;
      }
      if (cover === 0) continue;
      output[index * 3] = red / cover;
      output[index * 3 + 1] = green / cover;
      output[index * 3 + 2] = blue / cover;
    }
  }
  return output;
}

/**
 * Shade opaque pixels. `none` returns the same array.
 * `pixelWidth` and `pixelHeight` are the on-image size of one glyph pixel.
 */
export function shadeRgba(data, width, height, look, pixelWidth, pixelHeight) {
  if (look === 'none') return data;
  const profile = profileFor(look);
  const count = width * height;
  const rgb = new Float32Array(count * 3);
  const alpha = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    alpha[index] = data[offset + 3];
    rgb[index * 3] = data[offset];
    rgb[index * 3 + 1] = data[offset + 1];
    rgb[index * 3 + 2] = data[offset + 2];
  }
  if (profile.phosphor) paintPhosphor(rgb, alpha, count, profile.phosphor);
  const shift = Math.max(pixelWidth, 1) * profile.shift;
  const converged = new Float32Array(count * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (alpha[index] === 0) continue;
      converged[index * 3] = sampleChannel(rgb, alpha, width, height, x - shift, y, 0);
      converged[index * 3 + 1] = sampleChannel(rgb, alpha, width, height, x, y, 1);
      converged[index * 3 + 2] = sampleChannel(rgb, alpha, width, height, x + shift, y, 2);
    }
  }
  const radius = Math.max(pixelHeight, 1) * profile.radius;
  const kernel = gaussianKernel(radius);
  const blurred = blurAxis(blurAxis(converged, alpha, width, height, true, kernel), alpha, width, height, false, kernel);
  const line = Math.max(pixelHeight, 1);
  const output = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    const along = (y + 0.5) / line;
    const frac = along - Math.floor(along);
    const gap = smoothstep(0.72, 1, frac);
    const scan = 1 - profile.scan * gap;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      output[offset + 3] = alpha[index];
      if (alpha[index] === 0) continue;
      for (let channel = 0; channel < 3; channel += 1) {
        const base = converged[index * 3 + channel];
        const halo = blurred[index * 3 + channel] - base;
        const lifted = halo > 0 ? base + profile.glow * halo : base;
        output[offset + channel] = Math.max(0, Math.min(255, Math.round(lifted * scan)));
      }
    }
  }
  return output;
}

export function shadeScreenImage(image, look, pixelWidth, pixelHeight) {
  if (look === 'none') return image;
  const shaded = shadeRgba(image.data, image.width, image.height, look, pixelWidth, pixelHeight);
  image.data.set(shaded);
  return image;
}

function colorKey(red, green, blue) {
  return (red >> 3) * 1024 + (green >> 3) * 32 + (blue >> 3);
}

function keyColor(key) {
  const red = (key >> 10) & 31;
  const green = (key >> 5) & 31;
  const blue = key & 31;
  return [red * 8 + 4, green * 8 + 4, blue * 8 + 4];
}

/** GIF palette after a screen look. Index 0 stays the transparent color. */
export function quantizeShaded(data, width, height) {
  const counts = new Map();
  const count = width * height;
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] === 0) continue;
    const key = colorKey(data[offset], data[offset + 1], data[offset + 2]);
    const seen = counts.get(key) || 0;
    counts.set(key, seen + 1);
  }
  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 255);
  const palette = [[0, 0, 0]];
  const slot = new Map();
  for (const [key] of ranked) {
    slot.set(key, palette.length);
    palette.push(keyColor(key));
  }
  const chosen = ranked.map(([key]) => key);
  const nearest = new Map();
  for (const [key] of counts) {
    const direct = slot.get(key);
    if (direct !== undefined) {
      nearest.set(key, direct);
      continue;
    }
    const color = keyColor(key);
    let best = 1;
    let bestDistance = Infinity;
    for (let index = 0; index < chosen.length; index += 1) {
      const other = keyColor(chosen[index]);
      const distance = (color[0] - other[0]) ** 2 + (color[1] - other[1]) ** 2 + (color[2] - other[2]) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index + 1;
      }
    }
    nearest.set(key, best);
  }
  const indexed = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] === 0) continue;
    indexed[index] = nearest.get(colorKey(data[offset], data[offset + 1], data[offset + 2]));
  }
  return {indexed, palette};
}
