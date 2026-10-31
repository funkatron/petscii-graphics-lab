const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,project,loadProject,ui,download}=require('./helpers.cjs');
const {glyphRows}=require('./glyph-reference.cjs'),{decodeVideo,nearPixel}=require('./video-utils.cjs');
const effects=['space-warp','perspective-floor','curved-road','tunnel-flight'];
const rgb=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'].map(c=>[0,2,4].map(n=>parseInt(c.slice(n,n+2),16)));
const ramp=[0,11,12,15,1,7,13,5,3,14,6,4,2,10,8,9];
async function pictures(page,p,count){
 // Reuse the separately unit-tested geometry kernel. Color and ROM raster
 // expectations are independent of editor animation/export helpers.
 // Use the browser's ES-module loader for the same .js modules shipped by Pages.
 // Playwright's Node loader treats these files as CommonJS in this package.
 const frames=await page.evaluate(async({p,count})=>{
  const {spaceWarpFrame}=await import('./space-warp.js'),{depthSurfaceFrame}=await import('./depth-surfaces.js');
  return Array.from({length:count},(_,f)=>{
   const phase=(f%(count/p.animation.motionCycles))/(count/p.animation.motionCycles),s={W:p.columns,H:p.rows,grid:p.grid,inks:p.cellColors,effect:p.animation.effect,depthTravel:p.animation.depthTravel};
   return (s.effect==='space-warp'?spaceWarpFrame:depthSurfaceFrame)(phase,s);
  });
 },{p,count});
 return frames.map((frame,f)=>{
  const step=Math.floor((f%(count/p.animation.colorCycles))/(count/p.animation.colorCycles)*16);
  frame.inks=frame.inks.map((ink,i)=>frame.cells[i]===''?ink:ramp[(ramp.indexOf(ink)+step)%16]);return frame;
 });
}
function raster(p,frame){const width=p.columns*8,b=Buffer.alloc(p.columns*p.rows*64*4);frame.cells.forEach((g,i)=>{const bits=g===''?Array(8).fill(0):glyphRows(g);for(let y=0;y<8;y++)for(let x=0;x<8;x++)b.set([...rgb[bits[y]&(128>>x)?frame.inks[i]:6],255],((Math.floor(i/p.columns)*8+y)*width+i%p.columns*8+x)*4)});return b}
function art(effect,video=false){return project(Array.from({length:24},(_,i)=>i%5===0?'':video?160:[0,128,160,257,489,32][i%6]),6,4,{cellColors:Array.from({length:24},(_,i)=>i%16),animation:{effect,depthTravel:'away',colorEffect:'color-cycle',seconds:4,scale:video?4:1,background:'dark',motionCycles:video?1:2,colorCycles:video?2:4}})}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const effect of effects)test(effect+' preserves mixed glyphs and independent colors in GIF, ZIP and native bytes',async({page})=>{
 test.setTimeout(60000);const p=art(effect);await loadProject(page,p);const before=await download(page,'#saveProject'),frames=await pictures(page,p,96),gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));
 expect(gif.numFrames()).toBe(96);expect(timing).toMatchObject({effect,depthTravel:'away',motionCycles:2,colorCycles:4,durationMs:4000});
 for(let f=0;f<96;f++){const b=Buffer.alloc(48*32*4);gif.decodeAndBlitFrameRGBA(f,b);expect(b).toEqual(raster(p,frames[f]));expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(b)}
 const expected=await page.evaluate(async({frames,glyphBits})=>{const {createC64AdaptiveProgram,createD64Disk}=await import('./c64-export.js');const {bytes}=createC64AdaptiveProgram({columns:6,rows:4,background:6,ink:14,frames,glyphBits:Uint8Array.from(glyphBits),repetitions:0});return {prg:[...bytes],d64:[...createD64Disk(bytes,'ANIMATION')]}},{frames:frames.map((f,i)=>({...f,durationMs:timing.frames[i].durationMs})),glyphBits:Array.from({length:512},(_,g)=>glyphRows(g)).flat()});
 await ui(page,'#c64Mode','selectOption','animation');expect([...await download(page,'#exportC64')]).toEqual(expected.prg);await ui(page,'#c64Format','selectOption','d64');expect([...await download(page,'#exportC64')]).toEqual(expected.d64);expect(await download(page,'#saveProject')).toEqual(before);
});
for(const effect of effects)test(effect+' repeats video color and movement cycles without altering source',async({page})=>{
 test.setTimeout(60000);const p=art(effect,true);p.animation.videoRepeats=2;await loadProject(page,p);const before=await download(page,'#saveProject'),frames=await pictures(page,p,48),video=decodeVideo(await download(page,'#exportVideo'));expect(video.frames).toHaveLength(96);
 for(let f=0;f<96;f++)for(let i=0;i<24;i++)nearPixel(video,f,i%6*32+16,Math.floor(i/6)*32+16,rgb[frames[f%48].cells[i]===''?6:frames[f%48].inks[i]]);
 expect(await download(page,'#saveProject')).toEqual(before);
});
