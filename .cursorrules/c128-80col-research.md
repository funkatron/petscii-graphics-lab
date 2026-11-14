# C128 80-column (VDC) research — future plan input

Captured 2026-11-13 from research agent. No implementation yet.

## Verdict

Phase A: **editor-only 80×25** with RGBI inks and existing C64 glyph atlas.  
Phase B: still native player (`$1C01` → force 80-col → ML VDC paint).  
Phase C: delta animation stream (handshake-costed), then mixed-bank charset.

## Hardware (short)

- VDC 8563/8568 private RAM; CPU via `$D600` ready + `$D601` data.
- Default text: screen ~`$0000`, attrs ~`$0800`, charset ~`$2000` (16 bytes/glyph with pad). Confirm via regs 12/13 and 20/21 at runtime.
- Attr byte: bit7 alt charset, bit6 reverse, bit5 underline, bit4 blink, bits3–0 **RGBI** FG. Background is global.
- No VDC char ROM — KERNAL copies VIC patterns. Reuse C64 atlas for drawing.
- Full-frame writes are slow → deltas matter more than on VIC. 16K VDC ≈ little spare after charset; stream lives in main RAM.

## Editor / product

- Today hard-capped at 40 cols (`index.html`, `project-validation.js`, `text-grid.js`, VIC export).
- Prefer machine **`c128-80`** (or `c128` + `display:'vdc'`) with RGBI palette — not Pepto indices.
- 40↔80 switch: confirm + crop/pad + VIC↔RGBI remap.
- Inverse: export prefers attr bit6; dual bank via attr bit7.

## Playback

- Force 80-col in stub (`GRAPHIC 5` / ML); don’t rely on user 40/80 key.
- VICE: `x128 -80col`, assert VDC not VIC; pin VICE ≥ 3.7; needs C128 ROMs.
- STOP: owner choice — stay 80-col vs `GRAPHIC 0`.

## Owner questions (open)

1. Machine id shape (`c128-80` vs display flag)?
2. Native RGBI drawing (recommended) vs VIC translate?
3. Blink/underline in editor, or reverse-only?
4. STOP restore policy?
5. Editor-only first vs still-player same milestone?

## Sources

Wikipedia 8563/8568; fightingcomputers C128 asm part 3; c64-wiki.de VDC; VDCScreenEditor2; cc65 `c128-vdc.s`; C128 System Guide App. I; VICE `-80col`.
