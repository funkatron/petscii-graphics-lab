/**
 * Commodore 128 80-column (VDC 8563/8568) native PRG exporter:
 * BASIC SYS stub at $1C01 + 6502 stream player that paints VDC RAM.
 *
 * Default path uses the VDC character sets the C128 screen editor already
 * keeps at $2000 (bank 0) and $3000 (bank 1, selected by attribute bit 7), with
 * hardware reverse (attribute bit 6). Mixed-bank artwork installs a custom
 * 256-glyph RAM charset (16 bytes per glyph) at VDC $2000 from glyphBits.
 *
 * VDC assumptions (C128 power-on / screen-editor defaults, 80 columns):
 *   - Screen matrix at VDC $0000 (regs 12/13 = $0000), 80 x 25 = 2000 cells.
 *   - Attribute matrix at VDC $0800 (regs 20/21 = $0800), attributes enabled.
 *   - Character set base at VDC $2000 (reg 28 bits 7-5 = %001).
 *
 * Stream format deviations from Plus/4 (forced by the VDC address map):
 *   - Screen cell $0000 is a valid VDC address, so "address 0" cannot end a
 *     plane. A plane ends with address $FFFF instead (no VDC RAM cell uses it).
 *   - Literal runs are capped at 128 bytes so interrupts are never masked for
 *     much longer than one jiffy (see the SEI note in the plane writer).
 */
import {basicSysStub, createD64Disk} from './c64-export.js';
import {atlasIdToVdcCell, vdcAttr} from './vdc-colors.js';

export {createD64Disk};

const MACHINE = 'c128-80';
const ORIGIN = 0x1c01;
const MEMORY_LIMIT = 0x8000 - ORIGIN;
const VDC_COLUMNS = 80;
const VDC_ROWS = 25;
const VDC_CELLS = VDC_COLUMNS * VDC_ROWS;
const SCREEN = 0x0000;
const ATTRS = 0x0800;
const CHARSET_RAM = 0x2000;
const CHARSET_BYTES = 16 * 256;
// VDC register 28 bits 7-5 = charset address bits 15-13. $2000 -> %001xxxxx.
const CHARSET_POINTER_BITS = (CHARSET_RAM >> 8) & 0xe0;
const MAX_LITERAL = 128;
const MAX_REPEAT = 255;
// C128 KERNAL: SWAPPER toggles 40/80 column output; MODE ($D7) bit 7 = 80 col.
const SWAPPER = 0xff5f;
const MODE = 0xd7;
// C128 jiffy clock TIME is $A0–$A2 (low byte $A2). Plus/4 uses $A5; do not copy that.
const JIFFY_LOW = 0xa2;
// 1 MHz (FAST not used): conservative CPU budget per second.
const CPU_HZ = 985248;
// Cost model (cycles). VDC access is handshake-limited, so it is far costlier than RAM.
const COST_ADDRESS_SETUP = 100;
const COST_REPEAT_BYTE = 55;
const COST_REPEAT_OVERHEAD = 200;
const COST_LITERAL_BYTE = 70;
const COST_LITERAL_OVERHEAD = 280;
const COST_FRAME_OVERHEAD = 4000;
// App ZP: pointer + temps. Saved/restored over $D8–$DF.
const ZP_PTR = 0xd8; // D8/D9 stream pointer, DA/DB VDC dest, DC repeat value, DD run count
const ZP_DEST = ZP_PTR + 2;
const ZP_VALUE = ZP_PTR + 4;
const ZP_COUNT = ZP_PTR + 5;
const PLANE_END = 0xffff;

