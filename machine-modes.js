/**
 * Machine modes, chrome seeds, and VIC↔TED index conversion.
 *
 * See docs/machine-modes.md for the product contract.
 */

import {colorRGB, isDisplayPaletteId} from './c64-colors.js';
import {c64InkToTed, plus4Hex, tedIndex, tedInkToC64} from './plus4-colors.js';
import {vicInkToVdc, vdcInkToVic, vdcHex} from './vdc-colors.js';

export {tedInkToC64, c64InkToTed, vicInkToVdc, vdcInkToVic};

/** Canonical machine id strings. Prefer these over bare literals in new code. */
export const MACHINE = Object.freeze({
  C64: 'c64',
  C128: 'c128',
  C128_80: 'c128-80',
  PLUS4: 'plus4',
});

/** Color / index space ids used on MACHINES[].indexSpace. */
export const INDEX_SPACE = Object.freeze({
  VIC: 'vic',
  TED: 'ted',
  VDC: 'vdc',
});

export const MACHINE_IDS = Object.freeze([
  MACHINE.C64,
  MACHINE.C128,
  MACHINE.C128_80,
  MACHINE.PLUS4,
]);
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
 * Drawing defaults use boot-screen indices. Shell paints live in styles/editor.css
 * under html[data-ui-theme]; chrome.caseHex is a maintainer cue only.
 */
export const MACHINES = Object.freeze({
  [MACHINE.C64]: Object.freeze({
    id: MACHINE.C64,
    label: 'Commodore 64',
    shortLabel: 'C64',
    indexSpace: INDEX_SPACE.VIC,
    maxColumns: 40,
    // Boot: border $0E light blue, bg $06 blue, text light blue.
    defaultInk: 14,
    defaultBackground: 6,
    borderIndex: 14,
    chrome: Object.freeze({
      accentIndex: 14,
      caseHex: '#6b5428',
    }),
  }),
  [MACHINE.C128]: Object.freeze({
    id: MACHINE.C128,
    label: 'Commodore 128 (40-col)',
    shortLabel: 'C128',
    indexSpace: INDEX_SPACE.VIC,
    maxColumns: 40,
    // Boot: light green on dark gray with light green border (Cameron Kaiser / common refs).
    defaultInk: 13,
    defaultBackground: 11,
    borderIndex: 13,
    chrome: Object.freeze({
      accentIndex: 13,
      caseHex: '#3a3a3a',
    }),
  }),
  [MACHINE.C128_80]: Object.freeze({
    id: MACHINE.C128_80,
    label: 'Commodore 128 (80-col)',
    shortLabel: 'C128-80',
    indexSpace: INDEX_SPACE.VDC,
    maxColumns: 80,
    // VDC RGBI: light green on dark gray cousins of the 40-col boot look.
    defaultInk: 10,
    defaultBackground: 8,
    borderIndex: 10,
    chrome: Object.freeze({
      accent: vdcHex(10),
      caseHex: '#3a3a3a',
    }),
  }),
  [MACHINE.PLUS4]: Object.freeze({
    id: MACHINE.PLUS4,
    label: 'Commodore Plus/4',
    shortLabel: 'Plus/4',
    indexSpace: INDEX_SPACE.TED,
    maxColumns: 40,
    // Drawing defaults: dark ink on TED paper white L5; pink border cue TED pink L4.
    // UI shell is charcoal (#2f2f2f) via data-ui-theme="plus4" in editor.css — not paper panels.
    defaultInk: 0,
    defaultBackground: tedIndex(1, 5),
    borderTed: tedIndex(11, 4),
    chrome: Object.freeze({
      accent: plus4Hex(tedIndex(11, 5)),
      caseHex: '#2f2f2f',
    }),
  }),
});

/** Legacy inline paints removed; clear them so stale sessions cannot override CSS themes. */
const LEGACY_CHROME_PAINTS = Object.freeze([
  '--chrome-bg',
  '--chrome-panel',
  '--chrome-panel-2',
  '--chrome-border',
  '--chrome-fg',
  '--chrome-muted',
  '--chrome-accent',
  '--chrome-case',
  '--chrome-bezel',
]);

export function isMachineId(value) {
  return typeof value === 'string' && Object.hasOwn(MACHINES, value);
}

export function getMachine(machineId = MACHINE.C64) {
  if (isMachineId(machineId)) {
    return MACHINES[machineId];
  }
  return MACHINES[MACHINE.C64];
}

export function isVicMachine(machineId) {
  return getMachine(machineId).indexSpace === INDEX_SPACE.VIC;
}

