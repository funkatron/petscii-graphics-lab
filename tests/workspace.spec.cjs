const {test,expect,ui,reveal,download,loadProject,project}=require('./helpers.cjs');
const {PNG}=require('pngjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('letters reveal both cases without a whole-drawing character switch',async({page})=>{
 await ui(page,'#showAlphanumerics','check');await expect(page.locator('#charset')).toHaveCount(0);
 for(const code of [1,129,257,385,48,176])await expect(page.locator('#palette button[data-g="'+code+'"]').first()).toHaveCount(1);
});
test('drawing controls stay reachable with settings hidden at phone width',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('.app[data-ready=true]').waitFor();
 for(const id of ['glyphToggle','inkQuick','paint','erase','undo','redo','symmetryMenu'])await expect(page.locator('#'+id)).toBeInViewport();
 await page.locator('#erase').click();await expect(page.locator('#erase')).toHaveAttribute('aria-pressed','true');await page.locator('#paint').click();await expect(page.locator('#paint')).toHaveAttribute('aria-pressed','true');
 await page.locator('#inkQuick').click();await expect(page.locator('#quickInkPalette')).toBeVisible();await page.locator('#quickInkPalette button').nth(2).click();await expect(page.locator('#inkQuick')).toHaveAttribute('title','Ink: Red');
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
 await loadProject(page,project([160],1,1,{selectedGlyph:160,colors:{ink:0,background:0}}));await ui(page,'#glyphFamily','selectOption','similar');
 const tile=page.locator('#palette button[data-g="224"] canvas');const rgba=await tile.evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data));expect(rgba.filter((_,i)=>i%4===0)).toContain(255);
 await page.locator('#palette button[data-g="224"]').click();await ui(page,'#favoriteGlyph');await ui(page,'#glyphFamily','selectOption','favorites');await expect(page.locator('#palette button[data-g="224"]')).toHaveCount(1);expect((await page.locator('#palette button').boundingBox()).width).toBeLessThan(70);
 await page.locator('#glyphFamily').selectOption('recent');await expect(page.locator('#palette button[data-g="224"]')).toHaveCount(1);await expect(page.locator('#palette button[data-g="224"]')).toHaveCount(1);
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#glyphFamily','selectOption','favorites');await expect(page.locator('#palette button[data-g="224"]')).toHaveCount(1);
});
test('pinned glyph picker remains open on tablet selection and still fits canvas',async({page})=>{
 await page.setViewportSize({width:1024,height:768});await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#glyphPin');await page.getByRole('button',{name:'C64 glyph ID 83',exact:true}).click();await expect(page.locator('#glyphPicker')).toBeVisible();await expect(page.locator('#glyphBackdrop')).toBeHidden();
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
 const png=PNG.sync.read(await download(page,'#png'));expect([png.width,png.height]).toEqual([64,32]);const glyphsOpen=await page.locator('#glyphPicker').isVisible();await page.keyboard.press('Escape');await expect(page.locator('#downloadDialog')).not.toBeVisible();await expect(page.locator('#downloadOpen')).toBeFocused();expect(await page.locator('#glyphPicker').isVisible()).toBe(glyphsOpen);
 await ui(page,'#animationFormat','selectOption','video');await ui(page,'#videoRepeats','fill','3');await expect(page.locator('#downloadDimensions')).toContainText('12 seconds');await page.locator('#downloadClose').click();await expect(page.locator('#saveStatus')).toHaveText('Saved on this device');
});
test('autosave failures stay visible on a small screen and do not prevent project backups',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='petscii-graphics-project-v3')throw new DOMException('Storage full','QuotaExceededError');return original.call(this,key,value)}});await page.reload();await page.locator('.app[data-ready=true]').waitFor();
 await expect(page.locator('#saveFailure')).toBeVisible();await expect(page.locator('#saveStatus')).toHaveAttribute('data-state','failed');const p=JSON.parse(await download(page,'#saveProject'));expect(p.grid).toHaveLength(256);
});
test('visual families include authentic graphics and inverse glyphs, with exact pages still accessible',async({page})=>{
 await ui(page,'#glyphFamily','selectOption','corners');await expect(page.locator('#palette button[data-g="75"]')).toHaveCount(1);await expect(page.locator('#palette button[data-g="203"]')).toHaveCount(1);
 await page.locator('#glyphFamily').selectOption('symbols');await expect(page.locator('#palette button[data-g="83"]')).toHaveCount(1);await expect(page.locator('#palette button[data-g="1"]')).toHaveCount(0);
 await page.locator('#glyphFamily').selectOption('similar');await expect(page.locator('#palette button')).toHaveCount(190);
});

