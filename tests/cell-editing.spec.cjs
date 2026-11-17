const {test, expect, ui, download, loadProject, project} = require('./helpers.cjs');

async function tapCell(page, col, row) {
  const box = await page.locator('#canvas').boundingBox();
  const cols = Number(await page.locator('#columns').inputValue());
  const rows = Number(await page.locator('#rows').inputValue());
  await page.mouse.click(
    box.x + (box.width * (col + 0.5)) / cols,
    box.y + (box.height * (row + 0.5)) / rows,
  );
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.locator('.app[data-ready=true]').waitFor();
});

test('edit cell changes glyph and ink with one undo after Done', async ({page}) => {
  await loadProject(page, project([160, ''], 2, 1, {cellColors: [1, 1]}));
  const before = JSON.parse(await download(page, '#saveProject'));
  await ui(page, '#tool-cell');
  await tapCell(page, 0, 0);
  await expect(page.locator('#cellInspectorBar')).toBeVisible();
  await ui(page, '#cellInspectorPickGlyph');
  await page.locator('#palette button[data-g="102"]').first().click();
  await ui(page, '#cellInspectorPickInk');
  await page.locator('#cellInkPalette button[data-ink="3"]').click();
  const mid = JSON.parse(await download(page, '#saveProject'));
  expect(mid.grid[0]).toBe(102);
  expect(mid.cellColors[0]).toBe(3);
  await ui(page, '#cellInspectorDone');
  await ui(page, '#undo');
  const after = JSON.parse(await download(page, '#saveProject'));
  expect(after).toEqual(before);
});

test('clear cell matches eraser semantics', async ({page}) => {
  await loadProject(page, project([160], 1, 1, {cellColors: [5], colors: {ink: 2, background: 0}}));
  await ui(page, '#tool-cell');
  await tapCell(page, 0, 0);
  await ui(page, '#cellInspectorClear');
  const data = JSON.parse(await download(page, '#saveProject'));
  expect(data.grid[0]).toBe('');
  expect(data.cellColors[0]).toBe(2);
});

test('edit cell disabled during animation preview', async ({page}) => {
  await loadProject(
    page,
    project([160, 160], 2, 1, {
      cellColors: [2, 3],
      animation: {effect: 'none', colorEffect: 'color-wave', seconds: 0.5, scale: 2, background: 'dark'},
    }),
  );
  await ui(page, '#quickPlay');
  await expect(page.locator('#previewLabel')).toContainText('Read-only preview');
  await expect(page.locator('#tool-cell')).toBeDisabled();
});