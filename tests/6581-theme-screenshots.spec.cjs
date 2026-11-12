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
 // Capture the actual animation preview, where the legacy theme previously leaked through.
 await page.locator('#glyphClose').click();
 await page.locator('#animationPlay').click();
 await expect(page.locator('#previewBanner')).toBeVisible();
 await page.locator('#quickPlay').click(); // Pause to keep the capture deterministic.
 await page.locator('.stagebar .help-trigger').click();
 await expect(page.locator('#contextHelp')).toBeVisible();
 await testInfo.attach('animation-preview-help-'+testInfo.project.name,{body:await page.screenshot({animations:'disabled',fullPage:true}),contentType:'image/png'});

});
