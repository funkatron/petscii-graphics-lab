# Editor styling and machine themes

Stylesheets live under `styles/`, separate from application markup and rendering logic. Keep them separate so future themes can re-skin surfaces without rewriting layout geometry.

| File | Owns | Does not own |
| --- | --- | --- |
| [editor.css](editor.css) | Tokens, `html[data-ui-theme]` scopes, component **surfaces** (panels, fields, glyph keys, status text, pressed/active chrome) | Compact hit-target geometry, responsive breakpoints for chrome chrome packing |
| [shell.css](shell.css) | Compact control **geometry**, tool-icon / selection-dock / help-trigger layout, header/strip alignment, responsive breakpoints | Theme colors (use tokens from `editor.css`) |

Link order in `index.html` is `editor.css` then `shell.css`. Shell may override geometry; it should not re-declare theme colors. Theme helpers live in [`ui-themes.js`](../ui-themes.js); machine and palette state lives in [`machine-modes.js`](../machine-modes.js) (see [machine modes](../docs/machine-modes.md)).

## Responsibilities

- **Shared interface:** control geometry (shell), spacing, buttons, inputs, dialogs, focus, touch targets, and responsive layout.
- **Machine appearance:** `data-ui-theme` scopes in `editor.css` change case colors and visual identity for Commodore 64C, Commodore 128, and Plus/4.
- **Artwork:** character ROM, screen geometry, color palettes, export encoding, and preview pixels are **not** selected by CSS. Never recolor artwork when changing interface themes.
- **Monitor:** the intentionally dark screen surround remains distinct from case chrome.

## Theme architecture

| Attribute | Values | Meaning |
| --- | --- | --- |
| `html[data-machine]` | `c64` (default) · `c128` · `plus4` | Source of truth; set by Machine control |
| `html[data-ui-theme]` | `c64c` (default) · `c128` · `plus4` | Mapped from `data-machine`; scopes the token sets below |

- **Machine modes drive appearance.** The header **Machine** control sets `html[data-machine]` (`c64` · `c128` · `plus4`) via `applyMachineChrome()` (data attributes only). `index.html` maps the machine to `data-ui-theme` via `uiThemeForMachine()`: `c64` → `c64c`, `c128` → `c128`, `plus4` → `plus4`. **CSS theme scopes own all shell paints** — there are no live JS `--chrome-*` inline paints. There is no separate Interface look control.
- Default and missing values resolve to **C64C** — the existing warm ivory enclosure.
- Preference key: `petscii-workspace-prefs` (device-local machine + display palette) replaces the old `petscii-ui-theme` key, which is no longer read. Machine and palette are stored in v3 project JSON (`machine`, `palette`); the mapped theme is derived, never stored.
- Changing theme must not alter glyph IDs, cell inks, background index, animation settings, or export bytes.
- Capability models (TED palette, ink conversion, native export gates) live in the machine-mode modules and `index.html`, not in these tokens. CSS only presents the selected machine.

### Token layers

1. **Shared `--ui-*`:** panel, field, control, selected, focus, and disabled surfaces.
2. **Case `--case-*`:** enclosure wash, raised controls, edges, and muted text consumed by layout rules.
3. **Theme accents:** `--header-*`, `--strip-control-*`, `--panel-well*`, `--stage-wash-*`, `--key-active`, `--stage-caption`, `--help-panel-*`, and `--theme-color`.
4. **Semantic roles** (below): component rules bind to these; machine themes only reassign values under `html[data-ui-theme=…]`.

Artwork uses separate `--art-ink` / `--art-bg` inline properties set from the Pepto drawing palette.

### Semantic chrome tokens

