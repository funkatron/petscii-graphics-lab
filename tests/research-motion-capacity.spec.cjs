const {test,expect,project,loadProject,download}=require('./helpers.cjs');
const {profiles,artwork,capacityPage}=require('./c64-capacity-fixtures.cjs');

const researchEffects=[
  {
    name:'column-wave',
    animation:{effect:'column-wave',scrollDirection:'left',waveShape:'sine',waveAmplitude:50,waveLength:50,colorEffect:'none',scale:1,background:'dark',motionCycles:1},
  },
  {
    name:'fld-blinds',
    animation:{effect:'fld-blinds',waveShape:'sine',waveAmplitude:75,waveLength:50,colorEffect:'none',scale:1,background:'dark',motionCycles:1},
  },
];

test('40 × 24 research motions report adaptive C64 capacity',async({page},testInfo)=>{
 test.setTimeout(120000);
 await capacityPage(page);
 const results=[];
 for(const {name,animation}of researchEffects){
  for(const profile of profiles){
   for(const seconds of [2,4,8,12]){
    const {grid,cellColors}=artwork(profile);
    const motion=profile==='detailed-fast'?{motionCycles:4}:{motionCycles:1};
    await loadProject(page,project(grid,40,24,{cellColors,animation:{...animation,seconds,...motion}}));
    const savedEffect=JSON.parse(await download(page,'#saveProject')).animation.effect;
    expect(savedEffect,name+' '+profile+' '+seconds).toBe(name);
    const row=await page.evaluate(async()=>{
     const {createC64AdaptiveProgram}=await import('./c64-export.js');
     const input=window.capacityInput();
     let analysis;
     let error='';
     try{
      analysis=createC64AdaptiveProgram({...input,analyze:true});
     }catch(e){
      error=e.message;
     }
     if(!analysis){
      return {frameCount:input.frames.length,error};
     }
     const d=analysis.diagnostics;
     const fits=d.programBytes<=d.memoryLimit&&d.worstUpdateRatio<=1;
     if(!fits&&error==='')error=d.worstUpdateRatio>1?'playback speed':'memory budget';
     return {
      frameCount:analysis.frameCount,
      durationTicks:analysis.durationTicks,
      programBytes:d.programBytes,
      memoryLimit:d.memoryLimit,
      worstUpdateRatio:d.worstUpdateRatio,
      renderer:d.renderer,
      sharedBlockCount:d.sharedBlockCount??0,
      error,
      fits,
     };
    });
    results.push({effect:name,profile,seconds,...row});
   }
  }
 }
 await testInfo.attach('research-motion-capacity.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
 for(const row of results){
  expect(row.frameCount).toBeGreaterThan(0);
  expect(row.error==='').toBe(row.fits);
  if(!row.fits)expect(row.error).toMatch(/playback speed|memory budget/);
  expect(row.playerBytes===undefined||row.programBytes+row.sharedBlockCount>=0).toBe(true);
 }
 // 40 samples @ 2s: generic diff player exceeds CPU budget; native-rows would fit timing but not RAM.
 const columnSparse2=results.find(r=>r.effect==='column-wave'&&r.profile==='sparse'&&r.seconds===2);
 expect(columnSparse2.frameCount).toBe(40);
 expect(columnSparse2.renderer).toBe('generic');
 expect(columnSparse2.fits).toBe(false);
 expect(columnSparse2.error).toBe('playback speed');
 expect(columnSparse2.worstUpdateRatio).toBeGreaterThan(1);
 expect(columnSparse2.programBytes).toBeLessThan(columnSparse2.memoryLimit);
 // fld-blinds stays on 24 samples like wave; sparse checker should fit adaptive export.
 const blindsSparse2=results.find(r=>r.effect==='fld-blinds'&&r.profile==='sparse'&&r.seconds===2);
 expect(blindsSparse2.frameCount).toBe(24);
 expect(blindsSparse2.fits).toBe(true);
 expect(blindsSparse2.error).toBe('');
 // Longer loops slow per-frame diffs for column-wave (same program size, better timing).
 const columnSparse12=results.find(r=>r.effect==='column-wave'&&r.profile==='sparse'&&r.seconds===12);
 expect(columnSparse12.worstUpdateRatio).toBeLessThan(columnSparse2.worstUpdateRatio);
});