const {spawnSync}=require('node:child_process');
const {glyphRows}=require('./glyph-reference.cjs');
const {test,expect,loadProject,project,ui,download}=require('./helpers.cjs');
const {capacityPage}=require('./c64-capacity-fixtures.cjs');
function emulate(bytes,options){
 const r=spawnSync('python3',['tests/c64-emulate.py'],{input:JSON.stringify({prg:bytes,...options}),encoding:'utf8',maxBuffer:16e6});expect(r.status,r.stderr).toBe(0);return JSON.parse(r.stdout);
}
test('native rows preserve all 96 full-screen wave/color samples at two seconds on both CPU speeds',async({page},testInfo)=>{
 test.setTimeout(90000);await capacityPage(page);
 const ids=[489,361,192,160,66],grid=Array.from({length:960},(_,i)=>ids[(Math.floor(i%40/4)+Math.floor(Math.floor(i/40)%8/3))%5]);
 await loadProject(page,project(grid,40,24,{cellColors:Array(960).fill(1),colors:{ink:1,background:0},animation:{effect:'wave',waveAmplitude:100,waveLength:50,colorWaveLength:50,colorWaveAmplitude:100,waveDirection:'up',waveShape:'sine',colorEffect:'color-wave',motionCycles:4,colorCycles:2,seconds:2,scale:1,background:'dark',colorWaveDirection:'up-left',colorWaveShape:'reverse-sawtooth'}}));
 const {bytes,frames,diagnostics,debugSymbols,generic}=await page.evaluate(async()=>{
  const {createC64RowProgram,createC64Program,createC64AdaptiveProgram}=await import('./c64-export.js'),input=window.capacityInput(),p=createC64AdaptiveProgram({...input,repetitions:2}),a=createC64AdaptiveProgram({...input,repetitions:2,analyze:true}),native=createC64RowProgram({...input,repetitions:2});
  if(p.bytes.some((v,i)=>v!==a.bytes[i])||p.bytes.length!==a.bytes.length)throw Error('Analysis changed native program bytes');
  if(p.bytes.some((v,i)=>v!==native.bytes[i])||p.bytes.length!==native.bytes.length)throw Error('Adaptive export did not select the native program');
  return {bytes:[...p.bytes],frames:input.frames,diagnostics:p.diagnostics,debugSymbols:p.debugSymbols,generic:createC64Program({...input,analyze:true}).diagnostics};
 });
 expect(frames).toHaveLength(96);expect(diagnostics.renderer).toBe('native-rows');expect(diagnostics.programBytes).toBeLessThanOrEqual(diagnostics.memoryLimit);expect(diagnostics.worstUpdateRatio).toBeLessThanOrEqual(1);expect(diagnostics.worstUpdateRatio).toBeLessThan(generic.worstUpdateRatio);
 expect(diagnostics.playerBytes+Object.values(diagnostics.streamBytes).reduce((a,b)=>a+b,0)).toBe(diagnostics.programBytes);
 await ui(page,'#c64Mode','selectOption','animation');await ui(page,'#c64Repeats','fill','2');await page.locator('#c64Repeats').press('Tab');
 await expect(page.locator('#c64Readiness')).toContainText('Ready — exporter checks passed');
 await expect(page.locator('#c64Readiness')).toContainText(diagnostics.programBytes.toLocaleString()+' / ');
 const before=await download(page,'#saveProject');await ui(page,'#c64Format','selectOption','prg');
 const exported=await download(page,'#exportC64');expect([...exported]).toEqual(bytes);
 await ui(page,'#c64Format','selectOption','d64');const disk=await download(page,'#exportC64');
 const expectedDisk=await page.evaluate(async bytes=>{const {createD64Disk}=await import('./c64-export.js');return [...createD64Disk(Uint8Array.from(bytes),'ANIMATION')]},bytes);
 expect([...disk]).toEqual(expectedDisk);expect(await download(page,'#saveProject')).toEqual(before);
 const expectedKeys=frames.map(f=>f.cells.map(g=>glyphRows(g).join(','))),reports=[];
 for(const clockHz of [985248,1022727]){
  const r=emulate([...exported],{clockHz,startJiffy:245,stopAfterTicks:260,maxSteps:5000000,observe:{start:debugSymbols.frameStart,ready:debugSymbols.frameReady}}),o=r.observations;
  expect(o.start).toHaveLength(192);expect(o.ready).toHaveLength(192);expect(r.snapshots).toHaveLength(192);
  const slotKeys=Array.from({length:256},(_,i)=>r.snapshots[0].characters.slice(i*8,i*8+8).join(','));let elapsed=0,maxCopyCycles=0;
  r.snapshots.forEach((s,i)=>{
   const f=frames[i%96];expect(s.colors.slice(0,960)).toEqual(f.inks);expect(s.colors.slice(960)).toEqual(Array(40).fill(1));expect(s.screen.slice(0,960).map(code=>slotKeys[code])).toEqual(expectedKeys[i%96]);expect(s.screen.slice(960)).toEqual(Array(40).fill(0));
   if(i){expect(Math.abs(o.start[i].tick-o.ready[0].tick-Math.round(elapsed*60/1000))).toBeLessThanOrEqual(1);const cost=o.ready[i].cycles-o.start[i].cycles;maxCopyCycles=Math.max(maxCopyCycles,cost);const ticks=Math.round((elapsed+f.durationMs)*60/1000)-Math.round(elapsed*60/1000);expect(cost).toBeLessThanOrEqual(ticks*clockHz/60)}
   elapsed+=f.durationMs;
  });expect(maxCopyCycles).toBeLessThan(14500);reports.push({clockHz,maxCopyCycles,...diagnostics});
 }
 await testInfo.attach('native-row-cpu.json',{body:JSON.stringify(reports,null,2),contentType:'application/json'});
});
test('adaptive selection preserves accepted generic bytes and original blockers when no native candidate fits',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const results=await page.evaluate(async()=>{
  const {createC64Program,createC64AdaptiveProgram,createC64RowProgram}=await import('./c64-export.js');
  const base={columns:40,rows:25,background:6,ink:14,frames:[0,1].map(f=>({cells:Array(1000).fill(f?102:160),inks:Array(1000).fill(f?2:1),durationMs:1000}))};
  const detailed=durationMs=>({...base,frames:Array.from({length:16},(_,f)=>({cells:Array.from({length:1000},(_,i)=>(i*31+f*17)%256),inks:Array.from({length:1000},(_,i)=>(i+f)%16),durationMs}))});
  return [base,{...base,frames:[base.frames[0]]},detailed(1e3),detailed(20),{...base,frames:Array.from({length:257},(_,i)=>({...base.frames[i%2],durationMs:20}))}].map(input=>{
   const before=JSON.stringify(input),generic=createC64Program({...input,analyze:true}),adaptive=createC64AdaptiveProgram({...input,analyze:true});let genericError='',adaptiveError='',nativeSize=0;
   try{createC64Program(input)}catch(e){genericError=e.message}
   try{createC64AdaptiveProgram(input)}catch(e){adaptiveError=e.message}
   if(input.frames.length>=2&&input.frames.length<=256)nativeSize=createC64RowProgram({...input,analyze:true}).diagnostics.programBytes;
   return {same:generic.bytes.length===adaptive.bytes.length&&generic.bytes.every((v,i)=>v===adaptive.bytes[i]),genericError,adaptiveError,unchanged:before===JSON.stringify(input),nativeSize,limit:adaptive.diagnostics.memoryLimit};
  });
 });
 for(const r of results){expect(r.same).toBe(true);expect(r.unchanged).toBe(true);expect(r.adaptiveError).toBe(r.genericError)}
 expect(results[0].genericError).toBe('');expect(results[1].genericError).toBe('');
 expect(results[2].nativeSize).toBeGreaterThan(results[2].limit);expect(results[3].genericError).toContain('playback speed');
});
test('native lookup reuse preserves all 192 eight-cycle samples and their original deadlines',async({page},testInfo)=>{
 test.setTimeout(120000);await capacityPage(page);
 const ids=[489,361,192,160,66],grid=Array.from({length:960},(_,i)=>ids[(Math.floor(i%40/4)+Math.floor(Math.floor(i/40)%8/3))%5]);
 await loadProject(page,project(grid,40,24,{cellColors:Array(960).fill(1),colors:{ink:1,background:0},animation:{effect:'wave',waveAmplitude:100,waveLength:50,colorWaveLength:50,colorWaveAmplitude:100,waveDirection:'up',waveShape:'sine',colorEffect:'color-wave',motionCycles:8,colorCycles:8,seconds:8,scale:1,background:'dark',colorWaveDirection:'down',colorWaveShape:'sawtooth'}}));
 const {bytes,frames,p,cycleBytes}=await page.evaluate(async()=>{
  const {createC64RowProgram}=await import('./c64-export.js'),input=window.capacityInput(),p=createC64RowProgram({...input,repetitions:2}),cycle=createC64RowProgram({...input,frames:input.frames.slice(0,24),repetitions:2});
  return {bytes:[...p.bytes],frames:input.frames,p:{diagnostics:p.diagnostics,frameCount:p.frameCount,durationTicks:p.durationTicks,debugSymbols:p.debugSymbols},cycleBytes:cycle.bytes.length};
 });
 expect(p.frameCount).toBe(192);expect(p.durationTicks).toBe(480);expect(p.diagnostics.nativeFrameStates).toBe(24);
 // Only the original seven-byte timed dispatches grow across repeated cycles.
 expect(bytes.length-cycleBytes).toBe((192-24)*7);
 const keys=frames.map(f=>f.cells.map(g=>glyphRows(g).join(','))),reports=[];
 for(const clockHz of [985248,1022727]){
  const r=emulate(bytes,{clockHz,startJiffy:245,stopAfterTicks:970,maxSteps:12000000,observe:{start:p.debugSymbols.frameStart,ready:p.debugSymbols.frameReady}}),o=r.observations;
  expect(r.snapshots).toHaveLength(384);expect(o.start).toHaveLength(384);expect(o.ready).toHaveLength(384);
  const slots=Array.from({length:256},(_,i)=>r.snapshots[0].characters.slice(i*8,i*8+8).join(','));let elapsed=0,maxCopyCycles=0,maxDrift=0;
  r.snapshots.forEach((s,i)=>{
   expect(s.screen.slice(0,960).map(code=>slots[code])).toEqual(keys[i%192]);expect(s.colors.slice(0,960)).toEqual(frames[i%192].inks);
   if(i){maxDrift=Math.max(maxDrift,Math.abs(o.start[i].tick-o.ready[0].tick-Math.round(elapsed*60/1000)));maxCopyCycles=Math.max(maxCopyCycles,o.ready[i].cycles-o.start[i].cycles)}
   elapsed+=frames[i%192].durationMs;
  });
  expect(maxDrift).toBeLessThanOrEqual(1);expect(maxCopyCycles).toBeLessThan(14500);reports.push({clockHz,maxDrift,maxCopyCycles,...p.diagnostics});
 }
 await testInfo.attach('native-frame-reuse.json',{body:JSON.stringify(reports,null,2),contentType:'application/json'});
});
test('lookup reuse compares glyphs and inks separately and preserves unequal holds and loop transitions',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const {bytes,states}=await page.evaluate(async()=>{
  const {createC64RowProgram}=await import('./c64-export.js'),frames=[{cells:[0,''],inks:[0,1],durationMs:100},{cells:[160,''],inks:[0,1],durationMs:200},{cells:[0,''],inks:[2,1],durationMs:300},{cells:[0,32],inks:[0,1],durationMs:400}],p=createC64RowProgram({columns:2,rows:1,background:6,ink:14,frames,repetitions:2});
  return {bytes:[...p.bytes],states:p.diagnostics.nativeFrameStates};
 });
 expect(states).toBe(3);const r=emulate(bytes,{stopAfterTicks:125});expect(r.snapshots).toHaveLength(7);
 expect(r.snapshots.map(s=>s.screen.slice(499,501))).toEqual([[0,32],[160,32],[0,32],[0,32],[160,32],[0,32],[0,32]]);
 expect(r.snapshots.map(s=>s.colors.slice(499,501))).toEqual([[0,1],[0,1],[2,1],[0,1],[0,1],[2,1],[0,1]]);
 // The identical final/first picture retains its combined 400+100 ms hold.
 const first=r.snapshots[0].tick;expect(r.snapshots.map(s=>s.tick-first)).toEqual([0,6,18,36,66,78,96]);
});
test('native ROM rows handle zero, empties, page crossings, small widths and continuous/finite playback',async({page})=>{
 test.setTimeout(60000);await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 for(const [columns,rows,repetitions,stopAfterTicks] of [[3,2,0,119],[40,25,2,135]]){
  const {bytes,frames}=await page.evaluate(async({columns,rows,repetitions})=>{
   const {createC64RowProgram}=await import('./c64-export.js'),frames=[0,1].map(f=>({cells:Array.from({length:columns*rows},(_,i)=>i%7===0?'':(i+f)%256),inks:Array.from({length:columns*rows},(_,i)=>(i+f)%16),durationMs:500}));
   const p=createC64RowProgram({columns,rows,background:6,ink:14,frames,repetitions});return {bytes:[...p.bytes],frames};
  },{columns,rows,repetitions});
  const {snapshots}=emulate(bytes,{stopAfterTicks,maxSteps:5000000});expect(snapshots).toHaveLength(4);
  snapshots.forEach((s,f)=>{const cells=Array(1000).fill(32),inks=Array(1000).fill(14);for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const i=y*columns+x;cells[(Math.floor((25-rows)/2)+y)*40+Math.floor((40-columns)/2)+x]=frames[f%2].cells[i]===''?32:frames[f%2].cells[i];inks[(Math.floor((25-rows)/2)+y)*40+Math.floor((40-columns)/2)+x]=frames[f%2].inks[i]}expect(s.screen).toEqual(cells);expect(s.colors).toEqual(inks)});
 }
});
test('native prototype rejects unsupported frame counts and excessive memory without changing input',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const r=await page.evaluate(async()=>{
  const {createC64RowProgram}=await import('./c64-export.js'),base={columns:1,rows:1,background:6,ink:14,frames:[{cells:[0],inks:[1],durationMs:100}]};
  const errors=[base,{...base,frames:Array(257).fill(base.frames[0])},{...base,columns:40,rows:25,frames:Array.from({length:16},(_,f)=>({cells:Array.from({length:1000},(_,i)=>(i*31+f*17)%256),inks:Array.from({length:1000},(_,i)=>(i+f)%16),durationMs:1000}))}].map(input=>{const before=JSON.stringify(input);let error='';try{createC64RowProgram(input)}catch(e){error=e.message}return {error,unchanged:before===JSON.stringify(input)}});return errors;
 });expect(r[0].error).toContain('2–256');expect(r[1].error).toContain('2–256');expect(r[2].error).toContain('memory');expect(r.every(x=>x.unchanged)).toBe(true);
});