| Role | Token | C64C default (alias) |
| --- | --- | --- |
| Panel surface | `--surface-panel` | `var(--ui-panel-bg)` |
| Recessed well | `--surface-well` | `var(--panel-well)` |
| Editable field | `--surface-field` | `var(--ui-field-bg)` |
| Body text | `--text` | `var(--ui-text)` |
| Muted / notes | `--text-muted` | `var(--case-muted)` |
| Status / export feedback | `--text-status` | `var(--ui-heading)` |
| Text on accent / selected key | `--text-on-accent` | `#fff9ee` |
| Select fill / border | `--select-bg`, `--select-border` | field tokens |
| Glyph keycap | `--glyph-key-bg`, `--glyph-key-border`, `--glyph-key-shadow`, `--glyph-key-text`, `--glyph-key-code` | ivory keycap metaphor |
| Glyph selected | `--glyph-key-selected-*` | selected fill + orange edge |
| ROM canvas filter | `--glyph-rom-filter`, `--glyph-rom-filter-selected` | `invert(1)` / white-on-selected |
| Symmetry divider / summary | `--sym-divider*`, `--sym-summary-*` | warm plastic |
| Pressed key shadow | `--key-pressed-shadow` | inset warm accent shadow |

`--chrome-label` remains the secondary label color inside theme scopes (not related to retired JS `--chrome-*` paints).

### Visual directions

| Theme | Direction |
| --- | --- |
| C64C | Warm ivory case and ivory PETSCII keycaps |
| C128 | Light gray/beige case with cooler trim/accent |
| Plus/4 | Dark charcoal enclosure, charcoal keycaps, light status text |

Plus/4 charcoal (`#2f2f2f` case, light text) is the locked product look. Drawing defaults still use TED paper READY indices; that is artwork, not shell chrome.

## Current state

Theme scopes override tokens. Prefer one winning color rule in `editor.css` over stacking overrides in `shell.css`. Do not implement C128/Plus/4 graphics capabilities through CSS.

## Refactoring guardrails

1. Keep layout, accessible hit targets, and responsive behavior invariant across themes (geometry lives in `shell.css`).
2. Prefer token overrides over new per-theme selector trees.
3. Preserve C64 pixel and export behavior; add capability tests before introducing non-C64 rendering.
4. Compare iPad portrait, landscape, and desktop screenshots for Project, Download artwork, the drawing surface, and glyph picker when chrome changes.
5. Keep appearance tokens separate from machine-capability logic: do not encode ink conversion, palettes or export gates in CSS.
6. Reserve `!important` for geometry that must beat a broad rule (e.g. `[hidden]`, fixed tool-icon size); do not use it for theme colors.

## Shared form-control conventions

Use the tokens in `editor.css` for all editor surfaces (sidebar, glyph picker,
Project menu, Machine menu, popovers, and dialogs). Avoid native white form surfaces or isolated
hex-color overrides for routine controls.

| Element | Treatment | Token |
| --- | --- | --- |
| Panel/dialog | Warm ivory enclosure (C64C) | `--ui-panel-bg` |
| Editable text, number, dropdown, textarea | Recessed field with readable text | `--ui-field-bg`, `--ui-field-border`, `--ui-text` |
| Ordinary button | Raised control with distinct border | `--ui-control-bg`, `--ui-control-border` |
| Selected/pressed action | Distinct selected fill; never color alone | `--ui-selected-bg`, `--ui-selected-text` (or `--key-active` / `--text-on-accent` for accent keys) |
| Disabled control | Muted surface and readable subdued text | `--ui-field-disabled-bg`, `--ui-field-disabled-text` |
| Keyboard focus | Visible high-contrast outline | `--ui-focus-border` |

**Rules**

1. Preserve native semantics and accessible names. Text/number fields and selects should look editable; ordinary action buttons should look pressable. Color swatches in `.color-grid` are flush tiles (no gaps, borders, or raised chrome) so dense palettes stay compact; do not restyle them as ordinary keys. Do not style checkboxes, radio buttons, sliders, file inputs, or artwork pixels as ordinary text fields.
2. Do not use pure-white input backgrounds to signal editability. Keep hover, focus, pressed, disabled, and progress states distinguishable without relying on color alone.
3. Use shared tokens rather than adding per-dialog color declarations. If a new control needs a distinct treatment, document why here and test it across the affected surfaces.
4. Check iPad portrait, iPad landscape, and desktop screenshots, especially **Download artwork** before and during export. Automated browser checks do not replace real-device accessibility and touch checks.
5. This is UI chrome only: never change C64 artwork, monitor pixels, or export colors through these tokens.
6. Keep essential information visible; move lengthy instructional copy into contextual Help. Do not expand theme work into a Help redesign.
