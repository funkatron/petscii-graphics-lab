const {ui,reveal,test,expect,download,loadProject,project}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#paletteMode','selectOption','legacy');await ui(page,'#palette button');});
test('sparse touch and pen drags interpolate every cell, ignore secondary pointers, and undo once',async({page})=>{
 for(const pointerType of ['touch','pen']){
  await page.locator('#canvas').evaluate((c,pointerType)=>{
   const r=c.getBoundingClientRect();const fire=(type,x,id=1,primary=true)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType,isPrimary:primary,clientX:r.left+r.width*x,clientY:r.top+r.height*.1,bubbles:true,cancelable:true}));
   fire('pointerdown',.01);fire('pointerdown',.5,2,false);fire('pointermove',.99,2,false);fire('pointermove',.99);fire('pointerup',.99);
  },pointerType);
  const rows=(await page.locator('#output').inputValue()).split('\n');expect(rows[1]).toBe('█'.repeat(16));expect(rows.filter(r=>r.includes('█'))).toHaveLength(1);
  await ui(page,'#undo');expect(await page.locator('#output').inputValue()).not.toContain('█');await expect(page.locator('#undo')).toBeDisabled();
 }
});
test('iPad real touch tap draws and scroll suppression stays within drawing region',async({page,isMobile})=>{
 test.skip(!isMobile,'Real touchscreen is enabled in iPad profiles');
 await page.locator('#canvas').tap({position:{x:20,y:20}});expect(await page.locator('#output').inputValue()).toContain('█');
 const result=await page.evaluate(()=>{
  const canvas=document.querySelector('#canvas'),sidebar=document.querySelector('#sidebar');
  const inside=new Event('touchmove',{bubbles:true,cancelable:true});canvas.dispatchEvent(inside);
  const outside=new Event('touchmove',{bubbles:true,cancelable:true});sidebar.dispatchEvent(outside);
  return {inside:inside.defaultPrevented,outside:outside.defaultPrevented,action:getComputedStyle(canvas).touchAction};
 });expect(result).toEqual({inside:true,outside:false,action:'none'});
 // Downloads have their own dialog. Open settings disclosures to exercise
 // scrolling in the actual sidebar rather than relying on export controls.
 await reveal(page,'#border');await reveal(page,'#recolorDrawing');await reveal(page,'#animationEffect');
 expect(await page.locator('#sidebar').evaluate(e=>e.scrollHeight-e.clientHeight)).toBeGreaterThan(0);
 await page.locator('#sidebar').evaluate(e=>e.scrollBy(0,500));
 await expect.poll(()=>page.locator('#sidebar').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
});
test('native Chromium touch drag paints continuously without scrolling',async({page,browserName})=>{
 test.skip(browserName!=='chromium','CDP native touch dispatch is Chromium-only');
 const session=await page.context().newCDPSession(page);await session.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const r=await page.locator('#canvas').boundingBox();
 const point=x=>({x:r.x+r.width*x,y:r.y+r.height*.2,id:1});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(.02)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(.98)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 expect((await page.locator('#output').inputValue()).split('\n')[3]).toBe('█'.repeat(16));expect(await page.evaluate(()=>scrollY)).toBe(0);
 await ui(page,'#undo');expect(await page.locator('#output').inputValue()).not.toContain('█');
});
test('resize, collapse, and reload preserve artwork including a 40 by 25 screen',async({page})=>{
 await ui(page,'#output','fill','█▀\n▄█');await ui(page,'#import');
 await ui(page,'#columns','selectOption','40');await ui(page,'#rows','selectOption','25');
 const before=JSON.parse(await download(page,'#saveProject'));expect(before.grid.slice(0,2)).toEqual(['█','▀']);expect(before.grid.slice(40,42)).toEqual(['▄','█']);
 await ui(page,'#toggle');await expect(page.locator('#sidebar')).toHaveClass(/closed/);
 await expect.poll(async()=>{const c=await page.locator('#canvas').boundingBox(),f=await page.locator('#frame').boundingBox();return c.width<=f.width&&c.height<=f.height}).toBe(true);
 await ui(page,'#toggle');await page.reload();
 await expect(page.locator('#dimensions')).toHaveText('40 × 25');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(before.grid);
});
test('v1 projects of nonpreset dimensions remain editable; load undo restores bank and dimensions',async({page})=>{
 await loadProject(page,project([0,128],2,1,{charset:1}));
 const old=project(['█','','▀','','',''],3,2,{version:1,selectedGlyph:'▀'});await loadProject(page,old);
 await expect(page.locator('#columns')).toHaveValue('3');await expect(page.locator('#rows')).toHaveValue('2');
 await ui(page,'#undo');await expect(page.locator('#charset')).toHaveValue('1');await expect(page.locator('#dimensions')).toHaveText('2 × 1');
 await ui(page,'#redo');await expect(page.locator('#dimensions')).toHaveText('3 × 2');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(old.grid);
});
test('transparent and black PNG backgrounds preserve expected pixels and resolution',async({page})=>{
 await loadProject(page,project(['▀',''],2,1,{selectedGlyph:'▀'}));
 for(const bg of ['transparent','black']){
  await ui(page,'#pngBg','selectOption',bg);await ui(page,'#pngScale','selectOption','2');const png=await download(page,'#png');
  expect(png.readUInt32BE(16)).toBe(64);expect(png.readUInt32BE(20)).toBe(32);
  const colors=await page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const t=c.getContext('2d');t.drawImage(i,0,0);return [[8,8],[8,24],[48,8]].map(([x,y])=>Array.from(t.getImageData(x,y,1,1).data))},png.toString('base64'));
  expect(colors[0]).toEqual([108,94,181,255]);expect(colors[1]).toEqual(bg==='black'?[0,0,0,255]:[0,0,0,0]);expect(colors[2]).toEqual(colors[1]);
 }
});
test('narrow overlay closes fully and canvas remains usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.reload();
 await expect(page.locator('#sidebar')).not.toBeVisible();await ui(page,'#toggle');await expect(page.locator('#sidebar')).toBeVisible();
 await ui(page,'#toggle');await expect(page.locator('#sidebar')).not.toBeVisible();
 const c=await page.locator('#canvas').boundingBox();await page.mouse.click(c.x+c.width*.5,c.y+c.height*.5);
 expect(await page.locator('#output').inputValue()).toContain('█');
});
test('erase, patterns, and crop are individually undoable',async({page})=>{
 await ui(page,'#border');const border=await page.locator('#output').inputValue();
 await ui(page,'#checker');await ui(page,'#undo');expect(await page.locator('#output').inputValue()).toBe(border);
 await ui(page,'#columns','selectOption','8');await ui(page,'#undo');expect(await page.locator('#output').inputValue()).toBe(border);
 await ui(page,'#erase');const c=await page.locator('#canvas').boundingBox();await page.mouse.click(c.x+c.width*.01,c.y+c.height*.01);
 expect((await page.locator('#output').inputValue())[0]).toBe(' ');await ui(page,'#undo');expect(await page.locator('#output').inputValue()).toBe(border);
});
