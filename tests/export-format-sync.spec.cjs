const {test,expect}=require('./helpers.cjs');
// A browser can restore a <select> value (reload, Back) without firing change.
// The Download dialog must still show the controls for the value on screen.
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});

test('restored Video format shows video controls, not GIF, when Download opens',async({page})=>{
 await page.locator('#animationFormat').evaluate(s=>{s.value='video'}); // no change event, like form restoration
 await page.locator('#downloadOpen').click();
 await page.locator('#export-tab-motion').click();
 await expect(page.locator('#animationFormat')).toHaveValue('video');
 await expect(page.locator('#exportVideo')).toBeVisible();
 await expect(page.locator('#exportGif')).toBeHidden();
 await expect(page.locator('#exportFrames')).toBeHidden();
});

test('restored SVG still format hides PNG controls when Download opens',async({page})=>{
 await page.locator('#stillFormat').evaluate(s=>{s.value='svg'});
 await page.locator('#downloadOpen').click();
 await expect(page.locator('#svg')).toBeVisible();
 await expect(page.locator('#png')).toBeHidden();
 await expect(page.locator('#pngResolution')).toBeHidden();
});

test('choosing each animation format shows only its controls',async({page})=>{
 await page.locator('#downloadOpen').click();
 await page.locator('#export-tab-motion').click();
 for(const [format,button] of [['video','#exportVideo'],['frames','#exportFrames'],['gif','#exportGif']]){
  await page.locator('#animationFormat').selectOption(format);
  for(const other of ['#exportGif','#exportVideo','#exportFrames'])await (other===button?expect(page.locator(other)).toBeVisible():expect(page.locator(other)).toBeHidden());
 }
});
