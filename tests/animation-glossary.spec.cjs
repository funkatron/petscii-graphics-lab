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
test('animation glossary lives in the timing help panel',async({page})=>{
 await openSidebarIfPhone(page);
 await openAnimationGroup(page);
 await expect(page.locator('#animationGlossary')).toBeHidden();
 await page.getByRole('button',{name:'Help about animation timing'}).click();
 const body=page.locator('#contextHelp');
 await expect(body).toContainText('Generated frames');
 await expect(body).toContainText('Frame ZIP');
 await expect(body).toContainText('Animation glossary');
});
test('glossary readable during animation preview',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{animation:{effect:'wave',colorEffect:'none',seconds:2,scale:1,background:'dark'}}));
 await ui(page,'#quickPlay');
 await waitForPreviewAdvance(page);
 await expect(page.locator('#stageHint')).toContainText('read-only');
 await openSidebarIfPhone(page);
 await openAnimationGroup(page);
 await page.getByRole('button',{name:'Help about animation timing'}).click();
 await expect(page.locator('#contextHelp dt').first()).toBeVisible();
 await ui(page,'#returnDrawing');
});