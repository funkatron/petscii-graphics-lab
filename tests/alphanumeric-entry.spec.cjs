const {PNG}=require('pngjs');
const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
const {glyphRows}=require('./glyph-reference.cjs');
const saved=async page=>JSON.parse(await download(page,'#saveProject'));
async function startText(page,x=0,y=0){
 await ui(page,'#tool-text');
 const canvas=page.locator('#canvas'),r=await canvas.boundingBox(),size=await page.locator('#dimensions').textContent(),[w,h]=size.split(' × ').map(Number);
 const position={x:(x+.5)*r.width/w,y:(y+.5)*r.height/h};
 if(await page.evaluate(()=>navigator.maxTouchPoints>0))await canvas.tap({position});else await canvas.click({position});
 await expect(page.locator('#typedText')).toBeFocused();
}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project(Array(32).fill(160),8,4,{cellColors:Array(32).fill(7),colors:{ink:3,background:6}}))});
test('typed mixed-case text previews without changing files, then applies exact glyphs and colors in one Undo',async({page})=>{
 const before=await saved(page);await startText(page,1,1);const pixels=await page.locator('#canvas').evaluate(c=>c.toDataURL());
 await page.locator('#typedText').fill('Az09\nb @');await expect(page.locator('#applyText')).toBeEnabled();
 expect(await page.locator('#canvas').evaluate(c=>c.toDataURL())).not.toBe(pixels);expect(await saved(page)).toEqual(before);
 await ui(page,'#applyText');const after=await saved(page),expected=before.grid.slice(),inks=before.cellColors.slice();
 for(const [i,g] of [[9,1],[10,282],[11,48],[12,57],[17,258],[18,32],[19,0]]){expected[i]=g;inks[i]=3}
 expect(after.grid).toEqual(expected);expect(after.cellColors).toEqual(inks);expect(after.animation).toEqual(before.animation);expect(after.selectedGlyph).toBe(before.selectedGlyph);await expect(page.locator('#showAlphanumerics')).not.toBeChecked();
 await ui(page,'#undo');expect(await saved(page)).toEqual(before);await ui(page,'#redo');expect(await saved(page)).toEqual(after);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('petscii-graphics-project-v3')))).toEqual(after);
 await ui(page,'#pngScale','selectOption','1');await ui(page,'#pngBg','selectOption','transparent');const png=PNG.sync.read(await download(page,'#png'));
 for(const i of [9,10,11,12,17,18,19])for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const offset=((Math.floor(i/8)*16+y*2+1)*png.width+(i%8)*16+x*2+1)*4,on=!!(glyphRows(expected[i])[y]&(128>>x));
  expect([...png.data.subarray(offset,offset+4)]).toEqual(on?[112,164,178,255]:[0,0,0,0]);
 }
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(await saved(page)).toEqual(after);
});
test('native textarea corrections, line breaks, wrapping and relocation preserve the starting column',async({page})=>{
 await startText(page,6,0);await page.locator('#typedText').pressSequentially('Az9');await page.locator('#typedText').press('Backspace');await page.locator('#typedText').press('Enter');await page.locator('#typedText').pressSequentially('b12');
 await ui(page,'#applyText');const p=await saved(page);expect(p.grid.slice(6,8)).toEqual([1,282]);expect(p.grid.slice(14,16)).toEqual([258,49]);expect(p.grid[22]).toBe(50);
 await startText(page,7,3);await page.locator('#typedText').fill('Ab');await expect(page.locator('#applyText')).toBeDisabled();
 // Reposition an existing draft by tapping a cell, without resetting its text.
 const r=await page.locator('#canvas').boundingBox();await page.locator('#canvas').click({position:{x:r.width*.0625,y:r.height*.125}});await expect(page.locator('#typedText')).toHaveValue('Ab');await expect(page.locator('#applyText')).toBeEnabled();await page.locator('#typedText').press('Control+Enter');expect((await saved(page)).grid.slice(0,2)).toEqual([1,258]);
});
test('unsupported or overflowing text and cancellation preserve source and redo',async({page})=>{
 const before=await saved(page);await loadProject(page,project([511],1,1));const future=await saved(page);await ui(page,'#undo');
 await startText(page,7,3);
 for(const text of ['AB','A🙂','é','\\','_']){
  await page.locator('#typedText').fill(text);await expect(page.locator('#applyText')).toBeDisabled();await expect(page.locator('#typedText')).toHaveAttribute('aria-invalid','true');expect(await saved(page)).toEqual(before);await expect(page.locator('#redo')).toBeEnabled();
 }
 await page.locator('#typedText').fill('Z');await page.locator('#typedText').press('Escape');await expect(page.locator('.text-entry')).toBeHidden();await expect(page.locator('#paint')).toHaveAttribute('aria-pressed','true');expect(await saved(page)).toEqual(before);await ui(page,'#redo');expect(await saved(page)).toEqual(future);
});
test('drafts are discarded by tool changes, project loads and animation; typing stays disabled during preview',async({page})=>{
 const before=await saved(page);await startText(page);await page.locator('#typedText').fill('Draft');await ui(page,'#tool-line');expect(await saved(page)).toEqual(before);await expect(page.locator('#typedText')).toHaveValue('');
 await startText(page);await page.locator('#typedText').fill('Draft');await ui(page,'#quickPlay');await expect(page.locator('#tool-text')).toBeDisabled();await expect(page.locator('.text-entry')).toBeHidden();expect(await saved(page)).toEqual(before);
 await ui(page,'#returnDrawing');await startText(page);await page.locator('#typedText').fill('Draft');await loadProject(page,project([0],1,1));expect((await saved(page)).grid).toEqual([0]);await expect(page.locator('#typedText')).toHaveValue('');
});
test('text controls fit below the artwork at iPad sizes and at 200% text',async({page},testInfo)=>{
 for(const [width,height] of [[810,1080],[1080,810]]){
  await page.setViewportSize({width,height});await startText(page);await page.locator('#typedText').fill('Hello 64');
  const canvas=await page.locator('#canvas').boundingBox(),dock=await page.locator('.text-entry').boundingBox();expect(dock.y).toBeGreaterThanOrEqual(canvas.y+canvas.height-1);expect(canvas.height).toBeGreaterThan(0);
  await expect(page.locator('#applyText')).toBeInViewport();await expect(page.locator('#cancelText')).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await testInfo.attach(`text-${width}x${height}`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});await ui(page,'#cancelText');
 }
 await page.addStyleTag({content:'html{font-size:200%}'});await startText(page);await page.locator('#typedText').fill('A');await ui(page,'#applyText');expect((await saved(page)).grid[0]).toBe(1);
});

test('keyboard-only placement positions the origin and focuses native text input',async({page})=>{
 await ui(page,'#tool-text');await page.locator('#canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(page.locator('#typedText')).toBeFocused();await page.locator('#typedText').pressSequentially('Ab2');await page.locator('#typedText').press('Control+Enter');expect((await saved(page)).grid.slice(9,12)).toEqual([1,258,50]);
});
