import {animationCells, animationCount, animationDelay} from './animation-frames.js';
import {basicSysStub, nativeMemoryLimit} from './c64-export.js';
import {MACHINE} from './machine-modes.js';
import {
  COLUMN_WAVE_EFFECT,
  FLD_BLINDS_EFFECT,
} from './project-validation.js';
import {
  columnWavePhaseTables,
  encodeColumnWaveTables,
  encodeFldBlindsTables,
  fldBlindsGapTables,
} from './c64-procedural-vic.js';

const CYCLES_PER_CELL = 45;
const FRAME_OVERHEAD_CYCLES = 1400;

export function proceduralFramePicture(motionSource, frameIndex) {
  return animationCells(frameIndex, motionSource);
}

function screenOffsetFor(rows, columns) {
  return Math.floor((25 - rows) / 2) * 40 + Math.floor((40 - columns) / 2);
}

export function expectedProceduralVicLayout({columns, rows, ink, motionSource, frameIndex}) {
  const picture = proceduralFramePicture(motionSource, frameIndex);
  const screenOffset = screenOffsetFor(rows, columns);
  const screen = Array(1000).fill(32);
  const colors = Array(1000).fill(ink);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const i = y * columns + x;
      const d = screenOffset + y * 40 + x;
      screen[d] = picture.cells[i] === '' ? 32 : picture.cells[i];
      colors[d] = picture.inks[i];
    }
  }
  return {screen, colors};
}

function frameTicksList(motionSource) {
  const frameCount = animationCount(motionSource);
  const ticks = [];
  for (let i = 0; i < frameCount; i++) {
    const t = Math.max(1, Math.round(animationDelay(i, motionSource) * 60 / 1000));
    if (t < 1 || t > 65534) {
      throw Error('Procedural frame duration is outside the supported range');
    }
    ticks.push(t);
  }
  return ticks;
}

function packSource(grid, inks, columns, rows) {
  const glyphs = [];
  const colors = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const i = y * columns + x;
      glyphs.push(grid[i] === '' ? 0 : grid[i]);
      colors.push(inks[i]);
    }
  }
  return {glyphs, colors};
}

function estimateWorstUpdateRatio(motionSource) {
  const frameCount = animationCount(motionSource);
  const cpuHz = 985248;
  const W = motionSource.W;
  const H = motionSource.H;
  const wrap = (v, m) => ((v % m) + m) % m;
  let worst = 0;
  for (let frame = 0; frame < frameCount; frame++) {
    const ticks = Math.max(1, Math.round(animationDelay(frame, motionSource) * 60 / 1000));
    let writes = 0;
    if (motionSource.effect === COLUMN_WAVE_EFFECT) {
      const tables = columnWavePhaseTables(motionSource);
      const {travel, bends} = tables.frames[frame];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const sx = wrap(x + travel, W);
          const sy = wrap(y + bends[x], H);
          if (motionSource.grid[sy * W + sx] !== '') {
            writes++;
          }
        }
      }
    } else {
      writes = proceduralFramePicture(motionSource, frame).cells.filter(c => c !== '').length;
    }
    const cost = FRAME_OVERHEAD_CYCLES + writes * CYCLES_PER_CELL;
    worst = Math.max(worst, cost / (ticks * cpuHz / 60));
  }
  return worst;
}

function emitColorPtrFromScreen(emit) {
  emit(0xa5, 0xfd, 0x85, 0xfb);
  emit(0xa5, 0xfe, 0x18, 0x69, 0xd4, 0x85, 0xfc);
}

function emitModulo(emit, label, branch, abs, mod, labelName) {
  const done = labelName + 'Done';
  const pos = labelName + 'Pos';
  label(labelName);
  branch(0x10, pos);
  emit(0x18, 0x69, mod);
  label(pos);
  emit(0xc9, mod);
  branch(0x90, done);
  emit(0x38, 0xe9, mod);
  abs(0x4c, pos);
  label(done);
  emit(0x60);
}

