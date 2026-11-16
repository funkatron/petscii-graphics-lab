# Algorithmic VIC-II tricks — feasibility for PETSCII Graphics Lab

**Status:** Research (2026-11-16). Companion to [animation types research](animation-types-research.md). Answers whether classic **hardware algorithmic** demo tricks are reasonable in a **browser character-grid editor** with optional **C64 PRG/D64** export.

## How to read this document

| Rating | Meaning |
| --- | --- |
| **Grid animation** | New or extended **movement/color** effect via `animation-frames.js` (derived cell/ink arrays). |
| **Screen look** | Fits [canvas shaders](roadmap.md#canvas-shaders--exploration) / `screen-look.js` post-process, not glyph motion. |
| **Research only** | Worth a spike, doc, or fixture; no product promise. |
| **Poor fit** | Conflicts with product model or cost; document and stop. |

References are **external** unless noted.

---

## Product model (reminder)

1. User art = **W × H** cells, numeric glyph IDs + per-cell ink + one background.
2. Animation = **derived frames**; source grid unchanged.
3. Preview and raster exports (PNG/GIF/video/ZIP) should match; SVG/PRG/D64 stay **clean** or use **authentic screen semantics**.
4. Native player has **byte and CPU budgets** ([c64-capacity.md](c64-capacity.md)).

Hardware tricks that **move the display window without updating screen RAM** (VSP, linecrunch, FLD) have **no literal equivalent** on a canvas—we can only **fake the appearance** by shifting which cells we draw.

---

## Technique assessments

### Fine horizontal / vertical scroll (`$D016`, `$D011` Y-scroll)

| | |
| --- | --- |
| **Hardware** | 0–7 pixel scroll within a char; screen RAM shift at wrap ([demo intro scroller](https://odd.blog/wp-content/uploads/2008/01/intro-to-programming-c64-demos.html)). |
| **Shipped** | **Scroll** moves whole cells per frame; no sub-pixel phase. |
| **Grid animation** | **Reasonable (medium).** Interpolate scroll with a **phase 0–1** per motion cycle: sample floor/ceil cell sources or render at higher internal resolution then snap—tradeoff between smoothness and export pixel lock. |
| **C64 export** | Fine scroll on real hardware is **register-only**; today’s exporter writes **screen memory** (quantized). A [**procedural player**](native-player-rewrite.md) can tweak scroll regs between occasional RAM shifts. |
| **Verdict** | **Research spike:** sub-cell scroll phase for browser preview; document that PRG stays cell-quantized. |

### DYCP / DXYCP / FPP / Tec-Tec (per-column or per-line Y)

| | |
| --- | --- |
| **Hardware** | Redefine charset or plot into char RAM each frame; per-letter sine ([Ojala DYCP](http://www.antimon.org/dl/c64/code/dycp.txt), [Code 198x](https://code198x.com/vault/techniques/dycp/)); FPP places any char **line** at any Y ([Wikipedia](https://en.wikipedia.org/wiki/Commodore_64_demos)). |
| **Shipped** | **Sine scroller** (path-based), **Bouncing/Stretching logo** (global transforms). |
| **Grid animation** | **Reasonable (medium–high) for editor; hard for C64.** A **per-column offset table** (max ±few cells) on each frame is faithful to DYCP *visually* on our grid. Cost: `W × H` remap each sample; dense art collides. **DXYCP** (2D offsets) explodes combinatorics. |
| **C64 export** | Real DYCP is **charset CPU**; our player emits **screen codes**. Could emit **only changed cells** if offsets small, but worst case ≈ full screen updates every frame → **capacity** risk. |
| **Verdict** | **Best algorithmic target:** “column wave” or “row Tec-Tec” effect with bounded amplitude and loop closure. Prototype in browser first; native optional with warnings. |

### FLD — flexible line distance

| | |
| --- | --- |
| **Hardware** | Delay badlines via `$D011` Y-scroll; gaps of N raster lines between **character rows** without moving RAM ([Codebase64 FLD](https://codebase64.c64.org/doku.php?id=base%3Afld), [Code 198x](https://code198x.com/vault/techniques/fld/), [MOS 6567 §3.14.2](https://janklingel.de/wordpress/wp-content/uploads/2020/08/MOS-6567_6569-Video-Interface-Controller.pdf)). |
| **Shipped** | Nothing equivalent. |
| **Grid animation** | **Reasonable (high) as stylized effect.** Insert **empty rows** (background) between logical rows whose count follows a wave/table—**Venetian blind** opening. Not pixel-accurate FLD; row insert/remove changes effective `H` in derived frames only (do not resize project grid). |
| **C64 export** | Could map to **vertical spacing** only if we animate **row pointers** in player (complex). Easier as **browser/GIF-only** or insert blank screen-code rows in native (bandwidth heavy). |
| **Verdict** | **Strong research prototype:** “FLD blinds” reveal. Good synergy with **Patterned wipe**. |

### VSP, linecrunch, AGSP

| | |
| --- | --- |
| **Hardware** | Late badline write shifts VC counter horizontally ([VSP](https://code198x.com/vault/techniques/vsp/)); early badline end **crunches** rows ([AGSP](https://code198x.com/vault/techniques/agsp/)); combined = move screen with little RAM copy ([Codebase64 AGSP](https://codebase64.net/doku.php?id=base%3Aagsp_any_given_screen_position)). |
| **Shipped** | **Scroll** + **Parallax** approximate layered motion, not pointer fraud. |
| **Grid animation** | **Poor fit as “authentic” trick.** Visually similar to **translating the whole derived grid** with optional **top garbage rows** (blanked)—which users experience as scroll, not magic. |
| **C64 export** | **Not reasonable** to emulate VSP even with a rewrite (IRQ + VC fraud); stays research-only. |
| **Verdict** | **Research only:** document in help as “what scroll already approximates.” Optional **easter-egg** top-blank band in preview is low value. |

### Raster bars / IRQ colour per scanline

| | |
| --- | --- |
| **Hardware** | Change border/background per raster line via stable IRQ ([Codebase64 rasterbars](https://codebase64.c64.org/doku.php?id=base%3Arasterbars_source)). |
| **Shipped** | **Raster-style bars** animates **inks/background** on the grid; **Backdrop** field ramps. |
| **Grid animation** | **Poor fit** per scanline on a **40×25 cell** canvas (cells are 8×8 logical pixels tall in export). |
| **Screen look** | **Reasonable (high).** Post-process in `screen-look.js` or future shader pass: draw horizontal colour bands on **rasterized canvas**, export in PNG/GIF/video only ([roadmap shaders](roadmap.md#canvas-shaders--exploration)). |
| **C64 export** | IRQ border/background ramps are feasible in a [**procedural player**](native-player-rewrite.md) for **backdrop-only** motion; still not per-scanline cell ink. |
| **Verdict** | Split: **animation track = backdrop bars**; **shader track = true scanline bars**. |

### FLI / half-FLI / FPP timing / “every line is a badline”

| | |
| --- | --- |
| **Hardware** | Force badline every line; swap screen bank; 8×1 colour cells; FLI bug columns ([Codebase64 FLI](https://codebase.c64.org/doku.php?id=base%3Afli), [C64-Wiki](https://www.c64-wiki.de/wiki/FLI), [vertical tweaks](https://codebase64.c64.org/doku.php?id=base%3Aintroduction_to_vertical_tweaks)). |
| **Shipped** | Nothing; editor is **not** 320×200 bitmap. |
| **Grid animation** | **Poor fit** — wrong coordinate system (sub-char colour clash). |
| **Screen look** | **Research only** if we ever render **high-res bitmap export** of canvas; not PETSCII-native. |
| **Verdict** | **Cite in research**; **do not** port FLI to cell editor. |

### Sprite starfield / multiplex / sideborder scroll

| | |
| --- | --- |
| **Hardware** | Sprites, multiplex ([Codebase64 starfields](https://codebase64.c64.org/doku.php?id=vic%3Ademo_programming)), border tricks ([Raistlin sideborder scroller](https://c64demo.com/category/effects/)). |
| **Shipped** | **Starfield** from **occupied cells** as objects (3 layers). |
| **Grid animation** | **Reasonable** to extend star count / depth curves; **multiplex** is irrelevant (we are not sprite-limited). Sideborder = **wider virtual grid** pan (expensive, research). |
| **C64 export** | Sprite paths need **sprite player** (absent). Starfield as **screen codes** is what we do now. |
| **Verdict** | Improve **Starfield** algorithmically before new hardware metaphors. |

### Realtime charset animation (“animate the ROM”)

| | |
| --- | --- |
| **Hardware** | Rewrite `$D000`–`$DFFF` patterns each frame for water/shimmer ([demo intro](https://odd.blog/wp-content/uploads/2008/01/intro-to-programming-c64-demos.html)). |
| **Shipped** | Static SVG glyph atlas; **no** per-frame glyph reshape. |
| **Grid animation** | **Poor fit** — would break **glyph ID authenticity** unless limited to **oscillating between two inverse partners** already in atlas. |
| **Verdict** | **Poor fit** except inverse/partner oscillation (partially **inverse pulse** in color space). |

### Linecrunch / open borders / DDMA

| | |
| --- | --- |
| **Hardware** | Timing-critical, often unstable on some C64s ([VSP memory risk](https://code198x.com/vault/techniques/vsp/)). |
| **Verdict** | **Out of scope** for browser editor and for safe native export story. |

---

## Summary matrix

| Technique | Grid animation | Screen look | C64 native | Overall |
| --- | --- | --- | --- | --- |
| Fine scroll (8-step) | Medium | — | Low | **Research** sub-cell phase |
| DYCP / column-wave | **High** | — | Medium | **Top prototype candidate** |
| FLD / row gaps | **High** | — | Low | **Strong visual prototype** |
| Tec-Tec row shear | Medium | — | Medium | Second wave after column |
| VSP / AGSP | Low | — | Poor | Document only |
| Raster IRQ bars | Low | **High** | Separate tool | Shader priority |
| FLI / AFLI | Poor | Research | Poor | **Reject** for PETSCII grid |
| Charset morph | Poor | — | Poor | **Reject** |
| Starfield++ | Medium | — | Medium | Incremental |

---

## Recommended research spikes (ordered)

1. **Column-offset scroller (DYCP-like)** — sine table per column, bounded amplitude, loop closure proof, Playwright pixel fixture; compare to existing **Sine scroller**.
2. **FLD blinds** — insert dynamic blank rows in derived frames; pair with **Wipe** for reveal.
3. **Sub-cell scroll phase** — optional `scrollPhase` 0–7 for cardinal scroll only; measure export drift vs preview.
4. **Scanline raster bars** — prototype in **Screen look** (shader track), not animation track.
5. **Spike doc only:** VSP/AGSP “explain like scroll” for help text.

Each spike: max one week of agent time, feature flag or hidden effect id, no project migration until validated.

---

## External references

| Topic | URL |
| --- | --- |
| VIC demo programming index | https://codebase64.c64.org/doku.php?id=vic%3Ademo_programming |
| FLD | https://codebase64.c64.org/doku.php?id=base%3Afld |
| FLI / vertical tweaks | https://codebase64.c64.org/doku.php?id=base%3Afli , https://codebase64.c64.org/doku.php?id=base%3Aintroduction_to_vertical_tweaks |
| VSP, FLD, AGSP (Code 198x) | https://code198x.com/vault/techniques/ |
| DYCP (Ojala) | http://www.antimon.org/dl/c64/code/dycp.txt |
| AGSP example | https://codebase64.net/doku.php?id=base%3Aagsp_any_given_screen_position |
| MOS 6567 raster / FLD | https://janklingel.de/wordpress/wp-content/uploads/2020/08/MOS-6567_6569-Video-Interface-Controller.pdf |
| Effect essays (Raistlin) | https://c64demo.com/category/effects/ |
| C64 demo tricks survey | https://en.wikipedia.org/wiki/Commodore_64_demos |

## Internal links

- [animation-types-research.md](animation-types-research.md) — ranked product candidates  
- [diagonal-movement.md](diagonal-movement.md) — scroll vs wave vs wipe  
- [depth-effects.md](depth-effects.md) — projection effects  
- [c64-capacity.md](c64-capacity.md) — native limits  
- [native-player-rewrite.md](native-player-rewrite.md) — procedural export path  