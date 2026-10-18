const { test, expect } = require('@playwright/test');
test.beforeEach(async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
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
 await page.locator('#toggle').click();
 await expect(page.locator('#sidebar')).toHaveClass(/closed/);
 await page.locator('#toggle').click();
 await expect(page.locator('#sidebar')).not.toHaveClass(/closed/);
});
test('drag painting is undoable and redoable',async({page})=>{
 await paint(page);
 const result=await page.locator('#output').inputValue();
 expect(result).toContain('█');
 await page.locator('#undo').click();
 expect(await page.locator('#output').inputValue()).not.toContain('█');
 await page.locator('#redo').click();
 expect(await page.locator('#output').inputValue()).toBe(result);
});
test('symmetry paints mirrored positions',async({page})=>{
 await page.locator('#sym').selectOption('both');
 await paint(page,.12,.12);
 const lines=(await page.locator('#output').inputValue()).split('\n');
 expect(lines[1][1]).toBe('█');
 expect(lines[14][14]).toBe('█');
});
test('project JSON save and reload round-trip',async({page})=>{
 await paint(page);
 const before=await page.locator('#output').inputValue();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#saveProject').click()]);
 expect(download.suggestedFilename()).toMatch(/\.json$/);
 const content=JSON.parse(await (await download.createReadStream()).toArray().then(chunks=>Buffer.concat(chunks).toString()));
 expect(content.format).toBe('petscii-stencil-lab');
 expect(content.grid).toContain('█');
 await page.locator('#clear').click();
 await page.locator('#projectFile').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(content))});
 expect(await page.locator('#output').inputValue()).toBe(before);
});
test('SVG, text, and PNG produce downloads',async({page})=>{
 await paint(page);
 for(const [selector,ext] of [['#svg','.svg'],['#text','.txt'],['#png','.png']]){
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);
  expect(download.suggestedFilename()).toContain(ext);
  const stream=await download.createReadStream();const chunks=[];
  for await(const c of stream)chunks.push(c);
  const buffer=Buffer.concat(chunks);
  expect(buffer.length).toBeGreaterThan(30);
  if(ext==='.png')expect(buffer.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 }
});
test('safety analysis reports potentially enclosed regions',async({page})=>{
 await page.locator('#border').click();
 await page.locator('#checkStencil').click();
 await expect(page.locator('#stencilReport')).toContainText('Potential isolated material regions');
});
test('import text is undoable',async({page})=>{
 await page.locator('#output').fill('█▀\n▄█');
 await page.locator('#import').click();
 expect(await page.locator('#output').inputValue()).toContain('█▀');
 await page.locator('#undo').click();
 expect(await page.locator('#output').inputValue()).not.toContain('█▀');
});
