# Work slice queue (owner order)

One slice is planned, approved, implemented, and merged before the next begins. **Current:** [owner-program-queue.md](owner-program-queue.md) phase **1b** (validation debt), then **#1 prep**, then **#7** modularization.

| # | Track | Slice | Status |
| ---: | --- | --- | --- |
| 1 | Tier B drawing | **1a** Magic replace (ink + glyph) | **Merged** (v0.35.5) |
| 1 | | **1a′** Canvas toolbar panel | **Merged** (v0.35.6+) |
| 1 | | **1b** Grid labeling + derived-frame summary | **Merged** (v0.35.14) |
| 1 | | **1c** Line/rect stage hints + help | **Merged** (with 1b) |
| 2 | Roadmap **#3** | Colors/register help, export filenames, glossary | **Merged** (v0.35.16–0.35.18) |
| 3 | Roadmap **#2** | Validation debt matrix + status doc | **In progress** |
| 4 | Roadmap **#1** | Diagonal wave/wipe — [prep doc](diagonal-wave-wipe-prep.md) then spike | **Queued** |
| 5 | Roadmap **#7** | `canvas-view`, `drawing-tools`, `stage-hint` | **Merged** (0.35.19–0.35.22). Next: download shell |

---

## Slice 3 — Validation debt *(2026-11-20)*

**Scope:** Close automated gaps called out in [animation-types-research.md](animation-types-research.md#recommended-sequence-research--build): sine scroller, Bonfire, depth browser pacing.

**Deliverables**

- [validation-debt-status.md](validation-debt-status.md) with spec list and last CI/local evidence.
- Doc sync: [diagonal-movement.md](diagonal-movement.md) (sine line), [bonfire-release-checklist.md](bonfire-release-checklist.md) pointer.

**Out of scope:** Physical hardware, new animation ids.

---

## Slice 4 — Diagonal wave / wipe prep *(next)*

See [diagonal-wave-wipe-prep.md](diagonal-wave-wipe-prep.md). No Animation menu promotion until native path is written.

---

## Slice 5 — Modularization

See [modularization-slices.md](modularization-slices.md). Slices 1–3 are on `main`. The next extract is the download dialog shell.