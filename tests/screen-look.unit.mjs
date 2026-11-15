import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createC64AdaptiveProgram, createD64Disk} from '../c64-export.js';
import {validateProject} from '../project-validation.js';
import {shadeRgba} from '../screen-look.js';

const baseProject = {
  format: 'petscii-stencil-lab',
  version: 3,
  columns: 1,
  rows: 1,
  grid: [160],
  selectedGlyph: 160,
  colors: {ink: 1, background: 6},
};

function solid(width, height, red, green, blue) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = red;
    data[index * 4 + 1] = green;
    data[index * 4 + 2] = blue;
    data[index * 4 + 3] = 255;
  }
  return data;
}

function at(data, width, x, y) {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
}

function channelCentroid(data, width, height, channel) {
  let weight = 0;
  let moment = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = data[(y * width + x) * 4 + channel];
      weight += value;
      moment += x * value;
    }
  }
  return moment / weight;
}

test('none leaves every pixel alone', () => {
  const source = solid(4, 4, 10, 20, 30);
  const shaded = shadeRgba(source, 4, 4, 'none', 4, 4);
  assert.equal(shaded, source);
});

test('a scanline darkens the bottom of a glyph row and stays readable', () => {
  const width = 4;
  const height = 8;
  const shaded = shadeRgba(solid(width, height, 255, 255, 255), width, height, 'monitor', 4, 8);
  const top = at(shaded, width, 1, 0)[0];
  const bottom = at(shaded, width, 1, 7)[0];
  assert.ok(bottom < top - 20);
  assert.ok(bottom > 200);
});

test('color fringing moves red and blue apart, and television moves them farther', () => {
  const width = 24;
  const height = 8;
  const source = solid(width, height, 0, 0, 0);
  source[(2 * width + 12) * 4] = 255;
  source[(2 * width + 12) * 4 + 1] = 255;
  source[(2 * width + 12) * 4 + 2] = 255;
  source[(2 * width + 12) * 4 + 3] = 255;
  const monitor = shadeRgba(source, width, height, 'monitor', 4, 4);
  const television = shadeRgba(source.slice(), width, height, 'tv', 4, 4);
  const monitorGap = channelCentroid(monitor, width, height, 0) - channelCentroid(monitor, width, height, 2);
  const televisionGap = channelCentroid(television, width, height, 0) - channelCentroid(television, width, height, 2);
  assert.ok(monitorGap > 0.05);
  assert.ok(televisionGap > monitorGap);
});

test('phosphor lifts a dark neighbor without painting a blob', () => {
  const width = 16;
  const height = 8;
  const source = solid(width, height, 0, 0, 0);
  const origin = (4 * width + 8) * 4;
  source[origin] = 255;
  source[origin + 1] = 255;
  source[origin + 2] = 255;
  const shaded = shadeRgba(source, width, height, 'monitor', 4, 4);
  const neighbor = at(shaded, width, 9, 4)[1];
  assert.ok(neighbor > 2);
  assert.ok(neighbor < 40);
});

test('transparent pixels stay clear', () => {
  const data = solid(4, 4, 255, 0, 0);
  data[5 * 4 + 3] = 0;
  const shaded = shadeRgba(data, 4, 4, 'tv', 2, 2);
  assert.deepEqual(at(shaded, 4, 1, 1), [0, 0, 0, 0]);
});

function filled(width, height, red, green, blue) {
  const data = solid(width, height, 0, 0, 0);
  const origin = (0 * width + 1) * 4;
  data[origin] = red;
  data[origin + 1] = green;
  data[origin + 2] = blue;
  return data;
}

test('green and amber replace hue with one phosphor and keep brightness order', () => {
  const width = 8;
  const height = 8;
  const white = shadeRgba(solid(width, height, 255, 255, 255), width, height, 'green', 4, 8);
  const greenPeak = at(white, width, 1, 0);
  assert.deepEqual(greenPeak.slice(0, 3), [120, 255, 90]);
  const black = shadeRgba(solid(width, height, 0, 0, 0), width, height, 'amber', 4, 8);
  assert.deepEqual(at(black, width, 1, 0).slice(0, 3), [0, 0, 0]);
  const bright = shadeRgba(filled(width, height, 255, 255, 0), width, height, 'green', 4, 8);
  const dim = shadeRgba(filled(width, height, 0, 0, 255), width, height, 'green', 4, 8);
  assert.ok(at(bright, width, 1, 0)[1] > at(dim, width, 1, 0)[1]);
  const amber = shadeRgba(solid(width, height, 255, 255, 255), width, height, 'amber', 4, 8);
  assert.deepEqual(at(amber, width, 1, 0).slice(0, 3), [255, 176, 40]);
});

test('a one-color tube does not pull red and blue apart', () => {
  const width = 24;
  const height = 8;
  const source = solid(width, height, 0, 0, 0);
  source[(2 * width + 12) * 4] = 255;
  source[(2 * width + 12) * 4 + 1] = 255;
  source[(2 * width + 12) * 4 + 2] = 255;
  source[(2 * width + 12) * 4 + 3] = 255;
  for (const look of ['green', 'amber']) {
    const shaded = shadeRgba(source.slice(), width, height, look, 4, 4);
    const gap = channelCentroid(shaded, width, height, 0) - channelCentroid(shaded, width, height, 2);
    assert.ok(Math.abs(gap) < 0.05, look);
  }
});

test('screen look validates as none, monitor, television, green, or amber', () => {
  validateProject({...baseProject, screen: 'monitor'});
  validateProject({...baseProject, screen: 'tv'});
  validateProject({...baseProject, screen: 'green'});
  validateProject({...baseProject, screen: 'amber'});
  assert.throws(() => validateProject({...baseProject, screen: 'bad-tv'}), /Invalid screen look/);
});

test('PRG and disk bytes ignore the screen look', () => {
  const frames = [{cells: [160], inks: [1], durationMs: 500}];
  const input = {columns: 1, rows: 1, background: 6, ink: 1, repetitions: 0, frames};
  const plain = createC64AdaptiveProgram(input);
  const screened = createC64AdaptiveProgram({...input, screen: 'tv'});
  assert.deepEqual([...plain.bytes], [...screened.bytes]);
  assert.deepEqual([...createD64Disk(plain.bytes, 'PICTURE')], [...createD64Disk(screened.bytes, 'PICTURE')]);
});
