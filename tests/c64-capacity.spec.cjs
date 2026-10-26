// Exercise the actual browser sampling functions; expose a test-only closure,
// rather than maintaining a second implementation of movement/color waves.
const {test,expect,project,loadProject}=require('./helpers.cjs');
const profiles=['sparse','repeated','detailed','mixed-bank','detailed-fast'];
const ramp=[2,8,7,13,3,14,6,4];
function artwork(profile){
 const grid=Array.from({length:960},(_,i)=>{
  const x=i%40,y=Math.floor(i/40);
  if(profile==='sparse')return x===y||x===39-y?160:'';
  if(profile==='repeated')return (x+y)%4<2?160:102;
  if(profile==='mixed-bank')return [1,257,2,258,160,102,127,255][(x*7+y*11)%8];
  return (x*17+y*31+x*y)%256;
 });
 return {grid,cellColors:grid.map((_,i)=>ramp[(i%40+Math.floor(i/40)*3)%8])};
}
test('40 × 24 combined-wave capacity matrix separates memory from timing limits',async({page},testInfo)=>{
 test.setTimeout(60000);
 await page.route('**/',async route=>{
  const response=await route.fetch();
  const body=(await response.text()).replace('(async()=>{',`(async()=>{
   window.capacityInput=()=>{const s=animationSource();const frames=animationExportFrames(s).map(f=>({...animationCells(f.index,s),durationMs:f.durationMs}));return {columns:s.W,rows:s.H,background:s.colors.background,ink:s.colors.ink,frames,...(frames.some(f=>f.cells.some(g=>g>255))?{glyphBits:rom.slice()}:{})}};
  `);
  await route.fulfill({response,body});
 });
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const results=[];
 for(const profile of profiles)for(const seconds of [2,4,8,12]){
  const {grid,cellColors}=artwork(profile);
  await loadProject(page,project(grid,40,24,{cellColors,animation:{effect:'wave',colorEffect:'color-wave',seconds,scale:1,background:'dark',motionCycles:profile==='detailed-fast'?4:1,colorCycles:profile==='detailed-fast'?4:1,waveDirection:'up',waveShape:'sine',colorWaveDirection:'up-left',colorWaveShape:'sawtooth'}}));
  const result=await page.evaluate(async()=>{
   const {createC64Program}=await import('./c64-export.js'),input=window.capacityInput();
   const analysis=createC64Program({...input,analyze:true});let error='';
   try{const ordinary=createC64Program(input);if(ordinary.bytes.some((v,i)=>v!==analysis.bytes[i])||ordinary.bytes.length!==analysis.bytes.length)throw Error('Analysis changed program bytes')}catch(e){error=e.message}
   return {...analysis.diagnostics,frameCount:analysis.frameCount,durationTicks:analysis.durationTicks,error};
  });
  expect(result.frameCount).toBe(profile==='detailed-fast'?96:24);expect(result.durationTicks).toBe(seconds*60);
  expect(result.playerBytes+Object.values(result.streamBytes).reduce((a,b)=>a+b,0)).toBe(result.programBytes);
  const fits=result.programBytes<=result.memoryLimit&&result.worstUpdateRatio<=1;
  expect(result.error==='').toBe(fits);
  if(!fits)expect(result.error).toContain(result.worstUpdateRatio>1?'playback speed':'memory budget');
  expect(result.error).not.toContain('Analysis changed');
  expect(result.streamBytes.characters>0).toBe(profile==='mixed-bank');
  results.push({profile,seconds,...result});
 }
 // Slowing these fixed-sample loops can relieve timing, but cannot reclaim memory.
 for(const profile of profiles){const rows=results.filter(r=>r.profile===profile);expect(new Set(rows.map(r=>r.programBytes)).size).toBe(1);expect(rows[3].worstUpdateRatio).toBeLessThan(rows[0].worstUpdateRatio)}
 expect(results.find(r=>r.profile==='detailed-fast'&&r.seconds===12).programBytes).toBeGreaterThan(results[0].memoryLimit);
 await testInfo.attach('c64-wave-capacity.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
});
