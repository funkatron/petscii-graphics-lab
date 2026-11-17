const {test,expect,ui,loadProject,project,waitForPreviewAdvance}=require('./helpers.cjs');
test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
});
async function openAnimationGroup(page){
 await page.locator('#animationDetails').evaluate(d=>{d.open=true});
}
test('animation glossary collapsed by default with terms on expand',async({page})=>{
 await openAnimationGroup(page);
 await expect(page.locator('#animationGlossary')).not.toHaveJSProperty('open',true);
 await page.locator('#animationGlossary > summary').click();
 await expect(page.locator('#animationGlossary')).toHaveJSProperty('open',true);
 const terms=await page.locator('#animationGlossary dt').allTextContents();
 expect(terms.length).toBeGreaterThanOrEqual(6);
 expect(terms.join(' ')).toMatch(/Generated frames/);
 expect(terms.join(' ')).toMatch(/Frame ZIP/);
 expect(await page.locator('#animationInfo').innerText()).toMatch(/Animation glossary/);
});
test('glossary reachable at 200% text on iPad portrait',async({page})=>{
 await page.setViewportSize({width:810,height:1080});
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
 await page.addStyleTag({content:'html{font-size:200%}'});
 await ui(page,'#toggle');
 await openAnimationGroup(page);
 await page.locator('#animationGlossary').evaluate(d=>{d.open=true});
 const sidebar=await page.locator('#sidebar').boundingBox();
 const summary=await page.locator('#animationGlossary > summary').boundingBox();
 expect(summary.x).toBeGreaterThanOrEqual(sidebar.x);
 expect(summary.x+summary.width).toBeLessThanOrEqual(sidebar.x+sidebar.width);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(810);
});
test('glossary readable during animation preview',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{animation:{effect:'wave',colorEffect:'none',seconds:2,scale:1,background:'dark'}}));
 await ui(page,'#quickPlay');
 await waitForPreviewAdvance(page);
 await expect(page.locator('#stageHint')).toContainText('read-only');
 await openAnimationGroup(page);
 await page.locator('#animationGlossary > summary').click();
 await expect(page.locator('#animationGlossary dt').first()).toBeVisible();
 await ui(page,'#returnDrawing');
});