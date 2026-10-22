const crypto=require('node:crypto');
const {ui,test,expect,download,loadProject,project}=require('./helpers.cjs');
const originalSha='fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420';
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('built-in SVG sheet exactly preserves all 512 source glyphs without a binary asset',async({page})=>{
 const result=await page.evaluate(async()=>{
  const svg=await (await fetch('./assets/c64-glyphs.svg')).text(),doc=new DOMParser().parseFromString(svg,'image/svg+xml');const bytes=new Uint8Array(4096);
  for(let bank=0;bank<2;bank++)for(let code=0;code<256;code++)for(const r of doc.getElementById('c64-'+bank+'-'+code).children){const x=+r.getAttribute('x'),y=+r.getAttribute('y'),w=+r.getAttribute('width');for(let xx=x;xx<x+w;xx++)bytes[bank*2048+code*8+y]|=128>>xx}
  return {count:doc.querySelectorAll('symbol').length,viewBox:doc.documentElement.getAttribute('viewBox'),bytes:Array.from(bytes),binaryStored:localStorage.getItem('petscii-graphics-rom')};
 });
 expect(result.count).toBe(512);expect(result.viewBox).toBe('0 0 128 256');expect(result.binaryStored).toBeNull();
 const bytes=Buffer.from(result.bytes);expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(originalSha);
 expect(Array.from(bytes.subarray(129*8,130*8))).toEqual(Array.from(bytes.subarray(8,16),b=>b^255));
 // Preserve the source ROM's one-bit @/inverse-@ discrepancy instead of synthesizing inverses.
 for(const bank of [0,1]){expect(bytes[bank*2048+5]).toBe(0x62);expect(bytes[bank*2048+128*8+5]).toBe(0x99)}
 // Known C64 uppercase A versus lowercase a in the second bank.
 expect(Array.from(bytes.subarray(8,16))).toEqual([24,60,102,126,102,102,102,0]);
 expect(Array.from(bytes.subarray(2056,2064))).toEqual([0,0,60,6,62,102,62,0]);
});
test('fresh editor draws authentic glyphs and exports without importing a ROM',async({page})=>{
 await expect(page.locator('#romInfo')).toContainText('Built-in C64 SVG glyphs active');await expect(page.locator('#loadRom')).toHaveCount(0);await expect(page.locator('#palette button.active')).toHaveAttribute('data-g','64');
 await ui(page,'#border');const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.glyphSource).toBe('builtin');expect(saved.grid[0]).toBe(64);
 expect((await download(page,'#svg')).toString()).toContain('scale(2)');expect((await download(page,'#screenCodes'))[0]).toBe(64);
 await page.reload();await expect(page.locator('#romInfo')).toContainText('Built-in');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(saved.grid);
});
test('invalid SVG load blocks invisible drawing and can be retried without losing codes',async({page})=>{
 await loadProject(page,project([0],1,1,{glyphSource:'builtin'}));
 await page.route('**/assets/c64-glyphs.svg',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#romInfo')).toContainText('unavailable');await expect(page.locator('#palette button')).toHaveCount(0);await expect(page.locator('#paint')).toBeDisabled();const box=await page.locator('#canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await ui(page,'#svg');await expect(page.locator('#status')).toContainText('Glyph data unavailable');
 expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([0]);
 await page.unroute('**/assets/c64-glyphs.svg');await ui(page,'#retryGlyphs');await expect(page.locator('#romInfo')).toContainText('active');expect((await download(page,'#svg')).toString()).toContain('scale(2)');
});
test('slow built-in loading cannot overwrite an existing autosaved project',async({page})=>{
 await loadProject(page,project([81],1,1,{glyphSource:'builtin'}));await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await page.route('**/assets/c64-glyphs.svg',async route=>{await new Promise(resolve=>setTimeout(resolve,450));await route.continue()});
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([81]);
});
