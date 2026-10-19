const {GifReader}=require('omggif');
const {ui,test,expect,download,loadProject,project}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
async function clickCell(page,x,y){const b=await page.locator('#canvas').boundingBox(),cols=+(await page.locator('#columns').inputValue()),rows=+(await page.locator('#rows').inputValue());await page.mouse.click(b.x+b.width*(x+.5)/cols,b.y+b.height*(y+.5)/rows)}
function decoded(buffer){const r=new GifReader(buffer),frames=[];for(let i=0;i<r.numFrames();i++){const rgba=new Uint8Array(r.width*r.height*4);r.decodeAndBlitFrameRGBA(i,rgba);frames.push({rgba,info:r.frameInfo(i)})}return {r,frames}}
function rgbaAt(gif,frame,x,y){const at=(y*gif.r.width+x)*4;return Array.from(gif.frames[frame].rgba.slice(at,at+4))}
const ink=[217,255,242,255],dark=[14,23,40,255];
test('replay records paint, erase, repaint and symmetry without losing undo history',async({page})=>{
 await loadProject(page,project(Array(8).fill(''),4,2,{selectedGlyph:160}));
 await clickCell(page,3,0);await clickCell(page,0,0);await ui(page,'#erase');await clickCell(page,3,0);await ui(page,'#erase');await clickCell(page,3,0);
 let p=JSON.parse(await download(page,'#saveProject'));expect(p.drawingReplay.base).toEqual(Array(8).fill(''));expect(p.drawingReplay.events).toEqual([[3,160],[0,160],[3,''],[3,160]]);
 await ui(page,'#undo');p=JSON.parse(await download(page,'#saveProject'));expect(p.drawingReplay.events).toEqual([[3,160],[0,160],[3,'']]);expect(p.grid[3]).toBe('');
 await ui(page,'#redo');await ui(page,'#sym','selectOption','both');await clickCell(page,1,0);
 p=JSON.parse(await download(page,'#saveProject'));expect(p.drawingReplay.events.slice(-4).map(e=>e[0]).sort()).toEqual([1,2,5,6]);
});
test('preview changes pixels, pauses, stops, and never alters the saved grid',async({page})=>{
 const original=[160,'','',''];await loadProject(page,project(original,4,1));await ui(page,'#animationEffect','selectOption','scroll-x');await ui(page,'#animationSeconds','selectOption','1');
 const pixels=()=>page.locator('#canvas').evaluate(c=>{const t=c.getContext('2d');return Array.from({length:4},(_,x)=>Array.from(t.getImageData(Math.floor(c.width*(x+.5)/4),Math.floor(c.height/2),1,1).data))});
 await expect.poll(pixels).toEqual([ink,[41,54,74,255],[41,54,74,255],[41,54,74,255]]);
 const before=await pixels();await ui(page,'#quickPlay');
 await expect.poll(pixels).not.toEqual(before);
 await ui(page,'#quickPlay');const paused=await pixels();await page.waitForTimeout(350);expect(await pixels()).toEqual(paused);
 expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(original);
 await ui(page,'#animationStop');expect(await pixels()).toEqual(before);
 await ui(page,'#quickPlay');await clickCell(page,1,0);await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','false');
 await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(original);
});
test('drawing replay GIF contains the recorded states and holds the finished drawing',async({page})=>{
 await loadProject(page,project(['','',''],3,1,{selectedGlyph:160}));await clickCell(page,2,0);await clickCell(page,0,0);await ui(page,'#erase');await clickCell(page,2,0);
 await ui(page,'#gifScale','selectOption','1');const buffer=await download(page,'#exportGif');expect(buffer.subarray(0,6).toString()).toBe('GIF89a');
 const g=decoded(buffer);expect(g.r.width).toBe(24);expect(g.r.height).toBe(8);expect(g.r.numFrames()).toBe(4);expect(g.r.loopCount()).toBe(0);
 expect(rgbaAt(g,0,4,4)).toEqual(dark);expect(rgbaAt(g,0,20,4)).toEqual(dark);
 expect(rgbaAt(g,1,20,4)).toEqual(ink);expect(rgbaAt(g,1,4,4)).toEqual(dark);
 expect(rgbaAt(g,2,20,4)).toEqual(ink);expect(rgbaAt(g,2,4,4)).toEqual(ink);
 expect(rgbaAt(g,3,20,4)).toEqual(dark);expect(rgbaAt(g,3,4,4)).toEqual(ink);
 expect(g.frames.map(f=>f.info.delay)).toEqual([100,100,100,100]);
 await expect(page.locator('#gifDownload')).toBeVisible();const again=await download(page,'#gifDownload');expect(again).toEqual(buffer);
});
test('scroll GIF wraps cells and encodes loop duration and selected resolution',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1));await ui(page,'#animationEffect','selectOption','scroll-x');await ui(page,'#animationSeconds','selectOption','2');await ui(page,'#gifScale','selectOption','2');
 const g=decoded(await download(page,'#exportGif'));expect(g.r.width).toBe(64);expect(g.r.height).toBe(16);expect(g.r.numFrames()).toBe(4);expect(g.frames.map(f=>f.info.delay)).toEqual([50,50,50,50]);
 for(let f=0;f<4;f++)for(let x=0;x<4;x++)expect(rgbaAt(g,f,x*16+8,8)).toEqual(x===(4-f)%4?ink:dark);
});
test('inverse GIF uses actual reverse glyphs and preserves empty cells',async({page})=>{
 await loadProject(page,project([160,''],2,1));await ui(page,'#animationEffect','selectOption','inverse');await ui(page,'#gifScale','selectOption','1');await ui(page,'#gifBackground','selectOption','transparent');
 const g=decoded(await download(page,'#exportGif'));expect(g.r.numFrames()).toBe(2);expect(rgbaAt(g,0,4,4)).toEqual(ink);expect(rgbaAt(g,1,4,4)[3]).toBe(0);for(const f of [0,1])expect(rgbaAt(g,f,12,4)[3]).toBe(0);
});
test('every effect exports and legacy glyphs render on a white background',async({page})=>{
 await loadProject(page,project(['█','','',''],2,2,{selectedGlyph:'█'}));await ui(page,'#gifScale','selectOption','1');await ui(page,'#gifBackground','selectOption','white');
 for(const effect of ['replay','scroll-y','wave']){
  await ui(page,'#animationEffect','selectOption',effect);const g=decoded(await download(page,'#exportGif'));expect(g.r.width).toBe(16);expect(g.r.height).toBe(16);expect(g.r.numFrames()).toBeGreaterThan(1);
  expect(g.frames.reduce((sum,f)=>sum+f.info.delay,0)).toBe(400);expect(g.frames.some((_,i)=>rgbaAt(g,i,4,4).slice(0,3).every(v=>v===0))).toBe(true);
 }
});
test('project round-trip retains replay and animation settings but never autoplays',async({page})=>{
 await loadProject(page,project(['',''],2,1,{selectedGlyph:160}));await clickCell(page,1,0);
 await ui(page,'#animationEffect','selectOption','wave');await ui(page,'#animationSeconds','selectOption','8');await ui(page,'#gifScale','selectOption','4');await ui(page,'#gifBackground','selectOption','transparent');
 const before=JSON.parse(await download(page,'#saveProject'));expect(before.animation).toEqual({effect:'wave',seconds:8,scale:4,background:'transparent'});
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();const after=JSON.parse(await download(page,'#saveProject'));expect(after.drawingReplay).toEqual(before.drawingReplay);expect(after.animation).toEqual(before.animation);await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','false');
 await ui(page,'#clear');await loadProject(page,before);expect(JSON.parse(await download(page,'#saveProject')).drawingReplay).toEqual(before.drawingReplay);
});
test('corrupt replay and animation imports fail atomically',async({page})=>{
 await loadProject(page,project([160,''],2,1));const before=JSON.parse(await download(page,'#saveProject'));
 for(const extra of [{drawingReplay:{base:['',''],events:[[2,160]]}},{drawingReplay:{base:['',''],events:[[0,777]]}},{drawingReplay:{base:['',''],events:[]}},{animation:{effect:'bad',seconds:1,scale:1,background:'dark'}}]){
  await loadProject(page,{...before,...extra});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(before.grid);
 }
});
test('GIF encoder load errors recover without changing the drawing',async({page})=>{
 await loadProject(page,project([160]));await page.route('**/vendor/gifenc.esm.js',r=>r.abort());await ui(page,'#exportGif');await expect(page.locator('#status')).toContainText('GIF export failed');await expect(page.locator('#exportGif')).toBeEnabled();expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([160]);
});
test('undoing project import restores its animation settings and replay',async({page})=>{
 await loadProject(page,project([160,''],2,1,{animation:{effect:'wave',seconds:8,scale:4,background:'white'}}));
 const before=JSON.parse(await download(page,'#saveProject'));
 await loadProject(page,project([81],1,1,{animation:{effect:'inverse',seconds:1,scale:1,background:'dark'}}));
 await ui(page,'#undo');const restored=JSON.parse(await download(page,'#saveProject'));expect(restored.animation).toEqual(before.animation);expect(restored.drawingReplay).toEqual(before.drawingReplay);expect(restored.grid).toEqual(before.grid);
 await ui(page,'#redo');await expect(page.locator('#animationEffect')).toHaveValue('inverse');
});
test('GIF export is a snapshot even when the canvas is edited during encoder loading',async({page})=>{
 await loadProject(page,project([160,'',''],3,1));await ui(page,'#animationEffect','selectOption','scroll-x');await ui(page,'#gifScale','selectOption','1');
 await page.route('**/vendor/gifenc.esm.js',async r=>{await new Promise(resolve=>setTimeout(resolve,200));await r.continue()});
 const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await ui(page,'#columns','selectOption','2');
 const {contents}=require('./helpers.cjs');const g=decoded(await contents(await waiting));expect(g.r.width).toBe(24);expect(g.r.numFrames()).toBe(3);await expect(page.locator('#columns')).toHaveValue('2');expect(JSON.parse(await download(page,'#saveProject')).grid).toHaveLength(2);
});

test('fast long replays keep GIF frame delays at least twenty milliseconds',async({page})=>{
 const events=Array.from({length:80},(_,i)=>[0,i%2===0?160:'']);
 await loadProject(page,project([''],1,1,{drawingReplay:{base:[''],events}}));await ui(page,'#animationSeconds','selectOption','1');
 const g=decoded(await download(page,'#exportGif'));expect(g.r.numFrames()).toBe(38);expect(g.frames.every(f=>f.info.delay>=2)).toBe(true);expect(g.frames.reduce((n,f)=>n+f.info.delay,0)).toBe(100);
});
