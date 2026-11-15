const {test, expect, project, loadProject, download, ui} = require('./helpers.cjs');

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.locator('.app[data-ready=true]').waitFor();
});

function rowLuma(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#canvas');
    const context = canvas.getContext('2d');
    const line = canvas.height / 8;
    const x = Math.floor(canvas.width / 2);
    const top = context.getImageData(x, Math.floor(line * 0.2), 1, 1).data;
    const bottom = context.getImageData(x, Math.floor(line * 0.95), 1, 1).data;
    const luma = pixel => pixel[0] * 0.299 + pixel[1] * 0.587 + pixel[2] * 0.114;
    return {top: luma(top), bottom: luma(bottom)};
  });
}

test('monitor scanlines show on the canvas and in the saved project, and the program stays clean', async ({page}) => {
  const art = project([160], 1, 1, {cellColors: [1], colors: {ink: 1, background: 6}});
  await loadProject(page, art);
  const plain = await rowLuma(page);
  await ui(page, '#colorDetails');
  await ui(page, '#screenLook', 'selectOption', 'monitor');
  const monitored = await rowLuma(page);
  expect(monitored.bottom).toBeLessThan(monitored.top - 4);
  expect(monitored.bottom).toBeGreaterThan(plain.bottom * 0.75);
  const saved = JSON.parse(await download(page, '#saveProject'));
  expect(saved.screen).toBe('monitor');
  expect(saved.grid).toEqual([160]);
  const program = await download(page, '#exportC64');
  await ui(page, '#screenLook', 'selectOption', 'none');
  const clean = await download(page, '#exportC64');
  expect([...program]).toEqual([...clean]);
});
