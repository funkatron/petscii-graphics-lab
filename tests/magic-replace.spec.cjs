const {test, expect, ui, download, loadProject, project} = require('./helpers.cjs');

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.locator('.app[data-ready=true]').waitFor();
});

test('replace ink and glyph with one undo each', async ({page}) => {
  await loadProject(page, project([160, 102], 2, 1, {cellColors: [1, 2]}));
  const before = JSON.parse(await download(page, '#saveProject'));
  await ui(page, '#canvasTool');
  await page.locator('#replaceInkFrom').selectOption('1');
  await page.locator('#replaceInkTo').selectOption('3');
  await ui(page, '#applyReplaceInk');
  let mid = JSON.parse(await download(page, '#saveProject'));
  expect(mid.cellColors[0]).toBe(3);
  expect(mid.cellColors[1]).toBe(2);
  await ui(page, '#replaceGlyphFromPick');
  await page.locator('#palette button[data-g="102"]').first().click();
  await ui(page, '#replaceGlyphToPick');
  await page.locator('#palette button[data-g="160"]').first().click();
  await ui(page, '#applyReplaceGlyph');
  mid = JSON.parse(await download(page, '#saveProject'));
  expect(mid.grid).toEqual([160, 160]);
  await ui(page, '#undo');
  await ui(page, '#undo');
  expect(JSON.parse(await download(page, '#saveProject'))).toEqual(before);
});