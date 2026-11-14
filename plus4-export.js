/**
 * Plus/4 (TED) native PRG exporter: BASIC SYS stub at $1001 + 6502 stream player.
 * Default path uses TED character ROM with hardware reverse ($FF07 bit7 clear).
 * Mixed-bank artwork installs a RAM charset built from TED glyphBits at $F000.
 */
import {basicSysStub, createD64Disk} from './c64-export.js';
import {tedToAttr} from './plus4-colors.js';

export {createD64Disk};

const ORIGIN = 0x1001;
const MEMORY_LIMIT = 0x8000 - ORIGIN;
const CHARSET_RAM = 0xf000;
const SCREEN = 0x0c00;
const ATTRS = 0x0800;
// App ZP: pointer + temps. Do not use $FB–$FE (CURBNK / OS).
const ZP_PTR = 0xd8; // D8/D9 stream pointer, DA/DB dest, DC… temps via labels in BSS

function charsetRegister(address) {
  // $FF13 bits 7–2 = address bits 15–10.
  return (address >> 8) & 0xfc;
}

function prepareFrames(frames, glyphBits) {
  if (glyphBits !== undefined) {
    if (!(glyphBits instanceof Uint8Array) || glyphBits.length !== 4096) {
      throw Error('Invalid unified TED glyph data');
    }
    const characterBytes = new Uint8Array(2048);
    const patterns = new Map([['0,0,0,0,0,0,0,0', 0]]);
    const codes = new Map();
    const mapped = frames.map((frame) => ({
      ...frame,
      cells: frame.cells.map((g) => {
        if (g === '') {
          return g;
        }
        if (!Number.isInteger(g) || g < 0 || g > 511) {
          throw Error('Invalid TED atlas glyph ID');
        }
        if (codes.has(g)) {
          return codes.get(g);
        }
        const rows = glyphBits.subarray(g * 8, g * 8 + 8);
        const key = rows.join(',');
        let slot = patterns.get(key);
        if (slot === undefined) {
          slot = patterns.size;
          if (slot >= 256) {
            throw Error('Plus/4 export supports 256 distinct patterns across the animation, including blank space. Use fewer different glyphs; image and video exports remain available.');
          }
          patterns.set(key, slot);
          characterBytes.set(rows, slot * 8);
        }
        codes.set(g, slot);
        return slot;
      }),
    }));
    return {frames: mapped, custom: true, charset: 0, characterBytes};
  }

  let bank = null;
  for (const frame of frames) {
    for (const g of frame.cells) {
      if (g === '') {
        continue;
      }
      if (!Number.isInteger(g) || g < 0 || g > 511) {
        throw Error('Invalid TED atlas glyph ID');
      }
      const next = g > 255 ? 1 : 0;
      if (bank === null) {
        bank = next;
      } else if (bank !== next) {
        throw Error('Plus/4 ROM export needs one character set at a time. Mixed uppercase and lowercase glyphs require the unified TED character data path.');
      }
    }
  }
  if (bank === null) {
    bank = 0;
  }
  const mapped = frames.map((frame) => ({
    ...frame,
    cells: frame.cells.map((g) => {
      if (g === '') {
        return g;
      }
      return g & 255;
    }),
  }));
  return {frames: mapped, custom: false, charset: bank, characterBytes: null};
}

