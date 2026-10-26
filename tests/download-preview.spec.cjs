const {test,expect,ui,download,loadProject,project}=require('./helpers.cjs');
const pixels=page=>page.locator('#downloadPreview').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data));
test.beforeEach(async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,3,4,5],animation:{effect:'scroll-x',colorEffect:'color-wave',seconds:1,scale:2,background:'transparent'}}));
});
test('Animation plays the output preview in the modal and Stop restores its first frame without editing the project',async({page})=>{
 const before=await download(page,'#saveProject');await ui(page,'#animationFormat','selectOption','gif');
 const button=page.locator('#motionPreview'),first=await pixels(page);
 await expect(button).toHaveText('▶ Play preview');await button.focus();await page.keyboard.press('Space');
 await expect(button).toHaveText('■ Stop preview');await expect(button).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>pixels(page)).not.toEqual(first);await expect(page.locator('#downloadDialog')).toBeVisible();
 await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','true');
 await page.locator('#animationFormat').selectOption('video');await expect(button).toHaveText('■ Stop preview');
 await page.locator('#animationFormat').selectOption('gif');await button.click();
 await expect(button).toHaveText('▶ Play preview');await expect(button).toHaveAttribute('aria-pressed','false');
 expect(await pixels(page)).toEqual(first);await page.waitForTimeout(250);expect(await pixels(page)).toEqual(first);
 await expect(page.locator('#previewBanner')).toBeHidden();expect(await download(page,'#saveProject')).toEqual(before);
});
test('C64 animation shows the same live preview with canvas colors and synchronized Play/Stop controls',async({page})=>{
 await ui(page,'#c64Mode','selectOption','still');await expect(page.locator('#c64Preview')).toBeHidden();await expect(page.locator('#downloadFigure')).toBeHidden();
 await page.locator('#c64Mode').selectOption('animation');await expect(page.locator('#downloadFigure')).toBeVisible();
 const first=await pixels(page),button=page.locator('#c64Preview');
 await expect(page.locator('#downloadDimensions')).toContainText('320 × 200 pixels · 4 × 1 cells centered');
 expect(await page.locator('#downloadPreview').evaluate(c=>Array.from(c.getContext('2d').getImageData(18*8+4,12*8+4,1,1).data))).toEqual([104,55,43,255]);
 expect(first.slice(0,4)).toEqual([53,40,121,255]);
 expect(first.filter((_,i)=>i%4===3).every(a=>a===255)).toBe(true);
 await button.click();await expect.poll(()=>pixels(page)).not.toEqual(first);
 await page.locator('#c64Format').selectOption('d64');await expect(button).toHaveText('■ Stop preview');
 await page.locator('#export-tab-motion').click();await expect(page.locator('#motionPreview')).toHaveText('■ Stop preview');
 await page.locator('#motionPreview').click();await page.locator('#export-tab-data').click();
 await expect(button).toHaveText('▶ Play preview');expect(await pixels(page)).toEqual(first);
 await page.locator('#downloadClose').click();await ui(page,'#quickPlay');await ui(page,'#quickPlay');
 await ui(page,'#c64Mode','selectOption','animation');await expect(button).toHaveText('■ Stop preview');
 await button.click();await expect(page.locator('#previewBanner')).toBeHidden();
});
test('modal preview controls fit portrait and landscape iPad layouts',async({page},testInfo)=>{
 for(const [width,height] of [[810,1080],[1080,810]]){
  await page.setViewportSize({width,height});
  for(const selector of ['#motionPreview','#c64Preview']){
   if(selector==='#motionPreview')await ui(page,'#animationFormat','selectOption','gif');else await ui(page,'#c64Mode','selectOption','animation');
   await expect(page.locator(selector)).toBeInViewport();await expect(page.locator('#downloadPreview')).toBeInViewport();
   expect(await page.locator('#downloadDialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
   await page.screenshot({path:'/tmp/petscii-preview-'+testInfo.project.name+'-'+width+'-'+selector.slice(1)+'.png',fullPage:true});
  }
 }
});
