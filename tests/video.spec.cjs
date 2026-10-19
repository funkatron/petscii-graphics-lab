const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {GifReader}=require('omggif');
const {test,expect,contents,download,loadProject,project}=require('./helpers.cjs');
function decodeVideo(bytes){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'petscii-video-')),file=path.join(folder,'video.bin');
 try{
  fs.writeFileSync(file,bytes);const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-show_frames','-of','json',file],{maxBuffer:10000000}));
  const stream=info.streams.find(s=>s.codec_type==='video'),size=stream.width*stream.height*3;
  const raw=execFileSync('ffmpeg',['-v','error','-threads','1','-i',file,'-map','0:v:0','-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:64000000});
  return {info,stream,frames:Array.from({length:raw.length/size},(_,i)=>raw.subarray(i*size,(i+1)*size))};
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
}
function nearPixel(video,frame,x,y,expected){const offset=(y*video.stream.width+x)*3;for(let c=0;c<3;c++)expect(Math.abs(video.frames[frame][offset+c]-expected[c])).toBeLessThanOrEqual(12)}
const ink=[217,255,242],dark=[14,23,40];
async function sample(page,extra={}){await loadProject(page,project([160,'','',''],4,1,{animation:{effect:'scroll-x',seconds:.5,scale:4,background:'dark'},...extra}))}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('speed defaults to two seconds, supports faster replay, and persists in projects',async({page})=>{
 await expect(page.getByLabel('Animation speed',{exact:true})).toHaveValue('2');await sample(page);await page.locator('#animationEffect').selectOption('replay');
 const gif=new GifReader(await download(page,'#exportGif'));expect(Array.from({length:gif.numFrames()},(_,i)=>gif.frameInfo(i).delay).reduce((a,b)=>a+b,0)).toBe(50);
 const p=JSON.parse(await download(page,'#saveProject'));expect(p.animation.seconds).toBe(.5);await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#animationSeconds')).toHaveValue('0.5');
 await page.locator('#quickPlay').click();await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','true');await page.locator('#animationSeconds').selectOption('1');await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','true');await page.locator('#animationStop').click();expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(p.grid);
});
test('fast scrolling covers the whole grid with GIF-safe frame delays',async({page})=>{
 await loadProject(page,project([160,...Array(39).fill('')],40,1,{animation:{effect:'scroll-x',seconds:.5,scale:1,background:'dark'}}));
 const gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(25);
 for(let f=0;f<25;f++){expect(gif.frameInfo(f).delay).toBeGreaterThanOrEqual(2);const data=new Uint8Array(320*8*4);gif.decodeAndBlitFrameRGBA(f,data);const cell=(40-Math.floor(f/25*40))%40;for(let x=0;x<40;x++)expect(data[(4*320+x*8+4)*4]).toBe(x===cell?217:14)}
});
test('native video exports a complete loop at selected dimensions and speed',async({page})=>{
 await sample(page);const before=JSON.parse(await download(page,'#saveProject')),buffer=await download(page,'#exportVideo'),video=decodeVideo(buffer);
 expect(video.stream.width).toBe(128);expect(video.stream.height).toBe(32);expect(video.info.streams).toHaveLength(1);expect(Number(video.info.format.duration)).toBeCloseTo(.5,2);expect(video.frames).toHaveLength(4);
 for(let f=0;f<4;f++)for(let x=0;x<4;x++)nearPixel(video,f,x*32+16,16,x===(4-f)%4?ink:dark);
 await expect(page.locator('#videoDownload')).toBeVisible();expect(await download(page,'#videoDownload')).toEqual(buffer);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await expect(page.locator('#exportGif')).toBeEnabled();
});
test('video drawing replay retains painting order, erasures and the final hold',async({page})=>{
 await sample(page,{grid:[160,'','',''],drawingReplay:{base:['','','',''],events:[[3,160],[0,160],[3,'']]},animation:{effect:'replay',seconds:2,scale:4,background:'dark'}});
 const v=decodeVideo(await download(page,'#exportVideo'));expect(v.frames).toHaveLength(4);expect(Number(v.info.format.duration)).toBeCloseTo(2,2);
 for(const [f,left,right] of [[0,false,false],[1,false,true],[2,true,true],[3,true,false]]){nearPixel(v,f,16,16,left?ink:dark);nearPixel(v,f,112,16,right?ink:dark)}
 const frames=v.info.frames.filter(f=>f.media_type==='video');expect(frames.map(f=>Number(f.best_effort_timestamp_time))).toEqual([0,.5,1,1.5]);
});
test('video snapshots options and dimensions during loading; transparent video becomes dark',async({page})=>{
 await sample(page,{animation:{effect:'scroll-x',seconds:.5,scale:4,background:'transparent'}});let release;const gate=new Promise(resolve=>release=resolve);let requested;const started=new Promise(resolve=>requested=resolve);
 await page.route('**/video-export.js',async r=>{requested();await gate;await r.continue()});const waiting=page.waitForEvent('download');await page.locator('#exportVideo').click();await started;
 await page.locator('#columns').selectOption('2');await page.locator('#animationSeconds').selectOption('8');await page.locator('#gifBackground').selectOption('white');release();
 const v=decodeVideo(await contents(await waiting));expect(v.stream.width).toBe(128);expect(Number(v.info.format.duration)).toBeCloseTo(.5,2);nearPixel(v,0,48,16,dark);await expect(page.locator('#columns')).toHaveValue('2');
});
test('video falls back to WebM when AVC encoding is unavailable',async({page})=>{
 await page.addInitScript(()=>{const probe=VideoEncoder.isConfigSupported.bind(VideoEncoder);VideoEncoder.isConfigSupported=config=>config.codec.startsWith('avc')?Promise.resolve({supported:false,config}):probe(config)});await page.reload();await page.locator('.app[data-ready=true]').waitFor();await sample(page);
 const v=decodeVideo(await download(page,'#exportVideo'));await expect(page.locator('#videoDownload')).toHaveAttribute('download',/\.webm$/);expect(['vp8','vp9']).toContain(v.stream.codec_name);expect(Number(v.info.format.duration)).toBeCloseTo(.5,2);nearPixel(v,0,16,16,ink);
});
test('canceling video while loading restores export controls and permits retry',async({page})=>{
 await sample(page);let release;const gate=new Promise(resolve=>release=resolve);let requested;const started=new Promise(resolve=>requested=resolve);await page.route('**/video-export.js',async r=>{requested();await gate;await r.continue()});
 const files=[];page.on('download',d=>files.push(d));await page.locator('#exportVideo').click();await started;await expect(page.locator('#exportFrames')).toBeDisabled();await page.locator('#cancelAnimationExport').click();release();
 await expect(page.locator('#status')).toHaveText('Animation export canceled');expect(files).toHaveLength(0);await expect(page.locator('#videoDownload')).toBeHidden();await expect(page.locator('#exportVideo')).toBeEnabled();expect(decodeVideo(await download(page,'#exportVideo')).frames).toHaveLength(4);
});
test('unsupported video and module loading errors preserve the drawing and restore buttons',async({page})=>{
 await sample(page);await page.route('**/video-export.js',r=>r.abort());await page.locator('#exportVideo').click();await expect(page.locator('#status')).toContainText('Video export failed');await expect(page.locator('#exportVideo')).toBeEnabled();await page.unroute('**/video-export.js');
 await page.addInitScript(()=>Object.defineProperty(window,'VideoEncoder',{value:undefined,configurable:true}));await page.reload();await page.locator('.app[data-ready=true]').waitFor();await page.locator('#exportVideo').click();await expect(page.locator('#status')).toContainText('Video encoding is unavailable');await expect(page.locator('#exportGif')).toBeEnabled();expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([160,'','','']);
});
test('canceling native video finalization keeps the previous completed video available',async({page})=>{
 await sample(page);const previous=await download(page,'#exportVideo'),url=await page.locator('#videoDownload').getAttribute('href');
 let release;const gate=new Promise(resolve=>release=resolve);await page.exposeFunction('waitForVideoFlush',()=>gate);
 await page.evaluate(()=>{const original=VideoEncoder.prototype.flush;VideoEncoder.prototype.flush=async function(){document.documentElement.dataset.videoFlush='waiting';await window.waitForVideoFlush();return original.call(this)}});
 const files=[];page.on('download',d=>files.push(d));await page.locator('#exportVideo').click();await expect(page.locator('html')).toHaveAttribute('data-video-flush','waiting');await page.locator('#cancelAnimationExport').click();release();
 await expect(page.locator('#status')).toHaveText('Animation export canceled');expect(files).toHaveLength(0);await expect(page.locator('#videoDownload')).toHaveAttribute('href',url);await expect(page.locator('#exportVideo')).toBeEnabled();expect(await download(page,'#videoDownload')).toEqual(previous);
});
