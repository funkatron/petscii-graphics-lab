// Historical C64 workloads use 50% height: the movement range before 100% was doubled.
const {spawnSync}=require('node:child_process');
const {glyphRows}=require('./glyph-reference.cjs');
const {test,expect,loadProject,project,ui,download}=require('./helpers.cjs');
const {artwork,capacityPage}=require('./c64-capacity-fixtures.cjs');
function emulate(bytes,options={}){
 const r=spawnSync('python3',['tests/c64-emulate.py'],{input:JSON.stringify({prg:bytes,stopAfterTicks:135,...options}),encoding:'utf8',maxBuffer:8e6});
 expect(r.status,r.stderr).toBe(0);return JSON.parse(r.stdout);
}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('packed inks preserve odd/even runs, page boundaries, unchanged gaps and loop transitions on both display paths',async({page})=>{
 const glyphBits=Array.from({length:512},(_,i)=>glyphRows(i)).flat();
 for(const custom of [false,true]){
  const {bytes,frames,diagnostics}=await page.evaluate(async({custom,glyphBits})=>{
   const {createC64Program}=await import('./c64-export.js');
   const cells=Array.from({length:1000},(_,i)=>custom&&i%2?257:160),inks=Array.from({length:1000},(_,i)=>i%16);
   // Distinct changed runs of odd/even lengths, including a destination page crossing.
   const ranges=[[0,5],[12,18],[249,260],[300,555],[600,854],[992,1000]];
   const frames=[{cells,inks,durationMs:500},{cells,inks:inks.map((v,i)=>ranges.some(([a,b])=>i>=a&&i<b)?v^7:v),durationMs:500}];
   const p=createC64Program({columns:40,rows:25,background:6,ink:14,frames,repetitions:2,...(custom?{glyphBits:Uint8Array.from(glyphBits)}:{})});
   return {bytes:[...p.bytes],frames,diagnostics:p.diagnostics};
  },{custom,glyphBits});
  expect(diagnostics.packedColorSavings).toBeGreaterThan(500);
  for(const clockHz of [985248,1022727]){
   const {snapshots}=emulate(bytes,{clockHz,startJiffy:245});expect(snapshots).toHaveLength(4);
   snapshots.forEach((s,f)=>{
    expect(s.colors).toEqual(frames[f%2].inks);
    if(custom){for(const i of [0,1,254,255,256,511,999])expect(s.characters.slice(s.screen[i]*8,s.screen[i]*8+8)).toEqual(glyphRows(frames[f%2].cells[i]))}
    else expect(s.screen).toEqual(frames[f%2].cells);
    expect(Math.abs(s.tick-snapshots[0].tick-f*30)).toBeLessThanOrEqual(2);
   });
  }
 }
});
test('small color changes omit the optional packed decoder and packing pays for its complete code size',async({page})=>{
 const rows=await page.evaluate(async()=>{
  const {createC64Program}=await import('./c64-export.js');return [1,4,8,40,100,128,255,256,1000].map(n=>{
   const p=createC64Program({columns:40,rows:25,background:6,ink:14,frames:[{cells:Array(1000).fill(160),inks:Array.from({length:1000},(_,i)=>i<n?i%16:14),durationMs:500}]});
   return {n,...p.diagnostics};
  });
 });
 const baseline=[438,442,446,478,538,566,688,693,1434];
 rows.forEach((r,i)=>{
  expect(r.programBytes).toBeLessThanOrEqual(baseline[i]);
  expect(r.playerBytes).toBe(r.packedColorSavings?439:388);
  if(r.packedColorSavings)expect(r.packedColorSavings).toBeGreaterThan(51);
  expect(r.programBytes).toBe(baseline[i]-r.packedColorSavings+(r.packedColorSavings?51:0));
 });
});

