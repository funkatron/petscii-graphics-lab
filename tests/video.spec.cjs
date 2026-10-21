const {GifReader}=require('omggif');
const {ui,test,expect,contents,download,loadProject,project}=require('./helpers.cjs');
const {decodeVideo,nearPixel}=require('./video-utils.cjs');
const ink=[108,94,181],dark=[53,40,121];
async function sample(page,extra={}){await loadProject(page,project([160,'','',''],4,1,{animation:{effect:'scroll-x',seconds:.5,scale:4,background:'dark'},...extra}))}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('speed defaults to two seconds, supports faster replay, and persists in projects',async({page})=>{
 await expect(page.getByLabel('Loop duration',{exact:true})).toHaveValue('2');await sample(page);await ui(page,'#animationEffect','selectOption','replay');
 const gif=new GifReader(await download(page,'#exportGif'));expect(Array.from({length:gif.numFrames()},(_,i)=>gif.frameInfo(i).delay).reduce((a,b)=>a+b,0)).toBe(50);
 const p=JSON.parse(await download(page,'#saveProject'));expect(p.animation.seconds).toBe(.5);await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#animationSeconds')).toHaveValue('0.5');
 await ui(page,'#quickPlay');await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','true');await ui(page,'#animationSeconds','selectOption','1');await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','true');await ui(page,'#animationStop');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(p.grid);
});
test('fast scrolling covers the whole grid with GIF-safe frame delays',async({page})=>{
 await loadProject(page,project([160,...Array(39).fill('')],40,1,{animation:{effect:'scroll-x',seconds:.5,scale:1,background:'dark'}}));
 const gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(25);
 for(let f=0;f<25;f++){expect(gif.frameInfo(f).delay).toBeGreaterThanOrEqual(2);const data=new Uint8Array(320*8*4);gif.decodeAndBlitFrameRGBA(f,data);const cell=(40-Math.floor(f/25*40))%40;for(let x=0;x<40;x++)expect(data[(4*320+x*8+4)*4]).toBe(x===cell?108:53)}
});
test('native video exports a complete loop at selected dimensions and speed',async({page})=>{
 await sample(page);const before=JSON.parse(await download(page,'#saveProject')),buffer=await download(page,'#exportVideo'),video=decodeVideo(buffer);
 expect(video.stream.width).toBe(128);expect(video.stream.height).toBe(32);expect(video.info.streams).toHaveLength(1);expect(Number(video.info.format.duration)).toBeCloseTo(.5,2);expect(video.frames).toHaveLength(4);
 for(let f=0;f<4;f++)for(let x=0;x<4;x++)nearPixel(video,f,x*32+16,16,x===(4-f)%4?ink:dark);
 await expect(page.locator('#exportVideo')).toBeVisible();expect(await download(page,'#exportVideo')).toEqual(buffer);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await expect(page.locator('#exportGif')).toBeEnabled();
});
test('video drawing replay retains painting order, erasures and the final hold',async({page})=>{
 await sample(page,{grid:[160,'','',''],drawingReplay:{base:['','','',''],events:[[3,160],[0,160],[3,'']]},animation:{effect:'replay',seconds:2,scale:4,background:'dark'}});
 const v=decodeVideo(await download(page,'#exportVideo'));expect(v.frames).toHaveLength(4);expect(Number(v.info.format.duration)).toBeCloseTo(2,2);
 for(const [f,left,right] of [[0,false,false],[1,false,true],[2,true,true],[3,true,false]]){nearPixel(v,f,16,16,left?ink:dark);nearPixel(v,f,112,16,right?ink:dark)}
 const frames=v.info.frames.filter(f=>f.media_type==='video');expect(frames.map(f=>Number(f.best_effort_timestamp_time))).toEqual([0,.5,1,1.5]);
});
test('video snapshots options and dimensions during loading; transparent video becomes dark',async({page})=>{
 await sample(page,{animation:{effect:'scroll-x',seconds:.5,scale:4,background:'transparent',videoRepeats:3}});let release;const gate=new Promise(resolve=>release=resolve);let requested;const started=new Promise(resolve=>requested=resolve);
 await page.route('**/video-export.js',async r=>{requested();await gate;await r.continue()});const waiting=page.waitForEvent('download');await ui(page,'#exportVideo');await started;
 await ui(page,'#columns','selectOption','2');await ui(page,'#animationSeconds','selectOption','8');await ui(page,'#gifBackground','selectOption','white');await ui(page,'#videoRepeats','fill','7');release();
 const v=decodeVideo(await contents(await waiting));expect(v.stream.width).toBe(128);expect(Number(v.info.format.duration)).toBeCloseTo(1.5,2);expect(v.frames).toHaveLength(12);await expect(page.locator('#videoRepeats')).toHaveValue('7');nearPixel(v,0,48,16,dark);await expect(page.locator('#columns')).toHaveValue('2');
});
test('video falls back to WebM when AVC encoding is unavailable',async({page})=>{
 await page.addInitScript(()=>{const probe=VideoEncoder.isConfigSupported.bind(VideoEncoder);VideoEncoder.isConfigSupported=config=>config.codec.startsWith('avc')?Promise.resolve({supported:false,config}):probe(config)});await page.reload();await page.locator('.app[data-ready=true]').waitFor();await sample(page);await ui(page,'#videoRepeats','fill','3');
 const v=decodeVideo(await download(page,'#exportVideo'));await expect(page.locator('#exportVideo')).toHaveAttribute('data-download-name',/\.webm$/);expect(['vp8','vp9']).toContain(v.stream.codec_name);expect(Number(v.info.format.duration)).toBeCloseTo(1.5,2);expect(v.frames).toHaveLength(12);for(let f=0;f<12;f++)for(let x=0;x<4;x++)nearPixel(v,f,x*32+16,16,x===(4-f%4)%4?ink:dark);
});
test('canceling video while loading restores export controls and permits retry',async({page})=>{
 await sample(page);let release;const gate=new Promise(resolve=>release=resolve);let requested;const started=new Promise(resolve=>requested=resolve);await page.route('**/video-export.js',async r=>{requested();await gate;await r.continue()});
 const files=[];page.on('download',d=>files.push(d));await ui(page,'#exportVideo');await started;await expect(page.locator('#exportFrames')).toBeDisabled();await ui(page,'#cancelAnimationExport');release();
 await expect(page.locator('#status')).toHaveText('Animation export canceled');expect(files).toHaveLength(0);await expect(page.locator('#exportVideo')).not.toHaveAttribute('data-download-url',/./);await expect(page.locator('#exportVideo')).toBeEnabled();expect(decodeVideo(await download(page,'#exportVideo')).frames).toHaveLength(4);
});
test('unsupported video and module loading errors preserve the drawing and restore buttons',async({page})=>{
 await sample(page);await page.route('**/video-export.js',r=>r.abort());await ui(page,'#exportVideo');await expect(page.locator('#status')).toContainText('Video export failed');await expect(page.locator('#exportVideo')).toBeEnabled();await page.unroute('**/video-export.js');
 await page.addInitScript(()=>Object.defineProperty(window,'VideoEncoder',{value:undefined,configurable:true}));await page.reload();await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#exportVideo');await expect(page.locator('#status')).toContainText('Video encoding is unavailable');await expect(page.locator('#exportGif')).toBeEnabled();expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([160,'','','']);
});
test('canceling native video finalization keeps the previous completed video available',async({page})=>{
 await sample(page);await ui(page,'#videoRepeats','fill','3');const previous=await download(page,'#exportVideo'),url=await page.locator('#exportVideo').getAttribute('data-download-url');
 let release;const gate=new Promise(resolve=>release=resolve);await page.exposeFunction('waitForVideoFlush',()=>gate);
 await page.evaluate(()=>{const original=VideoEncoder.prototype.flush;VideoEncoder.prototype.flush=async function(){document.documentElement.dataset.videoFlush='waiting';await window.waitForVideoFlush();return original.call(this)}});
 await ui(page,'#animationSeconds','selectOption','1');const files=[];page.on('download',d=>files.push(d));await ui(page,'#exportVideo');await expect(page.locator('html')).toHaveAttribute('data-video-flush','waiting');await ui(page,'#cancelAnimationExport');release();
 await expect(page.locator('#status')).toHaveText('Animation export canceled');expect(files).toHaveLength(0);await expect(page.locator('#exportVideo')).toHaveAttribute('data-download-url',url);await expect(page.locator('#exportVideo')).toBeEnabled();await ui(page,'#animationSeconds','selectOption','0.5');expect(await download(page,'#exportVideo')).toEqual(previous);
});

