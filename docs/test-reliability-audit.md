# Test reliability audit

## First pass: animation preview and autosave

The Ripple, Plasma and demoscene control tests used fixed 120 ms playback and 350 ms autosave waits. These waits depend on runner speed and do not establish that the intended state has been reached.

This pass replaces those waits with shared assertions:

- Wait until the displayed animation frame advances beyond zero before pausing.
- Wait until the stored project exactly matches the expected project before reloading.

The existing independent pixel references, project round trips, Undo checks and invalid-import assertions remain unchanged. These changes improve synchronization; they do not explain away the gray-cell rendering defect fixed in PR #33. Its pixel assertions and all-frame tests remain required.

## Findings and next steps

| Area | Finding | Next step |
| --- | --- | --- |
| Preview synchronization | Ripple, Plasma and demoscene used elapsed-time guesses. | Replaced in this pass; validate all three CI projects. |
| Autosave synchronization | The same tests waited 350 ms for a 250 ms debounce. | Replaced with exact persisted-project checks. |
| Other animation tests | Intro motion and wavelength used 120 ms waits; wave height, cycles and animation controls also used autosave sleeps. | Replaced with preview advancement and exact persisted-project checks in this second pass; full CI remains required. |
| Paused playback | Color animation, animation and download-preview tests deliberately wait to detect unwanted changes. | Replace the real-time sleeps with two seconds of controlled clock advancement, preserving pixel stability and preceding playback-change checks. |
| Layout | Animation layout compares grouped height against a stacked version, but requires a fixed 15% saving. | No 15% saving requirement is documented. Compare grouped versus stacked height directly, retaining paired-field alignment, overflow and reachability checks. |
| Layout tolerances | Alignment checks allow small rounding differences; viewport bounds use actual geometry. | Reproduce cross-browser failures before changing tolerances. Do not replace geometry checks with button-presence checks. |
| Saved-project fixtures | New animation defaults previously required updating complete expected objects. | Keep exact serialization tests; distinguish format-contract fixtures from incidental defaults. Audit fixture ownership before centralizing them. |
| Capacity benchmarks | The shared project helper pins four seconds; historical capacity cases pin their workload separately. | Preserve explicit workload settings and independent byte/CPU expectations. Defaults changing must not silently change benchmarks. |
| Shared browser helpers | Tests reveal controls through real navigation. Async preview state and the frame/pixel reads deserve review. | Audit navigation side effects and capture frame identifiers and pixels together when sampling live playback. |

## Completion checklist

