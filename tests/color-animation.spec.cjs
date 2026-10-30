const fs=require('node:fs'),{PNG}=require('pngjs'),{GifReader}=require('omggif'),AdmZip=require('adm-zip');
const {ui,test,expect,download,contents,loadProject,project}=require('./helpers.cjs');
const {decodeVideo,nearPixel}=require('./video-utils.cjs');
const hex=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'];
const rgb=i=>[0,2,4].map(n=>parseInt(hex[i].slice(n,n+2),16));
// Expected sequences are explicit product behavior, independent of editor helpers.
const ramps={'color-cycle':[0,11,12,15,1,7,13,5,3,14,6,4,2,10,8,9],'color-wave':[2,8,7,13,3,14,6,4],'color-glow':[9,8,2,10,7,1,7,10,2,8]};
const svg=fs.readFileSync('assets/c64-glyphs.svg','utf8');
function mask(g,bank){if(g==='')return Array(64).fill(false);bank=Math.floor(g/256);g%=256;const m=Array(64).fill(false),body=svg.match(new RegExp('<symbol id="c64-'+bank+'-'+g+'"[^>]*>([\\s\\S]*?)</symbol>'))[1];for(const r of body.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g))for(let x=+r[1];x<+r[1]+ +r[3];x++)m[+r[2]*8+x]=true;return m}
function inkAt(effect,ink,x,y,f){const ramp=ramps[effect],start=Math.max(0,ramp.indexOf(ink));return ramp[(start+(effect==='color-wave'?x+y:0)+f)%ramp.length]}
function expectedFrame(p,effect,f,bg){const bytes=Buffer.alloc(p.columns*p.rows*64*4),width=p.columns*8;p.grid.forEach((g,i)=>{const x=i%p.columns,y=Math.floor(i/p.columns),bits=mask(g,p.charset);for(let py=0;py<8;py++)for(let px=0;px<8;px++){const solid=bits[py*8+px],color=solid?rgb(inkAt(effect,p.cellColors[i],x,y,f)):bg==='white'?[255,255,255]:bg==='transparent'?[0,0,0]:rgb(p.colors.background),offset=((y*8+py)*width+x*8+px)*4;bytes.set([...color,solid||bg!=='transparent'?255:0],offset)}});return bytes}
function normalized(bytes){const b=Buffer.from(bytes);for(let i=0;i<b.length;i+=4)if(!b[i+3])b.fill(0,i,i+3);return b}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const effect of Object.keys(ramps))test(effect+' exports exact C64 color sequences with unchanged glyphs, inverse bits and transparency',async({page})=>{
 const p=project([160,'',32,160,0,128,160,''],4,2,{charset:1,cellColors:[0,3,2,7,3,14,2,13],colors:{ink:14,background:6},animation:{effect:'none',colorEffect:effect,seconds:.5,scale:1,background:'dark'}});await loadProject(page,p);
 for(const bg of ['dark','white','transparent']){
  await ui(page,'#gifBackground','selectOption',bg);const before=JSON.parse(await download(page,'#saveProject')),gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));
  expect(zip.test()).toBe(true);expect(gif.numFrames()).toBe(ramps[effect].length);expect(gif.loopCount()).toBe(0);expect([gif.width,gif.height]).toEqual([32,16]);expect(timing).toMatchObject({effect:'none',colorEffect:effect,durationMs:500,glyphEncoding:'c64-atlas-id',background:bg});expect(timing.frames.reduce((n,f)=>n+f.durationMs,0)).toBe(500);expect(JSON.parse(zip.readAsText('project.json'))).toEqual(before);
  for(let f=0;f<gif.numFrames();f++){const bytes=new Uint8Array(32*16*4);gif.decodeAndBlitFrameRGBA(f,bytes);const png=PNG.sync.read(zip.readFile(timing.frames[f].file)),expected=expectedFrame(p,effect,f,bg);expect(normalized(bytes)).toEqual(expected);expect(normalized(png.data)).toEqual(expected);expect(gif.frameInfo(f).delay*10).toBe(timing.frames[f].durationMs);expect(gif.frameInfo(f).delay).toBeGreaterThanOrEqual(2)}
  expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 }
});
test('color previews pause, stop and reload safely, while static exports keep original cell colors',async({page})=>{
 await page.clock.install();
 // This scenario serially exercises all three effects, PNG export, reload, and import undo.
 test.setTimeout(60000);
 await loadProject(page,project([160,160],2,1,{cellColors:[2,3],colors:{ink:14,background:6}}));
 const pixels=()=>page.locator('#canvas').evaluate(c=>[.25,.75].map(x=>Array.from(c.getContext('2d').getImageData(c.width*x,c.height*.5,1,1).data))),original=await pixels();
 for(const effect of Object.keys(ramps)){
  await ui(page,'#animationEffect','selectOption','none');await ui(page,'#animationColor','selectOption',effect);await ui(page,'#animationSeconds','selectOption','0.5');const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#quickPlay');await expect.poll(pixels).not.toEqual(original);await ui(page,'#quickPlay');const paused=await pixels();await page.clock.runFor(2000);expect(await pixels()).toEqual(paused);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
  const png=PNG.sync.read(await download(page,'#png'));expect(Array.from(png.data.slice((32*png.width+32)*4,(32*png.width+32)*4+4))).toEqual([...rgb(2),255]);await ui(page,'#animationStop');expect(await pixels()).toEqual(original);
 }
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#animationColor')).toHaveValue('color-glow');await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','false');expect(await pixels()).toEqual(original);
 const before=JSON.parse(await download(page,'#saveProject'));await loadProject(page,{...before,animation:{...before.animation,effect:'color-unknown'}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await loadProject(page,project([160]));await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});
test('color-cycle export snapshots colors and effect before encoder loading',async({page})=>{
 await loadProject(page,project([160,160],2,1,{cellColors:[0,14],animation:{effect:'none',colorEffect:'color-cycle',seconds:1,scale:1,background:'dark'}}));let release,requested;const gate=new Promise(r=>release=r),started=new Promise(r=>requested=r);await page.route('**/vendor/gifenc.esm.js',async route=>{requested();await gate;await route.continue()});
 const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await started;await ui(page,'#inkTarget');await ui(page,'#colorPalette button:nth-child(3)');await ui(page,'#recolorDrawing');await ui(page,'#animationColor','selectOption','color-glow');release();const gif=new GifReader(await contents(await waiting));expect(gif.numFrames()).toBe(16);
 for(const f of [0,1,15]){const b=new Uint8Array(16*8*4);gif.decodeAndBlitFrameRGBA(f,b);for(const x of [0,1])expect(Array.from(b.slice((4*16+x*8+4)*4,(4*16+x*8+4)*4+3))).toEqual(rgb(inkAt('color-cycle',[0,14][x],x,0,f)))}expect(JSON.parse(await download(page,'#saveProject')).cellColors).toEqual([2,2]);
});
test('native repeated videos encode each color effect with the selected duration and fixed background',async({page})=>{
 for(const effect of Object.keys(ramps)){
  await loadProject(page,project([160,'',160,''],4,1,{cellColors:[2,14,3,14],colors:{ink:14,background:6},animation:{effect:'none',colorEffect:effect,seconds:.5,scale:4,background:'transparent',videoRepeats:2}}));const video=decodeVideo(await download(page,'#exportVideo')),count=ramps[effect].length;expect(video.frames).toHaveLength(count*2);expect(Number(video.info.format.duration)).toBeCloseTo(1,2);
  for(let f=0;f<count*2;f++){nearPixel(video,f,16,16,rgb(inkAt(effect,2,0,0,f%count)));nearPixel(video,f,80,16,rgb(inkAt(effect,3,2,0,f%count)));nearPixel(video,f,48,16,rgb(6))}
 }
});
