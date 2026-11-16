const {GifReader}=require('omggif'),AdmZip=require('adm-zip');
const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
const palette=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'];
const rgb=i=>[0,2,4].map(n=>parseInt(palette[i].slice(n,n+2),16));
const grid=Array(12).fill(160),inks=Array(12).fill(2);
const settings={effect:'wave',colorEffect:'none',seconds:1,scale:1,background:'dark',waveShape:'sine',waveAmplitude:50,waveLength:50};

test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});

async function waveFrames(page,animation){
 return page.evaluate(async animation=>{
  const {animationCells,animationCount}=await import('./animation-frames.js');
  const source={grid:Array(12).fill('160'),inks:Array(12).fill(2),W:3,H:4,colors:{ink:2,background:6},...animation};
  const n=animationCount(source);
  const frames=[];
  for(let i=0;i<n;i++)frames.push(animationCells(i,source));
  return frames;
 },animation);
}

test('wave direction offers eight choices and saves diagonals',async({page})=>{
 await ui(page,'#animationEffect','selectOption','wave');
 await expect(page.locator('#waveDirection option')).toHaveCount(8);
 await expect(page.locator('#waveDirection')).toHaveValue('up');
 await loadProject(page,project(grid,3,4,{cellColors:inks,animation:{...settings,waveDirection:'up-left'}}));
 await expect(page.locator('#waveDirection')).toHaveValue('up-left');
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.animation.waveDirection).toBe('up-left');
});

test('diagonal wave moves perpendicular to propagation and exports match planner',async({page})=>{
 for(const direction of ['up-left','down-right']){
  const animation={...settings,waveDirection:direction};
  await loadProject(page,project(grid,3,4,{cellColors:inks,animation}));
  const expected=await waveFrames(page,animation);
  const gif=new GifReader(await download(page,'#exportGif'));
  expect(gif.numFrames()).toBe(expected.length);
  for(let f=0;f<expected.length;f++){
   const pixels=Buffer.alloc(gif.width*gif.height*4);
   gif.decodeAndBlitFrameRGBA(f,pixels);
   for(let i=0;i<12;i++){
    const at=((Math.floor(i/3)*8+4)*gif.width+(i%3)*8+4)*4;
    expect([...pixels.subarray(at,at+3)],direction+' f'+f+' c'+i).toEqual(rgb(expected[f].inks[i]));
   }
  }
  const zip=new AdmZip(await download(page,'#exportFrames'));
  expect(JSON.parse(zip.readAsText('project.json')).animation.waveDirection).toBe(direction);
 }
});

test('invalid diagonal wave directions reject import',async({page})=>{
 await loadProject(page,project(grid,3,4,{cellColors:inks,animation:settings}));
 const before=JSON.parse(await download(page,'#saveProject'));
 await loadProject(page,{...before,animation:{...before.animation,waveDirection:'sideways'}});
 await expect(page.locator('#status')).toContainText('Load failed');
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});