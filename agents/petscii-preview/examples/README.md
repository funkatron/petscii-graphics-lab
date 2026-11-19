# Exploratory machine-feel examples

Open these in PETSCII Graphics Lab with **Project → Open**.

| File | Feel |
| --- | --- |
| `c64-ready-card.json` | Light blue on blue |
| `c128-ready-card.json` | Cyan on blue |
| `plus4-ready-card.json` | Black on light gray |
| `pgl-wordmark.json` | Yellow wordmark on black |
| `mode-swatches.json` | Same glyphs, three palette moods |

PNG previews are in `png/` for a quick look without launching the lab.

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

No photo references — use MCP `list_op_art_recipes` / `op_art_recipe` and the **Op-art** section in `.cursor/skills/petscii-draw/SKILL.md`. Study Riley/Vasarely composition mentally, then `stamp_op_art` + animation stacks (parallax, plasma, fld-blinds).
