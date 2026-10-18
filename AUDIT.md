# Editor audit — 2026-10-18

## Starting state

Reviewed AGENTS.md in full, index.html, both existing test files, Playwright configuration, and GitHub Actions. Opened the published application in the cloud browser and reproduced `ReferenceError: rom is not defined` during initial redraw and a Border operation. The ROM and charset variables were referenced but never declared. This also prevented successful ROM import and broke text synchronization.

Baseline GitHub Actions run [39143331159](https://github.com/funkatron/petscii-stencil-lab/actions/runs/39143331159): **10 failed, 8 passed**. Pages deployment had succeeded despite the browser test failure.

## Corrections

- Initialize ROM/charset state; all tests now collect uncaught browser exceptions.
- Cache actual bitmap tiles and disable smoothing; use common legacy paths in canvas and SVG.
- Correct numeric palette selection; add accessible pressed states, graphics filtering, inverse selection, a scrollable palette, and explicit legacy access.
- Replace ambiguous ROM text with a versioned lossless grid preserving bank, dimensions, code 0, inverse codes, mixed legacy shapes, and empty cells. Validate atomically.
- Refuse visual export when ROM data is missing and refuse binary conversion of legacy glyphs. Numeric screen-code export remains available without a ROM.
- Preserve charset and canvas dimensions through undo/import; support all editable dimensions 1–40 and a standard 40×25 screen.
- Add local draft autosave and optional local ROM memory without embedding ROM bytes into portable JSON projects.
- Ignore secondary pointers and non-left mouse buttons; interpolate sparse touch/pen samples, include pointer-up endpoint, and retain one undo operation per stroke.
- Explicitly identify ROM stencil analysis as unsupported.
- Pin Playwright 1.58.2, commit the npm lockfile, use `npm ci`, and add portrait iPad coverage.

## Executed verification before commit

Final local Playwright run: **66 passed, 3 skipped, 0 failed** in 37.2 seconds. Projects: desktop Chromium, iPad WebKit landscape, iPad WebKit portrait. There are 23 scenarios per project. The three skips are expected: the WebKit-specific real touchscreen test in desktop Chromium and the Chromium CDP native drag test in each WebKit profile.

Checks include real Chromium touch dragging; WebKit touchscreen taps; synthetic sparse touch/pen drags on both engines; scroll-event cancellation scope; symmetry; eraser/pattern/crop undo; narrow overlay behavior; canvas containment; reload persistence; v1/v2 compatibility; malformed inputs; exact SVG pixel positions; decoded PNG pixels/backgrounds/dimensions; and binary/text/project contents.

The local environment could not download Chromium through Playwright's default CDN. Local Chromium used an npm-distributed serverless Chromium executable via `CHROMIUM_EXECUTABLE_PATH`; WebKit used Playwright's downloaded build with required Ubuntu libraries extracted into its local runtime. The host-library preflight was skipped after supplying those libraries because its ldconfig lookup cannot see local library paths. No such overrides are configured in CI; GitHub Actions installs standard Playwright browser builds and dependencies.

## Limits and next work

- No physical iPad or Apple Pencil test was performed. WebKit uses real taps and synthetic pointer streams for drag-handler coverage, not a hardware stylus or native WebKit swipe.
- The fixture is original synthetic bitmap data, not a bundled Commodore ROM. Pixel interpretation is verified; full-ROM provenance/hash authentication remains unimplemented.
- Imported ROM slots are rendered verbatim. Custom or regional ROMs may put different glyphs at those screen codes. Graphics filtering follows the standard C64 layout.
- ROM storage is device-local and optional; projects on a different browser need the same ROM imported. Browser storage can be cleared. Multiple tabs share one autosaved draft.
- Screen-code bytes omit dimensions, charset and colors; export text and JSON retain metadata. Screen-code binary is not a PETSCII stream.
- Legacy geometry is retained as explicit approximations. Export colors differ from the editing theme, while artwork geometry and orientation match.
- Standalone per-glyph SVGs or an SVG glyph sheet can reuse the existing exact bitmap-vector conversion. Converting ROM-derived shapes to SVG does not by itself establish redistribution permission.
