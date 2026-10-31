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
  await ui(page,'#erase');const b=await page.locator('#canvas').boundingBox();await page.mouse.click(b.x+b.width/4,b.y+b.height/4);
  expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(['','','','']);await ui(page,'#undo');
  expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
  const png=PNG.sync.read(await download(page,'#png'));expect(png.width).toBe(png.height);expect([...png.data.subarray((Math.floor(png.height/4)*png.width+Math.floor(png.width/4))*4,(Math.floor(png.height/4)*png.width+Math.floor(png.width/4))*4+4)]).toEqual([104,55,43,255]);
  await page.locator('#downloadClose').click();await info.attach(`phone-${size.width}x${size.height}`,{body:await page.screenshot(),contentType:'image/png'});
 }
});
