# Native player rewrite — scope and options

**Status:** Research / owner decision (2026-11-16).  
**Owner:** Player rewrite is **explicitly on the table** when new animation work needs authentic VIC behavior on real hardware—not blocked by fear of touching `c64-export.js`.

This note sits beside [animation types research](animation-types-research.md) and [algorithmic VIC feasibility](algorithmic-vic-feasibility.md). It does **not** schedule implementation; it records what a rewrite would unlock and how to phase it without breaking shipped exports.

## What ships today

| Piece | Role |
| --- | --- |
| [`c64-export.js`](../c64-export.js) (plus C128/VDC/Plus/4 siblings) | Emits BASIC stub + generated 6502 **player** + **byte stream** of frame updates |
| [`buildNativeExportFrames`](../index.html) | Samples the same derived frames as GIF/video/ZIP |
| Renderers | **Paired** glyph+ink dictionary, **generic** changed runs, optional **native-rows** compiler |

The player is a **frame replay engine**: each clock tick it applies screen/color (and charset) **writes** compiled from pre-sampled grids. It does **not**:

- Tweak `$D016` / `$D011` for fine scroll without rewriting screen RAM
- Run stable per-scanline IRQ for border/background ramps tied to raster position
- Perform VSP/AGSP-style VC pointer tricks
- Execute DYCP-class **charset CPU** per column on the fly

That design is correct for “what you drew, sampled every N ms” and it fits bank-0 budgets ([c64-output.md](c64-output.md), [c64-capacity.md](c64-capacity.md)). It is the wrong long-term home for **algorithmic** demo tricks that are cheap on hardware but expensive as full-frame diffs.

## Why consider a rewrite now

Priority **#1** prototypes (column-offset waves, FLD-style blinds, optional sub-cell scroll phase) are **cheap in the browser** via `animation-frames.js` but **expensive or approximated** when every sample becomes literal screen writes on a C64.

| Effect class | Browser (derived frames) | Today’s native export | After plausible rewrite |
| --- | --- | --- | --- |
| Dense movement/color combo | Fine | Often fits paired/generic; timing risk on big updates | Same path retained |
| Column-offset / Tec-Tec | Fine | Full-screen or huge runs → **capacity/timing** | **Table-driven** remap or charset path |
| Fine scroll phase 0–7 | Fine | Quantized to whole cells | **Register + occasional** RAM shift |
| Backdrop raster (VIC) | Matte + block cells | Block + color RAM updates | Optional **IRQ** on border/background only |
| VSP / AGSP | Poor grid fit | Not attempted | Still **out of product scope** (unsafe / display fraud) |

**Owner intent (2026-11-16):** Pursue browser prototypes first; when native parity matters for a shipped effect, **design a second player generation** rather than endlessly compressing frame streams.

## Design directions (not a mandate)

### 1. Hybrid export (recommended default)

Keep the **current stream player** as renderer `replay` for arbitrary artwork and legacy downloads. Add a **procedural profile** selected when export analysis proves replay is oversized or over budget:

- **Snapshot once:** initial screen, color RAM, optional RAM charset, placement, loop ticks, repetition count (unchanged UX).
- **Emit descriptors:** small typed records (e.g. `SCROLL_PHASE`, `COLUMN_Y[]`, `ROW_GAP[]`, `COLOR_CYCLE`, `BACKDROP_IRQ`) interpreted by a **new 6502 core**.
- **Readiness:** Separate CPU model for IRQ paths vs copy loops; stricter VICE tests per descriptor type.

Existing PRGs stay byte-identical; new effects opt in per animation id.

### 2. Modular player core

Split generated code into:

- **Runtime** (fixed, versioned, testable in VICE once)
- **Data** (tables + optional compressed artifact region)

Reduces codegen churn in `c64-export.js` and mirrors how demotools ship a stable IRQ stub + tables.

### 3. Machine matrix

| Machine | Rewrite pressure | Notes |
| --- | --- | --- |
| C64 / C128 40-col VIC | Highest | IRQ, `$D016`, color RAM |
| C128 80-col VDC | Medium | Different timing; procedural value is lower |
| Plus/4 TED | Medium | TED attrs + TED backdrop; no VIC IRQ story |

Plus/4 and VDC must keep **replay fallback** even if VIC procedural path ships.

### 4. Non-goals (even with rewrite)

- FLI/SHIFLI/bitmap canvas modes
- VSP/AGSP as user-facing animation types
- Sprite multiplex starfields as native requirement (screen-code starfield stays valid)
- Breaking RUN/STOP exit, D64 packaging, or bank-0 default budgets without explicit opt-in

## Suggested phasing

1. **Browser:** Ship DYCP-like column wave and/or FLD blinds in derived frames (priority #1 spikes).
2. **Export analysis:** Extend diagnostics with “would procedural profile fit?” (table sizes, worst IRQ cost)—no 6502 yet.
3. **VIC runtime v2 spike:** One effect (e.g. cardinal scroll + `scrollPhase`, or shared-background IRQ ramp only) behind `renderer: procedural-v2` in tests only.
4. **Productize:** Wire UI warnings when replay exceeds threshold and procedural path is available.
5. **Capacity track:** REU / C128 bank-1 ([roadmap](roadmap.md)) remains **optional**; procedural tables may reduce need for extra RAM.

## Testing bar (same as today, stricter per path)

- Playwright: export bytes + still frames unchanged for replay path
- Unit: descriptor encoding round-trips
- VICE: PAL/NTSC for each new procedural opcode; physical hardware spot-check before claiming parity
- Do **not** drop paired/generic/native-rows tests until procedural path covers their workloads

## Cross-links

- [algorithmic-vic-feasibility.md](algorithmic-vic-feasibility.md) — per-trick ratings  
- [maintainer-reference.md](maintainer-reference.md) — current player contracts  
- [petscii-editors-landscape.md](petscii-editors-landscape.md) — competitors rarely ship native players; rewrite is a differentiator