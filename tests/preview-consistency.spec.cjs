const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
// Raskin review H2: during read-only preview every drawing tool looks and behaves
// unavailable, and edits that leave preview say so.
test('preview dims every drawing tool and announces when an edit returns to drawing',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project([160,'',160,''],2,2,{animation:{effect:'scroll-x',seconds:2,scale:1,background:'dark'}}));
 const before=await download(page,'#saveProject');
 await ui(page,'#quickPlay');await expect(page.locator('#previewBanner')).toBeVisible();
 await ui(page,'#quickPlay');await expect(page.locator('#previewLabel')).toContainText('Paused');
 for(const id of ['paint','erase','tool-picker','tool-fill','tool-line','tool-rectangle','tool-select','tool-text']){
  const opacity=await page.locator('#'+id).evaluate(e=>+getComputedStyle(e).opacity);
  expect(opacity,id+' should look unavailable').toBeLessThan(.75);
 }
 await expect(page.locator('#stageHint')).toContainText('editing returns to drawing');
 // A dimmed tool does nothing: preview stays active.
 await page.locator('#tool-fill').click({force:true});await expect(page.locator('#previewBanner')).toBeVisible();
 await page.locator('#tool-line').click({force:true});await expect(page.locator('#previewBanner')).toBeVisible();
 expect(await download(page,'#saveProject')).toEqual(before);
 // An edit returns to drawing and says so.
 await ui(page,'#inkQuick');await page.locator('#quickInkPalette button').nth(2).click();
 await expect(page.locator('#previewBanner')).toBeHidden();
 await expect(page.locator('#status')).toContainText('Returned to drawing');
 for(const id of ['paint','erase','tool-fill','tool-line']){
  expect(await page.locator('#'+id).evaluate(e=>+getComputedStyle(e).opacity)).toBe(1);
 }
 // Undo from preview also announces the return.
 await ui(page,'#quickPlay');await expect(page.locator('#previewBanner')).toBeVisible();
 await ui(page,'#undo');await expect(page.locator('#previewBanner')).toBeHidden();
 await expect(page.locator('#status')).toContainText('Returned to drawing');
});