test('quick ink selection leaves settings and artwork alone, dismisses safely, and is undoable',async({page})=>{
 await loadProject(page,project([160,''],2,1,{selectedGlyph:160,cellColors:[2,14]}));
 if(await page.locator('#glyphBackdrop').isVisible())await page.locator('#glyphClose').click();
 if(await page.locator('#toggle').getAttribute('aria-expanded')==='true')await page.locator('#toggle').click();
 const read=()=>page.locator('#canvas').evaluate(c=>[.25,.75].map(x=>Array.from(c.getContext('2d').getImageData(c.width*x,c.height*.5,1,1).data)));const before=await read();
 await page.locator('#inkQuick').click();await expect(page.locator('#inkPopover')).toBeVisible();await expect(page.locator('#sidebar')).toHaveClass(/closed/);
 for(const swatch of await page.locator('#quickInkPalette button').all())expect(await swatch.boundingBox()).toMatchObject({width:expect.any(Number),height:expect.any(Number)});
 await page.getByRole('button',{name:'Ink: Green',exact:true}).click();await expect(page.locator('#inkPopover')).toBeHidden();await expect(page.locator('#inkQuick')).toBeFocused();await expect(page.locator('#stageHint')).toContainText('Green ink');expect(await read()).toEqual(before);
 await page.locator('#inkQuick').click();await page.keyboard.press('Escape');await expect(page.locator('#inkPopover')).toBeHidden();await expect(page.locator('#inkQuick')).toBeFocused();
 await page.locator('#inkQuick').click();await expect(page.locator('#sidebar')).toHaveCSS('width','0px');const box=await page.locator('#canvas').boundingBox();await page.locator('#canvas').click({position:{x:box.width*.95,y:box.height*.95}});await expect(page.locator('#inkPopover')).toBeHidden();
 // The outside click is a normal drawing action and uses the newly selected brush.
 const p=JSON.parse(await download(page,'#saveProject'));expect(p.cellColors).toEqual([2,5]);expect(p.grid).toEqual([160,160]);await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([160,'']);await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject')).colors.ink).toBe(14);
});
test('paint and eraser select consistent tools, with read-only preview made explicit',async({page})=>{
 await loadProject(page,project([160,''],2,1,{selectedGlyph:160}));
 await ui(page,'#erase');await ui(page,'#erase');await expect(page.locator('#erase')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#stageHint')).toContainText('Eraser');
 await ui(page,'#paint');await ui(page,'#paint');await expect(page.locator('#paint')).toHaveAttribute('aria-pressed','true');
 await ui(page,'#quickPlay');for(const id of ['paint','erase'])await expect(page.locator('#'+id)).toBeDisabled();await expect(page.locator('#previewLabel')).toContainText('Read-only preview');
 await ui(page,'#quickPlay');for(const id of ['paint','erase'])await expect(page.locator('#'+id)).toBeDisabled();await expect(page.locator('#previewLabel')).toContainText('Paused');
 await ui(page,'#returnDrawing');for(const id of ['paint','erase'])await expect(page.locator('#'+id)).toBeEnabled();await expect(page.locator('#animationStop')).toBeDisabled();
});
test('glyph codes are optional device preferences and do not change project contents',async({page})=>{
 const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#glyphFamily','selectOption','blocks');await expect(page.locator('#palette button[data-g="160"] small')).toBeHidden();await expect(page.locator('#palette button[data-g="160"]')).toHaveAttribute('aria-label','C64 glyph ID 160');
 await ui(page,'#showGlyphCodes','check');await expect(page.locator('#palette button[data-g="160"] small')).toHaveText('A0');await expect(page.locator('#palette button[data-g="160"] small')).toBeVisible();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#showGlyphCodes','isChecked');await expect(page.locator('#showGlyphCodes')).toBeChecked();await ui(page,'#showGlyphCodes','uncheck');await ui(page,'#glyphFamily','selectOption','blocks');await expect(page.locator('#palette button[data-g="160"] small')).toBeHidden();
});
test('quick ink palette fits narrow and enlarged-text workspaces with usable targets',async({page})=>{
 for(const width of [390,768,1024]){
  await page.setViewportSize({width,height:844});await page.locator('html').evaluate(e=>e.style.fontSize='24px');await page.locator('#inkQuick').click();const p=await page.locator('#inkPopover').boundingBox();expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x+p.width).toBeLessThanOrEqual(width);expect(p.y+p.height).toBeLessThanOrEqual(844);
  for(const button of await page.locator('#quickInkPalette button').all()){const r=await button.boundingBox();expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44)}await page.keyboard.press('Escape');
 }
});

