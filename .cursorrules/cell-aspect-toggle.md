# Cell aspect toggle (CRT proportion) — exploration brief

Captured 2026-11-14 from [Aspect ratio toggle design](8efa4177-9422-4bd3-b081-a8fbb4fbaf83). Write-up only; no implementation in that pass.

Related: `.cursorrules/c128-80col-research.md`, `docs/machine-modes.md` follow-up (non-square cells), `docs/roadmap.md`.

---

### 1. Current geometry map (fit / stage / exports)

**Stage layout**
- Shell: `.stage` → `#frame.canvas-frame` → `#canvas` (`styles/editor.css`).
- Frame is a flex-centered monitor well. Canvas CSS: `max-width/height: 100%`, `image-rendering: pixelated`.
- `ResizeObserver` on `#frame` → rAF → `fit()` (`index.html`). Sidebar collapse also re-`fit()`.

**`fit()` — forces square cells today**
- One `nextUnit` for both axes → CSS box and backing store are always **W:H in cells**, i.e. square cells.
- `AGENTS.md` still encodes this: maximize while preserving square cells.

**Editor paint already supports unequal cells**
- `renderGrid()` uses `cellW = canvas.width/W`, `cellH = canvas.height/H` and stretches 8×8 ROM bits into that quad. If `fit()` set a non-square canvas, glyphs would already look CRT-stretched; **no ROM rebake needed**.
- Glyph pickers / `#glyphPreview` stay square — correct (logical 8×8).

**Pointer hit-testing**
- `canvasCell()` in `pointer-stroke.js` maps by `rect.width/height` → cell indices. **Already aspect-safe**.

**Download preview / stills / GIF / video**
- `artworkPreview()`, `makeSvg()`, PNG, and `animationRaster()` all use **square** cell pixels today.
- Native PRG/D64 already match hardware geometry and **must not change** for this feature.

**Persistence today**
- Device: `petscii-workspace-prefs` → `{machine, palette}`. No aspect field.
- Project v3: optional `machine` / `palette`. No aspect field.

---

### 2. Recommended ratios by machine

Model: **full text screen fills ~4:3**, with logical 8×8 glyphs; only the **display cell quad** is anisotropic.

| Machine | Chip / text | Pixel matrix | Full-screen cell W:H | `cellAspect = W/H` |
| --- | --- | --- | --- | --- |
| C64, C128 40-col | VIC ~320×200 | 40×25 | **5∶6** | `5/6 ≈ 0.833` |
| Plus/4 | TED ~320×200 | 40×25 | **5∶6** | same |
| C128 80-col | VDC ~640×200 | 80×25 | **5∶12** | `5/12 ≈ 0.417` |

**Fit math (hardware mode):** treat each cell as `aw×ah` aspect units (VIC `5×6`, VDC `5×12`, square `1×1`):

`unit = min(availableW/(W·aw), availableH/(H·ah))`  
`cssW = round(W·aw·unit)`, `cssH = round(H·ah·unit)`.

Partial grids use the same per-machine cell aspect so cells match CRT look even when the canvas is not full-screen.

---

### 3. Toggle UX (recommended)

| Decision | Recommendation |
| --- | --- |
| **Name** | **Cell shape**: **Square cells** \| **CRT proportion** |
| **Location** | `#machineMenu` (system chrome with Machine / Display palette) |
| **Default** | **Square cells** (opt-in CRT; valuable especially at 80×25) |
| **Persistence** | Device pref in `petscii-workspace-prefs` (`cellAspect: 'square' \| 'crt'`). Not project JSON / undo. |
| **Machine coupling** | One toggle; ratio follows active Machine (VIC/TED → 5∶6, VDC → 5∶12). |
| **Exports** | **Phase A:** editor canvas only. **Phase B:** optional PNG/SVG/GIF/video match. Native tab always hardware-true, independent of toggle. |

---

### 4. Implementation sketch

1. `machine-modes.js` — `cellAspectUnits(machineId)`; prefs `cellAspect`.
2. `index.html` — control in `#machineMenu`; on change prefs + `fit()` + `redraw()`.
3. `fit()` — aspect-unit sizing; include aspect in `fittedGridKey`.
4. Phase A leave alone: `renderGrid`, `canvasCell`, atlas/ROM, native exporters, animation cell solvers, glyph picker tiles.
5. Phase B: nonuniform SVG/PNG/GIF cells; update download dimension captions.
6. Docs: `AGENTS.md` square-cells rule; roadmap / machine-modes follow-up.
7. Tests: units for ratios/prefs; fit helper ≈ 4∶3; Playwright CRT canvas aspect + unchanged PRG bytes.

**Must not change:** glyph IDs, native PRG/D64, cell inks/undo, index-space animation math.

---

### 5. Open questions for the owner

1. Default: Square (recommended) or CRT for new installs / only for `c128-80`?
2. Export scope: editor-only first, or PNG/SVG/GIF in the same PR?
3. Persistence: device-only (recommended) vs also a v3 project field?
4. Label: “CRT proportion” vs “Hardware aspect” vs “4∶3 cells”?
5. NTSC/PAL: single 4∶3 enough for v1?
6. Partial grids: always apply machine cell aspect (recommended)?
7. Summary chip: append `· CRT` when active?
8. OK to rewrite `AGENTS.md` square-cells rule in the implementation PR?

---

**Verdict:** Hard constraint is `fit()` (and square export paths). Painting and hit-testing already tolerate non-square cells. Put **Cell shape** in `#machineMenu`, device prefs, default square, **5∶6** (VIC/TED) and **5∶12** (VDC) for CRT mode.
