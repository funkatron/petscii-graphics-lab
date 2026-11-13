import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inkHex, isDisplayPaletteId, paletteColors} from '../c64-colors.js';
import {
  applyMachineChrome,
  contrastingInk,
  convertInk,
  getMachine,
  isValidInkForMachine,
  machineSummary,
  tedInkToC64,
} from '../machine-modes.js';
import {c64InkToTed, tedIndex} from '../plus4-colors.js';
import {validateProject} from '../project-validation.js';

const base = {
  format: 'petscii-stencil-lab',
  version: 3,
  columns: 2,
  rows: 1,
  grid: [160, ''],
  cellColors: [14, 6],
  colors: {ink: 14, background: 6},
};

test('display palettes expose sixteen named colors', () => {
  for (const id of ['pepto', 'colodore', 'vice', 'rgb']) {
    assert.equal(isDisplayPaletteId(id), true);
    assert.equal(paletteColors(id).length, 16);
  }
  assert.notEqual(inkHex(6, 'pepto'), inkHex(6, 'rgb'));
});

test('C128 defaults use light green on dark gray', () => {
  const machine = getMachine('c128');
  assert.equal(machine.defaultInk, 13);
  assert.equal(machine.defaultBackground, 11);
  assert.equal(machine.borderIndex, 13);
});

test('Plus/4 defaults use TED paper indices', () => {
  const machine = getMachine('plus4');
  assert.equal(machine.defaultInk, 0);
  assert.equal(machine.defaultBackground, tedIndex(1, 5));
  assert.equal(isValidInkForMachine(80, 'plus4'), true);
  assert.equal(isValidInkForMachine(80, 'c64'), false);
});

test('VIC↔TED conversion round-trips chroma cousins', () => {
  assert.equal(c64InkToTed(14), tedIndex(14, 4));
  assert.equal(tedInkToC64(tedIndex(14, 7)), 14);
  assert.equal(convertInk(6, 'c64', 'plus4'), tedIndex(6, 4));
  assert.equal(convertInk(tedIndex(6, 2), 'plus4', 'c128'), 6);
});

test('Plus/4 case cue is charcoal; contrastingInk still picks readable ink', () => {
  assert.equal(getMachine('plus4').chrome.caseHex, '#2f2f2f');
  assert.equal(contrastingInk('#ecece4'), '#101010');
  assert.equal(contrastingInk('#2f2f2f'), '#eef5fa');
  assert.match(machineSummary('plus4', 'pepto'), /TED/);
  assert.match(machineSummary('c64', 'colodore'), /Colodore/);
});

test('applyMachineChrome sets data-machine and clears legacy chrome paints', () => {
  const removed = [];
  const root = {
    dataset: {},
    style: {
      props: {'--chrome-fg': '#101010'},
      setProperty(name, value) {
        this.props[name] = value;
      },
      removeProperty(name) {
        removed.push(name);
        delete this.props[name];
      },
    },
  };
  const result = applyMachineChrome('c128', 'vice', root);
  assert.equal(root.dataset.machine, 'c128');
  assert.equal(root.dataset.palette, 'vice');
  assert.deepEqual(result, {machine: 'c128', palette: 'vice'});
  assert.ok(removed.includes('--chrome-fg'));
  assert.equal(root.style.props['--chrome-fg'], undefined);
});

test('validation accepts Plus/4 TED inks and rejects them on C64', () => {
  validateProject({
    ...base,
    machine: 'plus4',
    palette: 'pepto',
    cellColors: [0, tedIndex(2, 3)],
    colors: {ink: 0, background: tedIndex(1, 5)},
  });
  assert.throws(
    () => validateProject({...base, machine: 'c64', cellColors: [0, 80]}),
    /cell colors/,
  );
  assert.throws(() => validateProject({...base, machine: 'vic20'}), /machine/);
  assert.throws(() => validateProject({...base, palette: 'neon'}), /palette/);
});
