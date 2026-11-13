const {test,expect}=require('@playwright/test');

async function themeTokens(page){
 return page.evaluate(()=>{
  const style=getComputedStyle(document.documentElement);
  return {
   theme:document.documentElement.dataset.uiTheme,
   caseBg:style.getPropertyValue('--case-bg').trim(),
   caseText:style.getPropertyValue('--case-text').trim(),
   artInk:style.getPropertyValue('--art-ink').trim(),
   artBg:style.getPropertyValue('--art-bg').trim()
  };
 });
}

test('default C64C theme matches ivory baseline and leaves artwork tokens alone',async({page},testInfo)=>{
 await page.goto('/');
 await page.evaluate(()=>localStorage.removeItem('petscii-ui-theme'));
 await page.reload();
 await page.locator('.app[data-ready=true]').waitFor();
 const before=await themeTokens(page);
 expect(before.theme).toBe('c64c');
 expect(before.caseBg).toBe('#d4cbb7');
 await expect(page.locator('#uiThemeSummary')).toHaveText('C64C');
 await page.locator('#canvas').click({position:{x:24,y:24}});
 const painted=await themeTokens(page);
 expect(painted.artInk).toBeTruthy();
 expect(painted.artBg).toBeTruthy();

 await page.locator('#uiThemeMenu > summary').click();
 await page.locator('#uiTheme').selectOption('plus4');
 const plus4=await themeTokens(page);
 expect(plus4.theme).toBe('plus4');
 expect(plus4.caseBg).toBe('#2f2f2f');
 expect(plus4.artInk).toBe(painted.artInk);
 expect(plus4.artBg).toBe(painted.artBg);
 await expect(page.locator('#uiThemeSummary')).toHaveText('Plus/4');
 const plus4Header=await page.locator('header').evaluate(el=>{
  const c=getComputedStyle(el).backgroundColor;
  const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if(!m)return c;
  return Number(m[1])+Number(m[2])+Number(m[3]);
 });
 expect(plus4Header).toBeLessThan(220);
 await testInfo.attach('theme-plus4-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });

 await page.locator('#uiThemeMenu > summary').click();
 await page.locator('#uiTheme').selectOption('c128');
 const c128=await themeTokens(page);
 expect(c128.theme).toBe('c128');
 expect(c128.caseBg).toBe('#c5c0b4');
 expect(c128.artInk).toBe(painted.artInk);
 await testInfo.attach('theme-c128-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });

 await page.locator('#downloadOpen').click();
 await expect(page.locator('#downloadDialog')).toBeVisible();
 await testInfo.attach('theme-c128-download-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });
 await page.locator('#downloadClose').click();

 // Desktop Chromium stand-ins when local WebKit deps are unavailable; CI still runs iPad projects.
 await page.setViewportSize({width:810,height:1080});
 await page.locator('#projectMenu > summary').click();
 await expect(page.locator('.project-menu')).toBeVisible();
 await testInfo.attach('theme-c128-ipad-portrait-project-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });
 await page.locator('#projectMenu > summary').click();
 await page.setViewportSize({width:1080,height:810});
 await page.locator('#uiThemeMenu > summary').click();
 await page.locator('#uiTheme').selectOption('c64c');
 await expect(page.locator('#uiThemeSummary')).toHaveText('C64C');
 await testInfo.attach('theme-c64c-ipad-landscape-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });

 await page.setViewportSize({width:1280,height:800});
 await page.locator('#uiThemeMenu > summary').click();
 await page.locator('#uiTheme').selectOption('c128');
 await page.reload();
 await page.locator('.app[data-ready=true]').waitFor();
 expect(await page.evaluate(()=>document.documentElement.dataset.uiTheme)).toBe('c128');
 await expect(page.locator('#uiThemeSummary')).toHaveText('C128');
});