test('video repetition count encodes three complete loops with continuous timestamps',async({page})=>{
 await sample(page);await ui(page,'#videoRepeats','fill','3');await expect(page.locator('#videoDuration')).toContainText('3 loops × 0.5 s = 1.5 s total');
 const v=decodeVideo(await download(page,'#exportVideo'));expect(Number(v.info.format.duration)).toBeCloseTo(1.5,2);expect(v.frames).toHaveLength(12);
 for(let f=0;f<12;f++)for(let x=0;x<4;x++)nearPixel(v,f,x*32+16,16,x===(4-f%4)%4?ink:dark);
 const frames=v.info.frames.filter(f=>f.media_type==='video');for(let i=0;i<12;i++)expect(Number(frames[i].best_effort_timestamp_time)).toBeCloseTo(Math.floor(i/4)*.5+[0,.13,.25,.38][i%4],3);
 await expect(page.locator('#exportVideo')).toHaveAttribute('data-download-name',/-3x\.(mp4|webm)$/);await expect(page.locator('#status')).toContainText('3 loops · 1.5 s');
 // GIF remains one timeline with its own infinite-loop flag.
 const gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(4);expect(Array.from({length:4},(_,i)=>gif.frameInfo(i).delay).reduce((a,b)=>a+b,0)).toBe(50);
});
test('repeated drawing replay preserves reset, erasures, and final hold in every loop',async({page})=>{
 await sample(page,{drawingReplay:{base:['','','',''],events:[[3,160],[0,160],[3,'']]},animation:{effect:'replay',seconds:2,scale:4,background:'dark',videoRepeats:3}});
 const v=decodeVideo(await download(page,'#exportVideo'));expect(v.frames).toHaveLength(12);expect(Number(v.info.format.duration)).toBeCloseTo(6,2);
 for(let loop=0;loop<3;loop++)for(const [f,left,right] of [[0,false,false],[1,false,true],[2,true,true],[3,true,false]]){nearPixel(v,loop*4+f,16,16,left?ink:dark);nearPixel(v,loop*4+f,112,16,right?ink:dark)}
 expect(v.info.frames.filter(f=>f.media_type==='video').map(f=>Number(f.best_effort_timestamp_time))).toEqual(Array.from({length:12},(_,i)=>i*.5));
});
test('video repetitions persist, restore through undo, and reject invalid imports atomically',async({page})=>{
 await expect(page.locator('#videoRepeats')).toHaveValue('1');await sample(page);await ui(page,'#videoRepeats','fill','3');const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.animation.videoRepeats).toBe(3);
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#videoRepeats')).toHaveValue('3');
 await ui(page,'#videoRepeats','fill','5');await loadProject(page,project([160]));await expect(page.locator('#videoRepeats')).toHaveValue('1');await ui(page,'#undo');await expect(page.locator('#videoRepeats')).toHaveValue('5');
 await loadProject(page,saved);await expect(page.locator('#videoRepeats')).toHaveValue('3');
 for(const videoRepeats of [0,-1,1.5,101,'3',null]){await loadProject(page,{...saved,animation:{...saved.animation,videoRepeats}});await expect(page.locator('#status')).toContainText('Load failed: Invalid animation settings');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved)}
 await ui(page,'#videoRepeats','fill','100');await expect(page.locator('#videoDuration')).toContainText('50 s total');expect(JSON.parse(await download(page,'#saveProject')).animation.videoRepeats).toBe(100);
});
test('invalid video repetitions preserve last valid settings and previous successful download',async({page})=>{
 await sample(page);const previous=await download(page,'#exportVideo'),url=await page.locator('#exportVideo').getAttribute('data-download-url');const files=[];page.on('download',d=>files.push(d));
 for(const count of ['', '0','-1','1.5','101']){await ui(page,'#videoRepeats','fill',count);await expect(page.locator('#videoRepeats')).toHaveAttribute('aria-invalid','true');await ui(page,'#exportVideo');await expect(page.locator('#status')).toHaveText('Video repetitions must be a whole number from 1 to 100');await expect(page.locator('#exportVideo')).toHaveAttribute('data-download-url',url)}
 expect(files).toHaveLength(0);expect(JSON.parse(await download(page,'#saveProject')).animation.videoRepeats).toBe(1);
 await ui(page,'#videoRepeats','fill','2');await expect(page.locator('#videoRepeats')).toHaveAttribute('aria-invalid','false');expect(decodeVideo(await download(page,'#exportVideo')).frames).toHaveLength(8);expect(await download(page,'#exportVideo')).not.toEqual(previous);
});
