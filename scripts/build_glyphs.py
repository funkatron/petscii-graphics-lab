#!/usr/bin/env python3
"""Convert a user-supplied 4 KB C64 character ROM into an SVG glyph sheet.

The input binary is never copied into the repository. Each symbol is an exact
8x8 vector drawing, using one rectangle per contiguous horizontal pixel run.
"""
import argparse
import hashlib
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('rom', type=Path)
parser.add_argument('--output', type=Path, default=Path('assets/c64-glyphs.svg'))
args = parser.parse_args()
data = args.rom.read_bytes()
if len(data) != 4096:
    parser.error('Expected exactly 4096 bytes')
parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 256" width="512" height="1024" shape-rendering="crispEdges">',
    '<title>C64 character glyphs: uppercase/graphics then lowercase/uppercase</title>',
    '<desc>Two banks of 256 screen-code glyphs, including inverse slots. Each symbol has an 8 by 8 viewBox. Source SHA-256: '+hashlib.sha256(data).hexdigest()+'</desc>',
    '<defs>',
]
for bank in range(2):
    for code in range(256):
        parts.append(f'<symbol id="c64-{bank}-{code}" viewBox="0 0 8 8">')
        for y, row in enumerate(data[bank*2048+code*8:bank*2048+code*8+8]):
            x = 0
            while x < 8:
                if row & (128 >> x):
                    start = x
                    while x < 8 and row & (128 >> x):
                        x += 1
                    parts.append(f'<rect x="{start}" y="{y}" width="{x-start}" height="1"/>')
                else:
                    x += 1
        parts.append('</symbol>')
parts.extend(['</defs>', '<rect width="128" height="256" fill="white"/>', '<g fill="black">'])
for bank in range(2):
    for code in range(256):
        parts.append(f'<use href="#c64-{bank}-{code}" x="{code%16*8}" y="{(bank*16+code//16)*8}" width="8" height="8"/>')
parts.extend(['</g>', '</svg>'])
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text('\n'.join(parts)+'\n')
print(f'Wrote 512 SVG symbols to {args.output}')
