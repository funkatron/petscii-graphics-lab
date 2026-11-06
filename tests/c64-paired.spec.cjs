const {spawnSync}=require('node:child_process');
const {test,expect,loadProject,project,ui,download}=require('./helpers.cjs');
const {capacityPage}=require('./c64-capacity-fixtures.cjs');

test('paired fallback exports the exact dense cube and keeps its loop deadlines',async({page})=>{
 test.setTimeout(90000);
 await capacityPage(page);
 let seed=1;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)>>>16);
 const grid=Array.from({length:1000},()=>[32,65,66,81,160,161,162,''][random()%8]);
 const cellColors=Array.from({length:1000},()=>[1,11,15][random()%3]);
 await loadProject(page,project(grid,40,25,{cellColors,colors:{ink:1,background:0},
  animation:{effect:'rotating-cube',cameraDistance:2.5,cameraMotion:2,motionCycles:2,seconds:4,scale:1,background:'dark'}}));
 const {bytes,disk,diagnostics,debugSymbols,frames,legacy}=await page.evaluate(async()=>{
  const {createC64Program,createC64AdaptiveProgram,createD64Disk}=await import('./c64-export.js');
  const input={...window.capacityInput(),repetitions:2};
  const result=createC64AdaptiveProgram(input);
  return {bytes:[...result.bytes],disk:[...createD64Disk(result.bytes,'ANIMATION')],
   diagnostics:result.diagnostics,debugSymbols:result.debugSymbols,frames:input.frames,legacy:createC64Program({...input,analyze:true}).diagnostics};
 });
 expect(legacy.programBytes).toBeGreaterThan(legacy.memoryLimit);
 expect(diagnostics.renderer).toBe('paired');
 expect(diagnostics.programBytes).toBeLessThanOrEqual(diagnostics.memoryLimit);
 expect(diagnostics.worstUpdateRatio).toBeLessThanOrEqual(1);
 expect(frames).toHaveLength(96);
 await ui(page,'#c64Mode','selectOption','animation');
 await ui(page,'#c64Repeats','fill','2');
 await page.locator('#c64Repeats').press('Tab');
 await expect(page.locator('#c64Readiness')).toContainText('Ready — exporter checks passed');
 await expect(page.locator('#c64Readiness')).toContainText(diagnostics.programBytes.toLocaleString()+' / ');
 await ui(page,'#c64Format','selectOption','prg');
 expect([...(await download(page,'#exportC64'))]).toEqual(bytes);
 await ui(page,'#c64Format','selectOption','d64');
 expect([...(await download(page,'#exportC64'))]).toEqual(disk);
 for(const clockHz of [985248,1022727]){
  const run=spawnSync('python3',['tests/c64-emulate.py'],{encoding:'utf8',maxBuffer:16e6,
   input:JSON.stringify({prg:bytes,clockHz,stopAfterTicks:490,maxSteps:5000000,
    observe:{start:debugSymbols.frameStart,ready:debugSymbols.frameReady}})});
  expect(run.status,run.stderr).toBe(0);
  const {snapshots,observations:{start,ready}}=JSON.parse(run.stdout);
  expect(snapshots).toHaveLength(192);
  expect(start).toHaveLength(192);
  expect(ready).toHaveLength(192);
  let elapsed=0;
  for(const [i,snapshot] of snapshots.entries()){
   const frame=frames[i%96],startTick=Math.round(elapsed*60/1000);
   elapsed+=frame.durationMs;
   expect(snapshot.screen).toEqual(frame.cells.map(g=>g===''?32:g));
   expect(snapshot.colors).toEqual(frame.inks);
   if(i){
    expect(start[i].tick-ready[0].tick).toBe(startTick);
    const availableTicks=Math.round(elapsed*60/1000)-startTick;
    expect(ready[i].cycles-start[i].cycles).toBeLessThanOrEqual(availableTicks*clockHz/60);
   }
  }
 }
});
