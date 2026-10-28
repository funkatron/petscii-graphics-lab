const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,ui,project,loadProject,download,contents}=require('./helpers.cjs'),{glyphRows}=require('./glyph-reference.cjs');
const W=8,H=6,effects=['logo-bounce','logo-stretch','starfield','wipe'];
const grid=Array.from({length:W*H},(_,i)=>{const x=i%W,y=Math.floor(i/W);return x>=1&&x<=6&&y>=1&&y<=4&&(x+y)%3!==0?[160,257,35,0][i%4]:''}),inks=grid.map((_,i)=>i%16);
const rgb=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'].map(c=>[0,2,4].map(n=>parseInt(c.slice(n,n+2),16)));
const settings={colorEffect:'none',seconds:1,scale:1,background:'dark',waveAmplitude:100,scrollDirection:'left',wipePattern:'diagonal'};
function reference(effect,f,a=settings,source=grid){
 const p=f/24,out={cells:Array(W*H).fill(''),inks:inks.slice()},put=(dst,src)=>{out.cells[dst]=source[src];out.inks[dst]=inks[src]};
 if(effect==='logo-bounce'){
  const left=Math.round(1-Math.sin(p*Math.PI*2)*a.waveAmplitude/100),top=Math.round(1-Math.cos(p*Math.PI*4)*a.waveAmplitude/100);
  for(let y=1;y<=4;y++)for(let x=1;x<=6;x++)put((top+y-1)*W+left+x-1,y*W+x);
 }else if(effect==='logo-stretch'){
  const width=Math.max(1,Math.round(6*(1-a.waveAmplitude/100*(1-Math.cos(p*Math.PI*2))/4))),height=Math.max(1,Math.round(4*(1-a.waveAmplitude/100*(1-Math.cos(p*Math.PI*4))/4))),left=1+Math.floor((6-width)/2),top=1+Math.floor((4-height)/2);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)put((top+y)*W+left+x,(1+Math.floor((y+.5)*4/height))*W+1+Math.floor((x+.5)*6/width));
 }else if(effect==='starfield'){
  const horizontal=['left','right'].includes(a.scrollDirection),length=horizontal?W:H,sign=['left','up'].includes(a.scrollDirection)?-1:1,particles=source.flatMap((g,i)=>g===''?[]:[{i,x:i%W,y:Math.floor(i/W),depth:1+(i%W*17+Math.floor(i/W)*31)%3}]).sort((a,b)=>a.depth-b.depth||a.i-b.i);
  for(const {i,x,y,depth}of particles){const travel=sign*Math.floor(p*length*depth),wrap=n=>(n%length+length)%length;put(horizontal?y*W+wrap(x+travel):wrap(y+travel)*W+x,i)}
 }else{
  const visible=p<.35?p/.35:p>.65?(1-p)/.35:1,horizontal=['left','right'].includes(a.scrollDirection),reverse=['left','up'].includes(a.scrollDirection);
  for(let i=0;i<W*H;i++){const x=i%W,y=Math.floor(i/W),pos=horizontal?x:y,len=horizontal?W:H,u=reverse?1-(pos+.5)/len:(pos+.5)/len,v=horizontal?(y+.5)/H:(x+.5)/W,stripe=(pos%4+.5)/4;
   const threshold=a.wipePattern==='blinds'?(reverse?1-stripe:stripe):a.wipePattern==='checkerboard'?((x+y)%2+u)/2:(u+v)/2;if(threshold<=visible)put(i,i);
  }
 }
 if(a.colorEffect==='raster-bars')out.inks=out.inks.map((c,i)=>out.cells[i]===''?c:[0,6,14,3,1,3,14,6][(Math.floor(i/W)+Math.floor(p*8))%8]);
 return out;
}
function raster(frame,transparent=false){const pixels=Buffer.alloc(W*8*H*8*4);for(let i=0;i<W*H;i++){const bits=frame.cells[i]===''?Array(8).fill(0):glyphRows(frame.cells[i]);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const at=(((Math.floor(i/W)*8+y)*W*8)+i%W*8+x)*4;pixels.set(bits[y]&(128>>x)?[...rgb[frame.inks[i]],255]:transparent?[0,0,0,0]:[...rgb[6],255],at)}}return pixels}
async function art(page,effect,a={},source=grid){const animation={...settings,effect,...a};await loadProject(page,project(source,W,H,{cellColors:inks,animation}));return animation}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const effect of effects)test(effect+' exports exact glyph/ink pixels in GIF and ZIP',async({page})=>{
 const a=await art(page,effect),gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));expect(gif.numFrames()).toBe(24);expect(timing.effect).toBe(effect);expect(timing.wipePattern).toBe('diagonal');expect(timing.frames.reduce((n,f)=>n+f.durationMs,0)).toBe(1000);
 for(let f=0;f<24;f++){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);expect(pixels,'GIF frame '+f).toEqual(raster(reference(effect,f,a)));expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data,'ZIP frame '+f).toEqual(pixels)}
});
test('starfield directions and wipe patterns move or mask original glyphs deterministically',async({page})=>{
 test.setTimeout(120000);
 for(const scrollDirection of ['left','right','up','down'])for(const effect of ['starfield','wipe']){
  for(const wipePattern of effect==='wipe'?['diagonal','checkerboard','blinds']:['diagonal']){const a=await art(page,effect,{scrollDirection,wipePattern}),gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(24);for(const f of [0,3,6,12,21,23]){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);expect(pixels,JSON.stringify({effect,scrollDirection,wipePattern,f})).toEqual(raster(reference(effect,f,a)))}}
 }
});
test('logo amount controls affect travel and squeeze independently of timing',async({page})=>{
 test.setTimeout(60000);
 for(const effect of ['logo-bounce','logo-stretch'])for(const waveAmplitude of [10,25,50,75]){const a=await art(page,effect,{waveAmplitude}),gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(24);for(const f of [0,6,9,12]){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);expect(pixels,effect+' '+waveAmplitude+' '+f).toEqual(raster(reference(effect,f,a)))}}
});
for(const effect of effects)test(effect+' combines with color and exports exact C64 program/disk bytes',async({page})=>{
 const a=await art(page,effect,{colorEffect:'raster-bars',colorWaveDirection:'up',colorWaveShape:'sawtooth'}),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json')),frames=timing.frames.map((f,n)=>({...reference(effect,n,a),durationMs:f.durationMs}));for(let f=0;f<24;f++)expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(raster(frames[f]));
 const bits=Array.from({length:512},(_,i)=>glyphRows(i)).flat();const wanted=await page.evaluate(async({frames,bits})=>{const {createC64AdaptiveProgram,createD64Disk}=await import('./c64-export.js');const {bytes}=createC64AdaptiveProgram({columns:8,rows:6,background:6,ink:14,repetitions:0,glyphBits:Uint8Array.from(bits),frames});return {prg:[...bytes],d64:[...createD64Disk(bytes,'ANIMATION')]}},{frames,bits});await ui(page,'#c64Mode','selectOption','animation');expect([...await download(page,'#exportC64')]).toEqual(wanted.prg);await ui(page,'#c64Format','selectOption','d64');expect([...await download(page,'#exportC64')]).toEqual(wanted.d64);
});
test('new motion controls preserve effect selections, source, read-only preview, history and autosave',async({page})=>{
 test.setTimeout(90000);
 for(const effect of effects){const a=await art(page,effect);await ui(page,'#animationEffect','selectOption',effect);await expect(page.locator('#waveDirection')).toBeHidden();await expect(page.locator('#waveShape')).toBeHidden();if(effect==='wipe')await expect(page.locator('#wipeOptions')).toBeVisible();else await expect(page.locator('#wipeOptions')).toBeHidden();
  if(effect.startsWith('logo')){await expect(page.locator('#waveAmplitude')).toHaveAccessibleName(effect==='logo-bounce'?'Bounce travel':'Logo squeeze');await expect(page.locator('#scrollDirection')).toBeHidden()}else{await ui(page,'#scrollDirection','selectOption','right');await expect(page.locator('#animationEffect')).toHaveValue(effect);await ui(page,'#scrollDirection','selectOption','left')}
  if(effect==='wipe'){await ui(page,'#wipePattern','selectOption','blinds');a.wipePattern='blinds'}
  const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#quickPlay');await page.waitForTimeout(120);await ui(page,'#quickPlay');await expect(page.locator('#paint')).toBeDisabled();const f=Number(await page.locator('#canvas').getAttribute('data-animation-frame')),frame=reference(effect,f,a);
  const pixels=await page.locator('#canvas').evaluate(c=>Array.from({length:48},(_,i)=>[...c.getContext('2d').getImageData(Math.floor((i%8+.5625)*c.width/8),Math.floor((Math.floor(i/8)+.5625)*c.height/6),1,1).data].slice(0,3)));expect(pixels).toEqual(frame.cells.map((g,i)=>rgb[g!==''&&(glyphRows(g)[4]&8)?frame.inks[i]:6]));expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
  await ui(page,'#returnDrawing');await loadProject(page,project([160],1,1));await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await page.waitForTimeout(350);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 }
 const before=JSON.parse(await download(page,'#saveProject'));for(const wipePattern of ['bad',null,1]){await loadProject(page,{...before,animation:{...before.animation,wipePattern}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}
 await ui(page,'#animationEffect','selectOption','wave');await expect(page.locator('#waveShape')).toBeVisible();await expect(page.locator('#waveAmplitude')).toHaveAccessibleName('Wave height');
});
test('wipe export captures its pattern before asynchronous work and invalidates old downloads',async({page})=>{
 const a=await art(page,'wipe',{wipePattern:'checkerboard'});let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/vendor/gifenc.esm.js',async route=>{started();await gate;await route.continue()});const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await loading;await ui(page,'#wipePattern','selectOption','blinds');release();const original=await contents(await waiting),gif=new GifReader(original),pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(3,pixels);expect(pixels).toEqual(raster(reference('wipe',3,a)));expect(await download(page,'#exportGif')).not.toEqual(original);
});
test('sampling retains repeated cycles and blocks unsupported fast layered movement',async({page})=>{
 for(const effect of effects){const a=await art(page,effect,{motionCycles:4,seconds:2}),gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(96);for(const f of [0,6,24,30,48,72,95]){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);expect(pixels).toEqual(raster(reference(effect,f%24,a)))}await ui(page,'#animationSeconds','selectOption','0.5');await ui(page,'#animationCycles','selectOption','16');await expect(page.locator('#quickPlay')).toBeDisabled();await expect(page.locator('#animationWarning')).toBeVisible()}
});
for(const effect of effects)test(effect+' video retains the reference movement and colors',async({page})=>{
 const {decodeVideo,nearPixel}=require('./video-utils.cjs'),source=grid.map(g=>g===''?'':160),a=await art(page,effect,{scale:4,colorEffect:'raster-bars',colorWaveDirection:'up',colorWaveShape:'sawtooth'},source),video=decodeVideo(await download(page,'#exportVideo'));expect(video.frames).toHaveLength(24);
 for(let f=0;f<24;f++){const frame=reference(effect,f,a,source);for(let i=0;i<W*H;i++)nearPixel(video,f,i%W*32+16,Math.floor(i/W)*32+16,rgb[frame.cells[i]===''?6:frame.inks[i]])}
});
test('new motions close their loops and handle empty, single-cell, narrow and full drawings',async({page})=>{
 const fs=require('node:fs'),html=fs.readFileSync('index.html','utf8').replace('(async()=>{','(async()=>{window.introFrames={animationCells,animationCount};');await page.route('**/index.html',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('/index.html');await page.locator('.app[data-ready=true]').waitFor();
 const results=await page.evaluate(effects=>effects.flatMap(effect=>[[1,1,[257]],[1,5,[160,'',257,'',35]],[5,1,[160,'',257,'',35]],[8,6,Array(48).fill('')],[8,6,Array(48).fill(257)]].map(([W,H,grid])=>{
  const s={W,H,grid,inks:grid.map((_,i)=>i%16),effect,colorEffect:'none',seconds:1,motionCycles:1,colorCycles:1,waveAmplitude:100,scrollDirection:'left',wipePattern:'diagonal'},api=window.introFrames,n=api.animationCount(s),frames=Array.from({length:n},(_,i)=>api.animationCells(i,s));return {effect,W,H,empty:grid.every(g=>g===''),count:n,closed:JSON.stringify(api.animationCells(0,s))===JSON.stringify(api.animationCells(n,s)),valid:frames.every(f=>f.cells.length===W*H&&f.inks.length===W*H&&f.cells.every(g=>g===''||grid.includes(g))&&f.inks.every(c=>Number.isInteger(c)&&c>=0&&c<16)),single:W===1&&H===1?frames.map(f=>f.cells[0]):null,emptyOutput:frames.every(f=>f.cells.every(g=>g===''))};})),effects);
 for(const r of results){expect(r.closed,JSON.stringify(r)).toBe(true);expect(r.valid,JSON.stringify(r)).toBe(true);if(r.empty)expect(r.emptyOutput).toBe(true);if(r.single){if(r.effect==='wipe'){expect(r.single[0]).toBe('');expect(r.single[12]).toBe(257)}else expect(r.single.every(g=>g===257)).toBe(true)}}
});

test('vacated and hidden regions stay transparent across each intro effect',async({page})=>{
 for(const effect of effects){const a=await art(page,effect,{background:'transparent'}),gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),t=JSON.parse(zip.readAsText('timing.json'));for(const f of [0,6,12,23]){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);expect(pixels).toEqual(raster(reference(effect,f,a),true));expect(PNG.sync.read(zip.readFile(t.frames[f].file)).data).toEqual(pixels)}}
});
test('intro controls stay usable in both iPad layouts with larger text',async({page})=>{
 test.setTimeout(60000);
 for(const [width,height]of [[810,1080],[1080,810]]){await page.setViewportSize({width,height});await page.addStyleTag({content:'html{font-size:200%}'});for(const effect of effects){await art(page,effect);await ui(page,'#animationEffect','selectOption',effect);await expect(page.locator('#introMotionHelp')).toBeVisible();const sidebar=await page.locator('#sidebar').boundingBox();for(const selector of ['#animationEffect','#animationCycles',...(effect.startsWith('logo')?['#waveAmplitude']:['#scrollDirection']),...(effect==='wipe'?['#wipePattern']:[])]){const b=await page.locator(selector).boundingBox();expect(b.width).toBeGreaterThan(38);expect(b.x).toBeGreaterThanOrEqual(sidebar.x);expect(b.x+b.width).toBeLessThanOrEqual(sidebar.x+sidebar.width)}expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)}}
});
