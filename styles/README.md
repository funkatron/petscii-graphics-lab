# Editor styling and machine themes

The editor stylesheet lives in [editor.css](editor.css), separate from application markup and rendering logic. Theme selection helpers live in [`ui-themes.js`](../ui-themes.js).

## Responsibilities

- **Shared interface:** control geometry, spacing, buttons, inputs, dialogs, focus, touch targets, and responsive layout.
- **Machine appearance:** `data-ui-theme` scopes change case colors and visual identity for Commodore 64C, Commodore 128, and Plus/4.
- **Artwork:** character ROM, screen geometry, color palettes, export encoding, and preview pixels are **not** selected by CSS. Never recolor artwork when changing interface themes.
- **Monitor:** the intentionally dark screen surround remains distinct from case chrome.

## Theme architecture

| Attribute | Values | Meaning |
| --- | --- | --- |
| `html[data-ui-theme]` | `c64c` (default) · `c128` · `plus4` | Interface look only |

- Default and missing values resolve to **C64C** — the existing warm ivory enclosure.
- Preference key: `petscii-ui-theme` (device-local). Themes are **not** stored in v3 project JSON.
- Changing theme must not alter glyph IDs, cell inks, background index, animation settings, or export bytes.
- Capability models (ROM maps, TED palette, native exporters) belong in later machine-mode work, not in these tokens.

### Token layers

1. **Shared `--ui-*`:** panel, field, control, selected, focus, and disabled surfaces.
2. **Case `--case-*`:** enclosure wash, raised controls, edges, and muted text consumed by layout rules.
3. **Theme accents:** `--key-active`, `--stage-caption`, `--help-panel-*`, `--theme-color` for chrome that still lives in injected overrides.

Artwork uses separate `--art-ink` / `--art-bg` inline properties set from the Pepto drawing palette.

### Initial visual directions

| Theme | Direction |
| --- | --- |
| C64C | Existing warm ivory case and controls |
| C128 | Light gray/beige case with cooler trim/accent |
| Plus/4 | Dark charcoal enclosure with contrasting controls |

These are design seeds, not finalized historical color specs.

## Current state

The extracted stylesheet still contains historical overrides. Theme scopes override tokens; they do not claim a full cascade dedupe. Do not implement C128/Plus/4 graphics capabilities through CSS.

## Refactoring guardrails

1. Keep layout, accessible hit targets, and responsive behavior invariant across themes.
2. Prefer token overrides over new per-theme selector trees.
3. Preserve C64 pixel and export behavior; add capability tests before introducing non-C64 rendering.
4. Compare iPad portrait, landscape, and desktop screenshots for Project, Download artwork, the drawing surface, and glyph picker when chrome changes.
5. Keep appearance themes separate from future machine-capability modules.

## Shared form-control conventions

Use the tokens in `editor.css` for all editor surfaces (sidebar, glyph picker,
Project menu, Theme menu, popovers, and dialogs). Avoid native white form surfaces or isolated
hex-color overrides for routine controls.

| Element | Treatment | Token |
| --- | --- | --- |
| Panel/dialog | Warm ivory enclosure (C64C) | `--ui-panel-bg` |
| Editable text, number, dropdown, textarea | Recessed field with readable text | `--ui-field-bg`, `--ui-field-border`, `--ui-text` |
| Ordinary button | Raised control with distinct border | `--ui-control-bg`, `--ui-control-border` |
| Selected/pressed action | Distinct selected fill; never color alone | `--ui-selected-bg`, `--ui-selected-text` |
| Disabled control | Muted surface and readable subdued text | `--ui-field-disabled-bg`, `--ui-field-disabled-text` |
| Keyboard focus | Visible high-contrast outline | `--ui-focus-border` |

**Rules**

1. Preserve native semantics and accessible names. Text/number fields and selects should look editable; buttons should look pressable. Do not style color swatches, checkboxes, radio buttons, sliders, file inputs, or artwork pixels as ordinary text fields.
2. Do not use pure-white input backgrounds to signal editability. Keep hover, focus, pressed, disabled, and progress states distinguishable without relying on color alone.
3. Use shared tokens rather than adding per-dialog color declarations. If a new control needs a distinct treatment, document why here and test it across the affected surfaces.
4. Check iPad portrait, iPad landscape, and desktop screenshots, especially **Download artwork** before and during export. Automated browser checks do not replace real-device accessibility and touch checks.
5. This is UI chrome only: never change C64 artwork, monitor pixels, or export colors through these tokens.
6. Keep essential information visible; move lengthy instructional copy into contextual Help. Do not expand theme work into a Help redesign.