function prepareFrames(frames, glyphBits, defaultInk) {
  if (glyphBits !== undefined) {
    if (!(glyphBits instanceof Uint8Array) || glyphBits.length !== 4096) {
      throw Error('Invalid unified VDC glyph data');
    }
    const characterBytes = new Uint8Array(CHARSET_BYTES);
    const patterns = new Map([['0,0,0,0,0,0,0,0', 0]]);
    const codes = new Map();
    const mapped = frames.map((frame) => ({
      durationMs: frame.durationMs,
      screens: frame.cells.map((g) => {
        if (g === '') {
          return 0;
        }
        if (!Number.isInteger(g) || g < 0 || g > 511) {
          throw Error('Invalid VDC atlas glyph ID');
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
            throw Error('C128 80-column export supports 256 distinct patterns across the animation, including blank space. Use fewer different glyphs; image and video exports remain available.');
          }
          patterns.set(key, slot);
          // 16-byte VDC glyph: 8 pattern bytes, then 8 zero pad bytes (already zero).
          characterBytes.set(rows, slot * 16);
        }
        codes.set(g, slot);
        return slot;
      }),
      // Custom charset: ink only. No reverse or alternate-bank bits.
      attrs: frame.inks.map((ink) => vdcAttr(ink, 0)),
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
        throw Error('Invalid VDC atlas glyph ID');
      }
      const next = g > 255 ? 1 : 0;
      if (bank === null) {
        bank = next;
      } else if (bank !== next) {
        throw Error('C128 80-column ROM export needs one character set at a time. Mixed uppercase and lowercase glyphs require the unified glyph data path.');
      }
    }
  }
  if (bank === null) {
    bank = 0;
  }
  const emptyAttr = vdcAttr(defaultInk, 0);
  const mapped = frames.map((frame) => {
    const screens = [];
    const attrs = [];
    frame.cells.forEach((g, i) => {
      if (g === '') {
        screens.push(32);
        attrs.push(emptyAttr);
        return;
      }
      const cell = atlasIdToVdcCell(g);
      screens.push(cell.screen);
      attrs.push(vdcAttr(frame.inks[i], cell.attrHi));
    });
    return {durationMs: frame.durationMs, screens, attrs};
  });
  return {frames: mapped, custom: false, charset: bank, characterBytes: null};
}