export function isTedMachine(machineId) {
  return getMachine(machineId).indexSpace === INDEX_SPACE.TED;
}

export function isVdcMachine(machineId) {
  return getMachine(machineId).indexSpace === INDEX_SPACE.VDC;
}

export function maxInkIndex(machineId) {
  if (isTedMachine(machineId)) {
    return 120;
  }
  return 15;
}

export function maxColumnsForMachine(machineId) {
  const max = getMachine(machineId).maxColumns;
  if (Number.isInteger(max) && max > 0) {
    return max;
  }
  return 40;
}

export function isValidInkForMachine(value, machineId) {
  return Number.isInteger(value) && value >= 0 && value <= maxInkIndex(machineId);
}

export function convertInk(ink, fromMachine, toMachine) {
  if (fromMachine === toMachine) {
    return ink;
  }
  const fromSpace = getMachine(fromMachine).indexSpace;
  const toSpace = getMachine(toMachine).indexSpace;
  if (fromSpace === toSpace) {
    return ink;
  }
  if (fromSpace === INDEX_SPACE.VIC && toSpace === INDEX_SPACE.TED) {
    return c64InkToTed(ink);
  }
  if (fromSpace === INDEX_SPACE.TED && toSpace === INDEX_SPACE.VIC) {
    return tedInkToC64(ink);
  }
  if (fromSpace === INDEX_SPACE.VIC && toSpace === INDEX_SPACE.VDC) {
    return vicInkToVdc(ink);
  }
  if (fromSpace === INDEX_SPACE.VDC && toSpace === INDEX_SPACE.VIC) {
    return vdcInkToVic(ink);
  }
  if (fromSpace === INDEX_SPACE.TED && toSpace === INDEX_SPACE.VDC) {
    return vicInkToVdc(tedInkToC64(ink));
  }
  if (fromSpace === INDEX_SPACE.VDC && toSpace === INDEX_SPACE.TED) {
    return c64InkToTed(vdcInkToVic(ink));
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

/**
 * Sets machine/palette data attributes. Shell colors come from CSS
 * `html[data-ui-theme]` scopes (see styles/README.md), not inline paints.
 */
export function applyMachineChrome(machineId, paletteId = 'pepto', root = document.documentElement) {
  const machine = getMachine(machineId);
  const palette = isDisplayPaletteId(paletteId) ? paletteId : 'pepto';
  root.dataset.machine = machine.id;
  if (machine.indexSpace === INDEX_SPACE.TED) {
    root.dataset.palette = 'ted';
  } else if (machine.indexSpace === INDEX_SPACE.VDC) {
    root.dataset.palette = 'vdc';
  } else {
    root.dataset.palette = palette;
  }
  if (root.style && typeof root.style.removeProperty === 'function') {
    for (const name of LEGACY_CHROME_PAINTS) {
      root.style.removeProperty(name);
    }
  }
  return {machine: machine.id, palette: root.dataset.palette};
}

export function readWorkspacePrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_PREFS_KEY));
    const machine = isMachineId(saved?.machine) ? saved.machine : MACHINE.C64;
    let palette = isDisplayPaletteId(saved?.palette) ? saved.palette : 'pepto';
    if (isTedMachine(machine)) {
      palette = isDisplayPaletteId(saved?.palette) ? saved.palette : 'pepto';
    }
    return {machine, palette};
  } catch {
    return {machine: MACHINE.C64, palette: 'pepto'};
  }
}

export function writeWorkspacePrefs({machine, palette}) {
  try {
    localStorage.setItem(
      WORKSPACE_PREFS_KEY,
      JSON.stringify({
        machine: isMachineId(machine) ? machine : MACHINE.C64,
        palette: isDisplayPaletteId(palette) ? palette : 'pepto',
      }),
    );
  } catch {
    // Device storage may be unavailable; project autosave is separate.
  }
}

export function machineSummary(machineId, paletteId) {
  const machine = getMachine(machineId);
  if (machine.indexSpace === INDEX_SPACE.TED) {
    return `${machine.shortLabel} · TED`;
  }
  if (machine.indexSpace === INDEX_SPACE.VDC) {
    return `${machine.shortLabel} · RGBI`;
  }
  const palette = isDisplayPaletteId(paletteId) ? paletteId : 'pepto';
  const labels = {pepto: 'Pepto', colodore: 'Colodore', vice: 'VICE', rgb: 'RGB'};
  return `${machine.shortLabel} · ${labels[palette]}`;
}