test('two-second 40 × 24 combined waves execute two complete loops with exact colors',async({page})=>{
 test.setTimeout(60000);
 // Replace the ordinary page with a sampler bridge, then import through the editor.
 await capacityPage(page);
 const {grid,cellColors}=artwork('repeated');
 await loadProject(page,project(grid,40,24,{cellColors,animation:{effect:'wave',waveAmplitude:50,colorEffect:'color-wave',seconds:2,scale:1,background:'dark'}}));
 const {bytes,frames,diagnostics,debugSymbols}=await page.evaluate(async()=>{
  const {createC64Program}=await import('./c64-export.js'),input=window.capacityInput();
  const p=createC64Program({...input,repetitions:2});return {bytes:[...p.bytes],frames:input.frames,diagnostics:p.diagnostics,debugSymbols:p.debugSymbols};
 });
 expect(diagnostics.programBytes).toBeLessThan(33000);
 const expected=[],boundaries=[];let elapsed=0,last;
 for(const frame of [...frames,...frames]){
  const screen=Array(1000).fill(32),colors=Array(1000).fill(14);
  screen.splice(0,960,...frame.cells);colors.splice(0,960,...frame.inks);
  boundaries.push(Math.round(elapsed*60/1000));const key=JSON.stringify([screen,colors]);if(key!==last)expected.push({screen,colors,frame:boundaries.length-1});last=key;elapsed+=frame.durationMs;
 }
 for(const clockHz of [985248,1022727]){
  const {snapshots,observations}=emulate(bytes,{clockHz,startJiffy:245,stopAfterTicks:255,maxSteps:6000000,observe:{start:debugSymbols.frameStart,ready:debugSymbols.frameReady}});
  expect(snapshots).toHaveLength(expected.length);
  expect(observations.start).toHaveLength(48);expect(observations.ready).toHaveLength(48);
  observations.start.forEach((start,i)=>{
   if(i===0)return; // First-frame initialization precedes the playback clock.
   expect(Math.abs(start.tick-observations.ready[0].tick-boundaries[i])).toBeLessThanOrEqual(1);
   const ticks=(boundaries[i+1]??Math.round(elapsed*60/1000))-boundaries[i];
   expect(observations.ready[i].cycles-start.cycles).toBeLessThanOrEqual(ticks*clockHz/60);
  });
  snapshots.forEach((s,i)=>{expect(s.screen).toEqual(expected[i].screen);expect(s.colors).toEqual(expected[i].colors);expect(Math.abs(s.tick-observations.ready[expected[i].frame].tick)).toBeLessThanOrEqual(1)});
 }
});

test('C64 readiness accepts native rows without slowing the requested loop',async({page})=>{
 const {grid,cellColors}=artwork('repeated');
 await loadProject(page,project(grid,40,24,{cellColors,animation:{effect:'wave',waveAmplitude:50,colorEffect:'color-wave',seconds:1,scale:1,background:'dark'}}));
 await ui(page,'#c64Mode','selectOption','animation');
 const panel=page.locator('#c64Readiness');await expect(panel).toContainText('Ready — exporter checks passed');
 await expect(panel.getByRole('button',{name:/Apply tested/})).toHaveCount(0);
 const bytes=await download(page,'#exportC64');expect(bytes.length).toBeLessThan(32488);
 await expect(page.locator('#animationSeconds')).toHaveValue('1');
});
test('C64 readiness keeps tested longer-loop remedies undoable when native rows exceed memory',async({page})=>{
 const {grid,cellColors}=artwork('detailed-fast');
 await loadProject(page,project(grid,40,24,{cellColors,animation:{effect:'wave',waveAmplitude:50,colorEffect:'color-wave',motionCycles:4,colorCycles:4,seconds:2,scale:1,background:'dark'}}));
 await ui(page,'#c64Mode','selectOption','animation');
 const panel=page.locator('#c64Readiness');await expect(panel).toContainText('Needs adjustment');
 const fix=panel.getByRole('button',{name:'Apply tested 8-second loop'});await expect(fix).toBeVisible();
 await fix.click();await expect(panel).toContainText('Ready — exporter checks passed');
 expect((await download(page,'#exportC64')).length).toBeLessThan(25000);
 await ui(page,'#undo');await expect(page.locator('#animationSeconds')).toHaveValue('2');
});