function compileC128VdcProgram({
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
  if (!Number.isInteger(columns) || columns < 1 || columns > VDC_COLUMNS || !Number.isInteger(rows) || rows < 1 || rows > VDC_ROWS) {
    throw Error('C128 80-column programs support up to 80 columns × 25 rows. Resize the canvas first.');
  }
  if (![background, ink].every((c) => Number.isInteger(c) && c >= 0 && c <= 15)) {
    throw Error('Invalid C128 80-column display colors');
  }
  if (!Number.isInteger(repetitions) || repetitions < 0 || repetitions > 100) {
    throw Error('C128 80-column repetitions must be a whole number from 0 to 100 (0 loops continuously)');
  }
  if (!Array.isArray(frames) || !frames.length) {
    throw Error('No C128 80-column frames to export');
  }
  for (const frame of frames) {
    if (!Array.isArray(frame.cells) || !Array.isArray(frame.inks) || frame.cells.length !== columns * rows || frame.inks.length !== columns * rows) {
      throw Error('Invalid C128 80-column frame dimensions');
    }
    if (frame.inks.some((c) => !Number.isInteger(c) || c < 0 || c > 15)) {
      throw Error('Invalid C128 80-column cell colors');
    }
    if (!Number.isFinite(frame.durationMs) || frame.durationMs <= 0) {
      throw Error('Invalid C128 80-column frame timing');
    }
  }

  const prepared = prepareFrames(frames, glyphBits, ink);
  frames = prepared.frames;
  const custom = prepared.custom;
  const charset = prepared.charset;
  const characterBytes = prepared.characterBytes;
  const blankScreen = custom ? 0 : 32;
  const blankAttr = vdcAttr(ink, 0);
  const screenOffset = Math.floor((VDC_ROWS - rows) / 2) * VDC_COLUMNS + Math.floor((VDC_COLUMNS - columns) / 2);

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

  // Emit changed runs for one VDC plane. Returns the estimated cycle cost.
  const changedRuns = (values, previous, address, kind) => {
    let cost = 0;
    const start = stream.length;
    const repeatLength = (i) => {
      let count = 1;
      while (
        count < MAX_REPEAT &&
        i + count < values.length &&
        values[i + count] === values[i] &&
        (!previous || values[i + count] !== previous[i + count])
      ) {
        count += 1;
      }
      return count;
    };
    const repeatCost = (count) => {
      return COST_ADDRESS_SETUP + COST_REPEAT_OVERHEAD + count * COST_REPEAT_BYTE;
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
        cost += repeatCost(count);
      } else {
        count = 1;
        while (
          count < MAX_LITERAL &&
          i + count < values.length &&
          (!previous || values[i + count] !== previous[i + count]) &&
          repeatLength(i + count) < 3
        ) {
          count += 1;
        }
        if (count <= 2 && values[i] === values[i + count - 1]) {
          stream.push(target & 255, target >> 8, count, values[i]);
          cost += repeatCost(count);
        } else {
          stream.push(target & 255, target >> 8, 0, count, ...values.slice(i, i + count));
          cost += COST_ADDRESS_SETUP + COST_LITERAL_OVERHEAD + count * COST_LITERAL_BYTE;
        }
      }
      i += count;
    }
    streamBytes[kind] += stream.length - start;
    return cost;
  };

  const updatePicture = (screen, colors, previousScreenValues, previousColorValues) => {
    return (
      COST_FRAME_OVERHEAD +
      changedRuns(screen, previousScreenValues, SCREEN, 'screen') +
      changedRuns(colors, previousColorValues, ATTRS, 'color')
    );
  };

  const budget = (ticks) => (ticks * CPU_HZ) / 60;

  for (const frame of frames) {
    elapsed += frame.durationMs;
    const endTick = Math.round((elapsed * 60) / 1000);
    const ticks = endTick - previousTick;
    previousTick = endTick;
    if (ticks < 1 || ticks > 65534) {
      throw Error('C128 80-column frame duration is outside the supported range');
    }
    stream.push(ticks & 255, ticks >> 8);
    const screen = Array(VDC_CELLS).fill(blankScreen);
    const colors = Array(VDC_CELLS).fill(blankAttr);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const i = y * columns + x;
        const d = screenOffset + y * VDC_COLUMNS + x;
        screen[d] = frame.screens[i];
        colors[d] = frame.attrs[i];
      }
    }
    if (custom && !previousScreen) {
      changedRuns([...characterBytes], undefined, CHARSET_RAM, 'characters');
    }
    const cost = updatePicture(screen, colors, previousScreen, previousColors);
    if (previousScreen) {
      worstUpdateRatio = Math.max(worstUpdateRatio, cost / budget(ticks));
    }
    stream.push(PLANE_END & 255, PLANE_END >> 8);
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
    worstUpdateRatio = Math.max(worstUpdateRatio, loopCost / budget(firstTicks));
  }
  // Plane end, then duration $FFFF = redirect, then a word patched to 'continuation'.
  stream.push(PLANE_END & 255, PLANE_END >> 8, 255, 255);
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
  // Call helper: X = VDC register, A = value.
  const vdcWriteReg = (register) => {
    emit(0xa2, register); // LDX #register
    abs(0x20, 'vdcWrite');
  };
  // Call helper: X = VDC register -> A = value.
  const vdcReadReg = (register) => {
    emit(0xa2, register); // LDX #register
    abs(0x20, 'vdcRead');
  };
  const maskInterrupts = () => emit(0x08, 0x78); // PHP, SEI
  const restoreInterrupts = () => emit(0x28); // PLP

  // Save app ZP $D8–$DF.
  for (let z = 0xd8; z <= 0xdf; z++) {
    emit(0xa5, z, 0x48);
  }
  emit(0xd8); // CLD

  // Snapshot MODE bit 7 (80-col) so exit can restore the user's display.
  emit(0xa5, MODE, 0x29, 0x80);
  abs(0x8d, 'savedMode');
  branch(0xd0, 'wide'); // bit 7 set: already 80-col
  abs(0x20, SWAPPER);
  label('wide');

  // VDC setup. SEI so the IRQ cursor code cannot interleave register selects.
  maskInterrupts();
  // Hide the VDC cursor: reg 10 bits 6-5 = %01 (no cursor), keep start scan line.
  vdcReadReg(10);
  abs(0x8d, 'savedCursor');
  emit(0x29, 0x1f, 0x09, 0x20);
  vdcWriteReg(10);
  // Background RGBI: reg 26 low nibble (high nibble = default foreground, kept).
  vdcReadReg(26);
  abs(0x8d, 'savedColors');
  emit(0x29, 0xf0, 0x09, background & 0x0f);
  vdcWriteReg(26);
  if (custom) {
    // Charset pointer reg 28: bits 7-5 = address bits 15-13 ($2000 -> %001),
    // bit 4 = DRAM type (kept). Assumes the VDC charset is 16-byte glyphs.
    vdcReadReg(28);
    abs(0x8d, 'savedCharPtr');
    emit(0x29, 0x1f, 0x09, CHARSET_POINTER_BITS);
    vdcWriteReg(28);
  }
  restoreInterrupts();

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
  emit(0xa5, JIFFY_LOW);
  abs(0x8d, 'lastTick');

  label('wait');
  abs(0x20, 0xffe1);
  branch(0xd0, 'clock');
  abs(0x4c, 'exit');

  label('clock');
  emit(0xa5, JIFFY_LOW);
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
  // Restore VDC registers first (VDC is reachable in either display mode).
  maskInterrupts();
  abs(0xad, 'savedColors');
  vdcWriteReg(26);
  abs(0xad, 'savedCursor');
  vdcWriteReg(10);
  if (custom) {
    abs(0xad, 'savedCharPtr');
    vdcWriteReg(28);
  }
  restoreInterrupts();
  // Only swap if the display mode differs from what the user started with.
  emit(0xa5, MODE, 0x29, 0x80);
  abs(0xcd, 'savedMode');
  branch(0xf0, 'modeRestored');
  abs(0x20, SWAPPER);
  label('modeRestored');
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

  // Plane writer: stream -> VDC RAM. Each run is [lo, hi, count, value] or
  // [lo, hi, 0, length, ...bytes]; lo/hi = $FFFF ends the plane.
  // Interrupts are masked for the whole run because the screen editor's IRQ
  // cursor code also selects VDC registers 18/19/31 and would corrupt the
  // update address between our address setup and the data writes.
  label('plane');
  abs(0x20, 'get');
  emit(0x85, ZP_DEST);
  abs(0x20, 'get');
  emit(0x85, ZP_DEST + 1);
  emit(0x25, ZP_DEST); // AND lo: $FF only when both bytes are $FF
  emit(0xc9, 0xff);
  branch(0xf0, 'planeEnd');
  abs(0x20, 'get');
  emit(0x85, ZP_COUNT); // STA keeps the Z flag from GET
  branch(0xf0, 'literal');
  abs(0x20, 'get');
  emit(0x85, ZP_VALUE);
  maskInterrupts();
  abs(0x20, 'vdcSetAddress');
  label('run');
  emit(0xa5, ZP_VALUE);
  abs(0x20, 'vdcPut');
  emit(0xc6, ZP_COUNT);
  branch(0xd0, 'run');
  restoreInterrupts();
  abs(0x4c, 'plane');
  label('planeEnd');
  emit(0x60);

  label('literal');
  abs(0x20, 'get');
  emit(0x85, ZP_COUNT);
  maskInterrupts();
  abs(0x20, 'vdcSetAddress');
  label('literalByte');
  emit(0xa0, 0, 0xb1, ZP_PTR);
  abs(0x20, 'vdcPut');
  emit(0xe6, ZP_PTR);
  branch(0xd0, 'literalNext');
  emit(0xe6, ZP_PTR + 1);
  label('literalNext');
  emit(0xc6, ZP_COUNT);
  branch(0xd0, 'literalByte');
  restoreInterrupts();
  abs(0x4c, 'plane');

  // VDC update address: reg 18 = high, reg 19 = low, from ZP_DEST.
  label('vdcSetAddress');
  emit(0xa5, ZP_DEST + 1);
  vdcWriteReg(18);
  emit(0xa5, ZP_DEST);
  vdcWriteReg(19);
  emit(0x60);

  // A = data. Wait ready, select reg 31 (data + auto-increment), write.
  label('vdcPut');
  emit(0xa2, 31);
  // Fall through: X = register, A = value.
  label('vdcWrite');
  abs(0x8e, 0xd600); // STX $D600
  abs(0x2c, 0xd600); // BIT $D600
  emit(0x10, 0xfb); // BPL *-3
  abs(0x8d, 0xd601); // STA $D601
  emit(0x60);

  // X = register -> A = value.
  label('vdcRead');
  abs(0x8e, 0xd600);
  abs(0x2c, 0xd600);
  emit(0x10, 0xfb);
  abs(0xad, 0xd601);
  emit(0x60);

  const bss = ['remaining', 'lastTick', 'delay', 'delayHigh', 'started', 'savedMode', 'savedCursor', 'savedColors'];
  if (custom) {
    bss.push('savedCharPtr');
  }
  for (const name of bss) {
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
      throw Error('Unknown C128 80-column player label');
    }
    if (f.relative) {
      const delta = address - (ORIGIN + f.at + 1);
      if (delta < -128 || delta > 127) {
        throw Error('C128 80-column branch out of range');
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
    machine: MACHINE,
    renderer: 'vdc',
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
      throw Error('This animation changes too much for this C128 80-column playback speed. Choose a longer loop or simplify the drawing.');
    }
    if (programBytes > MEMORY_LIMIT) {
      throw Error('This animation exceeds the C128 80-column player’s memory budget. Use a smaller canvas, a simpler drawing, or a shorter loop.');
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

export function createC128VdcProgram(input) {
  return compileC128VdcProgram(input);
}

export function createC128VdcAdaptiveProgram(input) {
  // v1: single generic VDC player (no paired/native-row variants yet).
  return compileC128VdcProgram(input);
}
