// Exercise the actual browser sampling functions; expose a test-only closure,
// rather than maintaining a second implementation of movement/color waves.
const {test,expect,project,loadProject}=require('./helpers.cjs');
const {profiles,artwork,capacityPage}=require('./c64-capacity-fixtures.cjs');
test('40 × 24 combined-wave capacity matrix separates memory from timing limits',async({page},testInfo)=>{
 test.setTimeout(60000);
 await capacityPage(page);
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
 expect(results.find(r=>r.profile==='repeated'&&r.seconds===4).error).toBe('');
 expect(results.find(r=>r.profile==='repeated'&&r.seconds===4).programBytes).toBeLessThan(33000);
 expect(results.find(r=>r.profile==='detailed-fast'&&r.seconds===12).programBytes).toBeLessThan(results[0].memoryLimit);
 expect(results.find(r=>r.profile==='detailed-fast'&&r.seconds===12).error).toBe('');
 expect(results.find(r=>r.profile==='detailed-fast'&&r.seconds===12).sharedBlockCount).toBeGreaterThan(0);
 await testInfo.attach('c64-wave-capacity.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
});
