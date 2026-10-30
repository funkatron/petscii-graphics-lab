const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,ui,project,loadProject,waitForPreviewAdvance,previewSample,waitForProjectAutosave,download}=require('./helpers.cjs');
const colors=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'].map(c=>[0,2,4].map(n=>parseInt(c.slice(n,n+2),16)));
const grid=Array.from({length:32},(_,i)=>i%5===0?'':160),inks=grid.map((_,i)=>i%16),ramp=[0,6,14,3,1,3,14,6],wrap=(n,s)=>(n%s+s)%s;
const settings={effect:'sine-scroll',colorEffect:'raster-bars',seconds:1,scale:1,background:'dark',scrollDirection:'left',waveAmplitude:50,colorWaveAmplitude:100,colorWaveDirection:'up',colorWaveShape:'sawtooth'};
function expected(direction='left',bars=true){return Array.from({length:24},(_,f)=>{
 const phase=f/24,horizontal=['left','right'].includes(direction),sign=['right','down'].includes(direction)?-1:1;
 const cells=[],out=[];
 for(let y=0;y<4;y++)for(let x=0;x<8;x++){
 const travel=Math.floor(phase*(horizontal?8:4))*sign,bend=Math.round(Math.sin((horizontal?x/8:y/4)*Math.PI*2)*(horizontal?1:2));
 const xx=wrap(x+(horizontal?travel:bend),8),yy=wrap(y+(horizontal?bend:travel),4),i=yy*8+xx;cells.push(grid[i]);
 out.push(bars&&grid[i]!==''?ramp[(y+Math.floor(phase*8))%8]:inks[i]);
 }return {cells,inks:out};
})}
function assertPixels(pixels,width,frame,cell=8){for(let i=0;i<32;i++){const offset=((Math.floor(i/8)*cell+Math.floor(cell/2))*width+i%8*cell+Math.floor(cell/2))*4;expect([...pixels.subarray(offset,offset+3)]).toEqual(colors[frame.cells[i]===''?6:frame.inks[i]])}}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('sine scroller follows all directions and combines with coherent raster-style bands in GIF and ZIP',async({page})=>{
 for(const direction of ['left','right','up','down']){
 await loadProject(page,project(grid,8,4,{cellColors:inks,animation:{...settings,scrollDirection:direction}}));
 const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json')),frames=expected(direction);expect(gif.numFrames()).toBe(24);expect(timing.effect).toBe('sine-scroll');expect(timing.colorEffect).toBe('raster-bars');
 for(let f=0;f<24;f++){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);assertPixels(pixels,gif.width,frames[f]);expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(pixels)}
 }
});
test('new animation exports exact shared C64 program and disk bytes',async({page})=>{
 await loadProject(page,project(grid,8,4,{cellColors:inks,animation:settings}));const zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json')),frames=expected().map((f,i)=>({...f,durationMs:timing.frames[i].durationMs}));
 const wanted=await page.evaluate(async frames=>{const {createC64AdaptiveProgram,createD64Disk}=await import('./c64-export.js');const {bytes}=createC64AdaptiveProgram({columns:8,rows:4,background:6,ink:14,repetitions:0,frames});return {prg:[...bytes],d64:[...createD64Disk(bytes,'ANIMATION')]}},frames);
 await ui(page,'#c64Mode','selectOption','animation');expect([...await download(page,'#exportC64')]).toEqual(wanted.prg);await ui(page,'#c64Format','selectOption','d64');expect([...await download(page,'#exportC64')]).toEqual(wanted.d64);
});
test('new effects expose contextual controls, preserve source/preview and persist through project history',async({page})=>{
 await loadProject(page,project(grid,8,4,{cellColors:inks,animation:settings}));const before=JSON.parse(await download(page,'#saveProject'));
 await ui(page,'#scrollDirection','selectOption','right');await expect(page.locator('#animationEffect')).toHaveValue('sine-scroll');await expect(page.locator('#waveDirection')).toBeHidden();await expect(page.locator('#waveShape')).toBeHidden();await expect(page.locator('#waveAmplitude')).toBeVisible();await expect(page.locator('#colorWaveAmplitude')).toBeVisible();
 await ui(page,'#scrollDirection','selectOption','left');await ui(page,'#quickPlay');await waitForPreviewAdvance(page);await ui(page,'#quickPlay');const {f,pixels}=await previewSample(page,8,4),frame=expected()[f];expect(pixels).toEqual(frame.cells.map((g,i)=>colors[g===''?6:frame.inks[i]]));expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await ui(page,'#returnDrawing');await loadProject(page,project([160],1,1));await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await waitForProjectAutosave(page,before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await ui(page,'#animationColor','selectOption','none');await ui(page,'#animationColor','selectOption','raster-bars');await expect(page.locator('#colorWaveDirection')).toHaveValue('up');await ui(page,'#animationEffect','selectOption','wave');await expect(page.locator('#waveShape')).toBeVisible();
});
test('new effects freeze export settings before asynchronous loading',async({page})=>{
 const {contents}=require('./helpers.cjs');await loadProject(page,project(grid,8,4,{cellColors:inks,animation:settings}));let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/vendor/gifenc.esm.js',async route=>{started();await gate;await route.continue()});const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await loading;await ui(page,'#animationEffect','selectOption','none');await ui(page,'#animationColor','selectOption','none');release();const gif=new GifReader(await contents(await waiting));expect(gif.numFrames()).toBe(24);const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(6,pixels);assertPixels(pixels,gif.width,expected()[6]);
});
test('each new effect also works alone, with original glyphs or original inks preserved',async({page})=>{
 await loadProject(page,project(grid,8,4,{cellColors:inks,animation:{...settings,effect:'none'}}));let gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(8);
 for(let f=0;f<8;f++){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);assertPixels(pixels,gif.width,{cells:grid,inks:grid.map((_,i)=>ramp[(Math.floor(i/8)+f)%8])})}
 await loadProject(page,project(grid,8,4,{cellColors:inks,animation:{...settings,colorEffect:'none'}}));gif=new GifReader(await download(page,'#exportGif'));for(let f=0;f<24;f++){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);assertPixels(pixels,gif.width,expected('left',false)[f])}
});
test('combined video retains the same scroller and color-band frames',async({page})=>{
 const {decodeVideo,nearPixel}=require('./video-utils.cjs');await loadProject(page,project(grid,8,4,{cellColors:inks,animation:{...settings,scale:4}}));const video=decodeVideo(await download(page,'#exportVideo'));expect(video.frames).toHaveLength(24);const frames=expected();
 for(let f=0;f<24;f++)for(let i=0;i<32;i++)nearPixel(video,f,i%8*32+16,Math.floor(i/8)*32+16,colors[frames[f].cells[i]===''?6:frames[f].inks[i]]);
});
