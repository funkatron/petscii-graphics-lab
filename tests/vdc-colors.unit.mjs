import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VDC_COLORS,
  atlasIdToVdcCell,
  vdcAttr,
  vdcHex,
  vdcInkToVic,
  vdcName,
  vicInkToVdc,
} from '../vdc-colors.js';

test('VDC palette exposes sixteen named RGBI colors', () => {
  assert.equal(VDC_COLORS.length, 16);
  assert.equal(vdcHex(10), '#55ff55');
  assert.equal(vdcName(10), 'Light green');
  assert.equal(vdcHex(-1), '#000000');
});

test('VIC↔VDC cousin map stays in 0–15', () => {
  for (let ink = 0; ink < 16; ink++) {
    const vdc = vicInkToVdc(ink);
    assert.ok(vdc >= 0 && vdc <= 15);
    const vic = vdcInkToVic(vdc);
    assert.ok(vic >= 0 && vic <= 15);
  }
  assert.equal(vicInkToVdc(0), 0);
  assert.equal(vicInkToVdc(1), 15);
});

test('atlasIdToVdcCell packs reverse and bank bits', () => {
  assert.deepEqual(atlasIdToVdcCell(65), {screen: 65, attrHi: 0});
  assert.deepEqual(atlasIdToVdcCell(128), {screen: 0, attrHi: 0x40});
  assert.deepEqual(atlasIdToVdcCell(256 + 65), {screen: 65, attrHi: 0x80});
  assert.deepEqual(atlasIdToVdcCell(256 + 128), {screen: 0, attrHi: 0xc0});
  assert.equal(vdcAttr(14, 0x40), 0x4e);
  assert.throws(() => atlasIdToVdcCell(512), /Invalid/);
  assert.throws(() => vdcAttr(16), /Invalid/);
});
