# Editor styling and machine modes

The editor stylesheet lives in [editor.css](editor.css), separate from application markup and rendering logic.

## Responsibilities

- **UI chrome:** buttons, panels, popovers, dialogs, accessibility and responsive layout.
- **Machine presentation:** a future theme layer may change the case colors and visual identity for Commodore 64, Commodore 128 and Plus/4.
- **Artwork:** character ROM, screen geometry, color palettes, export encoding and preview output must be selected by a *machine-mode model*, not inferred from CSS. Never recolor artwork when changing interface themes.
- **Monitor:** intentionally dark screen surround remains distinct from the ivory control surfaces.

## Current state

The extracted stylesheet preserves the existing cascade and contains historical overrides. This extraction is a structural prerequisite, **not** a claim that the stylesheet is fully deduplicated or that C128/Plus/4 modes are implemented.

## Refactoring guardrails

1. Keep layout, accessible hit targets and responsive behavior invariant across machine themes.
2. Centralize color, border and elevation tokens before removing overlapping selector declarations.
3. Preserve C64 pixel and export behavior; add mode-specific tests before introducing C128 or Plus/4 rendering.
4. Compare iPad portrait, landscape and desktop screenshots for the Project panel, export dialog, drawing surface and glyph picker.
5. Keep future mode-specific styling in separate files or token scopes, not in conditional CSS based on artwork contents.

No new machine modes are enabled by this change.

## Shared 64C form-control conventions

Use the tokens in `editor.css` for all editor surfaces (sidebar, glyph picker,
Project menu, popovers and dialogs). Avoid native white form surfaces or isolated
hex-color overrides for routine controls.

| Element | Treatment | Token |
| --- | --- | --- |
| Panel/dialog | Warm ivory enclosure | `--ui-panel-bg` |
| Editable text, number, dropdown, textarea | Recessed warm cream with dark text | `--ui-field-bg`, `--ui-field-border`, `--ui-text` |
| Ordinary button | Raised beige with distinct border | `--ui-control-bg`, `--ui-control-border` |
| Selected/pressed action | Warm gold; never rely on color alone | `--ui-selected-bg`, `--ui-selected-text` |
| Disabled control | Muted beige and readable subdued text | `--ui-field-disabled-bg`, `--ui-field-disabled-text` |
| Keyboard focus | Visible high-contrast outline | `--ui-focus-border` |

**Rules**

1. Preserve native semantics and accessible names. Text/number fields and selects should look editable; buttons should look pressable. Do not style color swatches, checkboxes, radio buttons, sliders, file inputs or artwork pixels as ordinary text fields.
2. Do not use pure-white input backgrounds to signal editability. Use warm cream and clear borders instead. Keep hover, focus, pressed, disabled and progress states distinguishable without relying on color alone.
3. Use shared tokens rather than adding per-dialog color declarations. If a new control needs a distinct treatment, document why here and test it across the affected surfaces.
4. Check iPad portrait, iPad landscape and desktop screenshots, especially **Download artwork** before and during export. Automated browser checks do not replace real-device accessibility and touch checks.
5. This is UI chrome only: never change C64 artwork, monitor pixels or export colors through these tokens.