function compileProceduralPlayer(opts) {
  const {
    columns,
    rows,
    charset,
    background,
    ink,
    repetitions,
    machine,
    effect,
    motionTable,
    frameTicks,
    sourceGlyphs,
    sourceColors,
    rowAddrs,
    worstUpdateRatio,
  } = opts;
  const origin = 0x0801;
  const {stub, entry} = basicSysStub(origin);
  const bytes = [...stub];
  const labels = {};
  const fixups = [];
  const emit = (...b) => bytes.push(...b);
  const label = (n) => {
    labels[n] = origin + bytes.length;
  };
  const word = (n) => emit(n & 255, n >> 8);
  const abs = (op, target) => {
    emit(op);
    if (typeof target === 'string') {
      fixups.push({at: bytes.length, target});
      word(0);
    } else {
      word(target);
    }
  };
  const branch = (op, target) => {
    emit(op);
    fixups.push({at: bytes.length, target, relative: true});
    emit(0);
  };

  const registers = [0xdd00, 0xdd02, 0xd011, 0xd016, 0xd018, 0xd020, 0xd021, 0x00cc, 0x0288];
  for (let z = 0xfb; z <= 0xfe; z++) {
    emit(0xa5, z, 0x48);
  }
  for (const address of registers) {
    abs(0xad, address);
    emit(0x48);
  }
  emit(0xd8);
  abs(0xad, 0xdd02);
  emit(0x09, 3);
  abs(0x8d, 0xdd02);
  abs(0xad, 0xdd00);
  emit(0x29, 3);
  abs(0x8d, 0xdd00);
  const vicMem = charset ? 0x17 : 0x15;
  for (const [address, value] of [
    [0xd011, 0x1b], [0xd016, 8], [0xd018, vicMem],
    [0xd020, background], [0xd021, background], [0xcc, 1], [0x0288, 4],
  ]) {
    emit(0xa9, value);
    abs(0x8d, address);
  }
  emit(0xa9, repetitions);
  abs(0x8d, 'remaining');
  emit(0xa9, 0);
  abs(0x8d, 'started');
  abs(0x8d, 'frameIndex');
  abs(0x4c, 'frame');

  label('restart');
  emit(0xa9, 0);
  abs(0x8d, 'frameIndex');
  label('frame');
  abs(0xad, 'frameIndex');
  emit(0xaa);
  abs(0xbd, 'tickTable');
  abs(0x8d, 'delay');
  abs(0xbd, 'tickTableHi');
  abs(0x8d, 'delayHigh');
  abs(0x20, 'drawFrame');
  abs(0xee, 'frameIndex');
  abs(0xad, 'frameIndex');
  emit(0xc9, frameTicks.length);
  branch(0xd0, 'frameReady');
  emit(0xa9, 0);
  abs(0x8d, 'frameIndex');
  abs(0xad, 'remaining');
  branch(0xf0, 'restart');
  abs(0xce, 'remaining');
  branch(0xd0, 'restart');
  abs(0x4c, 'hold');

  label('frameReady');
  abs(0xad, 'started');
  branch(0xd0, 'wait');
  abs(0xee, 'started');
  emit(0xa5, 0xa2);
  abs(0x8d, 'lastTick');
  label('wait');
  abs(0x20, 0xffe1);
  branch(0xd0, 'clock');
  abs(0x4c, 'exit');
  label('clock');
  emit(0xa5, 0xa2);
  abs(0xcd, 'lastTick');
  branch(0xf0, 'wait');
  abs(0xee, 'lastTick');
  abs(0xad, 'delay');
  branch(0xd0, 'decrement');
  abs(0xce, 'delayHigh');
  label('decrement');
  abs(0xce, 'delay');
  abs(0xad, 'delay');
  abs(0x0d, 'delayHigh');
  branch(0xd0, 'wait');
  abs(0x4c, 'frame');

  label('hold');
  abs(0x20, 0xffe1);
  branch(0xd0, 'hold');
  label('exit');
  for (const address of [...registers].reverse()) {
    emit(0x68);
    abs(0x8d, address);
  }
  for (let z = 0xfe; z >= 0xfb; z--) {
    emit(0x68, 0x85, z);
  }
  emit(0xa9, 147);
  abs(0x20, 0xffd2);
  emit(0x60);

  label('drawFrame');
  emit(0xa9, 0);
  emit(0x85, 0xf7);
  label('clearYLoop');
  emit(0xa6, 0xf7);
  emit(0xbd);
  fixups.push({at: bytes.length, target: 'rowScreenLo'});
  word(0);
  emit(0x85, 0xfd);
  emit(0xbd);
  fixups.push({at: bytes.length, target: 'rowScreenHi'});
  word(0);
  emit(0x85, 0xfe);
  emitColorPtrFromScreen(emit);
  emit(0xa0, 0);
  label('clearXLoop');
  emit(0xa9, 32);
  emit(0x91, 0xfd);
  emit(0xa9, ink);
  emit(0x91, 0xfb);
  emit(0xc8);
  emit(0xc0, columns);
  branch(0xd0, 'clearXLoop');
  emit(0xe6, 0xf7);
  emit(0xa5, 0xf7);
  emit(0xc9, rows);
  branch(0xd0, 'clearYLoop');

  abs(0xad, 'frameIndex');
  emit(0xaa);
  abs(0xbd, 'framePtrLo');
  emit(0x85, 0xf9);
  abs(0xbd, 'framePtrHi');
  emit(0x85, 0xfa);

  if (effect === COLUMN_WAVE_EFFECT) {
    emit(0xa0, 0);
    emit(0xb1, 0xf9);
    emit(0x18, 0x69, 128);
    emit(0x85, 0xf3);
    emit(0xa9, 0);
    emit(0x85, 0xf6);
    label('cwYLoop');
    emit(0xa9, 0);
    emit(0x85, 0xf5);
    label('cwXLoop');
    emit(0xa5, 0xf3);
    emit(0x18, 0x65, 0xf5);
    emit(0x20);
    fixups.push({at: bytes.length, target: 'modW'});
    word(0);
    emit(0x85, 0xf4);
    emit(0xa4, 0xf5);
    emit(0xc8);
    emit(0xb1, 0xf9);
    emit(0x18, 0x69, 128);
    emit(0x18, 0x65, 0xf6);
    emit(0x20);
    fixups.push({at: bytes.length, target: 'modH'});
    word(0);
    emit(0x85, 0xf8);
    emit(0xa5, 0xf8);
    emit(0x20);
    fixups.push({at: bytes.length, target: 'mulRow'});
    word(0);
    emit(0x18, 0x65, 0xf4);
    emit(0xaa);
    abs(0xbd, 'sourceColors');
    emit(0x48);
    abs(0xbd, 'sourceGlyphs');
    emit(0x48);
    emit(0xa6, 0xf6);
    emit(0xbd);
    fixups.push({at: bytes.length, target: 'rowScreenLo'});
    word(0);
    emit(0x85, 0xfd);
    emit(0xbd);
    fixups.push({at: bytes.length, target: 'rowScreenHi'});
    word(0);
    emit(0x85, 0xfe);
    emitColorPtrFromScreen(emit);
    emit(0xa4, 0xf5);
    emit(0x68);
    emit(0xf0);
    fixups.push({at: bytes.length, target: 'cwInkOnly', relative: true});
    emit(0);
    emit(0x91, 0xfd);
    emit(0x68);
    emit(0x91, 0xfb);
    abs(0x4c, 'cwSkip');
    label('cwInkOnly');
    emit(0x68);
    emit(0x91, 0xfb);
    label('cwSkip');
    emit(0xe6, 0xf5);
    emit(0xa5, 0xf5);
    emit(0xc9, columns);
    branch(0xd0, 'cwXLoop');
    emit(0xe6, 0xf6);
    emit(0xa5, 0xf6);
    emit(0xc9, rows);
    branch(0xd0, 'cwYLoop');
  } else {
    emit(0xa9, 0);
    abs(0x8d, 'dispRow');
    emit(0xa9, 0);
    emit(0x85, 0xf5);
    label('fbSyLoop');
    emit(0xa5, 0xf5);
    branch(0xf0, 'fbGapDone');
    emit(0xa4, 0xf5);
    emit(0xc8);
    emit(0xb1, 0xf9);
    abs(0x6d, 'dispRow');
    abs(0x8d, 'dispRow');
    label('fbGapDone');
    abs(0xad, 'dispRow');
    emit(0xc9, rows);
    branch(0xb0, 'fbDone');
    emit(0xa9, 0);
    emit(0x85, 0xf4);
    label('fbXLoop');
    emit(0xa5, 0xf5);
    emit(0x20);
    fixups.push({at: bytes.length, target: 'mulRow'});
    word(0);
    emit(0x18, 0x65, 0xf4);
    emit(0xaa);
    abs(0xbd, 'sourceColors');
    emit(0x48);
    abs(0xbd, 'sourceGlyphs');
    emit(0x48);
    abs(0xad, 'dispRow');
    emit(0xaa);
    emit(0xbd);
    fixups.push({at: bytes.length, target: 'rowScreenLo'});
    word(0);
    emit(0x85, 0xfd);
    emit(0xbd);
    fixups.push({at: bytes.length, target: 'rowScreenHi'});
    word(0);
    emit(0x85, 0xfe);
    emitColorPtrFromScreen(emit);
    emit(0xa4, 0xf4);
    emit(0x68);
    emit(0xf0);
    fixups.push({at: bytes.length, target: 'fbInkOnly', relative: true});
    emit(0);
    emit(0x91, 0xfd);
    emit(0x68);
    emit(0x91, 0xfb);
    abs(0x4c, 'fbSkip');
    label('fbInkOnly');
    emit(0x68);
    emit(0x91, 0xfb);
    label('fbSkip');
    emit(0xe6, 0xf4);
    emit(0xa5, 0xf4);
    emit(0xc9, columns);
    branch(0xd0, 'fbXLoop');
    abs(0xee, 'dispRow');
    abs(0xad, 'dispRow');
    emit(0xc9, rows);
    branch(0xb0, 'fbDone');
    emit(0xe6, 0xf5);
    emit(0xa5, 0xf5);
    emit(0xc9, rows);
    branch(0xd0, 'fbSyLoop');
    label('fbDone');
  }

  abs(0x60);

  emitModulo(emit, label, branch, abs, columns, 'modW');
  emitModulo(emit, label, branch, abs, rows, 'modH');

  label('mulRow');
  emit(0xa8);
  branch(0xf0, 'mulRowZero');
  emit(0xa9, 0);
  label('mulRowLoop');
  emit(0x18, 0x69, columns);
  emit(0x88);
  emit(0xd0);
  fixups.push({at: bytes.length, target: 'mulRowLoop', relative: true});
  emit(0);
  emit(0x60);
  label('mulRowZero');
  emit(0xa9, 0);
  emit(0x60);

  for (const name of ['remaining', 'lastTick', 'delay', 'delayHigh', 'started', 'frameIndex', 'dispRow']) {
    label(name);
    emit(0, 0);
  }

  label('tickTable');
  for (const t of frameTicks) {
    emit(t & 255);
  }
  label('tickTableHi');
  for (const t of frameTicks) {
    emit(t >> 8);
  }

  label('motionTable');
  const motionBase = origin + bytes.length;
  for (const b of motionTable) {
    emit(b);
  }

  const rowBytes = effect === COLUMN_WAVE_EFFECT ? 1 + columns : 1 + rows;
  const headerBytes = effect === COLUMN_WAVE_EFFECT ? 7 : 6;
  label('framePtrLo');
  for (let f = 0; f < frameTicks.length; f++) {
    emit((motionBase + headerBytes + f * rowBytes) & 255);
  }
  label('framePtrHi');
  for (let f = 0; f < frameTicks.length; f++) {
    emit((motionBase + headerBytes + f * rowBytes) >> 8);
  }

  label('rowScreenLo');
  for (const v of rowAddrs.screenLo) {
    emit(v);
  }
  label('rowScreenHi');
  for (const v of rowAddrs.screenHi) {
    emit(v);
  }
  label('sourceGlyphs');
  for (const g of sourceGlyphs) {
    emit(g);
  }
  label('sourceColors');
  for (const c of sourceColors) {
    emit(c);
  }

  const runtimeBytes = labels.motionTable - entry;

  const slotOwner = new Map();
  for (const f of fixups) {
  let address = labels[f.target];
  if (address === undefined) {
    throw Error('Unknown procedural player label: ' + f.target);
  }
  if (f.relative) {
    const delta = address - (origin + f.at + 1);
    if (delta < -128 || delta > 127) {
      throw Error('Procedural branch out of range');
    }
    if (slotOwner.has(f.at)) {
      throw Error('Procedural fixup collision at ' + f.at);
    }
    slotOwner.set(f.at, f.target);
    bytes[f.at] = delta & 255;
  } else {
    if (slotOwner.has(f.at) || slotOwner.has(f.at + 1)) {
      throw Error('Procedural fixup collision at ' + f.at);
    }
    slotOwner.set(f.at, f.target);
    slotOwner.set(f.at + 1, f.target);
    bytes[f.at] = address & 255;
    bytes[f.at + 1] = address >> 8;
  }
  }

  return {
    bytes: Uint8Array.from([origin & 255, origin >> 8, ...bytes]),
    frameCount: frameTicks.length,
    durationTicks: frameTicks.reduce((a, b) => a + b, 0),
    diagnostics: {
      machine,
      renderer: 'procedural-v2',
      programBytes: bytes.length,
      memoryLimit: nativeMemoryLimit(machine, {custom: false}),
      worstUpdateRatio,
      nativeBytes: 0,
      nativeRowKernels: 0,
      nativeFrameStates: 0,
      sharedBlockCount: 0,
      proceduralTableBytes: motionTable.length,
      proceduralRuntimeBytes: runtimeBytes,
      playerBytes: runtimeBytes,
    },
    debugSymbols: {
      entry,
      frameStart: labels.drawFrame,
      frameReady: labels.frameReady,
      hold: labels.hold,
      exit: labels.exit,
    },
  };
}

