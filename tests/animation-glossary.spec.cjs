const {test,expect,ui,loadProject,project,waitForPreviewAdvance}=require('./helpers.cjs');
test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
});
async function openAnimationGroup(page){
 await page.locator('#animationDetails').evaluate(d=>{d.open=true});
}
async function openSidebarIfPhone(page){
 if(test.info().project.name==='ipad-portrait')await ui(page,'#toggle');
}
test('animation glossary collapsed by default with terms on expand',async({page})=>{
 await openSidebarIfPhone(page);
 await openAnimationGroup(page);
 await expect(page.locator('#animationGlossary')).not.toHaveJSProperty('open',true);
 await page.locator('#animationGlossary').evaluate(d=>{d.open=true});
 await expect(page.locator('#animationGlossary')).toHaveJSProperty('open',true);
 const terms=await page.locator('#animationGlossary dt').allTextContents();
 expect(terms.length).toBeGreaterThanOrEqual(6);
 expect(terms.join(' ')).toMatch(/Generated frames/);
 expect(terms.join(' ')).toMatch(/Frame ZIP/);
 expect(await page.locator('#animationInfo').innerText()).toMatch(/Animation glossary/);
});
test('glossary readable during animation preview',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{animation:{effect:'wave',colorEffect:'none',seconds:2,scale:1,background:'dark'}}));
 await ui(page,'#quickPlay');
 await waitForPreviewAdvance(page);
 await expect(page.locator('#stageHint')).toContainText('read-only');
 await openSidebarIfPhone(page);
 await openAnimationGroup(page);
 await page.locator('#animationGlossary').evaluate(d=>{d.open=true});
 await expect(page.locator('#animationGlossary dt').first()).toBeVisible();
 await ui(page,'#returnDrawing');
});