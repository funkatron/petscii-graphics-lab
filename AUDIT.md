# Editor audit and development history

This is a **historical record**, beginning on 18 October 2026. Each section describes the version tested at that stage. Older controls, limitations, and test counts are retained as history.

For current instructions, use the [user guide](README.md). For current engineering requirements, use [AGENTS.md](AGENTS.md) and the [maintainer reference](docs/maintainer-reference.md).

## Changes since the initial audit

| Earlier behavior | Current behavior |
| --- | --- |
| Import a local character ROM before drawing | Both C64 character sets load from the built-in SVG sheet |
| Separate Export/Generate and Save actions | One Download action for the selected format |
| One video loop | 1–100 video repetitions |
| Animation speed multipliers; Stop / edit | Loop duration in seconds; Return to drawing |
| Save & export in the settings sidebar | Header Download artwork panel and separate Project menu |
| Shared foreground ink for the drawing | Each cell retains its own ink color |

## Verification recorded in this history

These are results from different versions, not a single combined test run.

| Stage | Passed | Expected skips | Recorded duration |
| --- | --- | --- | --- |
| Initial corrections | 66 | 3 | 37.2 seconds |
| Built-in SVG follow-up | 69 | 3 | 46.6 seconds |
| Animation/replay | 102 | 3 | Not recorded here |
| Fast-replay timing check | 36 animation tests | 0 | Not recorded here |
| PNG frame ZIP | 129 | 3 | 1.6 minutes |
| Video and speed | 156 | 3 | 1.9 minutes |
| Workspace redesign, 21 October | 264 | 3 | 9.7 minutes in GitHub Actions |

