const {GifReader}=require('omggif');
const {chooseInk,ui,test,expect,download,loadProject,project}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project([160,''],2,1,{selectedGlyph:160,animation:{effect:'scroll-x',seconds:.5,scale:4,background:'dark'}}))});
test('each animation format has one download action and reuses a completed file on a second tap',async({page})=>{
 await expect(page.locator('#gifDownload,#videoDownload,#framesDownload')).toHaveCount(0);
 for(const [id,label] of [['exportGif','Download GIF'],['exportFrames','Download frame ZIP'],['exportVideo','Download video']]){
  const first=await download(page,'#'+id),button=page.locator('#'+id),url=await button.getAttribute('data-download-url');await expect(button).toHaveText(label);expect(url).toMatch(/^blob:/);const second=await download(page,'#'+id);expect(second).toEqual(first);await expect(button).toHaveAttribute('data-download-url',url);await expect(page.locator('#export-motion button:visible')).toHaveCount(3); // Preview, Edit and the single format action.
 }
});
test('artwork and output changes regenerate the file instead of downloading stale content',async({page})=>{
 const first=await download(page,'#exportGif'),url=await page.locator('#exportGif').getAttribute('data-download-url');await chooseInk(page,2);await ui(page,'#recolorDrawing');const red=await download(page,'#exportGif');expect(red).not.toEqual(first);expect(await page.locator('#exportGif').getAttribute('data-download-url')).not.toBe(url);const gif=new GifReader(red),pixels=new Uint8Array(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(0,pixels);expect(Array.from(pixels.slice((16*gif.width+16)*4,(16*gif.width+16)*4+3))).toEqual([104,55,43]);
 await ui(page,'#gifScale','selectOption','1');const small=await download(page,'#exportGif');expect(new GifReader(small).width).toBe(16);expect(small).not.toEqual(red);await ui(page,'#animationColor','selectOption','color-cycle');expect(new GifReader(await download(page,'#exportGif')).numFrames()).toBe(16);
});
test('download progress restores the same button after cancellation or an encoder error',async({page})=>{
 let release,requested;const gate=new Promise(r=>release=r),started=new Promise(r=>requested=r);await page.route('**/vendor/gifenc.esm.js',async route=>{requested();await gate;await route.abort()});await ui(page,'#exportGif');await requested;await expect(page.locator('#exportGif')).toHaveText('Preparing GIF…');await expect(page.locator('#exportGif')).toBeDisabled();await ui(page,'#cancelAnimationExport');release();await expect(page.locator('#status')).toHaveText('Animation export canceled');await expect(page.locator('#exportGif')).toHaveText('Download GIF');await expect(page.locator('#exportGif')).toBeEnabled();await expect(page.locator('#exportGif')).not.toHaveAttribute('data-download-url',/./);
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#exportGif');await expect(page.locator('#status')).toContainText('GIF export failed');await expect(page.locator('#exportGif')).toHaveText('Download GIF');await expect(page.locator('#exportGif')).toBeEnabled();
});

test('animation export shows progress bar and mirrored status in the dialog',async({page})=>{
 let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);
 await page.route('**/vendor/gifenc.esm.js',async route=>{started();await gate;await route.continue()});
 await ui(page,'#exportGif');await loading;
 await expect(page.locator('#exportProgressWrap')).toBeVisible();
 await expect(page.locator('#downloadStatus')).toContainText(/Preparing GIF/);
 await expect(page.locator('#stageExportStatus')).toContainText(/Preparing GIF/);
 await ui(page,'#cancelSheetDownload');release();
 await expect(page.locator('#exportBadge')).toHaveText('Canceled');
 await expect(page.locator('#exportProgressWrap')).toBeHidden();
});
test('animation export shows frame counts while rendering',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='chromium','frame counter timing is checked on Chromium only');
 test.setTimeout(120000);
 await ui(page,'#animationColor','selectOption','color-cycle');
 await ui(page,'#animationSeconds','selectOption','4');
 const progress=page.waitForFunction(()=>{
  const dialog=document.querySelector('#downloadStatus')?.textContent||'';
  const stage=document.querySelector('#stageExportStatus')?.textContent||'';
  const match=/Rendering GIF: \d+ \/ \d+/;
  return match.test(dialog)&&match.test(stage);
 },undefined,{timeout:90000});
 const done=download(page,'#exportGif');
 await progress;
 await done;
});
test('stage shows export progress when the download dialog is closed',async({page})=>{
 let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);
 await page.route('**/video-export.js',async route=>{started();await gate;await route.continue()});
 await ui(page,'#animationFormat','selectOption','video');
 await ui(page,'#exportVideo');await loading;
 await expect(page.locator('#cancelAnimationExport')).toBeVisible();
 await page.locator('#downloadClose').click();
 await expect(page.locator('#stageExportProgressWrap')).toBeVisible();
 await expect(page.locator('#stageExportStatus')).toContainText(/Preparing video/);
 await page.locator('#cancelAnimationExport').click();release();
 await expect(page.locator('#exportBadge')).toHaveText('Canceled');
 await expect(page.locator('#stageExportProgressWrap')).toBeHidden();
});
