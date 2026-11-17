# Borrowing from other PETSCII editors — features and naming

**Status:** Research (2026-11-16). Owner is **open** to good ideas and **nomenclature changes** from Petmate, Wizard, Marq, Krissz, and on-machine tools—as long as [authenticity](https://github.com/funkatron/petscii-graphics-lab/blob/main/AGENTS.md) and the [**real-hardware product gate**](animation-types-research.md#product-gate--real-hardware) stay intact.

Context: [PETSCII editors landscape](petscii-editors-landscape.md). Implementation is **not** scheduled here; this is the agreed backlog for UX and naming.

---

## Borrowing rules

1. **Stable project ids** — JSON fields (`effect`, `colorEffect`, `backgroundEffect`) stay unless we ship a deliberate v4 break. UI labels and help text can change freely.
2. **Prefer familiar verbs** — *Paint, Fill, Frames, PRG, screen, charset* where they match community habit (Petmate/Wizard/Marq/CSDb).
3. **Disambiguate our differentiators** — Procedural **effect stacks** are not Wizard **cel frames**; say that in the UI once, not in every label.
4. **Hardware first** — Borrowed **animation** ideas must still reach **Native program** export (or stay research-only).

---

## Features worth adopting (prioritized)

### Tier A — high value, low–medium effort

| Feature | Where others do it | Why borrow | Native note | Suggested placement |
| --- | --- | --- | --- | --- |
| **Glyph-only / ink-only paint** | Petmate modes; Wizard **Shift** | Recolor without wiping glyphs; shade without changing shape—standard in every serious editor | Replay player unchanged | Drawing strip toggle or hold-modifier; mirror Wizard “char only / color only” in help |
| **Reference image overlay → grid** *(shipped: **Project → Reference image…**)* | Marq overlay **`T`** convert; Petmate guide PNG; Wizard JPG/PNG import | Fast onboarding; biggest gap vs competitors | Stills/animation via existing export once converted | Temporary overlay + **Apply as import**; not a v3 layer stack |
| **Line / rectangle / shape stroke** | Wizard toolbar | Expected web draw tools | Fill runs as undoable paint | New tools gated like Fill; integer grid endpoints |
| **Replace color / magic replace** | Wizard | Cleanup after import | Same as recolor + search | **Whole drawing color** area or fill variant |
| **Grid / guides toggle** | Petmate grid; our **Guides** partial | Users say “show grid” | N/A | Rename **Guides** → **Grid guides** or add explicit **Show grid** |
| **Pan + zoom language** | Petmate **Pan/Zoom tool** (`z`); Wizard **mouse wheel** | Sets expectations for stage-bar zoom + two-finger pan | N/A | Stage hint: “Pinch to pan · Zoom menu” |
| **Nudge whole canvas** | Wizard | Position art in safe title-safe zone | Native centering already | Resize/placement staging (small translate before apply) |
| **Text entry mode** | Petmate; Wizard | Typography without per-cell tapping | Text export already | Roadmap typing; borrow **type on canvas** flow |
| **Cel frame strip (optional)** | Wizard frame bar; Petmate screens | Users think “animation = frames”; we can offer **bake to procedural** or **export frame ZIP** as the bridge | Frame ZIP + PRG today; cel editor is adjunct | **Animation** section: “Timeline” disclosure listing derived key times—not replacing effect engine |
| **Scroller export profile label** | Petmate 9 widescreen/vertical **scroller PRG** | Names what people search for | Map to our **Scroll** + native program | Download help: “horizontal scroller” when `scroll-x` + PRG |

### Tier B — good ideas, higher cost or design risk

| Feature | Source | Fit | Hold reason |
| --- | --- | --- | --- |
| **Quarter-block / ¼-char mode** | Wizard quad; TBoard | Finer detail | Breaks “one glyph per cell” unless virtual 2×2 subgrid + format change |
| **Flicker / per-char rainbow** | Marq; Kaleidoscope | Demoscene look | Needs native timing proof; overlaps color-wave |
| **Dir art mode** | Marq; Petmate D64 dir | Niche export | Separate canvas preset 20×10 or similar |
| **Clipboard strip** | Marq | Power-user paste | iPad clipboard + glyph picker may be enough first |
| **Ultimate 64 push/import** | Petmate 9 | Hardware bridge | Niche vs GitHub Pages + manual PRG |
| **Smooth infinite zoom** | Playscii | Art-tool feel | We cap at integer zoom for grid alignment—optional “loupe” only in help |
| **Sprite table** | Krissz | HW-accurate sprites | Out of PETSCII grid scope unless future sprite layer |

### Tier C — document only / defer

- **Layers** (Playscii, Advanced Art Editor): conflicts with single-grid v3 unless new project schema.
- **Custom charset editor** (Marq): we use ROM SVG atlas; mixed-bank export is the supported escape hatch.
- **SID / music** (Petmate 9): out of product scope.

---

## Nomenclature — mapping and recommendations

Community habit varies: **PETSCII**, **chars**, **screen codes**, **color RAM**. Our docs already separate [screen code vs PETSCII vs atlas ID](maintainer-reference.md); the UI can meet users where they arrive.

### Drawing and colors

| Other editors say | We say today | Recommendation |
| --- | --- | --- |
| **Color** (Petmate/Wizard) | **Ink** | **Keep Ink** in UI (per-cell foreground is precise). Add help alias: *“Ink = character color (color RAM on C64).”* |
| **Background** / **paper** | **Background** (brush) | **Keep**; gloss: *screen background ($D021)* vs **Backdrop** (animated paper). |
| **Char** / **character** | **Glyphs** | **Keep Glyphs** in picker (atlas-driven). Help: *“Glyphs are the drawable character shapes (charset).”* |
| **Color only / char only** | (missing) | New control label: **Paint mode: Both · Glyph only · Ink only** (ids unchanged). |
| **Stamp** | Paint with selected glyph | Optional synonym in help only. |
| **Replace / magic replace** | Recolor entire drawing / pick | **Replace ink…** for magic-replace when implemented. |

### Canvas and project

| Other editors say | We say today | Recommendation |
| --- | --- | --- |
| **Screen** (Petmate multi-screen) | One grid per project | If cel UI lands: **Screen** or **Frame** for a stored key pose—not “Machine screen”. |
| **Canvas size** | **Canvas setup** | **Canvas size** matches Wizard/Marq (rename fieldset legend if we touch sidebar). |
| **Center on screen** | Help text | Use **Center on TV screen** in native export help (Petmate habit). |
| **Grid on/off** | **Guides** | **Show grid** checkbox label + keep center guides as sub-option. |

### Animation (largest vocabulary gap)

| Other editors say | We say today | Recommendation |
| --- | --- | --- |
| **Frames**, **frame bar**, **ms delay** | **Loop duration**, **Movement / reveal**, **Color animation** | Add one-line primer: *“Effects (below) generate frames automatically—you don’t draw each frame by hand.”* Optional secondary: **Loop (seconds)** showing computed ms. |
| **Replay** / play drawing | **Replay drawing** | **Keep**—unique and accurate. |
| **Scroll** / **scroller** | **Scroll** (direction sub-menu) | In picker: group label **Scroll (8 directions)**; export help **Scroller PRG**. |
| **DYCP** / **sine scroller** | **Sine scroller** | **Keep Sine scroller** in UI; help links DYCP as hardware cousin. Future column-wave: **Column wave (DYCP-style)**. |
| **Raster bars** | **Raster-style bars** | **Keep honest qualifier** unless native IRQ backdrop ships. |
| **Plasma** | **Plasma field** | Shorten to **Plasma** if we want Wizard parity (id `plasma` unchanged). |
| **Rainbow** | **Rainbow wave** | Either is fine; **Rainbow wave** clarifies it’s not backdrop. |
| **Inverse** | **Inverse pulse** (under color) | Help: *“Swap normal ↔ inverse glyphs (hardware reverse).”* |
| **Movement** | **Movement / reveal** | Consider **Motion** or **Movement** alone; move “reveal” to **Replay** only—reduces slash noise. |
| **Background animation** | **Backdrop** section + **Background** select | Rename select to **Backdrop effect** (value `field` unchanged) to avoid clash with brush **Background**. |

### Export and machine

| Other editors say | We say today | Recommendation |
| --- | --- | --- |
| **PRG**, **.prg**, **program** | **Native program** tab | Tab: **Native program (PRG)** or machine-aware **Run on C64 (PRG)** when Machine=C64. |
| **D64**, **disk** | **Disk image (.d64)** | **Keep** explicit extension. |
| **Display palette** | **Display palette** | **Keep**—already aligned with emulators. |
| **Charset** / **mixed case** | Mixed-bank / RAM charset in help | Export errors: use **custom charset (RAM)**—Petmate/Marq wording. |
| **VIC border** | **Border lead** (backdrop) | Glossary entry: *Border ($D020) vs background ($D021)* (Krissz-style tutor in help). |
| **40×25** | Dimensions in stage bar | Add **Screen size** next to dimensions for Marq users. |

### Renames worth doing (when we touch UI)

| Change | Rationale | Risk |
| --- | --- | --- |
| **Movement / reveal** → **Movement** | Petmate/Wizard use “animation type” lists; “reveal” is only **Replay** | Low—one label |
| **Backdrop** select **Background** → **Backdrop effect** | Stops confusion with color **Background** | Low |
| **Native program** → **Native program (PRG)** | Searchability; CSDb habit | Low |
| **Download artwork** → keep | Wizard “Export”; our name is clearer for non-code users | — |
| **Character options → Show glyph codes** → add **(hex screen codes)** | Marq devs think in hex | Help only |

### Keep deliberately different

| Our term | Why not mirror others |
| --- | --- |
| **PETSCII Graphics Lab** | Product identity |
| **Atlas / glyph ID** in files | Technical accuracy vs loose “char number” |
| **Loop duration** + **cycles per loop** | Finer than Wizard ms-per-frame; teaches demoscene loop closure |
| **Machine** menu | We ship C128 40/80, Plus/4—not Wizard’s “profile clears canvas” |
| **Effect stack** (movement + color + backdrop) | Stronger than single-frame strip; document, don’t dumb down |

---

## Suggested help sidebar additions

Shipped: **Animation glossary** disclosure in ☰ → **Animation** (above **About replay & speed**). Earlier sketch:

Short **Glossary** block (or expand **About replay & speed**):

1. **Glyph, ink, background** — cell contents vs shared screen paper.  
2. **Backdrop** — animates empty-cell paper and border on VIC/TED native export.  
3. **Native program** — runnable PRG/D64; same frames as GIF when export succeeds.  
4. **From other editors** — one row each: Petmate screens ≈ our effect timeline, not separate files; Wizard Shift ≈ planned glyph-only/ink-only.

---

## Roadmap hooks

**This document is roadmap priority #3.** Checklist: [Cross-editor UX and naming](roadmap.md#cross-editor-ux-and-naming--priority-3).

| Borrowing item | Tie to roadmap / issues |
| --- | --- |
| Glyph-only / ink-only | **#3** Tier A; Playwright paint assertions |
| Reference import | **#3** Tier A; overlaps **#5** import pipeline |
| Line/rect/fill tools | **#3** Tier B → **#5** drawing tools ([AGENTS.md](../AGENTS.md) future) |
| Nomenclature pass | **#3** + **#4** iPad validation; update [README](../README.md) + [ui-review](ui-review.md) |
| Cel timeline UI | **#3** Tier B optional; must not imply GIF-only export |
| Scroller PRG labeling | **#3** Tier A; [c64-output.md](c64-output.md) + download tab copy |

---

## Internal links

- [petscii-editors-landscape.md](petscii-editors-landscape.md) — tool-by-tool survey  
- [animation-types-research.md](animation-types-research.md) — effect priorities  
- [ui-review.md](ui-review.md) — control placement principles  
- [native-player-rewrite.md](native-player-rewrite.md) — when exports need new player ops  