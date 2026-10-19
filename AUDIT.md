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

## SVG-only follow-up

The owner requested built-in SVGs derived from the initial import, then clarified that experimental custom-project backward compatibility was not important. The editor now uses `assets/c64-glyphs.svg` automatically and has no ROM import/storage workflow. The original binary is excluded. This replaces the runtime ROM-import architecture described in the initial audit above.

The asset contains 512 exact SVG symbols and a viewable glyph sheet. `scripts/build_glyphs.py` rebuilds it from a developer-supplied reference ROM. Rebuilding and comparing the generated file byte-for-byte succeeded. Tests reconstruct every source byte from the SVG geometry and verify the complete SHA-256 fingerprint documented in README, along with known uppercase/lowercase shapes. They preserve the source's one-bit @/inverse-@ discrepancy in both banks rather than normalizing inverse glyphs.

The final local SVG-only Playwright run completed with **69 passed, 3 expected skips, 0 failed** in 46.6 seconds across Chromium and WebKit iPad landscape/portrait. Tests cover immediate drawing with no imported ROM, both banks/inverse slots across canvas/SVG/PNG, source hash preservation, slow/invalid asset loading, retry without data loss, and the existing drawing, persistence, import and export behaviors. Runtime import tests were replaced with tests of the built-in asset and loader. Explicit custom-source projects are rejected rather than silently changed; no custom migration is maintained.

## Animation and drawing replay follow-up (October 19, 2026)

Added opt-in drawing replay, scrolling left/up, row waves and inverse pulse, with accessible Play/Pause and Stop controls. New paint/erase/repaint changes record in input order; JSON/autosave and undo/redo retain the recording. Imports without recordings, patterns and resized canvases use a row-major reveal. Replay uses the chosen loop duration, not original wall-clock pauses, and holds the finished picture for 25% of each loop. Long recordings sample up to 48 frames; this is not a manual timeline editor.

Added looping animated GIF export using a locally vendored MIT encoder, selectable resolution/background, and a persistent Save link for Safari handoffs. Export snapshots all source state before asynchronous work. Independent GIF decoding tests verify pixels, recorded erasures, loop count, timing, transparency and dimensions. Preview ticks do not mutate the editable grid, history or saved project. Painting stops preview and returns to editing.

WebKit testing exposed a canvas scaling regression after importing a differently sized grid: the initial glyph could stretch across multiple cells while a later redraw was correct. Rendering directly in backing-store pixels removes reliance on retained HiDPI transforms. The regression asserts the initial cell pixels as well as playback/pause/stop restoration.

Physical iPad/Pencil and the device's actual Files/Photos handoff remain hardware checks. Video and zipped frame sequences are not implemented in this change.

Executed locally: the full suite passed **102 tests with 3 expected skips** across Chromium and WebKit iPad landscape/portrait. After adding the fast-replay frame-delay cap, all **36 animation tests passed** across the same three profiles, including the new minimum-delay regression. The existing project round-trip test now waits for asynchronous file loading before asserting the restored text. Local browser/runtime workarounds are the same as documented above; CI uses standard Playwright installations.
