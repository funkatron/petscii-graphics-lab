const {test,expect,ui,reveal,download,loadProject,project}=require('./helpers.cjs');
const {PNG}=require('pngjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('drawing controls stay reachable with settings hidden at phone width',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('.app[data-ready=true]').waitFor();
 for(const id of ['glyphToggle','inkQuick','paint','erase','undo','redo','symmetryMenu'])await expect(page.locator('#'+id)).toBeInViewport();
 await page.locator('#erase').click();await expect(page.locator('#erase')).toHaveAttribute('aria-pressed','true');await page.locator('#paint').click();await expect(page.locator('#paint')).toHaveAttribute('aria-pressed','true');
 await page.locator('#inkQuick').click();await expect(page.locator('#colorPalette')).toBeVisible();await page.locator('#colorPalette button').nth(2).click();await expect(page.locator('#inkQuick')).toHaveAttribute('title','Ink: Red');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});
test('resize stages both dimensions, previews cropping, cancels and applies with one undo',async({page})=>{
 await loadProject(page,project([160,83,160,83],2,2,{cellColors:[2,3,4,5]}));const before=await page.locator('#output').inputValue();
 await reveal(page,'#columns');await page.locator('#columns').selectOption('1');await page.locator('#rows').selectOption('1');
 await expect(page.locator('#dimensions')).toHaveText('2 × 2');expect(await page.locator('#output').inputValue()).toBe(before);await expect(page.locator('#resizeSummary')).toContainText('3 painted cells will be cropped');
 await page.locator('#cancelResize').click();await expect(page.locator('#resizeDraft')).toBeHidden();await page.locator('#columns').selectOption('1');await page.locator('#rows').selectOption('1');await page.locator('#applyResize').click();
 await expect(page.locator('#dimensions')).toHaveText('1 × 1');let p=JSON.parse(await download(page,'#saveProject'));expect(p.cellColors).toEqual([2]);await ui(page,'#undo');p=JSON.parse(await download(page,'#saveProject'));expect(p.grid).toEqual([160,83,160,83]);expect(p.cellColors).toEqual([2,3,4,5]);await ui(page,'#redo');await expect(page.locator('#dimensions')).toHaveText('1 × 1');
});
test('glyph thumbnails stay legible in black ink; recent and favorite selection preserve bank',async({page})=>{
 await loadProject(page,project([160],1,1,{selectedGlyph:160,colors:{ink:0,background:0}}));await ui(page,'#glyphPage','selectOption','3');
 const tile=page.locator('#palette button[data-g="224"] canvas');const rgba=await tile.evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data));expect(rgba.filter((_,i)=>i%4===0)).toContain(255);
 await page.locator('#palette button[data-g="224"]').click();await ui(page,'#favoriteGlyph');await ui(page,'#glyphFamily','selectOption','favorites');await expect(page.locator('#palette button[data-g="224"]')).toHaveCount(1);expect((await page.locator('#palette button').boundingBox()).width).toBeLessThan(70);
 await page.locator('#glyphFamily').selectOption('recent');await expect(page.locator('#palette button[data-g="224"]')).toHaveCount(1);await ui(page,'#charset','selectOption','1');await expect(page.locator('#palette button')).toHaveCount(0);await expect(page.locator('#glyphEmpty')).toBeVisible();await ui(page,'#charset','selectOption','0');await expect(page.locator('#palette button[data-g="224"]')).toHaveCount(1);
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#glyphFamily','selectOption','favorites');await expect(page.locator('#palette button[data-g="224"]')).toHaveCount(1);
});
test('pinned glyph picker remains open on tablet selection and still fits canvas',async({page})=>{
 await page.setViewportSize({width:1024,height:768});await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#glyphPin');await page.getByRole('button',{name:'C64 screen code 83',exact:true}).click();await expect(page.locator('#glyphPicker')).toBeVisible();await expect(page.locator('#glyphBackdrop')).toBeHidden();
 const c=await page.locator('#canvas').boundingBox(),f=await page.locator('#frame').boundingBox();expect(c.width).toBeLessThanOrEqual(f.width);expect(c.height).toBeLessThanOrEqual(f.height);await page.locator('#glyphClose').click();
});
test('preview labels stay explicit when paused and Return restores original colored drawing',async({page})=>{
 await loadProject(page,project([160,160],2,1,{cellColors:[2,3],animation:{effect:'none',colorEffect:'color-wave',seconds:.5,scale:2,background:'dark'}}));const readPixels=()=>page.locator('#canvas').evaluate(c=>[.25,.75].map(x=>Array.from(c.getContext('2d').getImageData(c.width*x,c.height*.5,1,1).data)));const before=await readPixels();
 await ui(page,'#quickPlay');await expect(page.locator('#previewLabel')).toContainText('Rainbow wave');await ui(page,'#quickPlay');await expect(page.locator('#previewLabel')).toContainText('Paused');await page.locator('#returnDrawing').click();await expect(page.locator('#previewBanner')).toBeHidden();
 expect(await readPixels()).toEqual(before);expect(JSON.parse(await download(page,'#saveProject')).cellColors).toEqual([2,3]);
});
test('download sheet shows actual dimensions and matching grid-free colors, with keyboard dismissal',async({page})=>{
 await loadProject(page,project([160,''],2,1,{cellColors:[2,3]}));await ui(page,'#pngScale','selectOption','2');await ui(page,'#pngBg','selectOption','transparent');await expect(page.locator('#downloadDimensions')).toContainText('64 × 32 pixels');
 expect(await page.locator('#downloadPreview').evaluate(c=>Array.from(c.getContext('2d').getImageData(4,4,1,1).data))).toEqual([104,55,43,255]);expect(await page.locator('#downloadPreview').evaluate(c=>c.getContext('2d').getImageData(12,4,1,1).data[3])).toBe(0);
 const png=PNG.sync.read(await download(page,'#png'));expect([png.width,png.height]).toEqual([64,32]);await page.keyboard.press('Escape');await expect(page.locator('#downloadDialog')).not.toBeVisible();await expect(page.locator('#downloadOpen')).toBeFocused();
 await ui(page,'#animationFormat','selectOption','video');await ui(page,'#videoRepeats','fill','3');await expect(page.locator('#downloadDimensions')).toContainText('12 seconds');await page.locator('#downloadClose').click();await expect(page.locator('#saveStatus')).toHaveText('Saved on this device');
});
test('autosave failures stay visible on a small screen and do not prevent project backups',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='petscii-graphics-project-v2')throw new DOMException('Storage full','QuotaExceededError');return original.call(this,key,value)}});await page.reload();await page.locator('.app[data-ready=true]').waitFor();
 await expect(page.locator('#saveFailure')).toBeVisible();await expect(page.locator('#saveStatus')).toHaveAttribute('data-state','failed');const p=JSON.parse(await download(page,'#saveProject'));expect(p.grid).toHaveLength(256);
});
test('visual families include authentic graphics and inverse glyphs, with exact pages still accessible',async({page})=>{
 await ui(page,'#glyphFamily','selectOption','corners');await expect(page.locator('#palette button[data-g="75"]')).toHaveCount(1);await expect(page.locator('#palette button[data-g="203"]')).toHaveCount(1);
 await page.locator('#glyphFamily').selectOption('symbols');await expect(page.locator('#palette button[data-g="83"]')).toHaveCount(1);await expect(page.locator('#palette button[data-g="1"]')).toHaveCount(0);
 await page.locator('#glyphPage').selectOption('1');await expect(page.locator('#glyphFamily')).toHaveValue('page');await expect(page.locator('#palette button')).toHaveCount(64);
});
