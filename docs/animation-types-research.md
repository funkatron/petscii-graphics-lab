# New animation types — research (2026-11-16)

**Status:** Deep research in progress. Informs roadmap priority **#1** (new animation types). **C64/native follow-ups** are **#2**; **cross-editor UX/naming** is **#3** ([roadmap](roadmap.md)).

This document combines **in-repo inventory** with **external** demoscene and hardware references. Prototypes are candidates only until preview/export/C64 contracts are defined.

## Product gate — real hardware

**Owner stance (2026-11-16):** Effects that **won’t run on real Commodore hardware** (native PRG/D64 for the selected **Machine**, within existing memory/timing checks) are **not exciting as shipped product**. Browser-only previews, GIF/video-only tricks, and shader-only looks are fine for **spikes and research**, but they **do not graduate** to the Animation picker without a **credible native path**—including a [**player rewrite**](native-player-rewrite.md) when frame replay is not enough.

**Minimum bar to ship a new animation type**

1. Same sampled semantics as today’s exports (preview ≡ GIF ≡ native frames unless a procedural native path is documented).
2. **Native program** export passes ordinary readiness (or documented procedural profile) on **C64** at minimum; **TED / VDC** when the effect is machine-specific.
3. VICE PAL/NTSC spot-check for that effect; physical hardware stays on the roadmap checklist ([c64-output.md](c64-output.md)).

Spikes may stay behind a flag or in docs only until (2) is designed—not “ship browser, maybe native later.”

## Editor constraints (non‑negotiable)

| Constraint | Implication |
| --- | --- |
| **Character grid** | Effects move **whole glyphs** with per-cell inks; no sub-cell bitmap modes (FLI, half-FLI, etc.) on the canvas. |
| **Source artwork** | Preview and downloads sample **derived frames**; the user's grid is never mutated during play. |
| **Shared background** | One background ink per frame; backdrop animation walks that register on VIC/TED, not per-cell paper in native PRG. |
| **Loop closure** | Movement/color/backdrop cycles must align to **loop duration** and independent cycle counts (`ANIMATION_CYCLES`). |
| **Machines** | VIC, TED, and VDC paths differ for color counts and backdrop; new ids must validate in `project-validation.js`. |
| **C64 export** | Frame-stream player is tight; new types need a **native plan** up front (replay, procedural ops, or rewrite slice). No **GIF-only** animation types. |

Architecture: [`animation-frames.js`](../animation-frames.js) plans and samples frames; movement modules include [`solid-motion.js`](../solid-motion.js), [`space-warp.js`](../space-warp.js), [`depth-surfaces.js`](../depth-surfaces.js), [`bonfire.js`](../bonfire.js). See [architecture](architecture.md).

## Shipped inventory (repo)

### Movement / reveal (`MOTION_EFFECTS` in `project-validation.js`)

| UI label | Id(s) | Module / notes |
| --- | --- | --- |
| Still / Replay | `none`, `replay` | Grid-order or stroke-order reveal |
| Scroll | `scroll-x`, `scroll-y`, `scroll-diagonal` | Eight directions; see [diagonal movement](diagonal-movement.md) |
| Wave rows/columns | `wave`, `ripple` | Axis displacement + radial ripple |
| Sine scroller | `sine-scroll` | Diagonal travel; maintainer contract for bend |
| Parallax | `parallax` | Ink or glyph groups, spread 0–4 |
| Space warp, Perspective floor, Curved road, Tunnel flight | `DEPTH_EFFECTS` | [depth-effects.md](depth-effects.md) |
| Rotating cube, Spinning globe, Rolling drum | `SOLID_EFFECTS` | Texture on solids |
| Bouncing / Stretching logo, Starfield, Patterned wipe | `INTRO_MOTIONS` + `wipePattern` | Intro-style motion |

### Color (independent of movement)

`color-cycle`, `color-wave`, `color-glow`, `raster-bars`, `plasma`, `bonfire` (+ TED `plus4-*` ids). **`inverse`** pulse lives in color space.

### Backdrop (shared background paper)

`field` / `plus4-field` with ramps (cycle, wave, raster, plasma, bonfire, glow). **Shipped:** backdrop + **Parallax** as the newest spatial pair (roadmap).

## Other PETSCII editors

Cross-tool comparison (Petmate, Marq, Wizard, Krissz, Playscii, on-machine editors): [**PETSCII editors landscape**](petscii-editors-landscape.md). Prioritized **features and UI naming** to adopt: [**editor borrowings**](editor-borrowings.md). Use these when deciding UX (pan/zoom, char-only paint, guide conversion) vs differentiators (procedural animation, iPad, native player).

## External reference — what C64 demos actually do

Classic demos use **VIC-II tricks** that the browser editor does not emulate literally. The goal is **spirit and composition**, not cycle-exact hardware.

### Scrollers and “logo” motion