The workspace result is [run 39683583817](https://github.com/funkatron/petscii-graphics-lab/actions/runs/39683583817), at commit `8f66caabf724600f62f654c385bb7182037f51d5`. It tested desktop Chromium and iPad WebKit in both orientations. The later repository rename did not change that commit.

## Reading the technical notes

A **fixture** is test data. **Charset** means character set; **row-major** means left to right, then down. **CI** means the automated GitHub Actions checks. Browser terms and export internals are defined in the [maintainer reference](docs/maintainer-reference.md#terms-used-here).

## 18 October: initial findings

Reviewed AGENTS.md in full, index.html, both existing test files, Playwright configuration, and GitHub Actions. Opened the published application in the cloud browser and reproduced `ReferenceError: rom is not defined` during initial redraw and a Border operation. The ROM and character set variables were referenced but never declared. This also prevented successful ROM import and broke text synchronization.

Baseline GitHub Actions run [39143331159](https://github.com/funkatron/petscii-graphics-lab/actions/runs/39143331159): **10 failed, 8 passed**. Pages deployment had succeeded despite the browser test failure.

### Corrections at that stage

- Initialize ROM/character set state; tests collect uncaught browser exceptions from this stage onward.
- Cache actual bitmap tiles and disable smoothing; use common legacy paths in canvas and SVG.
- Correct numeric palette selection; add accessible pressed states, graphics filtering, inverse selection, a scrollable palette, and explicit legacy access.
- Replace ambiguous ROM text with a versioned lossless grid preserving bank, dimensions, code 0, inverse codes, mixed legacy shapes, and empty cells. Check the whole input before changing artwork.
- Refuse visual export when ROM data is missing and refuse binary conversion of legacy glyphs. Numeric screen-code export remains available without a ROM.
- Preserve character set and canvas dimensions through undo/import; support all editable dimensions 1–40 and a standard 40×25 screen.
- Add local draft autosave and optional local ROM memory without embedding ROM bytes into portable JSON projects.
- Ignore secondary pointers and non-left mouse buttons; fill gaps between sparse touch/pen samples, include the final pointer-up position, and retain one undo operation per stroke.
- Explicitly identify ROM stencil analysis as unsupported.
- Pin Playwright 1.58.2, commit the npm lockfile, use `npm ci`, and add portrait iPad coverage.

### Verification at that stage

Final local Playwright run: **66 passed, 3 skipped, 0 failed** in 37.2 seconds. Projects: desktop Chromium, iPad WebKit landscape, iPad WebKit portrait. There are 23 scenarios per project. The three skips are expected: the WebKit-specific real touchscreen test in desktop Chromium and the Chromium CDP native drag test in each WebKit profile.

Checks include real Chromium touch dragging; WebKit touchscreen taps; synthetic sparse touch/pen drags on both engines; scroll-event cancellation scope; symmetry; eraser/pattern/crop undo; narrow overlay behavior; canvas containment; reload persistence; v1/v2 compatibility; malformed inputs; exact SVG pixel positions; decoded PNG pixels/backgrounds/dimensions; and binary/text/project contents.

For these historical runs, the local environment could not download Chromium through Playwright's default CDN. Local Chromium used an npm-distributed serverless Chromium executable via `CHROMIUM_EXECUTABLE_PATH`; WebKit used Playwright's downloaded build with required Ubuntu libraries extracted into its local runtime. The host-library preflight was skipped after supplying those libraries because its ldconfig lookup cannot see local library paths.

No such overrides are configured in CI; GitHub Actions installs standard Playwright browser builds and dependencies.

### Limits recorded at that stage

- No physical iPad or Apple Pencil test was performed. WebKit uses real taps and synthetic pointer streams for drag-handler coverage, not a hardware stylus or native WebKit swipe.
- The fixture is original synthetic bitmap data, not a bundled Commodore ROM. Pixel interpretation is verified; full-ROM provenance/hash authentication remains unimplemented.
- Imported ROM slots are rendered verbatim. Custom or regional ROMs may put different glyphs at those screen codes. Graphics filtering follows the standard C64 layout.
- ROM storage is device-local and optional; projects on a different browser need the same ROM imported. Browser storage can be cleared. Multiple tabs share one autosaved draft.
- Screen-code bytes omit dimensions, character set and colors; export text and JSON retain metadata. Screen-code binary is not a PETSCII stream.
- Legacy geometry is retained as explicit approximations. Export colors differ from the editing theme, while artwork geometry and orientation match.
- Standalone per-glyph SVGs or an SVG glyph sheet can reuse the existing exact bitmap-vector conversion. Converting ROM-derived shapes to SVG does not by itself establish redistribution permission.

## Follow-up: built-in SVG glyphs

The owner requested built-in SVGs derived from the initial import, then clarified that experimental custom-project backward compatibility was not important. At this stage, the editor switched to loading `assets/c64-glyphs.svg` automatically and has no ROM import/storage workflow. The original binary is excluded. This replaces the runtime ROM-import architecture described in the initial audit above.

The asset contains 512 exact SVG symbols and a viewable glyph sheet. `scripts/build_glyphs.py` rebuilds it from a developer-supplied reference ROM. Rebuilding and comparing the generated file byte-for-byte succeeded. Tests reconstruct every source byte from the SVG geometry and verify the complete SHA-256 fingerprint documented at that stage in README (now in the maintainer reference), along with known uppercase/lowercase shapes.

They preserve the source's one-bit @/inverse-@ discrepancy in both banks rather than normalizing inverse glyphs.

The final local SVG-only Playwright run completed with **69 passed, 3 expected skips, 0 failed** in 46.6 seconds across Chromium and WebKit iPad landscape/portrait. Tests cover immediate drawing with no imported ROM, both banks/inverse slots across canvas/SVG/PNG, source hash preservation, slow/invalid asset loading, retry without data loss, and the existing drawing, persistence, import and export behaviors.

Runtime import tests were replaced with tests of the built-in asset and loader. Explicit custom-source projects are rejected rather than silently changed; no custom migration is maintained.

## 19 October: animation and drawing replay

Added opt-in drawing replay, scrolling left/up, row waves and inverse pulse, with accessible Play/Pause and Stop controls. New paint/erase/repaint changes record in input order; JSON/autosave and undo/redo retain the recording. Imports without recordings, patterns and resized canvases use a row-major reveal. Replay uses the chosen loop duration, not original wall-clock pauses, and holds the finished picture for 25% of each loop.

Long recordings sample up to 48 frames; this is not a manual timeline editor.

Added looping animated GIF export using a locally vendored MIT encoder, selectable resolution/background, and a persistent Save link for Safari handoffs. Export snapshots all source state before asynchronous work. Independent GIF decoding tests verify pixels, recorded erasures, loop count, timing, transparency and dimensions. Preview frame updates do not mutate the editable grid, history or saved project. Painting stops preview and returns to editing.

WebKit testing exposed a canvas scaling regression after importing a differently sized grid: the initial glyph could stretch across multiple cells while a later redraw was correct. Rendering directly in backing-store pixels removes reliance on retained HiDPI transforms. The regression asserts the initial cell pixels as well as playback/pause/stop restoration.

Physical iPad/Pencil and the device's actual Files/Photos handoff remain hardware checks. Video and zipped frame sequences are not implemented in this change.

Executed locally: the full suite passed **102 tests with 3 expected skips** across Chromium and WebKit iPad landscape/portrait. After adding the fast-replay frame-delay cap, all **36 animation tests passed** across the same three profiles, including the new minimum-delay regression. The existing project round-trip test now waits for asynchronous file loading before asserting the restored text.

Local browser/runtime workarounds are the same as documented above; CI uses standard Playwright installations.

## 19 October: PNG frame ZIP

Added **Export PNG frames (.zip)** to Animation. The archive contains complete numbered PNG frames, a versioned `timing.json` with per-frame start/duration and loop metadata, an editable `project.json` snapshot, and usage instructions. Frames share GIF's indexed renderer, source snapshot and timing rounded to hundredths of a second while keeping the total loop duration; variable delays and sampled replay are documented. Resolution/background controls apply to both formats.

The ZIP preserves source dimensions and character set even when the editor changes during generation.

A roughly 5 KB vendored MIT `fflate@0.8.3` streaming ZIP writer loads on demand. Already compressed PNG entries use store mode; the app encodes one PNG at a time, retains compressed chunks for the final Blob, and avoids keeping all uncompressed frames. Licenses, source package hash and generated-module fingerprint are recorded in `vendor/README.md`.

At this stage, GIF and ZIP gained shared progress, a Cancel control, one export at a time and persistent Save links. Cancellation never publishes a partial archive and preserves the last completed download. Errors restore controls and leave artwork intact. Missing glyph checks now include numeric values in replay base/history, even when the final grid contains only legacy shapes. Project-load test helpers wait for asynchronous file handling to finish.

Eight new scenarios per browser independently validate ZIP CRCs and entry contents with `adm-zip`, decode PNGs with `pngjs`, compare complete frames/timings against GIF, preserve both banks and exact inverse slots, verify exports keeping their captured source state, exercise cancellation during module loading and PNG encoding, and recover from module/PNG failures. Physical iPad Files handoff and Apple Pencil remain hardware checks. Video encoding is not included.

Final local Playwright run: **129 passed, 3 expected skips, 0 failed** in 1.6 minutes across desktop Chromium and iPad WebKit landscape/portrait. This includes all 24 new frame-export cases and the existing 108 editor/animation cases. The same documented local browser/library overrides were used; GitHub Actions uses standard Playwright browsers and system dependencies.

## 19 October: video export and duration

Added an explicit **Animation speed** control covering 0.5/1/2/4/8/12 seconds per loop. New projects default to 2 seconds instead of 4; explicit saved durations remain unchanged. Speed is shared by preview, GIF, PNG ZIP and video. Fast scroll frame counts are capped to keep GIF delays at least 20 ms while sampled positions still travel around the whole grid.

Historical test fixtures now state their four-second duration explicitly; separate regressions check the new default and faster persisted settings.

Added **Export video** and a persistent **Save video** link, using native WebCodecs with a lazy, unmodified `mediabunny@1.61.6` browser bundle. MP4/AVC is preferred, with WebM/VP9 then VP8 fallback after dimension-specific capability checks. `video-export.js` contains the application integration. The vendored MPL-2.0 license, pinned source and build fingerprint are in `vendor/`. There are no media-capture permissions, server uploads or runtime CDN/WASM dependencies.

HTML media capability initialization precedes codec probing to avoid a GTK/WPE WebKit backend-initialization failure observed during testing.

Videos contain one silent loop with explicit timestamps/durations from the same sampled frame timeline as GIF/ZIP. The exporter waits for the encoder to accept each frame and finish the file. This avoids drift from recording playback in real time. The selected source/options are snapshotted before loading modules. The then-current video exporter respected solid backgrounds and rendered Transparent against Dark. Later color support changed this to the selected canvas background. Video compression is lossy; PNG sequences remain lossless.

Cancellation during encoding/finalization closes resources without publishing a partial file or replacing the last completed download.

Final local Playwright run: **156 passed, 3 expected skips, 0 failed** in 1.9 minutes, across desktop Chromium and WebKit iPad landscape/portrait. All 27 new cases ran; native video exports were independently probed with FFprobe and decoded with FFmpeg to verify dimensions, one-loop duration, source pixels, painting/erasure order and timestamps.

Coverage includes WebM fallback, transparent-to-dark rendering, source edits during module loading, unsupported encoders/module errors, cancellation during loading, and cancellation while finalizing native video. The prior 132 editor/animation/ZIP cases also passed.

The local WebKit runtime needed GStreamer plugin packages in addition to the previously extracted libraries; those were supplied locally via `GST_PLUGIN_SYSTEM_PATH` and a local registry. GitHub Actions installs standard Playwright dependencies and now explicitly installs FFmpeg for video checks. Physical iPad hardware encoding, Photos/Files handoff, and device-specific codec/performance behavior remain hardware checks.

At that stage, the video player controlled repeats. A later change added 1–100 repetitions encoded into the video file.
