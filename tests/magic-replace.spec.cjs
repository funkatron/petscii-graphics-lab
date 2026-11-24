const {test, expect, ui, download, loadProject, project} = require('./helpers.cjs');

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.locator('.app[data-ready=true]').waitFor();
});

test('replace ink and glyph with one undo each', async ({page}) => {
  await loadProject(page, project([160, 102], 2, 1, {cellColors: [1, 2]}));
  const before = JSON.parse(await download(page, '#saveProject'));
  await ui(page, '#canvasTool');
  await page.locator('#replaceInkFromPalette button[data-ink="1"]').click();
  await page.locator('#replaceInkToPalette button[data-ink="3"]').click();
  await ui(page, '#applyReplaceInk');
  let mid = JSON.parse(await download(page, '#saveProject'));
  expect(mid.cellColors[0]).toBe(3);
  expect(mid.cellColors[1]).toBe(2);
  await ui(page, '#replaceGlyphFromPick');
  await page.locator('#palette button[data-g="102"]').first().click();
  await expect.poll(() => page.locator('#canvasPopover').evaluate(el => el.matches(':popover-open'))).toBe(true);
  await ui(page, '#replaceGlyphToPick');
  await page.locator('#palette button[data-g="160"]').first().click();
  await expect.poll(() => page.locator('#canvasPopover').evaluate(el => el.matches(':popover-open'))).toBe(true);
  await ui(page, '#applyReplaceGlyph');
  mid = JSON.parse(await download(page, '#saveProject'));
  expect(mid.grid).toEqual([160, 160]);
  await ui(page, '#undo');
  await ui(page, '#undo');
  expect(JSON.parse(await download(page, '#saveProject'))).toEqual(before);
});
// Raskin review M4: Canvas commands sit apart from drawing tools, name their colors,
// default To ink to the brush ink, and act on the selection when there is one.
test('canvas commands default to brush ink, name colors and respect a selection', async ({page}) => {
  await page.setViewportSize({width: 1180, height: 820});
  await loadProject(page, project([160, 160, 160, 160], 4, 1, {cellColors: [1, 1, 1, 1]}));
  // Grouped with Undo/Redo, after the last drawing tool.
  const canvasBox = await page.locator('#canvasTool').boundingBox(), textBox = await page.locator('#tool-text').boundingBox(), undoBox = await page.locator('#undo').boundingBox();
  expect(canvasBox.x).toBeGreaterThan(textBox.x);
  expect(canvasBox.x).toBeLessThan(undoBox.x);
  // Defaults: To = current brush ink, From = the most used other ink; both named.
  await ui(page, '#inkQuick');
  await page.locator('#quickInkPalette button[data-ink="5"]').click();
  await ui(page, '#canvasTool');
  await expect(page.locator('#replaceInkToPalette button[data-ink="5"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#replaceInkFromPalette button[data-ink="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#replaceInkSummary')).toHaveText(/^\S.* → \S/);
  await page.keyboard.press('Escape');
  // Select the first two cells, then recolor: only the selection changes.
  await ui(page, '#tool-select');
  const canvas = page.locator('#canvas');
  await canvas.focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(page.locator('#deselect')).toBeVisible();
  await ui(page, '#canvasTool');
  await expect(page.locator('#recolorDrawing')).toHaveText('Recolor selection with current brush ink');
  await ui(page, '#recolorDrawing');
  const saved = JSON.parse(await download(page, '#saveProject'));
  expect(saved.cellColors).toEqual([5, 5, 1, 1]);
});
