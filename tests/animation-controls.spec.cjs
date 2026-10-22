const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,ui,download,loadProject,project}=require('./helpers.cjs');
const palette=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'];
const rgb=c=>[0,2,4].map(i=>parseInt(palette[c].slice(i,i+2),16));
const wrap=(x,n)=>(x%n+n)%n;
function sample(shape,t){t=wrap(t,1);return shape==='triangle'?1-4*Math.abs((t+.25)%1-.5):shape==='square'?(t<.5?1:-1):shape==='sawtooth'?2*t-1:shape==='reverse-sawtooth'?1-2*t:Math.sin(t*2*Math.PI)}
function frame(gif,f){const b=new Uint8Array(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,b);return Buffer.from(b)}
function cell(b,w,x,y){return Array.from(b.slice(((y*8+4)*w+x*8+4)*4,((y*8+4)*w+x*8+4)*4+3))}
const settings={effect:'wave',colorEffect:'none',seconds:1,scale:1,background:'dark'};
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('scroll direction wraps cells and ink in all four directions in GIF and ZIP',async({page})=>{
 for(const direction of ['left','right','up','down']){
  const p=project([160,'','','','',''],3,2,{cellColors:[2,14,14,14,14,14],animation:{...settings,effect:'scroll-x',scrollDirection:direction}});await loadProject(page,p);
  const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json')),n=['left','right'].includes(direction)?3:2;
  expect(gif.numFrames()).toBe(n);expect(timing.scrollDirection).toBe(direction);
  for(let f=0;f<n;f++){const b=frame(gif,f),x=direction==='left'?wrap(-f,3):direction==='right'?f:0,y=direction==='up'?wrap(-f,2):direction==='down'?f:0;for(let yy=0;yy<2;yy++)for(let xx=0;xx<3;xx++)expect(cell(b,24,xx,yy)).toEqual(rgb(xx===x&&yy===y?2:6));expect(Buffer.from(PNG.sync.read(zip.readFile(timing.frames[f].file)).data)).toEqual(b)}
 }
});
for(const shape of ['sine','triangle','square','sawtooth','reverse-sawtooth'])test(shape+' movement waveform follows selected direction in GIF frames',async({page})=>{
 for(const direction of ['up','down','left','right']){
  const inks=Array.from({length:16},(_,i)=>i),p=project(Array(16).fill(160),4,4,{cellColors:inks,animation:{...settings,waveDirection:direction,waveShape:shape}});await loadProject(page,p);
  const gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(24);
  for(const f of [0,3,6,12,18,23])for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   const rows=['up','down'].includes(direction),sign=['down','right'].includes(direction)?-1:1,shift=Math.round(sample(shape,(rows?y:x)/4+f/24*sign)),sx=rows?wrap(x+shift,4):x,sy=rows?y:wrap(y+shift,4);
   expect(cell(frame(gif,f),32,x,y)).toEqual(rgb(inks[sy*4+sx]));
  }
 }
});
test('color wave directions and waveforms change only occupied cell inks',async({page})=>{
 test.setTimeout(120000);
 const ramp=[2,8,7,13,3,14,6,4];
 for(const direction of ['left','right','up','down','up-left','up-right','down-left','down-right'])for(const shape of ['sine','triangle','square','sawtooth','reverse-sawtooth']){
  await loadProject(page,project([160,'',160,'',160,''],3,2,{cellColors:Array(6).fill(2),animation:{...settings,effect:'none',colorEffect:'color-wave',colorWaveDirection:direction,colorWaveShape:shape}}));
  const gif=new GifReader(await download(page,'#exportGif'));
  for(const f of [0,2,5,7]){const b=frame(gif,f);for(let i=0;i<6;i++){
   const x=i%3,y=Math.floor(i/3),offset=(direction.includes('left')?x:direction.includes('right')?-x:0)+(direction.includes('up')?y:direction.includes('down')?-y:0),step=shape==='sawtooth'?offset+f:Math.min(7,Math.floor((sample(shape,f/8+offset/8)+1)*4));
   expect(cell(b,24,x,y)).toEqual(rgb(i%2===0?ramp[wrap(step,8)]:6));
  }}
 }
});
test('context controls persist and reject malformed options without altering the project',async({page})=>{
 await loadProject(page,project([160,'',160,''],2,2));await ui(page,'#animationEffect','selectOption','none');await ui(page,'#animationColor','selectOption','none');await expect(page.locator('#scrollDirection')).toBeHidden();await expect(page.locator('#waveShape')).toBeHidden();await expect(page.locator('#colorWaveShape')).toBeHidden();
 await ui(page,'#animationEffect','selectOption','scroll-x');await ui(page,'#scrollDirection','selectOption','right');await expect(page.locator('#waveShape')).toBeHidden();await ui(page,'#animationEffect','selectOption','wave');await ui(page,'#waveDirection','selectOption','down');await ui(page,'#waveShape','selectOption','triangle');await ui(page,'#animationColor','selectOption','color-wave');await ui(page,'#colorWaveDirection','selectOption','down-right');await ui(page,'#colorWaveShape','selectOption','square');
 const before=JSON.parse(await download(page,'#saveProject'));await page.waitForTimeout(350);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 for(const key of ['scrollDirection','waveDirection','waveShape','colorWaveDirection','colorWaveShape']){await loadProject(page,{...before,animation:{...before.animation,[key]:'invalid'}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}
 await ui(page,'#quickPlay');await expect(page.locator('#previewBanner')).toBeVisible();await ui(page,'#waveShape','selectOption','sawtooth');await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','true');await ui(page,'#animationStop');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(before.grid);
});
test('speed slider and exact duration stay synchronized and control scroll export timing',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{animation:{...settings,effect:'scroll-x',scrollDirection:'right'}}));
 await ui(page,'#animationSpeed','press','End');await expect(page.locator('#animationSeconds')).toHaveValue('0.5');await expect(page.locator('#animationSpeed')).toHaveAttribute('aria-valuetext','0.5 seconds per loop');
 const gif=new GifReader(await download(page,'#exportGif'));expect(Array.from({length:gif.numFrames()},(_,i)=>gif.frameInfo(i).delay*10).reduce((a,b)=>a+b,0)).toBe(500);
 await ui(page,'#animationSeconds','selectOption','8');await expect(page.locator('#animationSpeed')).toHaveValue('1');await ui(page,'#quickPlay');await ui(page,'#animationSpeed','press','Home');await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#animationSeconds')).toHaveValue('12');
 const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.animation).toMatchObject({scrollDirection:'right',seconds:12});await page.waitForTimeout(350);await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#animationSpeed')).toHaveValue('0');await expect(page.locator('#animationSeconds')).toHaveValue('12');
});
test('nondefault directions and waveforms survive async snapshotting and drive video output',async({page})=>{
 const {decodeVideo,nearPixel}=require('./video-utils.cjs'),{contents}=require('./helpers.cjs');
 await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,14,14,14],animation:{...settings,effect:'scroll-x',scrollDirection:'right',colorEffect:'color-wave',colorWaveDirection:'right',colorWaveShape:'square',seconds:1,scale:4}}));
 const before=JSON.parse(await download(page,'#saveProject'));let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/vendor/gifenc.esm.js',async route=>{started();await gate;await route.continue()});const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await loading;
 await ui(page,'#scrollDirection','selectOption','left');await ui(page,'#colorWaveShape','selectOption','triangle');release();const gif=new GifReader(await contents(await waiting)),ramp=[2,8,7,13,3,14,6,4];
 const assertFrame=(f,pixel)=>{const x=Math.floor(f/8*4),level=wrap(f/8-x/8,1)<.5?7:0;for(let col=0;col<4;col++)pixel(col,rgb(col===x?ramp[level]:6))};
 for(let f=0;f<8;f++)assertFrame(f,(x,color)=>expect(cell(frame(gif,f),128,x*4,0)).toEqual(color));
 await loadProject(page,before);const video=decodeVideo(await download(page,'#exportVideo'));expect(video.frames).toHaveLength(8);expect(Number(video.info.format.duration)).toBeCloseTo(1,2);for(let f=0;f<8;f++)assertFrame(f,(x,color)=>nearPixel(video,f,x*32+16,16,color));
});
test('fresh projects expose stable animation defaults and an accessible speed value',async({page})=>{
 await expect(page.locator('#animationEffect')).toHaveValue('none');await expect(page.locator('#waveDirection')).toHaveValue('up');await expect(page.locator('#waveShape')).toHaveValue('sine');await expect(page.locator('#colorWaveDirection')).toHaveValue('up-left');await expect(page.locator('#colorWaveShape')).toHaveValue('sawtooth');await expect(page.locator('#animationSpeed')).toHaveAttribute('aria-valuetext','2 seconds per loop');
 await ui(page,'#animationEffect','selectOption','wave');await expect(page.locator('#waveDirection')).toBeVisible();await expect(page.locator('#scrollDirection')).toBeHidden();await ui(page,'#animationColor','selectOption','color-wave');await expect(page.locator('#colorWaveShape')).toBeVisible();
});