| Hardware / scene idea | Mechanism (external) | Editor analogue today | Gap |
| --- | --- | --- | --- |
| **Horizontal text scroller** | `$D016` fine scroll + screen RAM shift; [Codebase64 scroll text](https://codebase64.c64.org/doku.php?id=vic%3Ademo_programming) | **Scroll** (8 directions) | Fine sub-pixel scroll N/A; whole-cell steps |
| **DYCP / sine scroller** | Per-column Y offset via redefined chars; [Ojala DYCP](http://www.antimon.org/dl/c64/code/dycp.txt), [Code 198x summary](https://code198x.com/vault/techniques/dycp/) | **Sine scroller** | Per-column phase is simplified; not charset RAM rewrite |
| **DXYCP / FPP / “waving logo”** | Per-line or per-column Y placement; [Wikipedia VIC tricks](https://en.wikipedia.org/wiki/Commodore_64_demos) (FPP, Tec-Tec) | **Bouncing logo**, **Stretching logo** | No arbitrary per-line Y table |
| **Perspective / disco floor** | Charset perspective scrollers; [Codebase64 “discofloor”](https://codebase64.c64.org/doku.php?id=vic%3Ademo_programming) | **Perspective floor** (prototype) | Needs visual review per [depth-effects](depth-effects.md) |
| **Star Wars–style crawl** | Bit font + cyclic buffer; [Raistlin Papers](https://c64demo.com/category/effects/) | — | **Candidate:** faux 3D crawl on grid |

### Color and “raster” looks

| Hardware idea | Mechanism (external) | Editor analogue | Gap |
| --- | --- | --- | --- |
| **Raster bars** | IRQ + `$D020`/`$D021` per scanline; [Codebase64 rasterbars](https://codebase64.c64.org/doku.php?id=base%3Arasterbars_source), [C64 demo intro](https://odd.blog/wp-content/uploads/2008/01/intro-to-programming-c64-demos.html) | **Raster-style bars** (backdrop/cell color) | Bars are **ink animation**, not VIC border IRQ |
| **Plasma** | Color table in char mode or FLI; [Codebase64 plasma list](https://codebase64.c64.org/doku.php?id=vic%3Ademo_programming) | **Plasma field** | Char-grid approximation only |
| **FLI / copper / multi-color** | Bad-line timing, 4×4 blocks | — | Out of scope for editor canvas |

### Depth and space

| Hardware idea | Mechanism (external) | Editor analogue | Gap |
| --- | --- | --- | --- |
| **Starfield** | Sprites or ROL + `$D018`; [Codebase64 starfields](https://codebase64.c64.org/doku.php?id=vic%3Ademo_programming) | **Starfield** (3 depth layers from artwork) | Sprite multiplex N/A |
| **Parallax layers** | Multiple scroll speeds | **Parallax** (ink/glyph groups) | Only two effective speeds per group config |
| **3D objects / tunnels** | Bitmap or heavy charset CPU | **Space warp**, solids, tunnel/road | **Orbital field** deferred in [depth-effects](depth-effects.md) |

### Cracktro composition pattern

Typical intros combine **raster border**, **DYCP text**, **starfield**, **bouncing sprite logo**, fast **SID** ([example breakdown](https://github.com/dirien/c64-demo/blob/main/CLAUDE.md)). PETSCII Graphics Lab already covers the **visual** subset (no audio): starfield, sine scroller, raster/plasma, logos, parallax, backdrop. Missing pieces are mostly **combinations** and **stronger scroll/logo typography**, not one missing IRQ effect.

## Open items already tracked in-repo

| Topic | Doc / roadmap | Research note |
| --- | --- | --- |
| Diagonal **wave** / **wipe** | [diagonal-movement.md](diagonal-movement.md) | Separate from scroll; needs explicit ranking rules |
| **Sine scroller** validation | Roadmap “browser checks pending” | Close with iPad + export byte checks |
| **Perspective floor**, **Curved road**, **Tunnel flight** | [depth-effects.md](depth-effects.md) | Compare readability vs **Space warp**; keep or trim |
| **Orbital field** | depth-effects candidate #5 | Defer until simpler depth effects signed off |
| Demoscene reference pass | Roadmap unchecked bullets | This document satisfies the *research* slice; prototypes still TBD |

## Candidate prototypes (ranked for priority #1)

Scoring: **V** = visual payoff on PETSCII grid, **F** = fit with existing pipeline, **C** = **native hardware** feasibility on C64-class export (higher = easier). **Low C** = research or reject unless native/player design closes the gap **before** ship.

| Rank | Candidate | V | F | C | Rationale |
| --- | --- | --- | --- | --- | --- |
| **A** | **Finish depth review** (floor, road, tunnel) | High | High | Med | Already implemented; external “disco floor” / tunnel demos justify polish or cut ([Codebase64](https://codebase64.c64.org/doku.php?id=vic%3Ademo_programming)) |
| **A** | **Diagonal wave** | Med | Med | Med | Fills gap vs color-wave diagonals; design in [diagonal-movement](diagonal-movement.md) |
| **B** | **Diagonal wipe patterns** | Med | Med | High | Reveal order on diagonals; distinct from scroll |
| **B** | **Charset-style “vertical crawl”** (Star Wars–lite) | High | Low | Low | Inspired by [Raistlin Star Wars scroller](https://c64demo.com/category/effects/); needs new projection **and** native budget proof—deprioritize until C path exists |
| **B** | **Tec-Tec / horizontal wave on logo** | Med | Med | Med | Whole-grid sine on X per row; related to existing logo stretch |
| **C** | **Orbital field** | Med | Low | Low | depth-effects #5; after A-tier |
| **C** | **FLD-style row shear** | Low | Low | Low | Hardware row gap trick; poor fit for fixed grid |
| **—** | IRQ **true raster bars** | High on HW | — | — | **Shader track only** (no native scanline truth); **not** a shipped animation type—use **backdrop/raster-bars** for hardware |

**Backdrop + Parallax** are **shipped**; next *new type* work is unlikely to be another backdrop ramp. Focus: **movement/color variants** and **depth readability**.

## Algorithmic VIC tricks (feasibility)

Hardware scroll/VIC register tricks (DYCP, FLD, VSP, FLI, raster IRQ, and similar) are assessed separately in [**algorithmic VIC feasibility**](algorithmic-vic-feasibility.md): which belong on the **grid animation** track vs **screen look** vs **research only**.

**Short conclusion:** pursue **column-offset (DYCP-like)** and **FLD-style row gaps** only with a **native export story** (replay or [player rewrite](native-player-rewrite.md)); treat **VSP/AGSP/FLI** as poor fits; **true scanline raster bars** stay **screen look / shaders**, not product animation, because they do not map to char-mode PRG.

## Recommended sequence (research → build)

1. **Close validation debt** on shipped effects (sine scroller, bonfire iPad, depth performance on device) — overlaps priority **#2** but unblocks honest comparisons.
2. **Depth triage** — side-by-side GIFs on sparse vs dense PETSCII art; keep floor/road/tunnel or document “use Space warp instead.”
3. **Diagonal wave** — spec ranking in `animation-frames.js`; one Playwright export fixture.
4. **Diagonal wipe** — extend `WIPE_PATTERNS` or new pattern id with loop closure proof.
5. **Algorithmic motions** — **Column wave** and **Row blinds** are in the Movement menu (2026-11-17); procedural-v2 C64 PRGs cover movement-only exports ([column-wave-native.md](column-wave-native.md), [fld-blinds-native.md](fld-blinds-native.md)).
6. Green-field concepts (crawl, orbital) only when **C** score and native design are written first—not throwaway GIF demos.

Each step: update `MOTION_EFFECTS`, UI picker, `animationPlan` sample budget, Chromium + iPad WebKit specs, **VICE + native export** spot-check for the target machine.

## What we are not pursuing in this track

- Sprite multiplexing, side-border bitmap scroll, and **VSP/AGSP**-class display tricks (unsafe or wrong product model).
- **Full hardware DYCP** (per-frame charset redefinition) in the **browser grid**; native may approach it via [player rewrite](native-player-rewrite.md), not via bigger ZIP frames.
- Bitmap-only modes (FLI, SHIFLI) as editor canvas modes.
- Audio / SID (out of product scope).

## References (external)

| Source | URL | Use |
| --- | --- | --- |
| C64 demo programming (Codebase64) | https://codebase64.c64.org/doku.php?id=vic%3Ademo_programming | Effect taxonomy, scroll/plasma/starfield links |
| Intro to C64 demos (Livewire/ALS) | https://odd.blog/wp-content/uploads/2008/01/intro-to-programming-c64-demos.html | Raster bars, scrollers, char animation |
| Raster bar example (Codebase64) | https://codebase64.c64.org/doku.php?id=base%3Arasterbars_source | IRQ timing mental model |
| DYCP (Ojala) | http://www.antimon.org/dl/c64/code/dycp.txt | Sine scroller lineage |
| DYCP explained (Code 198x) | https://code198x.com/vault/techniques/dycp/ | Editor vs hardware gap |
| Raistlin Papers (effects) | https://c64demo.com/category/effects/ | Modern write-ups (crawl, bobs, DXYCP) |
| C64 demos (Wikipedia) | https://en.wikipedia.org/wiki/Commodore_64_demos | VSP, FLD, FPP, Tec-Tec names |
| Cracktro component list (example repo) | https://github.com/dirien/c64-demo/blob/main/CLAUDE.md | Typical intro layering |

## Internal cross-links

- [roadmap.md](roadmap.md) — priority order and checklist  
- [depth-effects.md](depth-effects.md) — depth candidate spec  
- [depth-performance.md](depth-performance.md) — browser cost baselines  
- [diagonal-movement.md](diagonal-movement.md) — scroll vs wave vs wipe  
- [c64-capacity.md](c64-capacity.md) — native player limits  
- [native-player-rewrite.md](native-player-rewrite.md) — when and how to replace frame replay  
- [maintainer-reference.md](maintainer-reference.md) — frame contracts and export behavior  