/** Maximum `.txt` grid file size for Project → Open text grid (bytes). */
export const TEXT_GRID_MAX_BYTES = 65536;

const HEADER_PATTERN = /^# PETSCII-GLYPHS ([12]) (\d+) (\d+)(?: ([0-9a-f]))?$/i;

function hexGlyphId(value) {
  return value.toString(16).toUpperCase();
}

function hexNibble(value) {
  return value.toString(16).toUpperCase();
}

/**
 * Format the current grid as a PETSCII-GLYPHS v1 or v2 text document.
 */
export function formatTextGrid({columns, rows, grid, cellColors, colors, includeColors}) {
  const header = includeColors
    ? `# PETSCII-GLYPHS 2 ${columns} ${rows} ${hexNibble(colors.background)}`
    : `# PETSCII-GLYPHS 1 ${columns} ${rows}`;

  const body = Array.from({length: rows}, (_, row) => {
    const start = row * columns;
    const tokens = grid.slice(start, start + columns).map((glyph, column) => {
      const glyphToken = glyph === '' ? '--' : hexGlyphId(glyph).padStart(3, '0');
      if (!includeColors) {
        return glyphToken;
      }
      const ink = cellColors[start + column];
      return `${glyphToken}:${hexNibble(ink)}`;
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
    throw Error('Use PETSCII-GLYPHS 1, or version 2 with a background ink');
  }
  const versionColored = header[1] === '2';
  const hasBackground = Boolean(header[4]);
  if (versionColored !== hasBackground) {
    throw Error('Use PETSCII-GLYPHS 1, or version 2 with a background ink');
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

  const glyphPattern = versionColored
    ? /^(--|[0-9a-f]{3}):([0-9a-f])$/i
  : /^(--|[0-9a-f]{3})$/i;

  for (const line of lines) {
    const tokens = line.split(' ');
    if (tokens.length !== columns) {
      throw Error('Incorrect column count');
    }
    for (const token of tokens) {
      const match = token.match(glyphPattern);
      if (!match) {
        throw Error(versionColored
          ? 'Use glyph:ink tokens, such as 0A0:F or --:0'
          : 'Invalid glyph ID');
      }
      grid.push(match[1] === '--' ? '' : parseInt(match[1], 16));
      if (versionColored) {
        cellColors.push(parseInt(match[2], 16));
      } else {
        cellColors.push(defaultColors.ink);
      }
    }
  }

  const colors = {
    ink: defaultColors.ink,
    background: versionColored ? parseInt(header[4], 16) : defaultColors.background,
  };

  return {columns, rows, grid, cellColors, colors};
}
