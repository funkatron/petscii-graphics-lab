const {spawnSync}=require('node:child_process');
const {test,expect,loadProject,project,ui,download}=require('./helpers.cjs');
const {capacityPage}=require('./c64-capacity-fixtures.cjs');

test('paired player exports the exact dense cube and keeps its loop deadlines',async({page})=>{
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

test('paired dictionary accepts 256 pairs and falls back for extra pairs and RAM glyphs',async({page})=>{
 await capacityPage(page);
 const result=await page.evaluate(async()=>{
  const {createC64Program,createC64AdaptiveProgram}=await import('./c64-export.js');
  const frame={cells:Array.from({length:256},(_,i)=>i),inks:Array(256).fill(1),durationMs:500};
  const input={columns:32,rows:8,background:0,ink:1,frames:[frame,frame]};
  const before=JSON.stringify(input);
  const full=createC64AdaptiveProgram(input);
  const extra={...frame,inks:frame.inks.map((ink,i)=>i===0?2:ink)};
  const overflow=createC64AdaptiveProgram({...input,frames:[frame,extra]});
  const generic=createC64Program({...input,frames:[frame,extra]});
  const mixed=createC64AdaptiveProgram({...input,glyphBits:new Uint8Array(4096)});
  const still=createC64AdaptiveProgram({...input,frames:[frame]});
  return {full:full.diagnostics.renderer,overflow:overflow.diagnostics.renderer,
   sameOverflow:overflow.bytes.length===generic.bytes.length&&overflow.bytes.every((b,i)=>b===generic.bytes[i]),
   mixed:mixed.diagnostics.renderer,still:still.diagnostics.renderer,unchanged:before===JSON.stringify(input)};
 });
 expect(result).toEqual({full:'paired',overflow:'generic',sameOverflow:true,mixed:'generic',still:'generic',unchanged:true});
});

test('paired centered updates preserve code zero, inks, unequal holds and loop transitions',async({page})=>{
 await capacityPage(page);
 const {frames,bytes,debugSymbols,diagnostics}=await page.evaluate(async()=>{
  const {createC64AdaptiveProgram}=await import('./c64-export.js');
  const frames=[
   {cells:[0,'',81,32,160,65],inks:[0,1,2,3,4,5],durationMs:100},
   {cells:[0,'',81,32,160,65],inks:[5,4,3,2,1,0],durationMs:200},
   {cells:[65,160,32,81,'',0],inks:[5,4,3,2,1,0],durationMs:300}
  ];
  const input={columns:3,rows:2,background:6,ink:14,charset:1,frames,repetitions:2};
  const program=createC64AdaptiveProgram(input);
  const analyzed=createC64AdaptiveProgram({...input,analyze:true});
  if(program.bytes.length!==analyzed.bytes.length||program.bytes.some((b,i)=>b!==analyzed.bytes[i]))throw Error('Analysis changes paired output');
  return {frames,bytes:[...program.bytes],debugSymbols:program.debugSymbols,diagnostics:program.diagnostics};
 });
 expect(diagnostics.renderer).toBe('paired');
 expect(diagnostics.playerBytes+Object.values(diagnostics.streamBytes).reduce((n,b)=>n+b,0)).toBe(diagnostics.programBytes);
 for(const clockHz of [985248,1022727]){
  const run=spawnSync('python3',['tests/c64-emulate.py'],{encoding:'utf8',maxBuffer:16e6,
   input:JSON.stringify({prg:bytes,clockHz,startJiffy:245,stopAfterTicks:80,
    observe:{start:debugSymbols.frameStart,ready:debugSymbols.frameReady}})});
  expect(run.status,run.stderr).toBe(0);
  const {snapshots,observations:{start,ready}}=JSON.parse(run.stdout);
  expect(snapshots).toHaveLength(6);
  expect(start).toHaveLength(6);
  expect(ready).toHaveLength(6);
  let elapsed=0;
  snapshots.forEach((snapshot,i)=>{
   const frame=frames[i%3],screen=Array(1000).fill(32),colors=Array(1000).fill(14);
   frame.cells.forEach((glyph,j)=>{
    const destination=(11+Math.floor(j/3))*40+18+j%3;
    screen[destination]=glyph===''?32:glyph;
    colors[destination]=frame.inks[j];
   });
   expect(snapshot.screen).toEqual(screen);
   expect(snapshot.colors).toEqual(colors);
   expect(snapshot.registers[4]).toBe(0x17);
   if(i)expect(start[i].tick-ready[0].tick).toBe(Math.round(elapsed*60/1000));
   elapsed+=frame.durationMs;
  });
 }
});
