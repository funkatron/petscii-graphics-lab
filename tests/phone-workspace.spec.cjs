const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
const {PNG}=require('pngjs');
for(const [width,height]of [[320,568],[390,844],[430,932]])test(`phone ${width} portrait and landscape retain drawing and export workflows`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project([160,'','',''],2,2,{cellColors:[2,14,14,14]}));await ui(page,'#erase');const before=JSON.parse(await download(page,'#saveProject'));
 for(const size of [{width,height},{width:height,height:width}]){
  await page.setViewportSize(size);await expect(page.locator('#canvas')).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
  for(const selector of ['#toggle','#projectMenu>summary','#downloadOpen','#quickPlay','#glyphToggle','#undo'])await expect(page.locator(selector)).toBeInViewport();
  // Settings must overlay rather than consume the short landscape workspace.
  const box=await page.locator('#canvas').boundingBox();await ui(page,'#columns','focus');
  expect(await page.locator('#sidebar').evaluate(e=>getComputedStyle(e).position)).toBe('absolute');
  await page.locator('#toggle').click();await expect(page.locator('#sidebar')).toBeHidden();
  await expect.poll(async()=>{const b=await page.locator('#canvas').boundingBox();return Math.abs(b.width-box.width)}).toBeLessThan(2);
  await ui(page,'#erase');const b=await page.locator('#canvas').boundingBox();const canvas=page.locator('#canvas'),position={x:b.width/4,y:b.height/4};if(await page.evaluate(()=>navigator.maxTouchPoints>0))await canvas.tap({position});else await canvas.click({position});
  expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(['','','','']);await ui(page,'#undo');
  expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
  const png=PNG.sync.read(await download(page,'#png'));expect(png.width).toBe(png.height);expect([...png.data.subarray((Math.floor(png.height/4)*png.width+Math.floor(png.width/4))*4,(Math.floor(png.height/4)*png.width+Math.floor(png.width/4))*4+4)]).toEqual([104,55,43,255]);
  await page.locator('#downloadClose').click();await info.attach(`phone-${size.width}x${size.height}`,{body:await page.screenshot(),contentType:'image/png'});
 }
});

test('phone text entry remains reachable after the viewport shrinks',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project(Array(8).fill(''),4,2));
 const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#tool-text');const canvas=page.locator('#canvas'),b=await canvas.boundingBox(),position={x:b.width/8,y:b.height/4};
 if(await page.evaluate(()=>navigator.maxTouchPoints>0))await canvas.tap({position});else await canvas.click({position});await expect(page.locator('#typedText')).toBeFocused();
 await page.locator('#typedText').fill('Az');await page.setViewportSize({width:390,height:440});
 await expect(page.locator('#typedText')).toBeInViewport();await page.locator('#applyText').scrollIntoViewIfNeeded();await expect(page.locator('#applyText')).toBeInViewport();await ui(page,'#applyText');
 const after=JSON.parse(await download(page,'#saveProject'));expect(after.grid).toEqual([1,282,'','','','','','']);await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await page.setViewportSize({width:390,height:844});await expect(canvas).toBeInViewport();await info.attach('phone-after-text-entry',{body:await page.screenshot(),contentType:'image/png'});
});

test('short landscape gives idle space to artwork and reserves selection controls before dragging',async({page},info)=>{
 await page.setViewportSize({width:568,height:320});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project([160,'','',''],2,2));await ui(page,'#paint');
 await expect(page.locator('.selection-dock')).toBeHidden();const canvas=page.locator('#canvas');
 const legacy=await page.addStyleTag({content:'.selection-dock{display:block!important}#stageHint{position:static!important;width:auto!important;height:auto!important;min-height:1.6em!important;margin:0!important;clip-path:none!important;white-space:normal!important}'});
 const oldHeight=(await canvas.boundingBox()).height;await legacy.evaluate(e=>e.remove());await expect.poll(async()=>(await canvas.boundingBox()).height).toBeGreaterThan(oldHeight);
 await ui(page,'#tool-select');await expect(page.locator('.selection-dock')).toBeVisible();const b=await canvas.boundingBox();await page.mouse.move(b.x+b.width/4,b.y+b.height/4);await page.mouse.down();await page.mouse.move(b.x+b.width*3/4,b.y+b.height*3/4);await page.mouse.up();
 await expect(page.locator('#selectionInfo')).toHaveText('2 × 2 selected');await expect(page.locator('#deselect')).toBeInViewport();expect((await canvas.boundingBox()).height).toBe(b.height);
 await ui(page,'#deselect');await ui(page,'#paint');await expect(page.locator('.selection-dock')).toBeHidden();await info.attach('compact-phone-landscape',{body:await page.screenshot(),contentType:'image/png'});
});
