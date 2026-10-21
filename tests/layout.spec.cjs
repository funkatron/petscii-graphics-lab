const {test,expect,loadProject,project,download}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('compact disclosures and export tabs expose every format without changing artwork',async({page})=>{
 await loadProject(page,project([160,0],2,1));const before=await page.locator('#output').inputValue();
 for(const id of ['animationDetails','canvasDetails','helpDetails'])await expect(page.locator('#'+id)).not.toHaveAttribute('open','');
 const height=await page.locator('#sidebar').evaluate(e=>({scroll:e.scrollHeight,client:e.clientHeight}));expect(height.scroll).toBe(height.client);
 await page.locator('#downloadOpen').click();await expect(page.locator('#export-still')).toBeVisible();await expect(page.locator('#export-motion')).toBeHidden();
 await page.locator('#export-tab-still').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#export-tab-motion')).toBeFocused();await expect(page.locator('#export-tab-motion')).toHaveAttribute('aria-selected','true');
 for(const [format,id] of [['video','exportVideo'],['frames','exportFrames'],['gif','exportGif']]){
  await page.locator('#animationFormat').selectOption(format);await expect(page.locator('#'+id)).toBeVisible();
  for(const other of ['exportGif','exportFrames','exportVideo'].filter(x=>x!==id))await expect(page.locator('#'+other)).toBeHidden();
 }
 await page.locator('#editAnimation').click();await expect(page.locator('#animationEffect')).toBeFocused();await page.locator('#animationSeconds').selectOption('0.5');await expect(page.locator('#motionSummary')).toContainText('0.5 s / loop');
 await page.locator('#downloadOpen').click();await page.locator('#export-tab-motion').focus();await page.keyboard.press('End');await expect(page.locator('#export-data')).toBeVisible();await page.keyboard.press('Home');await expect(page.locator('#export-still')).toBeVisible();
 expect(await page.locator('#output').inputValue()).toBe(before);await page.locator('#downloadClose').click();await page.locator('#undo').click();expect(JSON.parse(await download(page,'#saveProject')).grid.every(g=>g==='')).toBe(true);await expect(page.locator('#undo')).toBeDisabled();await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','false');
});
test('glyph picker is independent from tools, with single scrolling surface and responsive selection',async({page})=>{
 const wide=page.viewportSize().width>=1200;await expect(page.locator('#sidebar #palette')).toHaveCount(0);
 if(!wide)await page.locator('#glyphToggle').click();await expect(page.locator('#glyphPicker')).toBeVisible();
 const overflow=await page.locator('#palette').evaluate(e=>getComputedStyle(e).overflowY);expect(overflow).toBe('visible');
 await page.locator('#glyphOptions > summary').click();const viewport=page.viewportSize();await page.setViewportSize({...viewport,height:480});const sidebarScroll=await page.locator('#sidebar').evaluate(e=>e.scrollTop);
 await page.locator('#glyphPicker').evaluate(e=>e.scrollBy(0,10000));expect(await page.locator('#glyphPicker').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);expect(await page.locator('#sidebar').evaluate(e=>e.scrollTop)).toBe(sidebarScroll);await page.setViewportSize(viewport);
 await page.getByRole('button',{name:'C64 screen code 64',exact:true}).click();await expect(page.locator('#quickglyph')).toHaveText('#64');
 if(wide)await expect(page.locator('#glyphPicker')).toBeVisible();else{await expect(page.locator('#glyphPicker')).toBeHidden();await expect(page.locator('#glyphToggle')).toBeFocused()}
 if(wide)await page.locator('#glyphClose').click();
 await page.locator('#toggle').click();await expect(page.locator('#sidebar')).not.toBeVisible();await page.locator('#glyphToggle').click();await expect(page.locator('#glyphPicker')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#glyphPicker')).toBeHidden();await expect(page.locator('#glyphToggle')).toBeFocused();
});
test('small-screen picker dismisses without painting and header stays within viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('.app[data-ready=true]').waitFor();
 const before=await page.locator('#output').inputValue();await page.locator('#glyphToggle').click();const box=await page.locator('#glyphPicker').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
 await page.locator('#glyphBackdrop').click({position:{x:2,y:2}});await expect(page.locator('#glyphPicker')).toBeHidden();expect(await page.locator('#output').inputValue()).toBe(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await expect(page.locator('#quickPlay')).toBeInViewport();await expect(page.locator('#glyphToggle')).toBeInViewport();
});
test('export remains cancelable when its sheet is closed and previous completed download survives navigation',async({page})=>{
 await loadProject(page,project([160]));await download(page,'#exportGif');await expect(page.locator('#exportBadge')).toHaveText('GIF ready');const old=await page.locator('#exportGif').getAttribute('data-download-url');
 await page.locator('#export-tab-data').click();await page.locator('#export-tab-motion').click();await expect(page.locator('#exportGif')).toBeVisible();expect(await page.locator('#exportGif').getAttribute('data-download-url')).toBe(old);
 let release,started;const gate=new Promise(r=>release=r),requested=new Promise(r=>started=r);await page.route('**/video-export.js',async route=>{started();await gate;await route.continue()});
 await page.locator('#animationFormat').selectOption('video');await page.locator('#exportVideo').click();await requested;await page.locator('#downloadClose').click();await expect(page.locator('#cancelAnimationExport')).toBeVisible();await page.locator('#cancelAnimationExport').click();release();await expect(page.locator('#exportBadge')).toHaveText('Canceled');await expect(page.locator('#cancelAnimationExport')).toBeHidden();expect(await page.locator('#exportGif').getAttribute('data-download-url')).toBe(old);
});
