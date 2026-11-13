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

// Machine owns appearance: data-ui-theme is mapped from the header Machine control (c64->c64c).
test('default C64C look matches ivory baseline; machine switches map to themes without recoloring VIC artwork',async({page},testInfo)=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/');
 await page.evaluate(()=>{localStorage.removeItem('petscii-workspace-prefs');localStorage.removeItem('petscii-graphics-project-v3')});
 await page.reload();
 await page.locator('.app[data-ready=true]').waitFor();
 const before=await themeTokens(page);
 expect(before.theme).toBe('c64c');
 expect(before.caseBg).toBe('#d4cbb7');
 await expect(page.locator('#machineSummary')).toHaveText('C64 · Pepto');
 await page.locator('#canvas').click({position:{x:24,y:24}});
 const painted=await themeTokens(page);
 expect(painted.artInk).toBeTruthy();
 expect(painted.artBg).toBeTruthy();

 await page.locator('#machineMenu > summary').click();
 await page.locator('#workspaceMachine').selectOption('plus4');
 const plus4=await themeTokens(page);
 expect(plus4.theme).toBe('plus4');
 expect(plus4.caseBg).toBe('#2f2f2f');
 // Plus/4 remaps inks into TED space (undoable); it must still publish artwork tokens.
 expect(plus4.artInk).toBeTruthy();
 expect(plus4.artBg).toBeTruthy();
 await expect(page.locator('#machineSummary')).toHaveText('Plus/4 · TED');
 const plus4Header=await page.locator('header').evaluate(el=>{
  const c=getComputedStyle(el).backgroundColor;
  const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if(!m)return c;
  return Number(m[1])+Number(m[2])+Number(m[3]);
 });
 expect(plus4Header).toBeLessThan(220);

 // Export status + glyph keys follow charcoal tokens (not ivory hex locks).
 await page.locator('#downloadOpen').click();
 await expect(page.locator('#downloadDialog')).toBeVisible();
 const plus4Status=await page.evaluate(()=>{
  const root=getComputedStyle(document.documentElement);
  const status=getComputedStyle(document.querySelector('#downloadStatus'));
  const badge=getComputedStyle(document.querySelector('#exportBadge'));
  return {
   textStatus:root.getPropertyValue('--text-status').trim(),
   statusColor:status.color,
   badgeColor:badge.color
  };
 });
 expect(plus4Status.textStatus).toBe('#f0f0f0');
 expect(plus4Status.statusColor).toMatch(/rgb\(\s*240,\s*240,\s*240\s*\)/);
 expect(plus4Status.badgeColor).toMatch(/rgb\(\s*240,\s*240,\s*240\s*\)/);
 await testInfo.attach('theme-plus4-download-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });
 await page.locator('#downloadClose').click();
 if(await page.locator('#glyphPicker').isHidden()){
  await page.locator('#glyphToggle').click();
 }
 await expect(page.locator('.glyph-picker .palette .glyph').first()).toBeVisible();
 const plus4Glyph=await page.locator('.glyph-picker .palette .glyph').first().evaluate(el=>{
  const root=getComputedStyle(document.documentElement);
  const style=getComputedStyle(el);
  const canvas=el.querySelector('canvas');
  return {
   keyToken:root.getPropertyValue('--glyph-key-bg').trim(),
   backgroundImage:style.backgroundImage,
   filter:canvas?getComputedStyle(canvas).filter:''
  };
 });
 expect(plus4Glyph.keyToken).toContain('#4a4a4a');
 expect(plus4Glyph.backgroundImage).toMatch(/linear-gradient/i);
 expect(plus4Glyph.backgroundImage.toLowerCase()).toContain('rgb(74, 74, 74)');
 expect(plus4Glyph.filter==='none'||plus4Glyph.filter==='').toBeTruthy();
 await testInfo.attach('theme-plus4-glyphs-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });
 await testInfo.attach('theme-plus4-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });

 await page.locator('#machineMenu > summary').click();
 await page.locator('#workspaceMachine').selectOption('c128');
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
 await page.locator('#machineMenu > summary').click();
 await page.locator('#workspaceMachine').selectOption('c64');
 await expect(page.locator('#machineSummary')).toHaveText('C64 · Pepto');
 await testInfo.attach('theme-c64c-ipad-landscape-'+testInfo.project.name,{
  body:await page.screenshot({animations:'disabled',fullPage:true}),
  contentType:'image/png'
 });

 await page.setViewportSize({width:1280,height:800});
 await page.locator('#machineMenu > summary').click();
 await page.locator('#workspaceMachine').selectOption('c128');
 await page.reload();
 await page.locator('.app[data-ready=true]').waitFor();
 expect(await page.evaluate(()=>document.documentElement.dataset.uiTheme)).toBe('c128');
 await expect(page.locator('#machineSummary')).toHaveText('C128 · Pepto');
});
