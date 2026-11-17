const {test, expect, project, loadProject, download, ui} = require('./helpers.cjs');

async function drag(page, cols, rows, a, b) {
  await page.locator('#canvas').evaluate((c, {cols, rows, a, b}) => {
    const r = c.getBoundingClientRect();
    const fire = (type, p) => c.dispatchEvent(new PointerEvent(type, {
      pointerId: 42, pointerType: 'pen', isPrimary: true, bubbles: true, cancelable: true,
      clientX: r.left + (p[0] + 0.5) * r.width / cols,
      clientY: r.top + (p[1] + 0.5) * r.height / rows,
    }));
    fire('pointerdown', a);
    fire('pointermove', b);
    fire('pointerup', b);
  }, {cols, rows, a, b});
}

async function armPaint(page, mode) {
  await page.locator('#paint').click();
  await page.locator('#paintMenu .tool-mode-option[data-mode="' + mode + '"]').click();
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.locator('.app[data-ready=true]').waitFor();
  await loadProject(page, project([160, '', 160, ''], 2, 2, {cellColors: [2, 3, 4, 5], selectedGlyph: 257}));
});

test('glyph-only paint keeps inks', async ({page}) => {
  await armPaint(page, 'glyph');
  await drag(page, 2, 2, [0, 1], [0, 1]);
  const p = JSON.parse(await download(page, '#saveProject'));
  expect(p.grid[2]).toBe(257);
  expect(p.cellColors[2]).toBe(4);
});

test('ink-only paint keeps glyphs', async ({page}) => {
  await page.locator('#inkQuick').click();
  await page.locator('#quickInkPalette button').nth(14).click();
  await armPaint(page, 'ink');
  await drag(page, 2, 2, [0, 0], [0, 0]);
  const after = JSON.parse(await download(page, '#saveProject'));
  expect(after.grid[0]).toBe(160);
  expect(after.cellColors[0]).toBe(14);
});

test('ink-only paint skips empty cells', async ({page}) => {
  await armPaint(page, 'ink');
  await drag(page, 2, 2, [1, 0], [1, 0]);
  const p = JSON.parse(await download(page, '#saveProject'));
  expect(p.grid[1]).toBe('');
});