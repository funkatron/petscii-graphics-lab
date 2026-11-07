const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,project,loadProject,ui,download,previewSample,waitForPreviewAdvance,waitForProjectAutosave}=require('./helpers.cjs');
const palette=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'].map(c=>[0,2,4].map(n=>parseInt(c.slice(n,n+2),16)));
const art=(effect,colorEffect)=>project(Array.from({length:35},(_,i)=>i%3?'':160),7,5,{cellColors:Array.from({length:35},(_,i)=>i%16),colors:{ink:7,background:6},animation:{effect,colorEffect,seconds:4,scale:1,background:'dark'}});
async function reference(page,p){return page.evaluate(async p=>{
 const {bonfireFrame,bonfireHeat,BONFIRE_COLORS}=await import('/bonfire.js'),s={W:p.columns,H:p.rows,grid:p.grid,inks:p.cellColors};
 return Array.from({length:48},(_,f)=>{const phase=f/48,picture=p.animation.effect==='bonfire'?bonfireFrame(phase,s):{cells:p.grid.slice(),inks:p.cellColors.slice()};
  if(p.animation.colorEffect==='bonfire')picture.cells.forEach((g,i)=>{if(g!=='')picture.inks[i]=BONFIRE_COLORS[Math.min(5,Math.floor(bonfireHeat(i%s.W,Math.floor(i/s.W),s.W,s.H,phase)*6))]});return picture});
 },p)}
function raster(picture){const b=Buffer.alloc(56*40*4);for(let y=0;y<40;y++)for(let x=0;x<56;x++){const i=Math.floor(y/8)*7+Math.floor(x/8);b.set([...palette[picture.cells[i]===''?6:picture.inks[i]],255],(y*56+x)*4)}return b}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const [effect,color] of [['bonfire','none'],['none','bonfire'],['bonfire','bonfire']])test(`Bonfire ${effect}/${color}: preview and every GIF/ZIP frame agree`,async({page})=>{
 const p=art(effect,color);await loadProject(page,p);const before=JSON.parse(await download(page,'#saveProject')),pictures=await reference(page,p);
 const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));
 expect(gif.numFrames()).toBe(48);expect(timing).toMatchObject({effect,colorEffect:color,durationMs:4000});expect(timing.frames.reduce((a,f)=>a+f.durationMs,0)).toBe(4000);
 for(let f=0;f<48;f++){const b=Buffer.alloc(56*40*4);gif.decodeAndBlitFrameRGBA(f,b);expect(b).toEqual(raster(pictures[f]));expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(b)}
 await ui(page,'#quickPlay');await waitForPreviewAdvance(page);await ui(page,'#quickPlay');const {f,pixels}=await previewSample(page,7,5);expect(pixels).toEqual(pictures[f].cells.map((g,i)=>palette[g===''?6:pictures[f].inks[i]]));
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await ui(page,'#returnDrawing');
 await waitForProjectAutosave(page,before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});
test('Bonfire selectors, independent rates, empty input and undo preserve source',async({page})=>{
 await loadProject(page,art('none','none'));await ui(page,'#animationEffect','selectOption','bonfire');await ui(page,'#animationColor','selectOption','bonfire');
 await expect(page.locator('#waveOptions')).toBeHidden();await expect(page.locator('#colorWaveOptions')).toBeHidden();
 await ui(page,'#animationCycles','selectOption','2');await ui(page,'#animationColorCycles','selectOption','4');
 const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.animation).toMatchObject({effect:'bonfire',colorEffect:'bonfire',motionCycles:2,colorCycles:4});
 const zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));expect(timing.frames).toHaveLength(192);expect(timing).toMatchObject({motionCycles:2,colorCycles:4});
 await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject')).animation.colorCycles).toBe(1);
 await loadProject(page,project(Array(35).fill(''),7,5,{colors:{ink:7,background:6},animation:{effect:'bonfire',colorEffect:'bonfire',seconds:4,scale:1,background:'dark'}}));
 const gif=new GifReader(await download(page,'#exportGif'));const b=Buffer.alloc(56*40*4);gif.decodeAndBlitFrameRGBA(0,b);expect(b).toEqual(raster({cells:Array(35).fill(''),inks:Array(35).fill(7)}));
});
