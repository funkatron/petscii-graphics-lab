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
