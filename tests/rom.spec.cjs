const {test,expect,download,loadProject,project,fixtureRom,loadRom}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/')});
test('ROM palette filters text, highlights selection, and selects inverse glyph',async({page})=>{
 await loadRom(page);
 await expect(page.locator('#palette button')).toHaveCount(64);
 await expect(page.locator('#palette button.active')).toHaveAttribute('data-g','64');
 await expect(page.locator('#palette button.active')).toHaveAttribute('aria-pressed','true');
 await page.locator('#inverse').click();
 await expect(page.locator('#palette button.active')).toHaveAttribute('data-g','192');
 await page.locator('#charset').selectOption('1');
 await expect(page.locator('#palette button')).toHaveCount(38);
 await page.locator('#paletteMode').selectOption('all');
 await page.locator('#glyphPage').selectOption('0');
 await expect(page.locator('#palette button')).toHaveCount(64);
 await page.getByRole('button',{name:'C64 screen code 0',exact:true}).click();
 await expect(page.locator('#palette button.active')).toHaveAttribute('data-g','0');
 await page.locator('#paletteMode').selectOption('legacy');
 await expect(page.locator('#palette button')).toHaveCount(12);
});
test('both ROM banks and inverse bytes render identically in canvas, SVG, and PNG',async({page})=>{
 await loadRom(page);await loadProject(page,project([0,128]));
 for(const bank of [0,1]){
  if(bank)await page.locator('#charset').selectOption('1');
  const svg=(await download(page,'#svg')).toString();
  expect(svg).toContain('viewBox="0 0 32 16"');
  const first=svg.split('scale(2)">')[1].split('</g>')[0];
  expect(first).toContain(`<rect x="${bank?7:0}" y="0" width="1" height="1"/>`);
  const expected=fixtureRom().subarray(bank*2048,bank*2048+8);
  const ink=await page.locator('#canvas').evaluate(c=>{
   const t=c.getContext('2d'),bits=[];
   for(let y=0;y<8;y++)for(let x=0;x<8;x++){const d=t.getImageData(Math.floor((x+.5)*c.width/16),Math.floor((y+.5)*c.height/8),1,1).data;bits.push(d[0]===217&&d[1]===255&&d[2]===242)}return bits;
  });
  expect(ink).toEqual(Array.from({length:64},(_,i)=>!!(expected[i>>3]&(128>>(i%8)))));
  await page.locator('#pngScale').selectOption('4');await page.locator('#pngBg').selectOption('white');
  const png=await download(page,'#png');expect(png.readUInt32BE(16)).toBe(128);expect(png.readUInt32BE(20)).toBe(64);
  const pixels=await page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const t=c.getContext('2d');t.drawImage(img,0,0);const bits=[];for(let y=0;y<8;y++)for(let x=0;x<16;x++)bits.push(t.getImageData(x*8+4,y*8+4,1,1).data[0]===0);return bits},png.toString('base64'));
  const rom=fixtureRom();expect(pixels).toEqual(Array.from({length:128},(_,i)=>{const y=Math.floor(i/16),x=i%16;return !!(rom[bank*2048+(x<8?0:128*8)+y]&(128>>(x%8)))}));
 }
});
test('screen codes are row-major, preserve zero and inverse, and reject legacy data',async({page})=>{
 await loadProject(page,project([0,128,'',255],2,2));
 expect(await download(page,'#screenCodes')).toEqual(Buffer.from([0,128,32,255]));
 await loadProject(page,project([0,'█']));await page.locator('#screenCodes').click();
 await expect(page.locator('#status')).toContainText('legacy shapes cannot be converted');
});
test('mixed ROM and legacy text round trips dimensions, bank, and empty cells',async({page})=>{
 await loadProject(page,project([0,'█','',128],2,2,{charset:1}));
 const text=(await download(page,'#text')).toString();expect(text).toBe('# PETSCII-GRID 1 2 2 1\n00 █\n-- 80');
 await page.locator('#clear').click();await page.locator('#output').fill(text);await page.locator('#import').click();
 expect(await page.locator('#output').inputValue()).toBe(text);
 const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.grid).toEqual([0,'█','',128]);expect(saved.charset).toBe(1);
 await page.locator('#undo').click();expect(await page.locator('#output').inputValue()).not.toContain('00');
 await page.locator('#redo').click();expect(await page.locator('#output').inputValue()).toBe(text);
});
test('missing ROM blocks visual export and does not corrupt project bytes',async({page})=>{
 await loadProject(page,project([0,128]));
 await expect(page.locator('#status')).toContainText('import a C64 ROM');
 for(const id of ['svg','png']){await page.locator('#'+id).click();await expect(page.locator('#status')).toContainText('Import a C64 ROM')}
 expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([0,128]);
 await page.locator('#checkStencil').click();await expect(page.locator('#stencilReport')).toContainText('unavailable for ROM');
});
test('ROM is remembered locally, excluded from JSON, and can be forgotten',async({page})=>{
 await loadRom(page);await loadProject(page,project([0,128]));await page.reload();
 await expect(page.locator('#romInfo')).toContainText('restored from this device');
 expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([0,128]);
 const saved=await download(page,'#saveProject');expect(saved.toString()).not.toContain('probe.bin');expect(saved.length).toBeLessThan(1000);
 await page.locator('#forgetRom').click();await page.reload();await expect(page.locator('#romInfo')).toContainText('ROM not loaded');
 expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([0,128]);
});
test('ROM length and project schema validation leave artwork and history intact',async({page})=>{
 await page.locator('#border').click();const before=await page.locator('#output').inputValue();
 for(const data of [null,{},project([256]),project([0],41,1),project(['bogus']),{...project([0]),version:99}]){
  await loadProject(page,data);await expect(page.locator('#status')).toContainText('Load failed');expect(await page.locator('#output').inputValue()).toBe(before);
 }
 for(const size of [0,1024,4095,4097]){await page.locator('#romInput').setInputFiles({name:'bad.bin',mimeType:'application/octet-stream',buffer:Buffer.alloc(size)});await expect(page.locator('#status')).toContainText('4096')}
 await page.locator('#undo').click();expect(await page.locator('#output').inputValue()).not.toContain('█');
});
test('malformed hex text import leaves artwork and undo untouched',async({page})=>{
 await page.locator('#border').click();await page.locator('#output').fill('# PETSCII-GRID 1 2 1 0\n00 XX');await page.locator('#import').click();
 await expect(page.locator('#status')).toContainText('Import failed');const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.grid[0]).toBe('█');
 await page.locator('#undo').click();expect(await page.locator('#output').inputValue()).not.toContain('█');
});
