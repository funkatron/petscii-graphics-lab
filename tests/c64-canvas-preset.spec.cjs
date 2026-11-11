const {test,expect,ui,loadProject,project}=require('./helpers.cjs');
test('C64 screen preset stages 40 × 25, preserves artwork until Apply, and supports Undo',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project([160,257],2,1,{cellColors:[2,3]}));
 await ui(page,'#c64CanvasPreset');
 await expect(page.locator('#columns')).toHaveValue('40');
 await expect(page.locator('#rows')).toHaveValue('25');
 await expect(page.locator('#resizeDraft')).toBeVisible();
 await expect(page.locator('#dimensions')).toContainText('2 × 1');
 await ui(page,'#cancelResize');
 await expect(page.locator('#resizeDraft')).toBeHidden();
 await ui(page,'#c64CanvasPreset');
 await ui(page,'#applyResize');
 await expect(page.locator('#dimensions')).toContainText('40 × 25');
 await ui(page,'#undo');
 await expect(page.locator('#dimensions')).toContainText('2 × 1');
});
