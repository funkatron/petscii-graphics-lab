# Application-like UI IA — exploration brief

Captured 2026-11-14 from [Explore app-like UI IA](58188467-b446-4556-93db-7a38757a5bd6). Write-up only; no implementation in that pass.

**Branch at capture:** `feature/c128-80col-vdc`  
**Sources:** `index.html`, `docs/ui-review.md`, `docs/machine-modes.md`, `README.md`, `AGENTS.md`, `docs/roadmap.md`, `styles/editor.css`, `styles/shell.css`

Do **not** fold IA chrome changes into the C128 80-col feature PR. Keep strip permanence and one-action Download sacred (`docs/ui-review.md`).

---

### 1. Current structure map

#### Chrome regions (top → bottom)

```text
┌─ header ─────────────────────────────────────────────────────────┐
│ #toggle ☰ │ .app-title (h1) │ #machineMenu │ #projectMenu │ │
│ #saveStatus │ #downloadOpen │ #quickPlay ▶ │
└──────────────────────────────────────────────────────────────────┘
┌─ .drawing-strip (persistent toolbar) ────────────────────────────┐
│ #glyphToggle │ #inkQuick → #inkPopover │ #paint #erase │ │
│ #tool-* (fill/line/rect/select/text, JS-injected) │ .recovery-group #undo #redo │
└──────────────────────────────────────────────────────────────────┘
┌─ .selection-dock (contextual; reserved then reclaimed) ──────────┐
│ Move / Duplicate / Delete / Deselect / Cancel │
└──────────────────────────────────────────────────────────────────┘
┌─ .layout ────────────────────────────────────────────────────────┐
│ #sidebar │ main.stage │
│ #canvasDetails │ .stagebar (#dimensions #stageCanvasView #status) │
│ #colorDetails │ #previewBanner + #returnDrawing │
│ #animationDetails│ #frame #canvas │
│ #helpDetails │ #stageHint / saveFailure / export cancel │
│ │ (+ #glyphPicker docked or overlay) │
└──────────────────────────────────────────────────────────────────┘
<dialog #downloadDialog> … </dialog>
```

#### Inventory by surface

| Surface | Selectors / contents | Semantic layer today |
| --- | --- | --- |
| **Header** | `#toggle`, `#machineMenu` (`#workspaceMachine`, `#workspacePalette`), `#projectMenu` (New / name / Save|Share / Open project / Open text grid), `#saveStatus`, `#downloadOpen`, `#quickPlay` | Mixed: system + project + export + editor play |
| **Drawing strip** | Glyphs, Ink popover, Paint/Eraser, injected tools, Symmetry, Tap endpoints, Undo/Redo | Editor / tools (correct) |
| **Selection dock** | Move/Duplicate/Delete/Deselect/Cancel | Transient editor chrome (correct) |
| **Sidebar** (`aria-label="Drawing tools"`) | `#canvasDetails` (size, whole-drawing actions), `#colorDetails` (ink/bg/swap/recolor), `#animationDetails` (timeline/movement/color), `#helpDetails` | Mostly editor/project-doc settings; mislabeled as “drawing tools” |
| **Glyph picker** | `#glyphPicker`, `#palette`, filters, `#glyphOptions` (codes = device pref) | Editor + one device preference buried in Character options |
| **Download dialog** | Image / Animation / Native program tabs; raw bytes & **Import text** under `#rawDataDetails` | Output (correct) + document import (mismatch) |
| **Stage** | Dimensions, status, preview banner, canvas | Editor focus surface (correct) |

#### Docs already say (and mostly match)

From `docs/ui-review.md` “Where controls belong” and `docs/machine-modes.md`:

- Header: Project, save status, Download, Play — **plus Machine** (shipped later; docs updated).
- Strip: glyph, ink, tools, symmetry, undo/redo — permanent.
- Sidebar: canvas, colors, animation, help.
- Download: separate panel; one action per format.
- Machine + Display palette: **app-level**, peer to Project, not buried in Colors.

#### Mismatches vs “application-like” outer→inner IA

