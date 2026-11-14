/** Maximum `.txt` grid file size for Project → Open text grid (bytes). */
export const TEXT_GRID_MAX_BYTES = 65536;

const HEADER_PATTERN = /^# PETSCII-GLYPHS ([123]) (\d+) (\d+)(?: ([0-9a-f]{1,2}))?$/i;
const HEADER_ERROR = 'Use PETSCII-GLYPHS 1, version 2 with a background ink, or version 3 with a two-digit TED ink';
const TED_INK_ERROR = 'TED ink must be 00–78';

function hexGlyphId(value) {
  return value.toString(16).toUpperCase();
}

function hexInk(value, digits) {
  const max = digits === 2 ? 120 : 15;
  if (!Number.isInteger(value) || value < 0 || value > max) {
    if (digits === 2) {
      throw Error(TED_INK_ERROR);
    }
    throw Error('Ink must be one hex digit 0–F');
  }
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

/**
 * Format the current grid as a PETSCII-GLYPHS text document.
 * colorDigits 2 emits version 3 (TED indices 0–120). Otherwise colored output is version 2.
 */
export function formatTextGrid({columns, rows, grid, cellColors, colors, includeColors, colorDigits = 1}) {
  const tedColors = includeColors && colorDigits === 2;
  let header = `# PETSCII-GLYPHS 1 ${columns} ${rows}`;
  if (tedColors) {
    header = `# PETSCII-GLYPHS 3 ${columns} ${rows} ${hexInk(colors.background, 2)}`;
  } else if (includeColors) {
    header = `# PETSCII-GLYPHS 2 ${columns} ${rows} ${hexInk(colors.background, 1)}`;
  }

  const body = Array.from({length: rows}, (_, row) => {
    const start = row * columns;
    const tokens = grid.slice(start, start + columns).map((glyph, column) => {
      const glyphToken = glyph === '' ? '--' : hexGlyphId(glyph).padStart(3, '0');
      if (!includeColors) {
        return glyphToken;
      }
      const ink = cellColors[start + column];
      const digits = tedColors ? 2 : 1;
      return `${glyphToken}:${hexInk(ink, digits)}`;
    });
    return tokens.join(' ');
  });

  return `${header}\n${body.join('\n')}`;
}

/**
 * Parse and validate a text grid without applying it. Throws the same errors as the editor UI.
 *
 * @param {string} text
 * @param {{ ink: number, background: number }} defaultColors brush defaults for v1 imports
 */
export function parseTextGrid(text, defaultColors) {
  const lines = text.replace(/\r/g, '').trimEnd().split('\n');
  const headerLine = lines.shift();
  const header = headerLine?.match(HEADER_PATTERN);

  if (!header) {
    throw Error(HEADER_ERROR);
  }
  const version = header[1];
  const backgroundToken = header[4];
  if (version === '1' && backgroundToken) {
    throw Error(HEADER_ERROR);
  }
  if (version === '2' && (!backgroundToken || backgroundToken.length !== 1)) {
    throw Error(HEADER_ERROR);
  }
  if (version === '3' && (!backgroundToken || backgroundToken.length !== 2)) {
    throw Error(HEADER_ERROR);
  }

  const columns = Number(header[2]);
  const rows = Number(header[3]);
  const grid = [];
  const cellColors = [];

  if (columns < 1 || columns > 80 || rows < 1 || rows > 40) {
    throw Error('Dimensions must be 1–80 columns and 1–40 rows');
  }
  if (lines.length !== rows) {
    throw Error('Incorrect row count');
  }

  let glyphPattern = /^(--|[0-9a-f]{3})$/i;
  if (version === '2') {
    glyphPattern = /^(--|[0-9a-f]{3}):([0-9a-f])$/i;
  } else if (version === '3') {
    glyphPattern = /^(--|[0-9a-f]{3}):([0-9a-f]{2})$/i;
  }

  let background = defaultColors.background;
  if (version !== '1') {
    background = parseInt(backgroundToken, 16);
  }
  if (version === '3' && background > 120) {
    throw Error(TED_INK_ERROR);
  }

  for (const line of lines) {
    const tokens = line.split(' ');
    if (tokens.length !== columns) {
      throw Error('Incorrect column count');
    }
    for (const token of tokens) {
      const match = token.match(glyphPattern);
      if (!match) {
        if (version === '1') {
          throw Error('Invalid glyph ID');
        }
        if (version === '3') {
          throw Error('Use glyph:ink tokens, such as 0A0:50 or --:00');
        }
        throw Error('Use glyph:ink tokens, such as 0A0:F or --:0');
      }
      grid.push(match[1] === '--' ? '' : parseInt(match[1], 16));
      if (version === '1') {
        cellColors.push(defaultColors.ink);
      } else {
        const ink = parseInt(match[2], 16);
        if (version === '3' && ink > 120) {
          throw Error(TED_INK_ERROR);
        }
        cellColors.push(ink);
      }
    }
  }

  return {
    columns,
    rows,
    grid,
    cellColors,
    colors: {ink: defaultColors.ink, background},
  };
}
