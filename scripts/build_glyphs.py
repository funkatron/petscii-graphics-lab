#!/usr/bin/env python3
"""Convert a user-supplied character ROM into an SVG glyph sheet.

The input binary is never copied into the repository. Each symbol is an exact
8x8 vector drawing, using one rectangle per contiguous horizontal pixel run.

C64: pass characters.901225-01.bin (default output assets/c64-glyphs.svg).
That file is 4 KB: bank 0 (uppercase/graphics) then bank 1 (lowercase/upper).

Plus/4 TED: the kernal chargen image is only 2 KB at offset 0x1000 ($D000).
The first 1 KB is the uppercase/graphics set; the second 1 KB is the
lowercase/uppercase set (C=/Shift case switch / $FF13 half-page). Use
--machine ted so each bank’s codes 128–255 are synthesized as hardware
inverses of 0–127 (default TED text mode with $FF07 bit7 clear). Do not
extract 4 KB from the kernal — bytes past the 2 KB chargen are KERNAL code.
"""
import argparse
import hashlib
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('rom', type=Path)
parser.add_argument('--machine', choices=('c64', 'ted'), default='c64')
parser.add_argument('--kernal-offset', type=lambda s: int(s, 0), default=None,
                    help='When set, read the machine-sized chargen from this offset')
parser.add_argument('--output', type=Path, default=None)
args = parser.parse_args()

raw = args.rom.read_bytes()
chargen_bytes = 2048 if args.machine == 'ted' else 4096

if args.kernal_offset is not None:
    end = args.kernal_offset + chargen_bytes
    if end > len(raw):
        parser.error(f'kernal offset + {chargen_bytes} exceeds file size')
    source = bytes(raw[args.kernal_offset:end])
    source_note = f'{args.rom.name} offset {args.kernal_offset:#x} ({chargen_bytes} bytes)'
else:
    if len(raw) != chargen_bytes:
        parser.error(
            f'Expected exactly {chargen_bytes} bytes for --machine {args.machine} '
            '(or pass --kernal-offset)'
        )
    source = bytes(raw)
    source_note = args.rom.name

source_sha = hashlib.sha256(source).hexdigest()

prefix = 'c64'
title = 'C64 character glyphs: uppercase/graphics then lowercase/uppercase'
if args.machine == 'ted':
    prefix = 'ted'
    title = 'Plus/4 TED character glyphs: uppercase/graphics then lowercase/uppercase'
    # TED ROM is 2 KB: two 1 KB case sets. Expand each to 256 codes via hardware XOR.
    data = bytearray(4096)
    for bank in range(2):
        low = source[bank * 1024:(bank + 1) * 1024]
        base = bank * 2048
        data[base:base + 1024] = low
        for code in range(128):
            for row in range(8):
                data[base + (code + 128) * 8 + row] = low[code * 8 + row] ^ 0xFF
else:
    data = bytearray(source)

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
print(f'Source SHA-256: {source_sha}')
print(f'Display SHA-256: {display_sha}')
