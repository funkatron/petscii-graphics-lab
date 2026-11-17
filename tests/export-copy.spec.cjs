const {test,expect,ui,loadProject,project}=require('./helpers.cjs');
test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
});
test('scroller help appears for scroll movement on native and animation tabs',async({page})=>{
 await loadProject(page,project([160,''],4,1,{animation:{effect:'scroll-x',colorEffect:'none',seconds:2,scale:1,background:'dark',scrollDirection:'left'}}));
 await ui(page,'#animationEffect','selectOption','scroll');
 await ui(page,'#downloadOpen');
 await ui(page,'#export-tab-data');
 await ui(page,'#c64Mode','selectOption','animation');
 const help=await page.locator('#c64ExportHelp').innerText();
 expect(help).toMatch(/scroller-style/i);
 await ui(page,'#export-tab-motion');
 await expect(page.locator('#exportScrollerNote')).toBeVisible();
 expect(await page.locator('#exportScrollerNote').innerText()).toMatch(/Native program \(PRG\)/);
 await ui(page,'#c64Mode','selectOption','still');
 await ui(page,'#export-tab-motion');
 await expect(page.locator('#exportScrollerNote')).toBeVisible();
 expect(await page.locator('#exportScrollerNote').innerText()).toMatch(/Selected animation/);
});
test('non-scroll movement hides scroller export note',async({page})=>{
 await loadProject(page,project([160],2,1,{animation:{effect:'inverse',colorEffect:'none',seconds:1,scale:1,background:'dark'}}));
 await ui(page,'#downloadOpen');
 await expect(page.locator('#exportScrollerNote')).toBeHidden();
 await ui(page,'#export-tab-data');
 await ui(page,'#c64Mode','selectOption','animation');
 const help=await page.locator('#c64ExportHelp').innerText();
 expect(help).not.toMatch(/scroller-style program on/i);
});