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
| Other animation tests | Intro motion and wavelength still use 120 ms waits; wave height, cycles and animation controls also use autosave sleeps. | Apply state-based waits in a separate tested pass. |
| Paused playback | Color animation, animation and download-preview tests deliberately wait to detect unwanted changes. | Keep the stability assertion; evaluate controlled clocks rather than deleting the observation interval. |
| Layout | Animation layout compares grouped height against a stacked version, but requires a fixed 15% saving. | Check whether that percentage is a product requirement. Retain overflow, alignment and reachability assertions. |
| Layout tolerances | Alignment checks allow small rounding differences; viewport bounds use actual geometry. | Reproduce cross-browser failures before changing tolerances. Do not replace geometry checks with button-presence checks. |
| Saved-project fixtures | New animation defaults previously required updating complete expected objects. | Keep exact serialization tests; distinguish format-contract fixtures from incidental defaults. Audit fixture ownership before centralizing them. |
| Capacity benchmarks | The shared project helper pins four seconds; historical capacity cases pin their workload separately. | Preserve explicit workload settings and independent byte/CPU expectations. Defaults changing must not silently change benchmarks. |
| Shared browser helpers | Tests reveal controls through real navigation. Async preview state and the frame/pixel reads deserve review. | Audit navigation side effects and capture frame identifiers and pixels together when sampling live playback. |

## Completion checklist

- [x] Inventory timing, layout and saved-default risks in the first pass.
- [x] Replace six guessed waits in three animation control tests.
- [ ] Finish the remaining timing-test changes, including controlled-clock pause checks.
- [ ] Review layout thresholds against explicit UI requirements.
- [ ] Review serialization fixtures, shared helpers and order-dependent state.
- [ ] Confirm the audit changes in Chromium and both iPad WebKit CI projects.

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
