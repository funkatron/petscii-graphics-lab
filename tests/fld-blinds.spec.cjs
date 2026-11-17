const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,project,loadProject,download,waitForProjectAutosave,ui}=require('./helpers.cjs');
const palette=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'];
const rgb=i=>[0,2,4].map(n=>parseInt(palette[i].slice(n,n+2),16));

function art(w,h,waveAmplitude){
 const len=w*h;
 const grid=Array.from({length:len},(_,i)=>(Math.floor(i/w)%2===0?160:''));
 const cellColors=grid.map((_,i)=>(i+2)%16);
 return project(grid,w,h,{cellColors,animation:{
   effect:'fld-blinds',waveShape:'sine',waveAmplitude,waveLength:50,
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

test('fld-blinds exports match planner on two grid sizes',async({page})=>{
 for(const [w,h]of [[8,6],[6,4]]){
  const p=art(w,h,75);
  await loadProject(page,p);
  await expect(page.locator('#animationEffect')).toHaveValue('fld-blinds');
  const {count,frames,closed}=await plannerFrames(page,p);
  expect(closed).toBe(true);
  const gif=new GifReader(await download(page,'#exportGif'));
  const zip=new AdmZip(await download(page,'#exportFrames'));
  const timing=JSON.parse(zip.readAsText('timing.json'));
  expect(timing).toMatchObject({effect:'fld-blinds',waveAmplitude:75,waveLength:50});
  expect(gif.numFrames()).toBe(count);
  for(const f of [0,Math.floor(count/3),Math.floor((2*count)/3),count-1]){
   const pixels=Buffer.alloc(gif.width*gif.height*4);
   gif.decodeAndBlitFrameRGBA(f,pixels);
   expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(pixels);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;
    const at=((y*8+4)*gif.width+x*8+4)*4;
    expect([...pixels.subarray(at,at+3)],`${w}x${h} f${f} ${i}`).toEqual(rgb(frames[f].cells[i]===''?6:frames[f].inks[i]));
   }
  }
 }
});

test('fld-blinds persists and adaptive C64 spot-check',async({page})=>{
 const p=art(8,6,50);
 await loadProject(page,p);
 const before=JSON.parse(await download(page,'#saveProject'));
 expect(before.animation.effect).toBe('fld-blinds');
 const gifBytes=await download(page,'#exportGif');
 await waitForProjectAutosave(page,before);
 await page.reload();
 await page.locator('.app[data-ready=true]').waitFor();
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 expect(await download(page,'#exportGif')).toEqual(gifBytes);
 const diag=await page.evaluate(async ({animation,grid,cellColors,columns,rows})=>{
  const {animationCells,animationCount}=await import('./animation-frames.js');
  const {createC64AdaptiveProgram}=await import('./c64-export.js');
  const source={W:columns,H:rows,grid,inks:cellColors,colors:{background:6,ink:14},...animation};
  const n=animationCount(source);
  const frames=[];
  for(let i=0;i<n;i++)frames.push({...animationCells(i,source),durationMs:Math.round(source.seconds*1000/n)});
  const analysis=createC64AdaptiveProgram({columns,rows,background:6,ink:14,repetitions:0,frames,analyze:true});
  return {frameCount:n,programBytes:analysis.diagnostics.programBytes,memoryLimit:analysis.diagnostics.memoryLimit,worstUpdateRatio:analysis.diagnostics.worstUpdateRatio,fits:analysis.diagnostics.programBytes<=analysis.diagnostics.memoryLimit&&analysis.diagnostics.worstUpdateRatio<=1};
 },{animation:p.animation,grid:p.grid,cellColors:p.cellColors,columns:p.columns,rows:p.rows});
 expect(diag.fits).toBe(true);
 expect(diag.frameCount).toBe(24);
});

test('fld-blinds is selectable from Movement menu',async({page})=>{
 const p=project(Array(8*6).fill(''),8,6,{animation:{effect:'none',seconds:2,scale:1,background:'dark',colorEffect:'none'}});
 await loadProject(page,p);
 await ui(page,'#animationEffect','selectOption','fld-blinds');
 await expect(page.locator('#animationEffect')).toHaveValue('fld-blinds');
 await expect(page.locator('#scrollOptions')).toBeHidden();
 await expect(page.locator('#waveOptions')).toBeVisible();
 await expect(page.locator('label[for=waveAmplitude]')).toHaveText('Gap depth');
});