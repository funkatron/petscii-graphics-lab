const {ui,test,expect,download}=require('./helpers.cjs');
test('solid block and inverse blank remain in Blocks without revealing letters or changing views',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#glyphFamily','selectOption','blocks');await ui(page,'#palette [data-g="160"]');await expect(page.locator('#quickglyph')).toHaveText('#160');await expect(page.locator('#showAlphanumerics')).not.toBeChecked();
 await ui(page,'#border');expect(JSON.parse(await download(page,'#saveProject')).grid[0]).toBe(160);
 await ui(page,'#inverse');await expect(page.locator('#glyphFamily')).toHaveValue('blocks');await expect(page.locator('#showAlphanumerics')).not.toBeChecked();await expect(page.locator('#palette [data-g="32"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#quickglyph')).toHaveText('#32');await expect(page.locator('#glyphPicker')).toBeVisible();
 await ui(page,'#inverse');await expect(page.locator('#palette [data-g="160"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#palette [data-g="1"]')).toHaveCount(0);
});
