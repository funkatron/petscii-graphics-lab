/**
 * Machine modes, chrome seeds, and VIC↔TED index conversion.
 *
 * See docs/machine-modes.md for the product contract.
 */

import {colorRGB, inkHex, isDisplayPaletteId, paletteColors} from './c64-colors.js';
import {c64InkToTed, plus4Hex, tedIndex, tedInkToC64} from './plus4-colors.js';

export {tedInkToC64, c64InkToTed};

export const MACHINE_IDS = Object.freeze(['c64', 'c128', 'plus4']);
export const WORKSPACE_PREFS_KEY = 'petscii-workspace-prefs';

function rgbToHex([r, g, b]) {
  const byte = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

function relativeLuminance(hex) {
  const channels = colorRGB(hex).map((value) => {
    const channel = value / 255;
    if (channel <= 0.03928) {
      return channel / 12.92;
    }
    return ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Pick black or white for readable text on a background hex. */
export function contrastingInk(backgroundHex) {
  if (relativeLuminance(backgroundHex) > 0.4) {
    return '#101010';
  }
  return '#eef5fa';
}

export function mutedInk(foregroundHex, backgroundHex) {
  const fg = colorRGB(foregroundHex);
  const bg = colorRGB(backgroundHex);
  return rgbToHex([
    fg[0] * 0.55 + bg[0] * 0.45,
    fg[1] * 0.55 + bg[1] * 0.45,
    fg[2] * 0.55 + bg[2] * 0.45,
  ]);
}

/**
 * TED white at luma 5 ≈ dirty paper; pink border chroma 11 luma 4.
 * VIC defaults use hardware indices (border/bg/text).
 */
export const MACHINES = Object.freeze({
  c64: Object.freeze({
    id: 'c64',
    label: 'Commodore 64',
    shortLabel: 'C64',
    indexSpace: 'vic',
    // Boot: border $0E light blue, bg $06 blue, text light blue.
    defaultInk: 14,
    defaultBackground: 6,
    borderIndex: 14,
    chrome: Object.freeze({
      // Case/UI wash evokes blue READY screen family.
      bg: null, // resolved from palette blue
      panel: null,
      panel2: null,
      accentIndex: 14,
      caseHex: '#6b5428',
    }),
  }),
  c128: Object.freeze({
    id: 'c128',
    label: 'Commodore 128 (40-col)',
    shortLabel: 'C128',
    indexSpace: 'vic',
    // Boot: light green on dark gray with light green border (Cameron Kaiser / common refs).
    defaultInk: 13,
    defaultBackground: 11,
    borderIndex: 13,
    chrome: Object.freeze({
      accentIndex: 13,
      caseHex: '#3a3a3a',
    }),
  }),
  plus4: Object.freeze({
    id: 'plus4',
    label: 'Commodore Plus/4',
    shortLabel: 'Plus/4',
    indexSpace: 'ted',
    defaultInk: 0,
    defaultBackground: tedIndex(1, 5),
    borderTed: tedIndex(11, 4),
    chrome: Object.freeze({
      bg: '#d8d8d0',
      panel: '#ecece4',
      panel2: '#f6f6ee',
      border: plus4Hex(tedIndex(11, 4)),
      accent: plus4Hex(tedIndex(11, 5)),
      caseHex: '#2f2f2f',
    }),
  }),
});

export function isMachineId(value) {
  return typeof value === 'string' && Object.hasOwn(MACHINES, value);
}

export function getMachine(machineId = 'c64') {
  if (isMachineId(machineId)) {
    return MACHINES[machineId];
  }
  return MACHINES.c64;
}

export function isVicMachine(machineId) {
  return getMachine(machineId).indexSpace === 'vic';
}

export function isTedMachine(machineId) {
  return getMachine(machineId).indexSpace === 'ted';
}

export function maxInkIndex(machineId) {
  if (isTedMachine(machineId)) {
    return 120;
  }
  return 15;
}

export function isValidInkForMachine(value, machineId) {
  return Number.isInteger(value) && value >= 0 && value <= maxInkIndex(machineId);
}

export function convertInk(ink, fromMachine, toMachine) {
  if (fromMachine === toMachine) {
    return ink;
  }
  if (isVicMachine(fromMachine) && isTedMachine(toMachine)) {
    return c64InkToTed(ink);
  }
  if (isTedMachine(fromMachine) && isVicMachine(toMachine)) {
    return tedInkToC64(ink);
  }
  return ink;
}

export function convertColorsObject(colors, fromMachine, toMachine) {
  return {
    ink: convertInk(colors.ink, fromMachine, toMachine),
    background: convertInk(colors.background, fromMachine, toMachine),
  };
}

export function convertInkArray(inks, fromMachine, toMachine) {
  return inks.map((ink) => convertInk(ink, fromMachine, toMachine));
}

function mixHex(a, b, amount) {
  const left = colorRGB(a);
  const right = colorRGB(b);
  return rgbToHex([
    left[0] + (right[0] - left[0]) * amount,
    left[1] + (right[1] - left[1]) * amount,
    left[2] + (right[2] - left[2]) * amount,
  ]);
}

export function resolveChromeTokens(machineId, paletteId = 'pepto') {
  const machine = getMachine(machineId);
  if (machine.id === 'plus4') {
    const bg = machine.chrome.bg;
    const panel = machine.chrome.panel;
    const fg = contrastingInk(panel);
    return {
      '--chrome-bg': bg,
      '--chrome-panel': panel,
      '--chrome-panel-2': machine.chrome.panel2,
      '--chrome-border': mixHex(machine.chrome.border, panel, 0.35),
      '--chrome-fg': fg,
      '--chrome-muted': mutedInk(fg, panel),
      '--chrome-accent': machine.chrome.accent,
      '--chrome-case': machine.chrome.caseHex,
      '--chrome-bezel': machine.chrome.border,
    };
  }

  const colors = paletteColors(paletteId);
  const blue = colors[6][1];
  const accent = colors[machine.chrome.accentIndex][1];
  const dark = colors[machine.defaultBackground][1];
  let panel;
  let bg;
  let panel2;
  if (machine.id === 'c128') {
    panel = mixHex(dark, '#0a0a0a', 0.35);
    bg = mixHex(dark, '#050505', 0.55);
    panel2 = mixHex(dark, accent, 0.12);
  } else {
    panel = mixHex(blue, '#0e1728', 0.55);
    bg = mixHex(blue, '#070b14', 0.7);
    panel2 = mixHex(blue, '#111d30', 0.45);
  }
  const fg = contrastingInk(panel);
  return {
    '--chrome-bg': bg,
    '--chrome-panel': panel,
    '--chrome-panel-2': panel2,
    '--chrome-border': mixHex(accent, panel, 0.55),
    '--chrome-fg': fg,
    '--chrome-muted': mutedInk(fg, panel),
    '--chrome-accent': accent,
    '--chrome-case': machine.chrome.caseHex,
    '--chrome-bezel': inkHex(machine.borderIndex, paletteId),
  };
}

export function applyMachineChrome(machineId, paletteId = 'pepto', root = document.documentElement) {
  const machine = getMachine(machineId);
  const palette = isDisplayPaletteId(paletteId) ? paletteId : 'pepto';
  root.dataset.machine = machine.id;
  root.dataset.palette = machine.indexSpace === 'ted' ? 'ted' : palette;
  const tokens = resolveChromeTokens(machine.id, palette);
  for (const [name, value] of Object.entries(tokens)) {
    root.style.setProperty(name, value);
  }
  return tokens;
}

export function readWorkspacePrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_PREFS_KEY));
    const machine = isMachineId(saved?.machine) ? saved.machine : 'c64';
    let palette = isDisplayPaletteId(saved?.palette) ? saved.palette : 'pepto';
    if (isTedMachine(machine)) {
      palette = isDisplayPaletteId(saved?.palette) ? saved.palette : 'pepto';
    }
    return {machine, palette};
  } catch {
    return {machine: 'c64', palette: 'pepto'};
  }
}

export function writeWorkspacePrefs({machine, palette}) {
  try {
    localStorage.setItem(
      WORKSPACE_PREFS_KEY,
      JSON.stringify({
        machine: isMachineId(machine) ? machine : 'c64',
        palette: isDisplayPaletteId(palette) ? palette : 'pepto',
      }),
    );
  } catch {
    // Device storage may be unavailable; project autosave is separate.
  }
}

export function machineSummary(machineId, paletteId) {
  const machine = getMachine(machineId);
  if (machine.indexSpace === 'ted') {
    return `${machine.shortLabel} · TED`;
  }
  const palette = isDisplayPaletteId(paletteId) ? paletteId : 'pepto';
  const labels = {pepto: 'Pepto', colodore: 'Colodore', vice: 'VICE', rgb: 'RGB'};
  return `${machine.shortLabel} · ${labels[palette]}`;
}
