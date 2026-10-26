const {spawnSync}=require('node:child_process');
const {glyphRows}=require('./glyph-reference.cjs');
const {test,expect,loadProject,project}=require('./helpers.cjs');
const {artwork,capacityPage}=require('./c64-capacity-fixtures.cjs');
function emulate(bytes,options={}){
 const r=spawnSync('python3',['tests/c64-emulate.py'],{input:JSON.stringify({prg:bytes,...options}),encoding:'utf8',maxBuffer:12e6});
 expect(r.status,r.stderr).toBe(0);return JSON.parse(r.stdout);
}
function checkPlayback(result,frames,columns,rows,loops,clockHz){
 const expected=[],boundaries=[];let elapsed=0,last;
 for(let loop=0;loop<loops;loop++)for(const frame of frames){
  boundaries.push(Math.round(elapsed*60/1000));
  const colors=Array(1000).fill(14),cells=Array(1000).fill(32);
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){colors[y*40+x]=frame.inks[y*columns+x];cells[y*40+x]=frame.cells[y*columns+x]}
  const key=JSON.stringify([cells,colors]);if(key!==last)expected.push({cells,colors,frame:boundaries.length-1});last=key;elapsed+=frame.durationMs;
 }
 expect(result.observations.start).toHaveLength(frames.length*loops);
 expect(result.observations.ready).toHaveLength(frames.length*loops);
 result.observations.start.forEach((start,i)=>{
  if(i===0)return;
  expect(Math.abs(start.tick-result.observations.ready[0].tick-boundaries[i])).toBeLessThanOrEqual(1);
  const ticks=(boundaries[i+1]??Math.round(elapsed*60/1000))-boundaries[i];
  expect(result.observations.ready[i].cycles-start.cycles).toBeLessThanOrEqual(ticks*clockHz/60);
 });
 expect(result.snapshots).toHaveLength(expected.length);
 result.snapshots.forEach((s,i)=>{expect(s.colors).toEqual(expected[i].colors);expect(Math.abs(s.tick-result.observations.ready[expected[i].frame].tick)).toBeLessThanOrEqual(1)});
 return expected;
}
test('shared update bodies retain unequal holds, finite/continuous loops and ROM/RAM glyphs',async({page})=>{
 test.setTimeout(60000);await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const glyphBits=Array.from({length:512},(_,i)=>glyphRows(i)).flat();
 for(const custom of [false,true]){
  const {bytes,frames,diagnostics,debugSymbols}=await page.evaluate(async({custom,glyphBits})=>{
   const {createC64Program}=await import('./c64-export.js');
   const frames=[250,400,350,500,450,300].map((durationMs,f)=>({durationMs,cells:Array.from({length:1000},(_,i)=>custom?(f%2?257:160):(i+f%2)%256),inks:Array.from({length:1000},(_,i)=>(i+f%2)%16)}));
   const p=createC64Program({columns:40,rows:25,background:6,ink:14,frames,repetitions:custom?0:2,...(custom?{glyphBits:Uint8Array.from(glyphBits)}:{})});
   return {bytes:[...p.bytes],frames,diagnostics:p.diagnostics,debugSymbols:p.debugSymbols};
  },{custom,glyphBits});
  expect(diagnostics.sharedBlockCount).toBeGreaterThan(0);
  expect(diagnostics.sharedFrameReferences).toBeGreaterThan(2);
  expect(diagnostics.playerBytes).toBe(480);
  for(const clockHz of [985248,1022727]){
   // End continuous playback after its second loop, before its third first frame.
   // The finite version holds until the same stop time.
   const result=emulate(bytes,{clockHz,startJiffy:245,stopAfterTicks:custom?269:280,maxSteps:7000000,observe:{start:debugSymbols.frameStart,ready:debugSymbols.frameReady}});
   const expected=checkPlayback(result,frames,40,25,2,clockHz);
   result.snapshots.forEach((s,i)=>{
    if(custom){for(const x of [0,254,255,256,511,999])expect(s.characters.slice(s.screen[x]*8,s.screen[x]*8+8)).toEqual(glyphRows(expected[i].cells[x]))}
    else expect(s.screen).toEqual(expected[i].cells);
   });
  }
 }
});
test('four-cycle 40 × 24 combined waves fit memory and execute every sampled frame twice',async({page})=>{
 test.setTimeout(90000);await capacityPage(page);
 const {grid,cellColors}=artwork('detailed-fast');
 await loadProject(page,project(grid,40,24,{cellColors,animation:{effect:'wave',colorEffect:'color-wave',motionCycles:4,colorCycles:4,seconds:8,scale:1,background:'dark'}}));
 const {bytes,frames,diagnostics,debugSymbols}=await page.evaluate(async()=>{
  const {createC64Program}=await import('./c64-export.js'),input=window.capacityInput();
  const p=createC64Program({...input,repetitions:2});return {bytes:[...p.bytes],frames:input.frames,diagnostics:p.diagnostics,debugSymbols:p.debugSymbols};
 });
 expect(frames).toHaveLength(96);expect(diagnostics.programBytes).toBeLessThan(25000);expect(diagnostics.sharedBlockSavings).toBeGreaterThan(50000);
 for(const clockHz of [985248,1022727]){
  const result=emulate(bytes,{clockHz,startJiffy:245,stopAfterTicks:975,maxSteps:12000000,observe:{start:debugSymbols.frameStart,ready:debugSymbols.frameReady}});
  const expected=checkPlayback(result,frames,40,24,2,clockHz);
  result.snapshots.forEach((s,i)=>expect(s.screen).toEqual(expected[i].cells));
 }
});

