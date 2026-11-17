const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,project,loadProject,download,waitForProjectAutosave,ui}=require('./helpers.cjs');
const palette=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'];
const rgb=i=>[0,2,4].map(n=>parseInt(palette[i].slice(n,n+2),16));

function art(w,h,scrollDirection,waveAmplitude=50){
 const len=w*h;
 const grid=Array.from({length:len},(_,i)=>(i%(w+1)===0?160:''));
 const cellColors=grid.map((_,i)=>(i+2)%16);
 return project(grid,w,h,{cellColors,animation:{
   effect:'column-wave',scrollDirection,waveShape:'sine',waveAmplitude,waveLength:50,
   colorEffect:'none',seconds:2,scale:1,background:'dark',motionCycles:1,
 }});
}

async function plannerFrames(page,p){
 return page.evaluate(async ({columns,rows,animation,grid,cellColors})=>{
  const {animationCells,animationCount}=await import('./animation-frames.js');
  const source={W:columns,H:rows,grid,inks:cellColors,colors:{ink:2,background:6},...animation};
  const count=animationCount(source);
  const frames=[];
  for(let i=0;i<count;i++)frames.push(animationCells(i,source));
  return {count,frames,closed:JSON.stringify(animationCells(0,source))===JSON.stringify(animationCells(count,source))};
 },{columns:p.columns,rows:p.rows,animation:p.animation,grid:p.grid,cellColors:p.cellColors});
}

test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});

test('column-wave exports match planner and timing metadata',async({page})=>{
 test.setTimeout(90000);
 for(const [w,h,direction]of [[8,5,'left'],[7,3,'right']]){
  const p=art(w,h,direction);
  await loadProject(page,p);
  await expect(page.locator('#animationEffect')).toHaveValue('column-wave');
  const {count,frames,closed}=await plannerFrames(page,p);
  expect(closed).toBe(true);
  const gif=new GifReader(await download(page,'#exportGif'));
  const zip=new AdmZip(await download(page,'#exportFrames'));
  const timing=JSON.parse(zip.readAsText('timing.json'));
  expect(timing).toMatchObject({effect:'column-wave',scrollDirection:direction,waveAmplitude:50,waveLength:50});
  expect(gif.numFrames()).toBe(count);
  expect(timing.frames).toHaveLength(count);
  const sampleFrames=[0,Math.floor(count/4),Math.floor(count/2),count-1];
  for(const f of sampleFrames){
   const pixels=Buffer.alloc(gif.width*gif.height*4);
   gif.decodeAndBlitFrameRGBA(f,pixels);
   const png=PNG.sync.read(zip.readFile(timing.frames[f].file)).data;
   expect(png).toEqual(pixels);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;
    const at=((y*8+4)*gif.width+x*8+4)*4;
    expect([...pixels.subarray(at,at+3)],`${w}x${h} ${direction} f${f} c${i}`).toEqual(rgb(frames[f].cells[i]===''?6:frames[f].inks[i]));
   }
  }
 }
});

test('column-wave persists through reload and rejects invalid directions',async({page})=>{
 const p=art(8,5,'left');
 await loadProject(page,p);
 const before=JSON.parse(await download(page,'#saveProject'));
 expect(before.animation).toMatchObject({effect:'column-wave',scrollDirection:'left'});
 const f0=await download(page,'#exportGif');
 await waitForProjectAutosave(page,before);
 await page.reload();
 await page.locator('.app[data-ready=true]').waitFor();
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 expect(await download(page,'#exportGif')).toEqual(f0);
 await loadProject(page,{...before,animation:{...before.animation,scrollDirection:'up-left'}});
 await expect(page.locator('#status')).toContainText('Load failed');
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});

test('column-wave low amplitude differs from column-wave full bend on exports',async({page})=>{
 const hi=art(8,5,'left',50);
 const lo=art(8,5,'left',10);
 await loadProject(page,hi);
 const hiGif=new GifReader(await download(page,'#exportGif'));
 const pHi=Buffer.alloc(hiGif.width*hiGif.height*4);
 hiGif.decodeAndBlitFrameRGBA(Math.floor(hiGif.numFrames()/2),pHi);
 await loadProject(page,lo);
 const loGif=new GifReader(await download(page,'#exportGif'));
 const pLo=Buffer.alloc(loGif.width*loGif.height*4);
 loGif.decodeAndBlitFrameRGBA(Math.floor(loGif.numFrames()/2),pLo);
 expect(pLo).not.toEqual(pHi);
});

test('column-wave adaptive C64 export spot-check',async({page})=>{
 const p=art(8,5,'left');
 await loadProject(page,p);
 const diag=await page.evaluate(async ({animation,grid,cellColors,columns,rows})=>{
  const {animationCells,animationCount}=await import('./animation-frames.js');
  const {createC64AdaptiveProgram}=await import('./c64-export.js');
  const source={W:columns,H:rows,grid,inks:cellColors,colors:{background:6,ink:14},...animation};
  const n=animationCount(source);
  const frames=[];
  for(let i=0;i<n;i++)frames.push({...animationCells(i,source),durationMs:Math.round(source.seconds*1000/n)});
  const analysis=createC64AdaptiveProgram({columns,rows,background:6,ink:14,repetitions:0,frames,analyze:true});
  const painted=frames.reduce((max,f)=>Math.max(max,f.cells.filter(c=>c!=='').length),0);
  return {
   effect:source.effect,
   frameCount:n,
   paintedCellsMax:painted,
   programBytes:analysis.diagnostics.programBytes,
   memoryLimit:analysis.diagnostics.memoryLimit,
   worstUpdateRatio:analysis.diagnostics.worstUpdateRatio,
   renderer:analysis.diagnostics.renderer,
   fits:analysis.diagnostics.programBytes<=analysis.diagnostics.memoryLimit&&analysis.diagnostics.worstUpdateRatio<=1,
  };
 },{animation:p.animation,grid:p.grid,cellColors:p.cellColors,columns:p.columns,rows:p.rows});
 expect(diag.effect).toBe('column-wave');
 expect(diag.frameCount).toBe(24);
 expect(diag.fits).toBe(true);
 expect(diag.programBytes).toBeLessThanOrEqual(diag.memoryLimit);
});

test('column-wave is selectable from Movement menu with horizontal scroll only',async({page})=>{
 const p=project(Array(8*5).fill(''),8,5,{animation:{effect:'none',seconds:2,scale:1,background:'dark',colorEffect:'none'}});
 await loadProject(page,p);
 await ui(page,'#animationEffect','selectOption','column-wave');
 await expect(page.locator('#animationEffect')).toHaveValue('column-wave');
 await expect(page.locator('#scrollDirection option')).toHaveText(['Left','Right']);
 await expect(page.locator('#scrollOptions')).toBeVisible();
 await expect(page.locator('#waveOptions')).toBeVisible();
});