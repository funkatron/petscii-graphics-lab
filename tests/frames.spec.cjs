const fs=require('node:fs');
const AdmZip=require('adm-zip');
const {PNG}=require('pngjs');
const {GifReader}=require('omggif');
const {ui,test,expect,contents,download,loadProject,project}=require('./helpers.cjs');
const ink=[108,94,181,255],dark=[53,40,121,255];
function unpack(buffer){const zip=new AdmZip(buffer);expect(zip.test()).toBe(true);const timing=JSON.parse(zip.readAsText('timing.json')),frames=timing.frames.map(f=>PNG.sync.read(zip.readFile(f.file)));return {zip,timing,frames}}
function pixel(png,x,y){return Array.from(png.data.subarray((y*png.width+x)*4,(y*png.width+x)*4+4))}
function matchesGif(sequence,buffer){
 const gif=new GifReader(buffer);expect(sequence.timing.width).toBe(gif.width);expect(sequence.timing.height).toBe(gif.height);expect(sequence.frames).toHaveLength(gif.numFrames());
 for(let i=0;i<gif.numFrames();i++){
  const frame=sequence.frames[i],rgba=new Uint8Array(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(i,rgba);
  expect(sequence.timing.frames[i].durationMs).toBe(gif.frameInfo(i).delay*10);
  // RGB below zero alpha is deliberately ignored: PNG/GIF can retain different transparent colors.
  const normalized=bytes=>{const copy=Buffer.from(bytes);for(let p=0;p<copy.length;p+=4)if(!copy[p+3])copy.fill(0,p,p+3);return copy};
  expect(normalized(frame.data)).toEqual(normalized(rgba));
 }
}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('ZIP replay preserves recorded erasures, timing, source project and repeat download',async({page})=>{
 const recording={base:['','',''],events:[[2,160],[0,160],[2,'']]};
 await loadProject(page,project([160,'',''],3,1,{drawingReplay:recording}));await ui(page,'#gifScale','selectOption','1');
 const before=JSON.parse(await download(page,'#saveProject')),buffer=await download(page,'#exportFrames'),s=unpack(buffer);
 expect(s.zip.getEntries().map(e=>e.entryName).sort()).toEqual(['README.txt','frames/frame-0001.png','frames/frame-0002.png','frames/frame-0003.png','frames/frame-0004.png','project.json','timing.json']);
 expect(s.timing).toMatchObject({format:'petscii-animation-frames',version:2,effect:'replay',width:24,height:8,columns:3,rows:1,pixelsPerCell:8,glyphEncoding:'c64-atlas-id',background:'dark',loop:true,durationMs:4000,sourceProject:'project.json'});
 expect(s.timing.frames.map(f=>[f.startMs,f.durationMs])).toEqual([[0,1000],[1000,1000],[2000,1000],[3000,1000]]);
 expect(s.frames.map(p=>[pixel(p,4,4),pixel(p,20,4)])).toEqual([[dark,dark],[dark,ink],[ink,ink],[ink,dark]]);
 expect(JSON.parse(s.zip.readAsText('project.json'))).toEqual(before);expect(s.zip.readAsText('README.txt')).toContain('do not assume a fixed frame rate');
 await expect(page.locator('#exportFrames')).toBeVisible();expect(await download(page,'#exportFrames')).toEqual(buffer);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 matchesGif(s,await download(page,'#exportGif'));
});
test('transparent PNG sequences retain both banks and verbatim inverse glyphs',async({page})=>{
 const svg=fs.readFileSync('assets/c64-glyphs.svg','utf8');
 for(const bank of [0,1]){
  await loadProject(page,project([0,128,''],3,1,{charset:bank}));await ui(page,'#animationEffect','selectOption','inverse');await ui(page,'#gifScale','selectOption','1');await ui(page,'#gifBackground','selectOption','transparent');
  const s=unpack(await download(page,'#exportFrames'));expect(s.timing.glyphEncoding).toBe('c64-atlas-id');expect(s.timing.background).toBe('transparent');
  for(let f=0;f<2;f++)for(let cell=0;cell<2;cell++){
   const code=(cell*128)^(f*128),body=svg.match(new RegExp('<symbol id="c64-'+bank+'-'+code+'"[^>]*>([\\s\\S]*?)</symbol>'))[1];
   const expected=Array(64).fill(false);for(const r of body.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g))for(let x=+r[1];x<+r[1]+ +r[3];x++)expected[+r[2]*8+x]=true;
   for(let y=0;y<8;y++)for(let x=0;x<8;x++)expect(pixel(s.frames[f],cell*8+x,y)[3]).toBe(expected[y*8+x]?255:0);
  }
  for(const f of s.frames)expect(pixel(f,20,4)[3]).toBe(0);
  matchesGif(s,await download(page,'#exportGif'));
 }
});
test('every procedural effect matches GIF frames at the selected scale and white background',async({page})=>{
 await loadProject(page,project([160,'',81,''],2,2));await ui(page,'#gifScale','selectOption','2');await ui(page,'#gifBackground','selectOption','white');await ui(page,'#animationSeconds','selectOption','2');
 for(const effect of ['scroll-x','scroll-y','wave']){
  await ui(page,'#animationEffect','selectOption',effect);const s=unpack(await download(page,'#exportFrames'));expect(s.frames[0].width).toBe(32);expect(s.frames[0].height).toBe(32);
  expect(s.timing.frames.reduce((n,f)=>n+f.durationMs,0)).toBe(2000);expect(s.timing.frames.at(-1).startMs+s.timing.frames.at(-1).durationMs).toBe(2000);matchesGif(s,await download(page,'#exportGif'));
 }
});
test('ZIP snapshots dimensions, bank, options and editable project before loading the encoder',async({page})=>{
 await loadProject(page,project([160,'',''],3,1));await ui(page,'#animationEffect','selectOption','scroll-x');await ui(page,'#gifScale','selectOption','1');
 const before=JSON.parse(await download(page,'#saveProject'));let release;const gate=new Promise(resolve=>release=resolve);let requested;const started=new Promise(resolve=>requested=resolve);
 await page.route('**/vendor/fflate-zip.esm.js',async r=>{requested();await gate;await r.continue()});
 const waiting=page.waitForEvent('download');await ui(page,'#exportFrames');await started;
 await ui(page,'#columns','selectOption','2');await ui(page,'#showAlphanumerics','check');await ui(page,'#gifBackground','selectOption','white');release();
 const s=unpack(await contents(await waiting));expect(s.timing).toMatchObject({width:24,height:8,columns:3,glyphEncoding:'c64-atlas-id',background:'dark'});expect(pixel(s.frames[0],4,4)).toEqual(ink);expect(pixel(s.frames[0],12,4)).toEqual(dark);expect(JSON.parse(s.zip.readAsText('project.json'))).toEqual(before);
 await expect(page.locator('#columns')).toHaveValue('2');expect(JSON.parse(await download(page,'#saveProject')).grid).toHaveLength(2);
});
test('canceling ZIP generation restores controls and permits a new export',async({page})=>{
 await loadProject(page,project([160]));let release;const gate=new Promise(resolve=>release=resolve);let requested;const started=new Promise(resolve=>requested=resolve);
 await page.route('**/vendor/fflate-zip.esm.js',async r=>{requested();await gate;await r.continue()});
 const downloads=[];page.on('download',d=>downloads.push(d));await ui(page,'#exportFrames');await started;await expect(page.locator('#exportGif')).toBeDisabled();await ui(page,'#cancelAnimationExport');release();
 await expect(page.locator('#status')).toHaveText('Animation export canceled');expect(downloads).toHaveLength(0);await expect(page.locator('#exportFrames')).not.toHaveAttribute('data-download-url',/./);await expect(page.locator('#exportGif')).toBeEnabled();await expect(page.locator('#exportFrames')).toBeEnabled();await expect(page.locator('#cancelAnimationExport')).toBeHidden();
 expect(unpack(await download(page,'#exportFrames')).timing.frames).toHaveLength(2);
});
test('ZIP module and PNG encoding failures recover without modifying artwork',async({page})=>{
 await loadProject(page,project([160]));await page.route('**/vendor/fflate-zip.esm.js',r=>r.abort());await ui(page,'#exportFrames');await expect(page.locator('#status')).toContainText('Frame ZIP export failed');await expect(page.locator('#exportFrames')).toBeEnabled();expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([160]);
 await page.unroute('**/vendor/fflate-zip.esm.js');
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.toBlob;let failed=false;HTMLCanvasElement.prototype.toBlob=function(callback,...args){if(!failed){failed=true;callback(null)}else original.call(this,callback,...args)}});
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#exportFrames');await expect(page.locator('#status')).toContainText('PNG encoding failed');await expect(page.locator('#exportFrames')).not.toHaveAttribute('data-download-url',/./);await expect(page.locator('#exportFrames')).toBeEnabled();expect(unpack(await download(page,'#exportFrames')).timing.frames).toHaveLength(2);
});
test('animation exports reject unavailable numeric replay history even if final artwork is empty',async({page})=>{
 await page.route('**/assets/c64-glyphs.svg',r=>r.abort());await page.reload();await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project([''],1,1,{drawingReplay:{base:[''],events:[[0,160],[0,'']]}}));
 for(const selector of ['#exportGif','#exportFrames']){await ui(page,selector);await expect(page.locator('#status')).toHaveText('Reload C64 glyphs before exporting animation')}
 await expect(page.locator('#exportFrames')).not.toHaveAttribute('data-download-url',/./);await expect(page.locator('#exportFrames')).toBeEnabled();
});
test('canceling during PNG encoding keeps the prior completed ZIP available',async({page})=>{
 await loadProject(page,project([160,''],2,1));const previous=await download(page,'#exportFrames'),url=await page.locator('#exportFrames').getAttribute('data-download-url');
 await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){document.documentElement.dataset.pngEncoding='true';window.releasePNG=()=>original.call(this,callback,...args)}});
 await ui(page,'#animationSeconds','selectOption','1');const downloads=[];page.on('download',d=>downloads.push(d));await ui(page,'#exportFrames');await expect(page.locator('html')).toHaveAttribute('data-png-encoding','true');await ui(page,'#cancelAnimationExport');await page.evaluate(()=>window.releasePNG());
 await expect(page.locator('#status')).toHaveText('Animation export canceled');expect(downloads).toHaveLength(0);await expect(page.locator('#exportFrames')).toHaveAttribute('data-download-url',url);await expect(page.locator('#exportGif')).toBeEnabled();await ui(page,'#animationSeconds','selectOption','4');expect(await download(page,'#exportFrames')).toEqual(previous);
});
