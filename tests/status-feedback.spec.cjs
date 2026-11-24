const {test,expect,ui,project,loadProject}=require('./helpers.cjs');
// Raskin review M1/M2: routine stage messages fade, problems persist, the Download
// dialog does not show drawing messages, and device save state reads as a word.
test('routine status fades, problems persist, downloads stay separate, save state has a word',async({page})=>{
 await page.setViewportSize({width:1180,height:820});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 // A problem message (Play on an empty canvas) stays until replaced.
 await ui(page,'#quickPlay');const warning=await page.locator('#status').textContent();expect(warning).toMatch(/first/i);
 await page.waitForTimeout(7000);await expect(page.locator('#status')).toHaveText(warning);
 await loadProject(page,project([160,''],2,1));
 await ui(page,'#undo');await expect(page.locator('#status')).not.toHaveText('');
 await expect(page.locator('#status')).toHaveText('',{timeout:9000});
 await ui(page,'#redo');await ui(page,'#downloadOpen');await expect(page.locator('#downloadStatus')).not.toContainText(/Redid|Undid|Ready to draw/);
 await page.keyboard.press('Escape');
 const word=page.locator('#saveStatus .save-status-compact');await expect(word).toBeVisible();await expect(word).toHaveText('Saved');
});
