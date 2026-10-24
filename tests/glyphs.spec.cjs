const fs=require('node:fs');
const {ui,test,expect,download,loadProject,project}=require('./helpers.cjs');
function reference(){
 const svg=fs.readFileSync('assets/c64-glyphs.svg','utf8'),bytes=Buffer.alloc(4096);
 for(const match of svg.matchAll(/<symbol id="c64-(\d)-(\d+)"[^>]*>([\s\S]*?)<\/symbol>/g)){
  const bank=+match[1],code=+match[2];for(const r of match[3].matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g))for(let x=+r[1];x<+r[1]+ +r[3];x++)bytes[bank*2048+code*8+ +r[2]]|=128>>x;
 }return bytes;
}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('palette filters letters, highlights selection, and selects inverse glyphs',async({page})=>{
 await expect(page.locator('#palette button')).toHaveCount(184);await expect(page.locator('#palette button.active')).toHaveAttribute('data-g','64');
 await ui(page,'#inverse');await expect(page.locator('#palette button.active')).toHaveAttribute('data-g','192');
 await ui(page,'#charset','selectOption','1');await expect(page.locator('#palette button')).toHaveCount(132);
 await ui(page,'#showAlphanumerics','check');await expect(page.locator('#palette button')).toHaveCount(256);
 await page.getByRole('button',{name:'C64 screen code 0',exact:true}).click();await expect(page.locator('#palette button.active')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#paletteMode, #glyphPage')).toHaveCount(0);
});
test('both banks and inverse slots match source pixels in canvas, SVG, and PNG',async({page})=>{
 const bytes=reference();await loadProject(page,project([0,128]));
 for(const bank of [0,1]){
  if(bank)await ui(page,'#charset','selectOption','1');
  const svg=(await download(page,'#svg')).toString();expect(svg).toContain('viewBox="0 0 32 16"');expect(svg).toContain('scale(2)');
  const first=svg.split('scale(2)">')[1].split('</g>')[0];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)expect(first.includes(`<rect x="${x}" y="${y}" width="1" height="1"/>`)).toBe(!!(bytes[bank*2048+y]&(128>>x)));
  const ink=await page.locator('#canvas').evaluate(c=>{const t=c.getContext('2d'),bits=[];for(let y=0;y<8;y++)for(let x=0;x<16;x++){const d=t.getImageData(Math.floor((x+.5)*c.width/16),Math.floor((y+.5)*c.height/8),1,1).data;bits.push(d[0]===108&&d[1]===94&&d[2]===181)}return bits});
  const expected=Array.from({length:128},(_,i)=>{const y=Math.floor(i/16),x=i%16;return !!(bytes[bank*2048+(x<8?0:128*8)+y]&(128>>(x%8)))});expect(ink).toEqual(expected);
  await ui(page,'#pngBg','selectOption','transparent');const png=await download(page,'#png');expect(png.readUInt32BE(16)).toBe(128);expect(png.readUInt32BE(20)).toBe(64);
  const pixels=await page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const t=c.getContext('2d');t.drawImage(i,0,0);const bits=[];for(let y=0;y<8;y++)for(let x=0;x<16;x++)bits.push(t.getImageData(x*8+4,y*8+4,1,1).data[3]===255);return bits},png.toString('base64'));expect(pixels).toEqual(expected);
 }
});
test('binary screen codes preserve zero, inverse, row order, and empty cells',async({page})=>{
 await loadProject(page,project([0,128,'',255],2,2));expect(await download(page,'#screenCodes')).toEqual(Buffer.from([0,128,32,255]));

});
test('screen-code text round trips dimensions, bank, and empty cells',async({page})=>{
 await loadProject(page,project([0,160,'',128],2,2,{charset:1}));const text=(await download(page,'#text')).toString();expect(text).toBe('# PETSCII-GRID 1 2 2 1\n00 A0\n-- 80');
 await ui(page,'#clear');await ui(page,'#output','fill',text);await ui(page,'#import');expect(await page.locator('#output').inputValue()).toBe(text);
 const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.grid).toEqual([0,160,'',128]);expect(saved.charset).toBe(1);
 await ui(page,'#undo');expect(await page.locator('#output').inputValue()).not.toContain('00');await ui(page,'#redo');expect(await page.locator('#output').inputValue()).toBe(text);
});
test('bad project and text imports do not modify artwork or undo history',async({page})=>{
 await ui(page,'#palette [data-g="160"]');await ui(page,'#border');const before=await page.locator('#output').inputValue();
 for(const data of [null,{},project([256]),project([0],41,1),project(['bogus']),{...project([0]),version:99},{...project([0]),version:1},project(['█']),project([0],1,1,{glyphSource:'custom'})]){await loadProject(page,data);await expect(page.locator('#status')).toContainText('Load failed');expect(await page.locator('#output').inputValue()).toBe(before)}
 await ui(page,'#output','fill','# PETSCII-GRID 1 2 1 0\n00 XX');await ui(page,'#import');await expect(page.locator('#status')).toContainText('Import failed');expect(JSON.parse(await download(page,'#saveProject')).grid[0]).toBe(160);
 await ui(page,'#undo');expect(await page.locator('#output').inputValue()).not.toContain('A0');
});
