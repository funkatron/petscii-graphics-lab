const {ui, test, expect }=require('./helpers.cjs');
test.beforeEach(async ({page}) => {
  await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
  await expect(page.locator('#canvas')).toBeVisible();await ui(page,'#paletteMode','selectOption','all');await ui(page,'#glyphPage','selectOption','2');await ui(page,'#palette [data-g="160"]');
});
async function paint(page,x=.25,y=.25){
 const box=await page.locator('#canvas').boundingBox();
 await page.mouse.move(box.x+box.width*x,box.y+box.height*y);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*(x+.14),box.y+box.height*y,{steps:7});
 await page.mouse.up();
}
test('canvas scales within frame and palette toggles',async({page})=>{
 const canvas=page.locator('#canvas'),frame=page.locator('#frame');
 const c=await canvas.boundingBox(),f=await frame.boundingBox();
 expect(c.width).toBeLessThanOrEqual(f.width);
 expect(c.height).toBeLessThanOrEqual(f.height);
 await ui(page,'#toggle');
 await expect(page.locator('#sidebar')).toHaveClass(/closed/);
 await ui(page,'#toggle');
 await expect(page.locator('#sidebar')).not.toHaveClass(/closed/);
});
test('drag painting is undoable and redoable',async({page})=>{
 await paint(page);
 const result=await page.locator('#output').inputValue();
 expect(result).toContain('A0');
 await ui(page,'#undo');
 expect(await page.locator('#output').inputValue()).not.toContain('A0');
 await ui(page,'#redo');
 expect(await page.locator('#output').inputValue()).toBe(result);
});
test('symmetry paints mirrored positions',async({page})=>{
 await ui(page,'#sym','selectOption','both');
 await paint(page,.12,.12);
 const lines=(await page.locator('#output').inputValue()).split('\n');
 expect(lines[2].split(' ')[1]).toBe('A0');
 expect(lines[15].split(' ')[14]).toBe('A0');
});
test('project JSON save and reload round-trip',async({page})=>{
 await paint(page);
 const before=await page.locator('#output').inputValue();
 const [download]=await Promise.all([page.waitForEvent('download'),ui(page,'#saveProject')]);
 expect(download.suggestedFilename()).toMatch(/\.json$/);
 const savedStream=await download.createReadStream();const savedChunks=[];
 for await(const chunk of savedStream)savedChunks.push(chunk);
 const content=JSON.parse(Buffer.concat(savedChunks).toString('utf8'));
 expect(content.format).toBe('petscii-stencil-lab');
 expect(content.grid).toContain(160);
 await ui(page,'#clear');
 await page.locator('#projectFile').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(content))});
 await expect(page.locator('#output')).toHaveValue(before);
});
test('SVG, text, and PNG produce downloads',async({page})=>{
 await paint(page);
 for(const [selector,ext] of [['#svg','.svg'],['#text','.txt'],['#png','.png']]){
  const [download]=await Promise.all([page.waitForEvent('download'),ui(page,selector)]);
  expect(download.suggestedFilename()).toContain(ext);
  const stream=await download.createReadStream();const chunks=[];
  for await(const c of stream)chunks.push(c);
  const buffer=Buffer.concat(chunks);
  expect(buffer.length).toBeGreaterThan(30);
  if(ext==='.png')expect(buffer.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 }
});
test('import text is undoable',async({page})=>{
 await ui(page,'#output','fill','# PETSCII-GRID 1 2 2 0\nA0 E2\n62 A0');
 await ui(page,'#import');
 expect(await page.locator('#output').inputValue()).toContain('A0 E2');
 await ui(page,'#undo');
 expect(await page.locator('#output').inputValue()).not.toContain('A0 E2');
});