1. **Header is a flat peer row**, not layered. System (`#machineMenu`), project (`#projectMenu`, `#saveStatus`), and editor/output (`#downloadOpen`, `#quickPlay`) sit as equals. On narrow viewports (`styles/editor.css` ≤600/800px) title shrinks, `#saveStatus` hides, labels compress — crowding without hierarchy.
2. **`#sidebar` aria-label says “Drawing tools”** while real tools live in `.drawing-strip`. Sidebar is document/setup/animation chrome.
3. **Machine is dual-citizen:** device prefs (`petscii-workspace-prefs`) *and* optional v3 `machine`/`palette` fields. UI copy says “Application setting”; project open remaps/restores machine. Owner framing wants “system”; persistence is hybrid.
4. **Colors split is good for ink reach, muddy for “system palette”:** strip `#inkQuick` / `#inkPopover` = brush; sidebar `#colorDetails` = ink+background+recolor; Display palette stays in Machine (correct) but Colors help points there — users may hunt “palette” in the wrong place.
5. **Project name** (`#projectFilename`) is session export preference, not in v3 file — weak “project options” semantics next to New/Open/Save.
6. **Download vs Project** are deliberately separated (ui-review win) but still **header peers**, so “two save buttons” confusion remains possible.
7. **Import text** lives inside `#downloadDialog` → `#rawDataDetails`, while **Open text grid** is under Project — same family of document ops, two homes.
8. **Play** is header-quick; full animation authorship is sidebar-only — correct for reach, but animation feels like a second app bolted into settings rather than an editor mode/panel.
9. **Raskin follow-ups already fixed mode friction** (idempotent Paint/Eraser, anchored ink, preview-disabled tools). IA work should not undo strip permanence or those rules.

---

### 2. Proposed information architecture

#### Hierarchy (owner framing)

| Layer | Purpose | Survives projects? | Lives in |
| --- | --- | --- | --- |
| **System / application** | Host computer, RGB presentation, future global prefs (glyph codes, pin state, theme-if-ever) | Device (and optionally seed New Project) | Outer chrome / prefs |
| **Project** | Document lifecycle: New, Open, Save/Share, name, autosave status, load text grid | Project file + autosave draft | Header project cluster |
| **Editor / drawing** | Brush, glyphs, colors-for-cells, canvas size, tools, undo, animation setup, export of *artwork outputs* | Project (drawing state) | Strip + stage + sidebar/panels |
| **Transient / modal** | Download artwork, contextual help, ink popover, glyph overlay, resize draft, text dock | No (session UI) | Dialogs / popovers / banners |

#### Suggested chrome sketch

```text
┌─ SYSTEM ──────────┐ ┌─ PROJECT ─────────────────────┐ ┌─ EDITOR QUICK ──┐
│ Machine · Palette │ │ Project ▾ name? Saved… │ │ Download ▶ │
└───────────────────┘ └───────────────────────────────┘ └─────────────────┘
┌─ EDITOR TOOLS (always) ────────────────────────────────────────────────────┐
│ Glyphs Ink [tools…] Symmetry Undo/Redo │
└────────────────────────────────────────────────────────────────────────────┘
┌─ EDITOR PANELS (☰) ──────────────┬─ STAGE (attention) ─────────────────────┐
│ Canvas · Colors · Animation · Help│ canvas + preview banner │
└──────────────────────────────────┴─────────────────────────────────────────┘
 [modal] Download artwork [popover] Ink [panel] Glyphs
```

#### Layer rules (proposed)

- **System controls never paint cells** (Display palette already doesn’t; Machine switches may remap with confirm — still “host”, not brush).
- **Project controls operate on the whole document**, not the current stroke.
- **Editor controls change brush, grid, or derived preview**; Download produces *outputs*, not editable backup.
- **Modals** for multi-step choice with preview (download, maybe future prefs); **always-visible** for stroke loop (strip).

---

### 3. Placement recommendations