test('shared blocks preserve independent movement and color rates',async({page})=>{
 test.setTimeout(60000);await capacityPage(page);
 const grid=Array.from({length:64},(_,i)=>(i*17)%128),cellColors=Array.from({length:64},(_,i)=>[2,8,7,13,3,14,6,4][i%8]);
 await loadProject(page,project(grid,8,8,{cellColors,animation:{effect:'wave',colorEffect:'color-wave',motionCycles:4,colorCycles:2,seconds:4,scale:1,background:'dark'}}));
 const {bytes,frames,diagnostics,debugSymbols}=await page.evaluate(async()=>{
  const {createC64Program}=await import('./c64-export.js'),input=window.capacityInput(),p=createC64Program({...input,repetitions:1});
  return {bytes:[...p.bytes],frames:input.frames,diagnostics:p.diagnostics,debugSymbols:p.debugSymbols};
 });
 expect(frames).toHaveLength(96);expect(diagnostics.sharedBlockCount).toBeGreaterThan(0);
 const result=emulate(bytes,{clockHz:985248,stopAfterTicks:255,maxSteps:6000000,observe:{start:debugSymbols.frameStart,ready:debugSymbols.frameReady}});
 const expected=checkPlayback(result,frames,8,8,1,985248);result.snapshots.forEach((s,i)=>expect(s.screen).toEqual(expected[i].cells));
});
test('small repeated updates do not add a call decoder without a net size saving',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const diagnostics=await page.evaluate(async()=>{
  const {createC64Program}=await import('./c64-export.js');return createC64Program({columns:1,rows:1,background:6,ink:14,frames:Array.from({length:6},(_,f)=>({cells:[f%2?81:160],inks:[14],durationMs:200}))}).diagnostics;
 });
 expect(diagnostics.sharedBlockSavings).toBe(0);expect(diagnostics.sharedBlockCount).toBe(0);expect(diagnostics.playerBytes).toBe(388);
});

test('sharing never rejects an unshared animation that already fits memory and timing',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const result=await page.evaluate(async()=>{
  const {createC64Program}=await import('./c64-export.js');
  const input={columns:40,rows:4,background:6,ink:14,frames:Array.from({length:8},(_,f)=>({cells:Array.from({length:160},(_,i)=>((i/5|0)+f%2)%256),inks:Array.from({length:160},(_,i)=>(i+f%2)%16),durationMs:20}))};
  const p=createC64Program(input),a=createC64Program({...input,analyze:true});
  return {d:p.diagnostics,identical:p.bytes.every((v,i)=>v===a.bytes[i])&&p.bytes.length===a.bytes.length};
 });
 expect(result.d.programBytes).toBe(2430);expect(result.d.sharedBlockCount).toBe(0);expect(result.d.worstUpdateRatio).toBeLessThanOrEqual(1);expect(result.identical).toBe(true);
});
