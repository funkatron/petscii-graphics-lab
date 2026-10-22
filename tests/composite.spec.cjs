const fs=require('node:fs'),{PNG}=require('pngjs'),{GifReader}=require('omggif'),AdmZip=require('adm-zip');
const {ui,test,expect,download,loadProject,project}=require('./helpers.cjs');
const {decodeVideo,nearPixel}=require('./video-utils.cjs');
const palette=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'],rgb=i=>[0,2,4].map(n=>parseInt(palette[i].slice(n,n+2),16));
const ramps={'color-cycle':[0,11,12,15,1,7,13,5,3,14,6,4,2,10,8,9],'color-wave':[2,8,7,13,3,14,6,4],'color-glow':[9,8,2,10,7,1,7,10,2,8]};
const svg=fs.readFileSync('assets/c64-glyphs.svg','utf8');
function bits(g){const b=Array(64).fill(false);if(g==='')return b;const symbol=svg.match(new RegExp('<symbol id="c64-0-'+g+'"[^>]*>([\\s\\S]*?)</symbol>'))[1];for(const r of symbol.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g))for(let x=+r[1];x<+r[1]+ +r[3];x++)b[+r[2]*8+x]=true;return b}
function expected(p,f,count){const bytes=Buffer.alloc(p.columns*p.rows*64*4),ramp=ramps[p.animation.colorEffect],phase=f/count,wrap=(x,n)=>(x%n+n)%n;
 for(let y=0;y<p.rows;y++)for(let x=0;x<p.columns;x++){
  let sx=x,sy=y;if(p.animation.effect==='scroll-x')sx=(x+Math.floor(phase*p.columns))%p.columns;if(p.animation.effect==='scroll-y')sy=(y+Math.floor(phase*p.rows))%p.rows;if(p.animation.effect==='wave')sx=wrap(x+Math.round(Math.sin(phase*2*Math.PI+y/p.rows*2*Math.PI)*Math.min(3,Math.max(1,p.columns/4))),p.columns);
  const source=sy*p.columns+sx,mask=bits(p.grid[source]),start=Math.max(0,ramp.indexOf(p.cellColors[source])),ink=ramp[(start+(p.animation.colorEffect==='color-wave'?x+y:0)+Math.floor(phase*ramp.length))%ramp.length];
  for(let py=0;py<8;py++)for(let px=0;px<8;px++){const i=((y*8+py)*p.columns*8+x*8+px)*4,solid=mask[py*8+px];bytes.set(solid?[...rgb(ink),255]:[0,0,0,0],i)}
 }return bytes;
}
const normalized=b=>{b=Buffer.from(b);for(let i=0;i<b.length;i+=4)if(!b[i+3])b.fill(0,i,i+3);return b};
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const effect of ['scroll-x','scroll-y','wave'])for(const colorEffect of Object.keys(ramps))test(effect+' + '+colorEffect+' keeps exact shared GIF/ZIP frames and source colors',async({page})=>{
 const p=project([160,'',0,128,32,160,255,160],4,2,{cellColors:[0,3,14,2,7,4,2,13],colors:{ink:14,background:6},animation:{effect,colorEffect,seconds:.5,scale:1,background:'transparent'}});await loadProject(page,p);
 const before=JSON.parse(await download(page,'#saveProject')),gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json')),count=Math.min(25,Math.max(effect==='wave'?24:effect==='scroll-x'?4:2,ramps[colorEffect].length));
 expect(gif.numFrames()).toBe(count);expect(timing).toMatchObject({effect,colorEffect,durationMs:500});expect(timing.frames.reduce((a,f)=>a+f.durationMs,0)).toBe(500);
 for(let f=0;f<count;f++){const decoded=new Uint8Array(32*16*4);gif.decodeAndBlitFrameRGBA(f,decoded);const expectedPixels=expected(p,f,count);expect(normalized(decoded)).toEqual(expectedPixels);expect(normalized(PNG.sync.read(zip.readFile(timing.frames[f].file)).data)).toEqual(expectedPixels);expect(gif.frameInfo(f).delay*10).toBe(timing.frames[f].durationMs)}
 expect(JSON.parse(zip.readAsText('project.json'))).toEqual(before);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});
test('independent controls persist, reject invalid colors, and preserve artwork after preview and undo',async({page})=>{
 await loadProject(page,project([160,'',160,''],4,1,{cellColors:[0,14,2,14]}));await ui(page,'#animationEffect','selectOption','scroll-x');await ui(page,'#animationColor','selectOption','color-wave');await ui(page,'#animationSeconds','selectOption','0.5');
 const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#quickPlay');await expect(page.locator('#previewLabel')).toContainText('Scroll left + Rainbow wave');await expect.poll(()=>page.locator('#canvas').getAttribute('data-animation-frame')).not.toBe('0');await ui(page,'#animationStop');
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#animationEffect')).toHaveValue('scroll-x');await expect(page.locator('#animationColor')).toHaveValue('color-wave');
 await loadProject(page,{...before,animation:{...before.animation,colorEffect:'nope'}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await ui(page,'#clear');await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});
test('combined replay reveals source ink before cycling and holds the completed composition',async({page})=>{
 await loadProject(page,project([160,160],2,1,{cellColors:[0,2],drawingReplay:{base:['',''],baseColors:[14,14],events:[[0,160],[1,160]],eventColors:[0,2]},animation:{effect:'replay',colorEffect:'color-cycle',seconds:1,scale:1,background:'dark'}}));
 const gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(16);for(const [f,cells] of [[0,[false,false]],[6,[true,false]],[12,[true,true]],[15,[true,true]]]){const b=new Uint8Array(16*8*4);gif.decodeAndBlitFrameRGBA(f,b);cells.forEach((painted,x)=>expect(Array.from(b.slice((4*16+x*8+4)*4,(4*16+x*8+4)*4+3))).toEqual(rgb(painted?ramps['color-cycle'][([0,12][x]+f)%16]:6)))}
});
test('repeated composite video uses the same moving ink sequence and selected loop timing',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,14,14,14],colors:{ink:14,background:6},animation:{effect:'scroll-x',colorEffect:'color-wave',seconds:.5,scale:4,background:'dark',videoRepeats:2}}));
 const video=decodeVideo(await download(page,'#exportVideo'));expect(video.frames).toHaveLength(16);expect(Number(video.info.format.duration)).toBeCloseTo(1,2);
 for(let f=0;f<16;f++){const local=f%8,x=(4-Math.floor(local/8*4))%4;for(let col=0;col<4;col++)nearPixel(video,f,col*32+16,16,rgb(col===x?ramps['color-wave'][(x+local)%8]:6))}
});
test('composite export freezes movement and color settings before asynchronous encoding',async({page})=>{
 const {contents}=require('./helpers.cjs'),p=project([160,'',0,128,32,160,255,160],4,2,{cellColors:[0,3,14,2,7,4,2,13],animation:{effect:'scroll-x',colorEffect:'color-wave',seconds:1,scale:1,background:'transparent'}});await loadProject(page,p);
 let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/vendor/gifenc.esm.js',async route=>{started();await gate;await route.continue()});const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await loading;
 await ui(page,'#animationEffect','selectOption','wave');await ui(page,'#animationColor','selectOption','color-glow');await ui(page,'#recolorDrawing');release();const gif=new GifReader(await contents(await waiting));expect(gif.numFrames()).toBe(8);for(let f=0;f<8;f++){const pixels=new Uint8Array(32*16*4);gif.decodeAndBlitFrameRGBA(f,pixels);expect(normalized(pixels)).toEqual(expected(p,f,8))}
});