- [x] Inventory timing, layout and saved-default risks in the first pass.
- [x] Replace six guessed waits in three animation control tests.
- [x] Replace remaining guessed waits and add controlled-clock pause/stop stability checks; PR #37 passed all nine CI jobs.
- [ ] Review layout thresholds against explicit UI requirements.
- [ ] Review serialization fixtures, shared helpers and order-dependent state.
- [x] Confirm the timing and pause-stability changes in Chromium and both iPad WebKit CI projects (PR #37, run 142).
- [ ] Confirm the fourth-pass sampling and composite synchronization changes in all three browsers.

A passing retry alone is not evidence that a defect is fixed. Preserve failure logs and screenshots, distinguish test synchronization problems from product rendering defects, and report what was actually reproduced.

## CI suite budget follow-up

PR #35's first run reached the 20-minute suite limit in both WebKit jobs: portrait had 268 passing tests and seven unrun tests; landscape had 258 passing tests and sixteen unrun tests. Chromium completed successfully. No final assertion failure caused either WebKit job to stop.

Allow 25 minutes for the complete suite and 35 minutes for each Actions job, including setup, the portrait preflight and artifact upload. Individual test timeouts and retries stay unchanged. This budget change must be verified by a complete CI run; it does not establish that the remaining tests pass.

The landscape C64-only palette/tool test also timed out waiting for a download on its first attempt and passed on retry. Keep this flake open for investigation under shared helpers/download handoffs; a larger suite budget does not fix it.

## Parallel CI execution

The successful PR #35 run 136 still took 20 minutes 32 seconds for portrait tests (21 minutes 20 seconds including setup), compared with about 13 minutes for the other browsers. The portrait HTML report attributes 1,220 seconds to tests. Work was spread across files: intro-motion took 105 seconds, animation-controls 62 seconds and c64-native 55 seconds. The slowest individual test took about 30 seconds.

Run three Playwright shards for each of the three browsers, keeping one worker per job and existing per-test timeout/retry settings. File-level grouping and order within each file remain the Playwright defaults. No tests or browsers are removed. Portrait preflight runs only in portrait shard 1, and each shard uploads uniquely named artifacts plus a JSON timing report.

Test discovery assigns all 276 tests exactly once per browser. Applying run 136 portrait timings to the discovered shards estimates 7.72, 7.11 and 5.51 minutes of test work. These estimates exclude setup, queue time and runtime variability; the next CI run must establish actual elapsed time. Nine jobs increase setup overhead and may queue when runner concurrency is limited.

Replace the temporary 25-minute suite budget with a 15-minute budget per shard and a 20-minute Actions job limit. The limits remain safeguards; they are not performance measurements. The download flake recorded above remains open.

## Second pass: remaining state synchronization

Replace eight more guessed waits in intro-motion, wavelength, wave-height, cycles and animation-controls: two playback waits and six autosave waits. Use the existing shared assertions, keeping independent frame/pixel references, exact serialization, Undo and invalid-import checks intact. Four intro effects share the intro-motion scenario, so that source replacement covers all four.

The remaining fixed waits in animation, color-animation and download-preview intentionally observe stability after pausing. Keep them until controlled-clock checks can establish equivalent coverage. This pass does not mark the whole audit complete or claim to fix the recorded download flake.

PR #35's sharded run 137 passed all nine jobs in 8 minutes 40 seconds, compared with 21 minutes 20 seconds for the prior run. This is an observed elapsed time including job setup, rather than the earlier estimate. PR #36 also passed all nine jobs.

## Third pass: pause stability and layout requirements

Install Playwright's clock before playback in the three pause/stop stability scenarios (animation, color-animation and download-preview). Advance two seconds of virtual time after pausing or stopping, then retain the exact pixel comparison. Each scenario first requires live preview pixels to change, so a frozen renderer cannot satisfy the whole test. This replaces the 100–350 ms real sleeps with a longer controlled observation covering many frame callbacks. Native encoding/export scenarios keep their normal browser clocks.

Animation layout previously demanded a 15% height reduction, although the documented requirement is to group related controls and use space efficiently. Require the grouped layout to be shorter than the same controls stacked vertically; retain paired-field geometry, viewport overflow and enlarged-text interaction checks. The test still detects layouts that stop saving space.

These changes complete the fixed-sleep inventory in browser tests. Serialization fixtures, shared-helper side effects and the previously recorded download flake still need investigation. Browser CI must validate controlled-clock behavior across all three projects.

## Fourth pass: frame sampling and composite synchronization

PR #37 passed all nine shards for head `225f016` in run 142 and was merged and deployed. Its state-wait and controlled-clock changes are browser-validated; the wider audit remains open.

Review found that the live Ripple regression already sampled its frame marker and pixels in one browser task. The five effect suites read paused frames, so their separate reads did not establish a reproduced race. Consolidate their sampling in `previewSample` anyway, preserving each test's explicit grid dimensions, sampling offsets and independent expected pixels. Keep Ripple's live all-frame coverage and both context-reset paths. Reject empty or missing frame markers rather than converting an inactive preview to frame zero.

The composite preview check used `not.toBe('0')`, which also accepts an empty or missing marker. Require positive frame advancement with the existing helper. Before its reload, wait for the exact expected autosaved project instead of relying on earlier export/navigation work to outlast the debounce. No reproduced product defect or download-flake fix is claimed.

Syntax and test discovery cover 189 cases across the six affected suites and three browser projects. Browser CI is still required for this pass. Shared navigation/download behavior, serialization fixtures and remaining layout thresholds remain open.

## Fifth pass: fixture ownership and import defaults

PR #38 passed all nine CI jobs for `263c2a1` (run 145). Shared sampling and composite synchronization are validated.

Keep the historical four-second `project()` helper baseline separate from new-project UI defaults. Add a dedicated exact serialization test for omitted optional animation settings: first load deliberately different settings, then import the sparse fixture, compare against an explicit normalized object and equivalent explicit import, and verify exact autosave/reload plus stopped playback. This checks that omissions do not inherit previous-project state. The expected object is independent of application serialization code.

Pin wavelength and color-wave amplitude explicitly in the capacity matrix, alongside its existing movement amplitude, directions, shapes, cycles and duration. These values match the previous normalized workload; future defaults must not silently change it. Existing byte/CPU and frame-count checks remain intact. Browser CI remains required for this pass. Other benchmark suites, layout tolerances and shared download/navigation helpers remain open.

## Sixth pass: native benchmark settings

PR #39 passed all nine jobs for `ca2df1d` in run 147. Its import-default contract and explicit capacity settings are validated.

The native 96-frame and 192-frame CPU benchmarks still inherited movement height, both wavelengths, color height and some directions/shapes from import defaults. Pin these to their existing normalized values (movement/color height 100%, wavelengths 50%, upward sine movement, and the existing per-case color direction/shape). Preserve geometry, glyphs, cycles, duration, exported bytes, frame-state comparisons and CPU/drift ceilings. Direct exporter tests already construct their frame arrays explicitly. This changes workload ownership, not the intended workload or product. Syntax/discovery checks pass; browser and CPU execution remain subject to CI.

## Seventh pass: navigation/download evidence

PR #40 passed all nine CI jobs for `a51f091` (run 149). Native benchmark fixture settings are validated.

Review retained the remaining layout geometry and rounding tolerances; no reproduced failure justifies relaxing them. The historical C64-only download flake remains unresolved. Add a repeated navigation scenario that alternates animation/data tabs, editable-project saving, text and PNG downloads, comparing complete file bytes with their initial output and checking exact glyph text. No claim is made that this reproduces or fixes the flake.

On shared download-helper failure, attach the selected action, status, open panels, export tab/format and target geometry/disabled state. Rethrow the original error even if attachment collection fails. Preserve existing timeouts, retries and assertions. The attachment provides evidence for future failures without exposing project contents. Browser CI remains required.