| Cluster | Recommend | Why (layer) | Mobile / sidebar implications |
| --- | --- | --- | --- |
| **Machine** (`#machineMenu`, `#workspaceMachine`) | **Keep** in header as leftmost app control after ☰/title; visually group as System | Host computer + chrome; `docs/machine-modes.md` locked | On phone, keep summary chip (`C64 · Pepto`); avoid burying in sidebar |
| **Display palette** (`#workspacePalette`, `#displayPaletteField`) | **Keep** inside Machine menu; **do not** move into `#colorDetails` | RGB presentation ≠ cell ink; Colors already confuse brush vs background | Hide/disable for TED/VDC as today; sidebar Colors only references it |
| **Project** (`#projectMenu`) | **Keep** header; optionally **split visual group** from Machine (spacer / “Project” cluster) | Document lifecycle | Menu already scrolls (`.project-menu` max-height); don’t move New/Open into sidebar |
| **Autosave status** (`#saveStatus`) | **Keep** with Project; on narrow, prefer icon/dot over full hide-without-status | Project health | Today `#saveStatus{display:none}` ≤800px — consider compact “Saved”/alert only |
| **Project name** (`#projectFilename`) | **Keep** under Project for now; product question whether it becomes real project metadata | Export naming vs document identity | Stay in menu; don’t put in strip |
| **Download** (`#downloadOpen` → `#downloadDialog`) | **Keep** header peer to Project *as separate action*; optionally relabel cluster “Share / Export” vs Project “File” | Artwork *output* ≠ editable backup (ui-review) | Dialog stays modal; don’t fold into Project menu |
| **Play** (`#quickPlay` + `#animationPlay`) | **Keep** header ▶ for preview; settings stay in `#animationDetails` | Preview is frequent; authorship is deep | Mirror disabled/pressed state carefully; don’t require sidebar open to pause |
| **Drawing strip** | **Keep permanent**; do not migrate tools into sidebar | ui-review / AGENTS / Raskin: attention on canvas | Labels already collapse ≤800px; preserve accessible names |
| **Canvas setup** (`#canvasDetails`) | **Keep** in sidebar; treat as editor document geometry | Size/actions are whole-drawing edits, not system | Portrait: start closed (already); keep staged `#resizeDraft` |
| **Colors** (`#colorDetails`) | **Keep** sidebar for Background / Swap / Recolor; **Ink primary path stays strip** | Split brush (frequent) vs paper/recolor (less frequent) | Avoid forcing settings open for ink (already fixed) |
| **Animation** (`#animationDetails`) | **Keep** in sidebar for now; consider later “Animation” as editor subpanel, not system | Project/editor derived frames; not prefs | Grouping Timeline / Movement / Color already good; `#editAnimation` from download is a good cross-link |
| **Glyphs** (`#glyphToggle` / `#glyphPicker`) | **Keep** strip entry + independent panel | Editor brush material | Pin on wide; overlay on small; never nest in sidebar scroll |
| **Help** (`#helpDetails` + `#contextHelp`) | **Keep** sidebar stub thin; prefer heading `?` popovers | Transient guidance | Don’t grow sidebar Help into a second README |
| **Import text** (inside download `#rawDataDetails`) | **Move or split** long-term → Project or Canvas/Colors-adjacent “Import” | Document replace ≠ download | Short-term: leave + add Project cross-link; avoid two silent importers |

---

### 4. Open product questions

1. **Is Machine truly system-global, or per-project with a device default?** Today both: prefs seed New/fresh sessions; v3 stores `machine`/`palette`; Undo restores machine. Which mental model should the UI teach?
2. **Should Display palette ever be per-project-only** (no device memory), so “opening someone else’s file” never changes the user’s preferred Pepto/VICE for new work?
3. **Should Download stay a header peer to Project**, or become Project → “Export artwork…” while keeping one-tap `#downloadOpen` as a shortcut?
4. **Is project name a first-class project field** (persist in JSON / autosave) or forever a session export preference sitting oddly in `#projectMenu`?
5. **Should Animation be a mode** (Draw | Preview) with sticky chrome, or remain “sidebar settings + header Play” forever? (ui-review: avoid mandatory Draw/Animate tabs — still decide soft mode vs panels.)
6. **Where does Background color “belong” conceptually** — Colors sidebar only, or a second chip near Ink on the strip for parity with paper/ink thinking?
7. **Should whole-drawing actions** (Border / Checker / Clear / Recolor) stay buried in disclosures, or get a rare “Edit → …” menu so Canvas/Colors stay brush-focused?
8. **Import consolidation:** one “Open / Import” surface for project JSON, text grid, and paste-import — or keep Open under Project and paste under Download forever?
9. **Phone compact hierarchy:** when header wraps, what is the **cut order** — hide title first, collapse Machine to icon, overflow Project into ☰, keep Download+Play+strip?
10. **Future prefs** (glyph codes, pin, tap-endpoints default): dedicated System/Prefs menu, or remain scattered device toggles (`#showGlyphCodes`, `#glyphPin`)?

