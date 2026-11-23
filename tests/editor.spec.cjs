const {ui, reveal, test, expect }=require('./helpers.cjs');
test.beforeEach(async ({page}) => {
  await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
  await expect(page.locator('#canvas')).toBeVisible();await ui(page,'#palette [data-g="160"]');
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
 const closed=await page.locator('#sidebar').evaluate(e=>e.classList.contains('closed'));
 await ui(page,'#toggle');
 expect(await page.locator('#sidebar').evaluate(e=>e.classList.contains('closed'))).toBe(!closed);
 await ui(page,'#toggle');
 expect(await page.locator('#sidebar').evaluate(e=>e.classList.contains('closed'))).toBe(closed);
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
 expect(lines[2].split(' ')[1]).toBe('0A0');
 expect(lines[15].split(' ')[14]).toBe('0A0');
});
test('mirror glyph shapes reflects directional glyphs in symmetric copies',async({page})=>{
 const mirror=page.locator('#symMirror');
 await reveal(page,'#symMirror');
 await expect(mirror).toBeDisabled();
 await expect(page.locator('#symMirrorRow')).toBeVisible();
 await page.locator('#symmetryMenu').evaluate(e=>e.open=false);
 await ui(page,'#palette [data-g="233"]');
 await ui(page,'#sym','selectOption','both');
 await ui(page,'#symMirror','check');
 await page.locator('#symmetryMenu').evaluate(e=>e.open=false);
 await expect(page.locator('#stageHint')).toContainText('mirrored glyphs');
 const box=await page.locator('#canvas').boundingBox();
 await page.mouse.click(box.x+box.width*(1.5/16),box.y+box.height*(1.5/16));
 const saved=()=>page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('petscii-graphics-project-v3'));const at=(x,y)=>p.grid[y*p.columns+x];return {tl:at(1,1),tr:at(14,1),bl:at(1,14),br:at(14,14),saved:p.mirrorGlyphs}});
 // 233 lower-right triangle → 223 lower-left, 95 upper-right, 105 upper-left (C64 ROM shapes).
 await expect.poll(saved).toEqual({tl:233,tr:223,bl:95,br:105,saved:true});
 await ui(page,'#undo');
 await ui(page,'#symMirror','uncheck');
 await page.locator('#symmetryMenu').evaluate(e=>e.open=false);
 await page.mouse.click(box.x+box.width*(1.5/16),box.y+box.height*(1.5/16));
 await expect.poll(saved).toEqual({tl:233,tr:233,bl:233,br:233,saved:false});
});
test('mirror glyph setting loads from projects and rejects invalid values',async({page})=>{
 const grid=Array(256).fill('');
 const base={format:'petscii-stencil-lab',version:3,columns:16,rows:16,grid,symmetry:'horizontal'};
 await page.locator('#projectFile').setInputFiles({name:'m.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...base,mirrorGlyphs:true}))});
 await expect(page.locator('#symMirror')).toBeChecked();
 await expect(page.locator('#symMirror')).toBeEnabled();
 await page.locator('#projectFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...base,mirrorGlyphs:'yes'}))});
 await expect(page.locator('#status')).toContainText(/mirror glyph/i);
 await expect(page.locator('#symMirror')).toBeChecked();
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
test('same-size text import redraws the canvas',async({page})=>{
 const before=await page.locator('#canvas').evaluate(c=>c.toDataURL());
 const row=Array(16).fill('1A0').join(' ');
 await ui(page,'#output','fill','# PETSCII-GLYPHS 1 16 16\n'+Array(16).fill(row).join('\n'));
 await ui(page,'#import');
 await expect.poll(()=>page.locator('#canvas').evaluate(c=>c.toDataURL())).not.toBe(before);
});
test('import text is undoable',async({page})=>{
 await ui(page,'#output','fill','# PETSCII-GLYPHS 1 2 2\n0A0 0E2\n062 0A0');
 await ui(page,'#import');
 expect(await page.locator('#output').inputValue()).toContain('0A0 0E2');
 await ui(page,'#undo');
 expect(await page.locator('#output').inputValue()).not.toContain('0A0 0E2');
});
