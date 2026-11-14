#!/usr/bin/env python3
"""Convert a user-supplied 4 KB character ROM into an SVG glyph sheet.

The input binary is never copied into the repository. Each symbol is an exact
8x8 vector drawing, using one rectangle per contiguous horizontal pixel run.

C64: pass characters.901225-01.bin (default output assets/c64-glyphs.svg).

Plus/4 TED: extract 4 KB from a 16 KB kernal dump at offset 0x1000 ($D000 image),
e.g. kernal.318005-05.bin. Use --machine ted so codes 128–255 are synthesized as
hardware inverses of 0–127 (default TED text mode with $FF07 bit7 clear). The raw
ROM high half is not a soft-inverse table and must not be drawn as-is.
"""
import argparse
import hashlib
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('rom', type=Path)
parser.add_argument('--machine', choices=('c64', 'ted'), default='c64')
parser.add_argument('--kernal-offset', type=lambda s: int(s, 0), default=None,
                    help='When set, read 4096 bytes from this offset inside a larger dump')
parser.add_argument('--output', type=Path, default=None)
args = parser.parse_args()

raw = args.rom.read_bytes()
if args.kernal_offset is not None:
    end = args.kernal_offset + 4096
    if end > len(raw):
        parser.error('kernal offset + 4096 exceeds file size')
    data = bytearray(raw[args.kernal_offset:end])
    source_note = f'{args.rom.name} offset {args.kernal_offset:#x}'
else:
    if len(raw) != 4096:
        parser.error('Expected exactly 4096 bytes (or pass --kernal-offset)')
    data = bytearray(raw)
    source_note = args.rom.name

source_sha = hashlib.sha256(bytes(data)).hexdigest()

prefix = 'c64'
title = 'C64 character glyphs: uppercase/graphics then lowercase/uppercase'
if args.machine == 'ted':
    prefix = 'ted'
    title = 'Plus/4 TED character glyphs: uppercase/graphics then lowercase/uppercase'
    # Default TED text mode uses hardware reverse for screen codes 128–255.
    for bank in range(2):
        base = bank * 2048
        for code in range(128):
            for row in range(8):
                data[base + (code + 128) * 8 + row] = data[base + code * 8 + row] ^ 0xFF

display_sha = hashlib.sha256(bytes(data)).hexdigest()
output = args.output
if output is None:
    output = Path('assets/ted-glyphs.svg' if args.machine == 'ted' else 'assets/c64-glyphs.svg')

desc = (
    f'Two banks of 256 screen-code glyphs, including inverse slots. '
    f'Each symbol has an 8 by 8 viewBox. Source ({source_note}) SHA-256: {source_sha}'
)
if args.machine == 'ted':
    desc += (
        f'. Display atlas uses hardware-inverse high halves; SHA-256: {display_sha}'
    )

parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 256" width="512" height="1024" shape-rendering="crispEdges">',
    f'<title>{title}</title>',
    f'<desc>{desc}</desc>',
    '<defs>',
]
for bank in range(2):
    for code in range(256):
        parts.append(f'<symbol id="{prefix}-{bank}-{code}" viewBox="0 0 8 8">')
        for y, row in enumerate(data[bank * 2048 + code * 8:bank * 2048 + code * 8 + 8]):
            x = 0
            while x < 8:
                if row & (128 >> x):
                    start = x
                    while x < 8 and row & (128 >> x):
                        x += 1
                    parts.append(f'<rect x="{start}" y="{y}" width="{x - start}" height="1"/>')
                else:
                    x += 1
        parts.append('</symbol>')
parts.extend(['</defs>', '<rect width="128" height="256" fill="white"/>', '<g fill="black">'])
for bank in range(2):
    for code in range(256):
        parts.append(
            f'<use href="#{prefix}-{bank}-{code}" x="{code % 16 * 8}" '
            f'y="{(bank * 16 + code // 16) * 8}" width="8" height="8"/>'
        )
parts.extend(['</g>', '</svg>'])
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text('\n'.join(parts) + '\n')
print(f'Wrote 512 SVG symbols to {output}')
