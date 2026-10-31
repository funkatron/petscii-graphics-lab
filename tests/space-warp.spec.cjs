const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,project,loadProject,ui,download,waitForPreviewAdvance,previewSample,waitForProjectAutosave}=require('./helpers.cjs');
const palette=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'].map(c=>[0,2,4].map(n=>parseInt(c.slice(n,n+2),16)));
// Independent depth-buffer reference: visit sources in order instead of sorting.
function expected(p,f){const out=Array(p.grid.length).fill(''),inks=p.cellColors.slice(),depths=Array(p.grid.length).fill(Infinity),cx=(p.columns-1)/2,cy=(p.rows-1)/2;
 p.grid.forEach((g,i)=>{if(g==='')return;let t=((i*37)%101+.5)/101+(p.animation.depthTravel==='away'?1:-1)*f/48;t-=Math.floor(t);const z=.35+1.4*t,x=Math.round(cx+(i%p.columns-cx)*.8/z),y=Math.round(cy+(Math.floor(i/p.columns)-cy)*.8/z),d=y*p.columns+x;if(x>=0&&x<p.columns&&y>=0&&y<p.rows&&z<=depths[d]){out[d]=g;inks[d]=p.cellColors[i];depths[d]=z}});return {cells:out,inks};}
function art(depthTravel){return project(Array.from({length:35},(_,i)=>i%4===0?160:''),7,5,{cellColors:Array.from({length:35},(_,i)=>i%16),animation:{effect:'space-warp',depthTravel,colorEffect:'none',seconds:2,scale:1,background:'dark'}})}
function raster(p,picture){const b=Buffer.alloc(7*8*5*8*4);for(let y=0;y<40;y++)for(let x=0;x<56;x++){const i=Math.floor(y/8)*7+Math.floor(x/8);b.set([...palette[picture.cells[i]===''?6:picture.inks[i]],255],(y*56+x)*4)}return b}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const direction of ['toward','away'])test(`Space warp ${direction} matches every GIF and ZIP frame`,async({page})=>{
 const p=art(direction);await loadProject(page,p);const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));expect(gif.numFrames()).toBe(48);expect(timing.depthTravel).toBe(direction);
 for(let f=0;f<48;f++){const b=Buffer.alloc(56*40*4);gif.decodeAndBlitFrameRGBA(f,b);expect(b).toEqual(raster(p,expected(p,f)));expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(b)}
});
test('Space warp preview, import defaults and persisted settings preserve artwork',async({page})=>{
 const p=art('away');await loadProject(page,p);const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#quickPlay');await waitForPreviewAdvance(page);await ui(page,'#quickPlay');const {f,pixels}=await previewSample(page,7,5),picture=expected(p,f);expect(pixels).toEqual(picture.cells.map((g,i)=>palette[g===''?6:picture.inks[i]]));expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await ui(page,'#returnDrawing');
 await waitForProjectAutosave(page,before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await loadProject(page,{...before,animation:{...before.animation,depthTravel:'invalid'}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 const defaults={...p,animation:{...p.animation}};delete defaults.animation.depthTravel;await loadProject(page,defaults);expect(JSON.parse(await download(page,'#saveProject')).animation.depthTravel).toBe('toward');await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});
