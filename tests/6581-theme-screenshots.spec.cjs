const {test,expect}=require('@playwright/test');

test('capture Commodore enclosure styling in the full editor viewport',async({page},testInfo)=>{
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
 await expect(page.locator('#canvas')).toBeVisible();
 await expect(page.getByRole('toolbar',{name:'Drawing controls'})).toBeVisible();
 const theme=await page.evaluate(()=>({
  trim:getComputedStyle(document.documentElement).getPropertyValue('--case-trim').trim(),
  highlight:getComputedStyle(document.documentElement).getPropertyValue('--case-highlight').trim()
 }));
 expect(theme).toEqual({trim:'#d4cbb7',highlight:'#ffdf70'});
 await testInfo.attach('editor-viewport-'+testInfo.project.name,{body:await page.screenshot({animations:'disabled',fullPage:true}),contentType:'image/png'});
 // Show settings and the glyph palette together where space allows.
 if(!(await page.locator('#sidebar').isVisible()))await page.locator('#toggle').click();
 if(!(await page.locator('#glyphPicker').isVisible()))await page.locator('#glyphToggle').click();
 await expect(page.locator('#glyphPicker')).toBeVisible();
 await testInfo.attach('editor-panels-'+testInfo.project.name,{body:await page.screenshot({animations:'disabled',fullPage:true}),contentType:'image/png'});
});