export function compileProceduralVicProgram(input) {
  const motionSource = input.motionSource;
  const effect = motionSource.effect;
  if (effect !== COLUMN_WAVE_EFFECT && effect !== FLD_BLINDS_EFFECT) {
    throw Error('Unsupported procedural motion for codegen');
  }
  const machine = input.machine ?? MACHINE.C64;
  if (machine !== MACHINE.C64) {
    throw Error('Procedural VIC codegen supports C64 only');
  }
  const columns = input.columns;
  const rows = input.rows;
  const charset = input.charset ?? 0;
  const background = input.background;
  const ink = input.ink;
  const repetitions = input.repetitions ?? 0;
  if (!Number.isInteger(columns) || columns < 1 || columns > 40
    || !Number.isInteger(rows) || rows < 1 || rows > 25) {
    throw Error('Invalid procedural canvas size');
  }
  const frameTicks = frameTicksList(motionSource);
  const {glyphs, colors} = packSource(motionSource.grid, motionSource.inks, columns, rows);
  const motionTable = effect === COLUMN_WAVE_EFFECT
    ? encodeColumnWaveTables(columnWavePhaseTables(motionSource))
    : encodeFldBlindsTables(fldBlindsGapTables(motionSource));

  const screenOffset = screenOffsetFor(rows, columns);
  const rowAddrs = {screenLo: [], screenHi: []};
  for (let y = 0; y < rows; y++) {
    const s = 0x400 + screenOffset + y * 40;
    rowAddrs.screenLo.push(s & 255);
    rowAddrs.screenHi.push(s >> 8);
  }

  return compileProceduralPlayer({
    columns,
    rows,
    charset,
    background,
    ink,
    repetitions,
    machine,
    effect,
    motionTable,
    frameTicks,
    sourceGlyphs: glyphs,
    sourceColors: colors,
    rowAddrs,
    worstUpdateRatio: estimateWorstUpdateRatio(motionSource),
  });
}