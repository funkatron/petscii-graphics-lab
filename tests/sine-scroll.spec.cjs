const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,ui,project,loadProject,download,waitForPreviewAdvance,previewSample,waitForProjectAutosave}=require('./helpers.cjs');
const {reference}=require('./sine-scroll-reference.cjs');
const rgb=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'].map(c=>[0,2,4].map(n=>parseInt(c.slice(n,n+2),16)));
const directions=['up-left','up-right','down-left','down-right'];
function art(d){return project(Array.from({length:35},(_,i)=>i%4===1?'':160),7,5,{cellColors:Array.from({length:35},(_,i)=>(i+2)%16),animation:{effect:'sine-scroll',scrollDirection:d,waveAmplitude:50,waveLength:100,colorEffect:'none',seconds:2,scale:1,background:'dark'}})}
function pixels(p,picture){const out=Buffer.alloc(p.columns*8*p.rows*8*4);for(let y=0;y<p.rows*8;y++)for(let x=0;x<p.columns*8;x++){const i=Math.floor(y/8)*p.columns+Math.floor(x/8);out.set([...rgb[picture.cells[i]===''?6:picture.inks[i]],255],(y*p.columns*8+x)*4)}return out}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const d of directions)test(`Sine scroller ${d} matches independent GIF and ZIP pixels`,async({page})=>{
 const p=art(d);await loadProject(page,p);
 // Select through the real control as well as importing it.
 await ui(page,'#scrollDirection','selectOption',d);
 const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));
 expect(gif.numFrames()).toBe(24);expect(timing).toMatchObject({effect:'sine-scroll',scrollDirection:d,waveAmplitude:50,waveLength:100,durationMs:2000});
 for(let f=0;f<24;f++){const actual=Buffer.alloc(56*40*4);gif.decodeAndBlitFrameRGBA(f,actual);const expected=pixels(p,reference(p,d,f/24));expect(actual).toEqual(expected);expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(expected)}
});
test('Sine scroller preview, save, reload and Undo preserve diagonal settings and artwork',async({page})=>{
 const p=art('down-right');await loadProject(page,p);
 expect(await page.locator('#scrollDirection option').evaluateAll(o=>o.map(o=>o.value))).toEqual(['left','right','up','down',...directions]);
 const original=JSON.parse(await download(page,'#saveProject'));
 await ui(page,'#quickPlay');await waitForPreviewAdvance(page);await ui(page,'#quickPlay');
 const {f,pixels:actual}=await previewSample(page,7,5),expected=reference(p,'down-right',f/24);
 expect(actual).toEqual(expected.cells.map((g,i)=>rgb[g===''?6:expected.inks[i]]));
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(original);
 await ui(page,'#returnDrawing');
 await loadProject(page,project([160],1,1));await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(original);
 for(const d of directions){
  await ui(page,'#scrollDirection','selectOption',d);const saved=JSON.parse(await download(page,'#saveProject'));
  expect(saved.animation.scrollDirection).toBe(d);expect(saved.grid).toEqual(original.grid);expect(saved.cellColors).toEqual(original.cellColors);
  await waitForProjectAutosave(page,saved);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved);
 }
 const before=JSON.parse(await download(page,'#saveProject'));
 for(const animation of [{...before.animation,scrollDirection:'diagonal'},{...before.animation,effect:'wipe'}]){
  await loadProject(page,{...before,animation});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 }
 await ui(page,'#animationEffect','selectOption','starfield');await expect(page.locator('#scrollDirection')).toHaveValue('down-right');
 await ui(page,'#animationEffect','selectOption','sine-scroll');await expect(page.locator('#scrollDirection')).toHaveValue('down-right');
 await ui(page,'#animationEffect','selectOption','wipe');await expect(page.locator('#scrollDirection')).toHaveValue('left');
});
test('diagonal Sine scroller shares independent color cycles with GIF, ZIP, PRG and D64',async({page})=>{
 const p=art('up-right');p.animation={...p.animation,seconds:4,motionCycles:2,colorEffect:'color-cycle',colorCycles:4};await loadProject(page,p);
 const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json')),ramp=[0,11,12,15,1,7,13,5,3,14,6,4,2,10,8,9],frames=[];
 expect(gif.numFrames()).toBe(64);
 for(let f=0;f<64;f++){
  const picture=reference(p,'up-right',(f%32)/32);picture.inks=picture.inks.map((ink,i)=>picture.cells[i]===''?ink:ramp[(ramp.indexOf(ink)+f%16)%16]);
  const actual=Buffer.alloc(56*40*4);gif.decodeAndBlitFrameRGBA(f,actual);expect(actual).toEqual(pixels(p,picture));expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(pixels(p,picture));frames.push({...picture,durationMs:timing.frames[f].durationMs});
 }
 const expected=await page.evaluate(async frames=>{const {createC64AdaptiveProgram,createD64Disk}=await import('./c64-export.js');const {bytes}=createC64AdaptiveProgram({columns:7,rows:5,background:6,ink:14,repetitions:0,frames});return {prg:[...bytes],d64:[...createD64Disk(bytes,'ANIMATION')]}},frames);
 await ui(page,'#c64Mode','selectOption','animation');expect([...await download(page,'#exportC64')]).toEqual(expected.prg);await ui(page,'#c64Format','selectOption','d64');expect([...await download(page,'#exportC64')]).toEqual(expected.d64);
});
