# Editor readability phases

`index.html` still hosts most UI wiring in a compact inline script. New logic belongs in readable ES modules; shrink the shell incrementally.

## Done

| Module | Extracted from `index.html` |
| --- | --- |
| `project-validation.js` | v3 project validation |
| `animation-frames.js` | Frame plan and sampling |
| `pointer-stroke.js` | Brush strokes and cell picking |
| `c64-colors.js` | Pepto palette table and RGB helper |
| `typed-text.js` | Text tool placement |
| `glyph-families.js` | Palette families and catalog building |
| Effect modules | `bonfire.js`, `space-warp.js`, `depth-surfaces.js`, `depth-phase.js`, `solid-motion.js` reformatted |

## Next candidates (not started)

1. **Text grid** — `importTextGrid`, `textGrid()` export formatting
2. **Canvas render** — `renderGrid`, `romCanvasGlyph`, tile cache
3. **Project I/O** — `projectData`, `autosave`, `applyProject` (DOM-light parts)
4. **Animation UI** — `setAnimationSettings`, `updateAnimationOptions` (still DOM-coupled)
5. **Shell reformat** — expand remaining inline script section-by-section only when touching that code

Do not introduce a bundler; keep GitHub Pages static hosting.
