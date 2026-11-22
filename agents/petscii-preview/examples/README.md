# Exploratory machine-feel examples

Open these in PETSCII Graphics Lab with **Project → Open project**. Each file sets its machine, so the editor switches to it when the project opens.

| File | Machine | Feel |
| --- | --- | --- |
| `c64-ready-card.json` | C64 | Light blue on blue |
| `c128-ready-card.json` | C128 40-column | Cyan on blue |
| `plus4-ready-card.json` | Plus/4 | Black on light gray, in TED colors and glyphs |
| `pgl-wordmark.json` | C64 | Yellow wordmark on black |
| `mode-swatches.json` | C64 | Same glyphs, three palette moods in VIC colors |

To regenerate the files, run `node agents/petscii-preview/make_pgl_examples.mjs`. For PNG previews, run `agents/petscii-preview/.venv/bin/python agents/petscii-preview/render_pgl_examples.py`; they land in `agents/petscii-preview/out/examples-png/`.

## Animation JSON (MCP)

Stack movement, cell color, and backdrop with the same keys as `project.animation` in the editor. Prefer `backgroundEffect` for stepped shared backgrounds:

```json
"animation": {
  "effect": "scroll-x",
  "colorEffect": "color-wave",
  "backgroundEffect": "field",
  "fieldRamp": "glow",
  "motionCycles": 1,
  "colorCycles": 1,
  "backgroundCycles": 1,
  "seconds": 2
}
```

Legacy saves may still have `colorEffect: "field"`; the lab and MCP migrate that to `backgroundEffect` on load.

## Drawing references

`IMG_0343` through `IMG_0360` are pictures to study before painting with the MCP. The drawing skill in `.cursor/skills/petscii-draw/SKILL.md` says which file to open for a face, a figure, or a place. They are references, not files to trace.

## Op-art abstracts

No photo references — read the MCP catalogs `petscii://op-art/recipes` and `petscii://op-art/recipes/{id}`, and the **Op-art** section in `.cursor/skills/petscii-draw/SKILL.md`. Study Riley/Vasarely composition mentally, then `stamp_op_art` + animation stacks (parallax, plasma, fld-blinds).