function compilePlus4Program({
  columns,
  rows,
  background,
  ink,
  frames,
  repetitions = 0,
  glyphBits,
  analyze = false,
  allowTimingOverrun = false,
}) {
  if (!Number.isInteger(columns) || columns < 1 || columns > 40 || !Number.isInteger(rows) || rows < 1 || rows > 25) {
    throw Error('Plus/4 programs support up to 40 columns × 25 rows. Resize the canvas first.');
  }
  if (![background, ink].every((c) => Number.isInteger(c) && c >= 0 && c <= 120)) {
    throw Error('Invalid Plus/4 display colors');
  }
  if (!Number.isInteger(repetitions) || repetitions < 0 || repetitions > 100) {
    throw Error('Plus/4 repetitions must be a whole number from 0 to 100 (0 loops continuously)');
  }
  if (!Array.isArray(frames) || !frames.length) {
    throw Error('No Plus/4 frames to export');
  }

  const prepared = prepareFrames(frames, glyphBits);
  frames = prepared.frames;
  const custom = prepared.custom;
  const charset = prepared.charset;
  const characterBytes = prepared.characterBytes;
  const bgAttr = tedToAttr(background);
  const inkAttr = tedToAttr(ink);
  const screenOffset = Math.floor((25 - rows) / 2) * 40 + Math.floor((40 - columns) / 2);

  const stream = [];
  const streamBytes = {characters: 0, screen: 0, color: 0, framing: 0};
  let previousScreen;
  let previousColors;
  let firstScreen;
  let firstColors;
  let firstTicks;
  let continuationOffset;
  let elapsed = 0;
  let previousTick = 0;
  let worstUpdateRatio = 0;

  const changedRuns = (values, previous, address) => {
    let cost = 0;
    const start = stream.length;
    const repeatLength = (i) => {
      let count = 1;
      while (
        count < 255 &&
        i + count < values.length &&
        values[i + count] === values[i] &&
        (!previous || values[i + count] !== previous[i + count])
      ) {
        count += 1;
      }
      return count;
    };
    for (let i = 0; i < values.length;) {
      if (previous && values[i] === previous[i]) {
        i += 1;
        continue;
      }
      let count = repeatLength(i);
      const target = address + i;
      if (count >= 3) {
        stream.push(target & 255, target >> 8, count, values[i]);
        cost += count * 13 + 160;
      } else {
        count = 1;
        while (
          count < 255 &&
          i + count < values.length &&
          (!previous || values[i + count] !== previous[i + count]) &&
          repeatLength(i + count) < 3
        ) {
          count += 1;
        }
        if (count <= 2 && values[i] === values[i + count - 1]) {
          stream.push(target & 255, target >> 8, count, values[i]);
          cost += count * 13 + 160;
        } else {
          stream.push(target & 255, target >> 8, 0, count, ...values.slice(i, i + count));
          cost += count * 20 + 220;
        }
      }
      i += count;
    }
    const kind = address === CHARSET_RAM ? 'characters' : address === ATTRS ? 'color' : 'screen';
    streamBytes[kind] += stream.length - start;
    return cost;
  };

  const updatePicture = (screen, colors, previousScreenValues, previousColorValues) => {
    return (
      2500 +
      changedRuns(screen, previousScreenValues, SCREEN) +
      changedRuns(colors, previousColorValues, ATTRS)
    );
  };

  for (const frame of frames) {
    if (frame.cells.length !== columns * rows || frame.inks.length !== columns * rows) {
      throw Error('Invalid Plus/4 frame dimensions');
    }
    if (frame.cells.some((g) => g !== '' && (!Number.isInteger(g) || g < 0 || g > 255))) {
      throw Error('Plus/4 programs require numeric screen codes from 0 to 255.');
    }
    if (frame.inks.some((c) => !Number.isInteger(c) || c < 0 || c > 120)) {
      throw Error('Invalid Plus/4 cell colors');
    }
    if (!Number.isFinite(frame.durationMs) || frame.durationMs <= 0) {
      throw Error('Invalid Plus/4 frame timing');
    }
    elapsed += frame.durationMs;
    const endTick = Math.round((elapsed * 60) / 1000);
    const ticks = endTick - previousTick;
    previousTick = endTick;
    if (ticks < 1 || ticks > 65534) {
      throw Error('Plus/4 frame duration is outside the supported range');
    }
    stream.push(ticks & 255, ticks >> 8);
    const screen = Array(1000).fill(custom ? 0 : 32);
    const colors = Array(1000).fill(inkAttr);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const i = y * columns + x;
        const d = screenOffset + y * 40 + x;
        screen[d] = frame.cells[i] === '' ? (custom ? 0 : 32) : frame.cells[i];
        colors[d] = tedToAttr(frame.inks[i]);
      }
    }
    if (custom && !previousScreen) {
      changedRuns([...characterBytes], undefined, CHARSET_RAM);
    }
    const cost = updatePicture(screen, colors, previousScreen, previousColors);
    if (previousScreen) {
      worstUpdateRatio = Math.max(worstUpdateRatio, cost / ((ticks * 985248) / 60));
    }
    stream.push(0, 0);
    if (!firstScreen) {
      firstScreen = screen;
      firstColors = colors;
      firstTicks = ticks;
      continuationOffset = stream.length;
    }
    previousScreen = screen;
    previousColors = colors;
  }
  stream.push(0, 0);
  const loopOffset = stream.length;
  stream.push(firstTicks & 255, firstTicks >> 8);
  const loopCost = updatePicture(firstScreen, firstColors, previousScreen, previousColors);
  if (frames.length > 1) {
    worstUpdateRatio = Math.max(worstUpdateRatio, loopCost / ((firstTicks * 985248) / 60));
  }
  stream.push(0, 0, 255, 255);
  const continuationPointer = stream.length;
  stream.push(0, 0);

  const {stub, entry} = basicSysStub(ORIGIN);
  const bytes = [...stub];
  const labels = {};
  const fixups = [];
  if (entry !== ORIGIN + bytes.length) {
    throw Error('BASIC SYS stub entry mismatch');
  }

  const emit = (...b) => bytes.push(...b);
  const label = (n) => {
    labels[n] = ORIGIN + bytes.length;
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
  const immLabel = (op, target, high = false) => {
    emit(op);
    fixups.push({at: bytes.length, target, byte: true, high});
    emit(0);
  };

  // Save app ZP $D8–$DF and TED display regs.
  for (let z = 0xd8; z <= 0xdf; z++) {
    emit(0xa5, z, 0x48);
  }
  const registers = [0xff06, 0xff07, 0xff12, 0xff13, 0xff14, 0xff15, 0xff19, 0xff0c, 0xff0d];
  for (const address of registers) {
    abs(0xad, address);
    emit(0x48);
  }
  emit(0xd8); // CLD

  // Char mode, 25 rows, screen on. Avoid GRAPHIC / bitmap.
  emit(0xa9, 0x1b);
  abs(0x8d, 0xff06);
  // Preserve PAL/NTSC bit6; clear 256-char bit7 (hardware reverse); keep 40-col.
  abs(0xad, 0xff07);
  emit(0x29, 0x7f); // clear bit7
  emit(0x09, 0x08); // 40 columns
  abs(0x8d, 0xff07);

  if (custom) {
    // Charset from RAM at $F000.
    abs(0xad, 0xff12);
    emit(0x29, 0xfb); // clear CHARROM bit2
    abs(0x8d, 0xff12);
    emit(0xa9, charsetRegister(CHARSET_RAM));
    abs(0x8d, 0xff13);
  } else {
    abs(0xad, 0xff12);
    emit(0x09, 0x04); // CHARROM
    abs(0x8d, 0xff12);
    const romBase = charset ? 0xd400 : 0xd000;
    emit(0xa9, charsetRegister(romBase));
    abs(0x8d, 0xff13);
  }

  // Keep default matrix window ($0C00 / $0800): do not poke $FF14 unless needed.
  emit(0xa9, bgAttr);
  abs(0x8d, 0xff15);
  abs(0x8d, 0xff19);
  // Hide hardware cursor (row/col past screen).
  emit(0xa9, 0);
  abs(0x8d, 0xff0c);
  emit(0xa9, 0xcc); // >= 1001 hides cursor on TED
  abs(0x8d, 0xff0d);

  emit(0xa9, repetitions);
  abs(0x8d, 'remaining');
  emit(0xa9, 0);
  abs(0x8d, 'started');
  immLabel(0xa9, 'data');
  emit(0x85, ZP_PTR);
  immLabel(0xa9, 'data', true);
  emit(0x85, ZP_PTR + 1);
  abs(0x4c, 'frame');

  label('restart');
  immLabel(0xa9, 'loopData');
  emit(0x85, ZP_PTR);
  immLabel(0xa9, 'loopData', true);
  emit(0x85, ZP_PTR + 1);

  label('frame');
  abs(0x20, 'get');
  abs(0x8d, 'delay');
  abs(0x20, 'get');
  abs(0x8d, 'delayHigh');
  abs(0x0d, 'delay');
  branch(0xd0, 'checkRedirect');
  abs(0xad, 'remaining');
  branch(0xf0, 'restart');
  abs(0xce, 'remaining');
  branch(0xd0, 'restart');
  abs(0x4c, 'hold');

  label('checkRedirect');
  abs(0xad, 'delayHigh');
  emit(0xc9, 255);
  branch(0xd0, 'picture');
  abs(0xad, 'delay');
  emit(0xc9, 255);
  branch(0xd0, 'picture');
  abs(0x20, 'get');
  emit(0xaa);
  abs(0x20, 'get');
  emit(0x85, ZP_PTR + 1, 0x86, ZP_PTR);
  abs(0x4c, 'frame');

  label('picture');
  abs(0x20, 'plane');
  label('frameReady');
  abs(0xad, 'started');
  branch(0xd0, 'wait');
  abs(0xee, 'started');
  emit(0xa5, 0xa5);
  abs(0x8d, 'lastTick');

  label('wait');
  abs(0x20, 0xffe1);
  branch(0xd0, 'clock');
  abs(0x4c, 'exit');

  label('clock');
  emit(0xa5, 0xa5);
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
  for (let z = 0xdf; z >= 0xd8; z--) {
    emit(0x68, 0x85, z);
  }
  emit(0xa9, 147);
  abs(0x20, 0xffd2);
  emit(0x60);

  label('get');
  emit(0xa0, 0, 0xb1, ZP_PTR, 0xe6, ZP_PTR);
  branch(0xd0, 'got');
  emit(0xe6, ZP_PTR + 1);
  label('got');
  emit(0xc9, 0, 0x60);

  label('plane');
  abs(0x20, 'get');
  emit(0x85, ZP_PTR + 2);
  abs(0x20, 'get');
  emit(0x85, ZP_PTR + 3);
  branch(0xf0, 'planeEnd');
  abs(0x20, 'get');
  emit(0xaa);
  branch(0xf0, 'literal');
  abs(0x20, 'get');
  label('run');
  emit(0x91, ZP_PTR + 2, 0xc8, 0xca);
  branch(0xd0, 'run');
  abs(0x4c, 'plane');
  label('planeEnd');
  emit(0x60);

  label('literal');
  abs(0x20, 'get');
  emit(0xaa);
  label('literalByte');
  emit(0xb1, ZP_PTR, 0x91, ZP_PTR + 2, 0xc8, 0xca);
  branch(0xd0, 'literalByte');
  emit(0x98, 0x18, 0x65, ZP_PTR, 0x85, ZP_PTR);
  branch(0x90, 'literalDone');
  emit(0xe6, ZP_PTR + 1);
  label('literalDone');
  abs(0x4c, 'plane');

  for (const name of ['remaining', 'lastTick', 'delay', 'delayHigh', 'started']) {
    label(name);
    emit(0);
  }
  label('data');
  labels.loopData = labels.data + loopOffset;
  labels.continuation = labels.data + continuationOffset;
  fixups.push({at: bytes.length + continuationPointer, target: 'continuation'});
  for (const byte of stream) {
    emit(byte);
  }

  for (const f of fixups) {
    const address = labels[f.target];
    if (address === undefined) {
      throw Error('Unknown Plus/4 player label');
    }
    if (f.relative) {
      const delta = address - (ORIGIN + f.at + 1);
      if (delta < -128 || delta > 127) {
        throw Error('Plus/4 branch out of range');
      }
      bytes[f.at] = delta & 255;
    } else if (f.byte) {
      bytes[f.at] = f.high ? address >> 8 : address & 255;
    } else {
      bytes[f.at] = address & 255;
      bytes[f.at + 1] = address >> 8;
    }
  }

  const programBytes = bytes.length;
  const diagnostics = {
    machine: 'plus4',
    renderer: 'generic',
    programBytes,
    memoryLimit: MEMORY_LIMIT,
    worstUpdateRatio,
    playerBytes: labels.data - ORIGIN,
    customCharset: custom,
    charset,
    streamBytes: {
      ...streamBytes,
      framing: stream.length - streamBytes.characters - streamBytes.screen - streamBytes.color,
    },
  };

  if (!analyze) {
    if (worstUpdateRatio > 1 && !allowTimingOverrun) {
      throw Error('This animation changes too much for this Plus/4 playback speed. Choose a longer loop or simplify the drawing.');
    }
    if (programBytes > MEMORY_LIMIT) {
      throw Error('This animation exceeds the Plus/4 player’s memory budget. Use a smaller canvas, a simpler drawing, or a shorter loop.');
    }
  }

  return {
    bytes: Uint8Array.from([ORIGIN & 255, ORIGIN >> 8, ...bytes]),
    diagnostics,
    durationTicks: previousTick,
    frameCount: frames.length,
    debugSymbols: {
      entry,
      frameStart: labels.picture,
      frameReady: labels.frameReady,
      hold: labels.hold,
      exit: labels.exit,
    },
  };
}

export function createPlus4Program(input) {
  return compilePlus4Program(input);
}

export function createPlus4AdaptiveProgram(input) {
  // v1: single generic TED player (no paired/native-row variants yet).
  return compilePlus4Program(input);
}