---

### 5. Phased approach (low-risk IA PRs)

Respect ui-review: **canvas attention first**; strip permanence; no mandatory Draw/Animate tabs; navigation alone must not mutate artwork.

| Phase | PR focus | Risk | Notes |
| --- | --- | --- | --- |
| **0 — Docs only** | Update “Where controls belong” + README “Find a control” with System / Project / Editor / Modal layers; align `#sidebar` language | Very low | No behavior change; unblocks consensus |
| **1 — Header grouping (CSS/DOM order only)** | Visual clusters: `[☰ title] [Machine] | [Project + saveStatus] | [Download] [Play]`; aria landmarks/`role="group"` labels | Low | No ID renames if possible; Playwright header smoke |
| **2 — Sidebar rename + section order** | `aria-label` → “Editor settings” (or similar); order Canvas → Colors → Animation → Help; clarify Colors vs Machine Display palette in `#colorsHelp` | Low | Copy + a11y; no control moves |
| **3 — Import discoverability** | Cross-link Open text grid ↔ download paste import; optional “Import” legend under Project without removing download disclosure yet | Low–med | Behavior preserved; reduces wrong-home friction |
| **4 — Narrow header compact status** | Replace full hide of `#saveStatus` with compact indicator; overflow menu only if needed | Med | Phone/iPad layouts; roadmap phone UI follow-ups |
| **5 — Optional Animation “Edit” affordance** | Stronger path from `#quickPlay` / preview banner into `#animationDetails` without new tabs | Med | Keeps single canvas; improves mode clarity |
| **6 — Structural moves (only after answers)** | e.g. Import out of download; Background chip; Prefs menu; persist project name | Higher | Needs product answers from §4 |

Avoid early: merging Download into Project; moving Machine into Colors; putting strip tools into sidebar; baking bezel into exports.

---

### 6. Out of scope / do not

- **Do not** remove or hide the persistent `.drawing-strip` behind settings.
- **Do not** collapse “Download artwork” into multiple Generate/Save steps — keep **one action per format** (`#downloadDialog` model).
- **Do not** conflate Machine **UI chrome** (`data-ui-theme` / `applyMachineChrome`) with **artwork RGB** in PNG/SVG/GIF (machine-modes contract).
- **Do not** bury Machine / Display palette in `#colorDetails` or Animation.
- **Do not** add mandatory Draw/Animate workspace tabs (ui-review explicit).
- **Do not** nest `#palette` scroll inside `#sidebar` scroll (AGENTS.md).
- **Do not** move Undo/Redo off the strip into sidebar history panels.
- **Do not** treat Display palette changes as undoable artwork edits (already: cells unchanged).
- **Do not** bake READY banners / bezels into downloads as part of IA cleanup.
- **Do not** implement this brief in the same PR as C128 80-col behavior/export work — IA chrome PRs should stay separable for review.

---

### Verdict

The app is already **mostly** application-like where it matters for drawing (strip + stage + modal download + header Machine/Project). The main gap is **header flatness and mixed semantics** (system/project/export/play as peers), a **mislabeled sidebar**, and a few **cross-layer orphans** (import-in-download, session-only project name, hybrid Machine persistence). Lowest-risk win: **document + visually group layers** before moving controls; keep strip and download model sacred.
