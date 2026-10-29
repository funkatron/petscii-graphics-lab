const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,ui,project,loadProject,waitForPreviewAdvance,waitForProjectAutosave,download,contents}=require('./helpers.cjs');
const W=8,H=4,grid=Array.from({length:32},(_,i)=>i%5===0?'':160),inks=grid.map((_,i)=>i%16),lengths=[10,25,50,75,100],shapes=['sine','triangle','square','sawtooth','reverse-sawtooth'];
const rgb=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'].map(c=>[0,2,4].map(n=>parseInt(c.slice(n,n+2),16))),ramps={'color-wave':[2,8,7,13,3,14,6,4],'raster-bars':[0,6,14,3,1,3,14,6],plasma:[6,4,2,8,7,13,3,14]};
const settings={effect:'ripple',colorEffect:'none',seconds:1,scale:1,background:'dark',waveDirection:'up',waveShape:'sine',waveAmplitude:50,waveLength:50,colorWaveDirection:'up-left',colorWaveShape:'sine',colorWaveAmplitude:100,colorWaveLength:50,scrollDirection:'left'};
const wrap=(n,size)=>(n%size+size)%size;
function wave(shape,t){t=wrap(t,1);if(shape==='triangle')return 1-4*Math.abs((t+.25)%1-.5);if(shape==='square')return t<.5?1:-1;if(shape==='sawtooth')return 2*t-1;if(shape==='reverse-sawtooth')return 1-2*t;return Math.sin(t*Math.PI*2)}
function reference(f,a){const count=a.effect!=='none'||a.colorEffect==='plasma'?24:8,p=f/count,cells=[],out=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  let xx=x,yy=y;
  if(a.effect==='ripple'){
   const dx=x-3.5,dy=y-1.5,r=Math.hypot(dx,dy);if(r){const value=wave(a.waveShape,r/Math.hypot(3.5,1.5)*(50/a.waveLength)-p),shift=value*2*(a.waveAmplitude/100);xx=Math.round(x+dx/r*shift);yy=Math.round(y+dy/r*shift)}
   if(xx<0||xx>=W||yy<0||yy>=H){cells.push('');out.push(inks[y*W+x]);continue}
  }
  const i=yy*W+xx,g=grid[i];cells.push(g);let ink=inks[i],ramp=ramps[a.colorEffect];
  if(g!==''&&ramp){let index=0;
   if(a.colorEffect==='plasma'){const dx=a.colorWaveDirection.includes('left')?1:a.colorWaveDirection.includes('right')?-1:0,dy=a.colorWaveDirection.includes('up')?1:a.colorWaveDirection.includes('down')?-1:0,u=x/W*(50/a.colorWaveLength),v=y/H*(50/a.colorWaveLength),value=(wave(a.colorWaveShape,u+dx*p)+wave(a.colorWaveShape,v+dy*p)+wave(a.colorWaveShape,u+v+(dx+dy)*p))/3;index=Math.min(7,Math.floor(Math.max(0,Math.min(1,(value+1)/2))*(a.colorWaveAmplitude/100)*8+1e-10))}
   else{const d=a.colorWaveDirection,offset=((d.includes('left')?x:d.includes('right')?-x:0)+(d.includes('up')?y:d.includes('down')?-y:0))*(50/a.colorWaveLength),raw=a.colorWaveShape==='sawtooth'?Math.floor(offset+Math.floor(p*8)):Math.min(7,Math.floor((wave(a.colorWaveShape,p+offset/8)+1)*4)),step=Math.floor(wrap(raw,8)*a.colorWaveAmplitude/100),start=a.colorEffect==='raster-bars'?0:Math.max(0,ramp.indexOf(ink));index=wrap(start+step,8)}
   ink=ramp[index];
  }out.push(ink);
 }return {cells,inks:out};
}
function raster(frame){const pixels=Buffer.alloc(W*8*H*8*4);for(let i=0;i<32;i++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)pixels.set([...rgb[frame.cells[i]===''?6:frame.inks[i]],255],((Math.floor(i/W)*8+y)*W*8+i%W*8+x)*4);return pixels}
async function art(page,a){const animation={...settings,...a};await loadProject(page,project(grid,W,H,{cellColors:inks,animation}));return animation}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const effect of ['ripple'])test(effect+' wavelengths match independent movement and ink frames at every length',async({page})=>{
 test.setTimeout(60000);
 for(let k=0;k<5;k++){const a=await art(page,{effect,waveLength:lengths[k],waveAmplitude:lengths[k],waveShape:shapes[k],waveDirection:['up','down','left','right','up'][k],scrollDirection:['left','right','up','down','left'][k]}),gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(24);for(let f=0;f<24;f++){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);expect(pixels,lengths[k]+' frame '+f).toEqual(raster(reference(f,a)))}}
});
test('ripple wavelengths supply exact ZIP, C64 PRG and D64 frames and metadata',async({page})=>{
 const a=await art(page,{waveLength:25,colorWaveLength:100,colorEffect:'plasma'}),zip=new AdmZip(await download(page,'#exportFrames')),t=JSON.parse(zip.readAsText('timing.json'));expect(t.waveLength).toBe(25);expect(t.colorWaveLength).toBe(100);expect(JSON.parse(zip.readAsText('project.json')).animation).toMatchObject({waveLength:25,colorWaveLength:100});expect(t.frames.reduce((n,f)=>n+f.durationMs,0)).toBe(1000);const frames=t.frames.map((f,i)=>({...reference(i,a),durationMs:f.durationMs}));for(let f=0;f<24;f++)expect(PNG.sync.read(zip.readFile(t.frames[f].file)).data).toEqual(raster(frames[f]));
 const wanted=await page.evaluate(async frames=>{const {createC64AdaptiveProgram,createD64Disk}=await import('./c64-export.js');const {bytes}=createC64AdaptiveProgram({columns:8,rows:4,background:6,ink:14,repetitions:0,frames});return {prg:[...bytes],d64:[...createD64Disk(bytes,'ANIMATION')]}},frames);await ui(page,'#c64Mode','selectOption','animation');expect([...await download(page,'#exportC64')]).toEqual(wanted.prg);await ui(page,'#c64Format','selectOption','d64');expect([...await download(page,'#exportC64')]).toEqual(wanted.d64);
});
test('ripple controls are independent, contextual, preserved in preview/history/autosave and validated atomically',async({page})=>{
 const a=await art(page,{waveLength:25,colorWaveLength:100,colorEffect:'plasma'});await ui(page,'#waveLength','selectOption','25');await expect(page.locator('#waveShape')).toBeVisible();await expect(page.locator('#waveDirection')).toBeHidden();await expect(page.locator('#waveLength')).toHaveAccessibleName('Movement wavelength');await expect(page.locator('#colorWaveLength')).toHaveValue('100');await ui(page,'#colorWaveLength','selectOption','100');const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#quickPlay');await waitForPreviewAdvance(page);await ui(page,'#quickPlay');const f=Number(await page.locator('#canvas').getAttribute('data-animation-frame')),frame=reference(f,a),pixels=await page.locator('#canvas').evaluate(c=>Array.from({length:32},(_,i)=>[...c.getContext('2d').getImageData(Math.floor((i%8+.5625)*c.width/8),Math.floor((Math.floor(i/8)+.5625)*c.height/4),1,1).data].slice(0,3)));expect(pixels).toEqual(frame.cells.map((g,i)=>rgb[g===''?6:frame.inks[i]]));expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await ui(page,'#returnDrawing');
 await loadProject(page,project([160],1,1));await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await waitForProjectAutosave(page,before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 for(const key of ['waveLength','colorWaveLength'])for(const value of [0,20,101,'50',null]){await loadProject(page,{...before,animation:{...before.animation,[key]:value}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}
 for(const effect of ['logo-bounce','logo-stretch','starfield','wipe','scroll-x','none']){await ui(page,'#animationEffect','selectOption',effect);await expect(page.locator('#waveLength')).toBeHidden()}
 await ui(page,'#animationEffect','selectOption','sine-scroll');await expect(page.locator('#waveLength')).toBeVisible();await expect(page.locator('#waveShape')).toBeHidden();await ui(page,'#animationColor','selectOption','color-glow');await expect(page.locator('#colorWaveLength')).toBeHidden();
});
test('ripple changes invalidate cached downloads and async exports keep captured lengths',async({page})=>{
 const a=await art(page,{waveLength:25,colorWaveLength:100,colorEffect:'plasma'});let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/vendor/gifenc.esm.js',async route=>{started();await gate;await route.continue()});const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await loading;await ui(page,'#waveLength','selectOption','100');await ui(page,'#colorWaveLength','selectOption','10');release();const old=await contents(await waiting),gif=new GifReader(old),pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(5,pixels);expect(pixels).toEqual(raster(reference(5,a)));expect(await download(page,'#exportGif')).not.toEqual(old);await ui(page,'#waveLength','selectOption','25');await ui(page,'#colorWaveLength','selectOption','100');expect(await download(page,'#exportGif')).toEqual(old);
});
test('ripple video uses the same decoded frames',async({page})=>{
 const {decodeVideo,nearPixel}=require('./video-utils.cjs'),a=await art(page,{waveLength:100,colorWaveLength:25,colorEffect:'raster-bars',colorWaveShape:'sine',scale:4}),video=decodeVideo(await download(page,'#exportVideo'));expect(video.frames).toHaveLength(24);for(let f=0;f<24;f++){const frame=reference(f,a);for(let i=0;i<32;i++)nearPixel(video,f,i%W*32+16,Math.floor(i/W)*32+16,rgb[frame.cells[i]===''?6:frame.inks[i]])}
});

test('Ripple repeats cycles and preserves a one-cell center',async({page})=>{
 const a=await art(page,{motionCycles:4,colorEffect:'none',seconds:2});const gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(96);for(const f of [0,6,24,30,72,95]){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);expect(pixels).toEqual(raster(reference(f%24,a)))}
 await ui(page,'#animationCycles','selectOption','16');await ui(page,'#animationSeconds','selectOption','0.5');await expect(page.locator('#quickPlay')).toBeDisabled();
 await loadProject(page,project([160],1,1,{cellColors:[2],animation:{...settings}}));const single=new GifReader(await download(page,'#exportGif'));for(let f=0;f<24;f++){const pixels=Buffer.alloc(8*8*4);single.decodeAndBlitFrameRGBA(f,pixels);expect([...pixels.subarray(0,4)]).toEqual([...rgb[2],255])}
});

for(const resetMode of ['native reset','width fallback'])test('ripple repaints empty cells throughout playback after workspace resizing with '+resetMode,async({page})=>{
 if(resetMode==='width fallback')await page.evaluate(()=>{CanvasRenderingContext2D.prototype.reset=undefined});
 test.setTimeout(60000);
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
 await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 const a=await art(page,{waveLength:25,colorWaveLength:100,colorEffect:'plasma'});
 for(const sidebarOpen of [false,true]){
  if(await page.locator('#sidebar').evaluate(e=>!e.classList.contains('closed'))!==sidebarOpen)await page.locator('#toggle').click();
  await page.clock.runFor(300);
  await ui(page,'#quickPlay');
  const seen=new Set();
  for(let sample=0;sample<65;sample++){
   const {f,pixels}=await page.locator('#canvas').evaluate(c=>({f:Number(c.dataset.animationFrame),pixels:Array.from({length:32},(_,i)=>[...c.getContext('2d').getImageData(Math.floor((i%8+.5625)*c.width/8),Math.floor((Math.floor(i/8)+.5625)*c.height/4),1,1).data].slice(0,3))})),frame=reference(f,a);
   seen.add(f);expect(pixels,`sidebar ${sidebarOpen}, frame ${f}`).toEqual(frame.cells.map((g,i)=>rgb[g===''?6:frame.inks[i]]));
   await page.clock.runFor(16);
  }
  expect([...seen].sort((a,b)=>a-b)).toEqual(Array.from({length:24},(_,i)=>i));
  await ui(page,'#quickPlay');await ui(page,'#returnDrawing');
 }
});
