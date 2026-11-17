const {GifReader} = require('omggif');
const {test, expect, project, loadProject, download} = require('./helpers.cjs');
const {capacityPage} = require('./c64-capacity-fixtures.cjs');

const depthEffects = ['perspective-floor', 'curved-road', 'tunnel-flight'];
const profiles = [
  {
    name: 'sparse',
    cols: 4,
    rows: 4,
    grid: Array.from({length: 16}, (_, i) => (i % 2 === 0 ? 160 : '')),
    cellColors: Array.from({length: 16}, (_, i) => i % 16),
  },
  {
    name: 'dense',
    cols: 7,
    rows: 5,
    grid: Array(35).fill(160),
    cellColors: Array(35).fill(2),
  },
];

test('depth effects sparse vs dense export and C64 analyze', async ({page}, testInfo) => {
  test.setTimeout(120000);
  await capacityPage(page);
  const results = [];
  for (const effect of depthEffects) {
    for (const profile of profiles) {
      const {grid, cellColors, cols, rows} = profile;
      await loadProject(page, project(grid, cols, rows, {
        cellColors,
        animation: {
          effect,
          colorEffect: 'none',
          seconds: 2,
          scale: 1,
          background: 'dark',
          motionCycles: 1,
        },
      }));
      const row = await page.evaluate(async () => {
        const {createC64AdaptiveProgram} = await import('./c64-export.js');
        const input = window.capacityInput();
        let analysis;
        let error = '';
        try {
          analysis = createC64AdaptiveProgram({...input, analyze: true});
        } catch (e) {
          error = e.message;
        }
        const frameCount = input.frames.length;
        if (!analysis) {
          return {frameCount, error, fits: false};
        }
        const d = analysis.diagnostics;
        const fits = d.programBytes <= d.memoryLimit && d.worstUpdateRatio <= 1;
        if (!fits && error === '') {
          error = d.worstUpdateRatio > 1 ? 'playback speed' : 'memory budget';
        }
        return {
          frameCount,
          renderer: d.renderer,
          fits,
          error,
          programBytes: d.programBytes,
          worstUpdateRatio: d.worstUpdateRatio,
        };
      });
      const gif = new GifReader(await download(page, '#exportGif'));
      expect(gif.numFrames(), `${effect} ${profile.name}`).toBe(48);
      results.push({effect, profile: profile.name, cols, rows, gifFrames: gif.numFrames(), ...row});
    }
  }
  await testInfo.attach('depth-triage-report.json', {body: JSON.stringify(results, null, 2), contentType: 'application/json'});
  for (const row of results) {
    expect(row.frameCount).toBe(48);
    expect(row.renderer).toBeTruthy();
  }
  const sparse = results.filter((r) => r.profile === 'sparse');
  expect(sparse.every((r) => r.fits || r.error)).toBe(true);
});