test('default glyph browser groups similar shapes across code pages without duplicates or missing graphics',async({page})=>{
 await ui(page,'#glyphToggle');if(await page.locator('#glyphPicker').isHidden())await page.locator('#glyphToggle').click();
 await expect(page.locator('#glyphFamily')).toHaveValue('similar');await expect(page.locator('#glyphPage, #paletteMode')).toHaveCount(0);await expect(page.locator('#showAlphanumerics')).not.toBeChecked();
 await expect(page.locator('#palette .glyph-family')).toHaveText(['Blocks','Lines','Corners','Diagonals','Symbols','Other symbols']);
 const codes=await page.locator('#palette button').evaluateAll(bs=>bs.map(b=>Number(b.dataset.g)));expect(codes).toHaveLength(190);expect(new Set(codes).size).toBe(190);
 for(const code of [160,32,351,479,361,489,378,506])expect(codes).toContain(code);
 const corners=await page.locator('#palette button[data-family="corners"]').evaluateAll(bs=>bs.map(b=>Number(b.dataset.g)));
 expect(corners).toEqual([73,201,74,202,75,203,76,204,79,207,80,208,85,213,108,236,109,237,110,238]);
 await page.locator('#palette button[data-g="75"]').click();await expect(page.locator('#quickglyph')).toHaveText('#75');
 await ui(page,'#showAlphanumerics','check');const all=await page.locator('#palette button').evaluateAll(bs=>bs.map(b=>Number(b.dataset.g)));expect(all).toHaveLength(314);expect(new Set(all).size).toBe(314);
 await ui(page,'#showAlphanumerics','uncheck');await expect(page.locator('#palette button')).toHaveCount(190);await ui(page,'#showAlphanumerics','check');
 await ui(page,'#glyphFamily','selectOption','similar');await expect(page.locator('#palette button')).toHaveCount(314);
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#glyphToggle');if(await page.locator('#glyphPicker').isHidden())await page.locator('#glyphToggle').click();await expect(page.locator('#glyphFamily')).toHaveValue('similar');
});

test('letter toggle alone controls alphanumerics across paired glyph selection, imports, undo and reload',async({page})=>{
 for(const bank of [0,1]){
  await loadProject(page,project([160],1,1,{charset:bank,selectedGlyph:160}));await ui(page,'#glyphFamily','selectOption','similar');
  await expect(page.locator('#showAlphanumerics')).not.toBeChecked();
  for(const code of [1,26,48,57,129,154,176,185,257,282,385,410])await expect(page.locator('#palette button[data-g="'+code+'"]').first()).toHaveCount(0);
  await ui(page,'#palette [data-g="32"]');await expect(page.locator('#glyphFamily')).toHaveValue('similar');await expect(page.locator('#showAlphanumerics')).not.toBeChecked();await expect(page.locator('#palette button[data-g="32"]')).toHaveAttribute('aria-pressed','true');
  await ui(page,'#showAlphanumerics','check');await expect(page.locator('#palette button')).toHaveCount(314);await expect(page.locator('#palette .glyph-family').last()).toHaveText('Letters & numbers');await page.locator('#palette button[data-g="1"]').click();await ui(page,'#palette [data-g="129"]');await expect(page.locator('#palette button[data-g="129"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#showAlphanumerics')).toBeChecked();
  const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#showAlphanumerics','uncheck');await expect(page.locator('#hiddenGlyph')).toBeVisible();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
  await loadProject(page,project([1],1,1,{charset:bank,selectedGlyph:1}));await expect(page.locator('#showAlphanumerics')).not.toBeChecked();await ui(page,'#undo');await expect(page.locator('#showAlphanumerics')).not.toBeChecked();
 }
 await ui(page,'#showAlphanumerics','check');await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#glyphToggle');if(await page.locator('#glyphPicker').isHidden())await page.locator('#glyphToggle').click();await expect(page.locator('#showAlphanumerics')).not.toBeChecked();await expect(page.locator('#glyphFamily')).toHaveValue('similar');await expect(page.locator('#palette button[data-g="1"]')).toHaveCount(0);
});
