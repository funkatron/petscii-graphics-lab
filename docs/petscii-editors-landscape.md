# Other PETSCII editors — landscape and relevance (2026-11-16)

**Status:** Research for roadmap priority **#1** and product positioning. Complements [animation types research](animation-types-research.md) and [algorithmic VIC feasibility](algorithmic-vic-feasibility.md).

This is not a competitive scorecard; it records **how other tools work** so we can borrow workflows and avoid reinventing wheels. URLs were checked via public pages and Marq’s 2016 overview ([PETSCII editors: an overview](https://www.kameli.net/marq/?p=4365)).

---

## Spectrum: “authentic C64” vs “retro styled”

| Pole | Meaning | Examples |
| --- | --- | --- |
| **Authentic** | Screen codes, color RAM limits, real charsets, PRG output | FieserWolf on C64, Petmate, Marq PETSCII, **PETSCII Graphics Lab** |
| **Retro styled** | PETSCII-like but relaxed limits, layers, arbitrary fonts | Playscii, early EDSCII |
| **Hybrid web** | C64 profile + modern UX | PETSCII Wizard, Krissz editor, lvllvl |

**Graphics Lab** position: **authentic glyphs and machine modes** (C64 / C128 / Plus/4 / VDC) with a **browser-first** editor and **procedural animation** not found in classic frame-strip tools.

---

## Cross-development editors (most relevant)

### Petmate / Petmate 9 (desktop)

| | |
| --- | --- |
| **Links** | [Petmate 0.8.x](https://nurpax.github.io/petmate/), [Petmate 9 notes](https://wbochar.com/petmate9/), [keyboard map](https://github.com/wbochar/petmate9/blob/main/_notes/keyboard.md) |
| **Runtime** | Local app (Win/macOS/Linux); offline |
| **Canvas** | 40×25 default; multiple **screens** (frames) with per-screen undo |
| **Drawing** | Split modes: **char+color**, **color only**, **char only**; brush stamp; pan/zoom tool (`z`); text; grid toggle |
| **Animation** | **Frame timeline**; GIF export (64-frame bug fixed 0.8.1); Petmate 9 adds **animation PRG**, widescreen/vertical **scroller** exports, SID |
| **Hardware** | Petmate 9: **Ultimate 64** push/import, D64 preview, VDC/TED blink/underline |
| **Import/export** | `.petmate`, `.c`, PNG (pixel-match ROM), PRG, assembler, dir art D64, JSON framebufs |
| **Notable gaps vs Lab** | Few **in-editor procedural** motion effects; scrollers are **export templates**, not live wave/starfield preview |

**Takeaways for us:** pan/zoom as a **tool** (we use stage-bar zoom + two-finger pan); **char-only / ink-only** strokes (we have fill/pick modes but not modifier-split paint); **Ultimate** workflow is unmatched—our strength is **GitHub Pages + iPad** and **shared animation engine**.

### Marq’s PETSCII / Vent fork (desktop Java)

| | |
| --- | --- |
| **Links** | [Marq PETSCII](https://www.kameli.net/marq/?page_id=2717), [Vent fork](https://ventti.github.io/petscii/), [CSDb](https://csdb.dk/release/?id=197619) |
| **Runtime** | Java/Processing; tablet mode added |
| **Targets** | C64, **flicker mode**, dir art, PET 40/80, Plus/4, VIC-20 |
| **Drawing** | Clipboard strip; flood fill; **smart flip/rotate** on PETSCII shapes; reference **overlay + convert** (`T`) |
| **Animation** | **Rudimentary** multi-frame; **no standalone anim PRG** historically |
| **Export** | Native `.c`; PRG stills; `.PET`; backup autosave |

**Takeaways:** **Reference overlay → PETSCII** is a proven onboarding path (we have PNG/SVG export, not photo→grid import at Petmate/Wizard level). **Dir art** and **flicker** are niche modes we do not ship.

### PETSCII Wizard (browser)

| | |
| --- | --- |
| **Links** | [App](https://petscii-wizard.c64online.com/), [v1.0 announcement](https://c64online.com/petscii-wizard-v1-0-new-multiplatform-online-editor-for-c64-plus-4-pet-and-and-vic-20/) |
| **Runtime** | Browser; C64Online stack |
| **Targets** | C64, Plus/4, VIC-20, PET — **profile switch clears canvas** |
| **Drawing** | Full toolbar: line/rect/**circle**, **quad 1/4 block**, fill, stamp, magic replace, nudge whole canvas; **Shift** char-only / color-only |
| **Animation** | **Frame bar**: new/dup/cut, thumbnails, **ms speed**, play/stop — **cel animation**, not procedural |
| **Import** | Strong **JPG/PNG → PETSCII** with brightness/contrast/saturation and charset restrictions |
| **Export** | `.c`, PNG, raw `.txt` / memory dumps |

**Takeaways:** **Mouse wheel zoom** and **quad mode** are user expectations on web; our **zoom** is editor-scale not sub-char quad. **Frame-strip animation** is simpler mentally than our **effect stacks**—worth better UX glue, not replacing the engine.

### Krissz PETSCII Editor (browser)

| | |
| --- | --- |
| **Link** | [petscii.krissz.hu](https://petscii.krissz.hu/) |
| **Focus** | Typing-first; **VIC register** labels (border/background/multicolor); sprite animator; screen animation |
| **Animation** | **Sprite table** + ping-pong; separate from screen grid |
| **Import** | Decimal/hex bytes, CBM .prg Studio paste |

**Takeaways:** Teaches **hardware register mental model**; we hide that behind **Machine / palette** but could surface border/bg more in help.

### Playscii (desktop, successor to EDSCII)

| | |
| --- | --- |
| **Links** | [Marq overview](https://www.kameli.net/marq/?p=4365), [EDSCII thread](https://forums.tigsource.com/index.php?topic=26264.0) |
| **Philosophy** | **Not strict C64**; block-matching image conversion, **layers**, **smooth zoom**, animation frames, “game mode” |
| **Takeaways** | **Layers** and **smooth zoom** are the main UX gaps vs us if we target “digital art tool” feel without breaking authenticity |

### lvllvl (browser)

| | |
| --- | --- |
| **Link** | [lvllvl on C64Online](https://c64online.com/lvllvl-now-available-on-c64online-create-petscii-art-anywhere/) |
| **Notes** | Tile/level oriented PETSCII art; less documentation publicly |

---

## On-machine editors (hardware)

Summarized from [Marq’s overview](https://www.kameli.net/marq/?p=4365):

| Tool | Era | Notable mechanics |
| --- | --- | --- |
| **Petscii Editor 4.6** (FieserWolf) | C64 | Pages, copy/paste, recolor; **scene standard** for real-hardware art |
| **TBoard-Painter** | C64 | **1/4 char** mode; tall canvases |
| **Tyronpaint** | C64 | 1/4 dots; height &gt; 25 |
| **Kaleidoscope / Kaleidoscope Reloaded** | C64 | Rainbow mode (per-char color cycle) |
| **Digital Paint, PETSCII Paint** | C64 | Basic paint/fill |

**Takeaways:** **Quarter-cell** drawing and **tall screens** appear repeatedly; we support **resize** and **full screen 40×25** but not **sub-cell quads** in the glyph grid. **Page-based** animation on hardware maps to our **frame strip** competitors, not effect timelines.

---

## Feature comparison (high level)

| Capability | Graphics Lab | Petmate 9 | Wizard | Marq | Playscii |
| --- | --- | --- | --- | --- | --- |
| Browser / iPad | **Yes** | No | Yes | No | No |
| Touch painting | **Yes** | No | Mouse | Partial tablet | No |
| Machine modes (TED/VDC) | **Yes** | **Yes** | Profiles | **Yes** | Loose |
| ROM-accurate glyph render | **SVG atlas** | ROM match | Charset | ROM | Custom |
| Procedural animation | **Rich** | Export scrollers | No | Minimal | ? |
| Cel frame animation | Preview timelines | **Yes** | **Yes** | Basic | **Yes** |
| C64 PRG/D64 player | **Yes** | **Yes** | No | Stills | No |
| Photo → PETSCII | No | **Yes** (guide) | **Yes** | **Ref convert** | **Yes** |
| Pan / zoom while draw | **Yes** | **Yes** | **Wheel** | No | **Smooth** |
| Layers | No | No | No | No | **Yes** |

---

## What is reasonable to adopt (research → roadmap)

| Idea | Source | Fit for Lab | Effort |
| --- | --- | --- | --- |
| **Char-only / ink-only modifiers** | Wizard, Petmate | High UX win; matches shift-modifiers on desktop | Low–medium |
| **Guide image overlay + convert** | Marq, Petmate 9 | High for newcomers; overlaps roadmap import | Medium (accuracy) |
| **Frame strip + procedural** hybrid | Wizard + our engine | Clarify UI: “cells” vs “effects” | Medium design |
| **Quarter-block / quad draw mode** | Wizard, TBoard | Conflicts with **integer glyph grid** unless virtual 2×2 subgrid | High / maybe out of scope |
| **Scroller as export profile** | Petmate 9 | We already scroll in preview; **name** native export paths | Low doc + export labels |
| **Hardware register tutor** | Krissz | Help sidebar only | Low |
| **Layers** | Playscii, C64 AAE | Conflicts with **single-grid v3** unless new format | High — defer |
| **Ultimate 64 live port** | Petmate 9 | Niche hardware bridge | Low priority vs web |

---

## Gaps we already fill (stay the course)

1. **Single editor** for drawing, **multi-effect animation**, GIF/video, and **native C64** from one project.  
2. **iPad-first** interaction (continuous paint, two-finger pan, stage-bar zoom).  
3. **Documented** PETSCII vs screen code vs atlas ID discipline.  
4. **Regression tests** on preview = export (most tools rely on manual VICE check).

---

## External bibliography

| Resource | URL |
| --- | --- |
| Marq — editor overview (2016) | https://www.kameli.net/marq/?p=4365 |
| Marq — PETSCII editor | https://www.kameli.net/marq/?page_id=2717 |
| Petmate | https://nurpax.github.io/petmate/ |
| Petmate 9 / wbochar | https://wbochar.com/petmate9/ |
| PETSCII Wizard | https://petscii-wizard.c64online.com/ |
| Krissz editor | https://petscii.krissz.hu/ |
| C64-Wiki Marq | https://www.c64-wiki.com/wiki/Marq%27s_PETSCII_editor |
| EDSCII / Playscii context | https://forums.tigsource.com/index.php?topic=26264.0 |

## Internal links

- [roadmap.md](roadmap.md)  
- [animation-types-research.md](animation-types-research.md)  
- [README.md](../README.md) — current user-facing scope  