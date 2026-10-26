const {spawnSync}=require('node:child_process');
const {test,expect}=require('./helpers.cjs');
function emulate(bytes,options={}){
 const r=spawnSync('python3',['tests/c64-emulate.py'],{input:JSON.stringify({prg:bytes,...options}),encoding:'utf8',maxBuffer:8e6});
 expect(r.status,r.stderr).toBe(0);return JSON.parse(r.stdout);
}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('indexed literal and inline packed loops use fewer measured CPU cycles with exact output',async({page},testInfo)=>{
 test.setTimeout(60000);
 // Recorded with identical fixtures and py65 on a1520cf, before decoder changes.
 const baseline={literal:48639,packed:54333,combined:103171,repeat:27119};
 const limits={literal:22000,packed:38000,combined:60000,repeat:27200},results=[];
 for(const kind of Object.keys(baseline)){
  const {bytes,frames,diagnostics,debugSymbols}=await page.evaluate(async kind=>{
   const {createC64Program}=await import('./c64-export.js');
   const frames=[0,1].map(f=>({cells:Array.from({length:1000},(_,i)=>kind==='packed'?160:kind==='repeat'?(f?81:160):(i+f)%256),inks:Array.from({length:1000},(_,i)=>kind==='literal'?14:kind==='repeat'?(f?7:2):(i+f)%16),durationMs:500}));
   const p=createC64Program({columns:40,rows:25,background:6,ink:14,frames,repetitions:2});return {bytes:[...p.bytes],frames,diagnostics:p.diagnostics,debugSymbols:p.debugSymbols};
  },kind);
  const {snapshots,observations:o}=emulate(bytes,{stopAfterTicks:135,observe:{start:debugSymbols.frameStart,ready:debugSymbols.frameReady}});
  expect(o.start).toHaveLength(4);expect(o.ready).toHaveLength(4);expect(snapshots).toHaveLength(4);
  snapshots.forEach((s,i)=>{expect(s.screen).toEqual(frames[i%2].cells);expect(s.colors).toEqual(frames[i%2].inks)});
  const maxCopyCycles=Math.max(...o.start.slice(1).map((v,i)=>o.ready[i+1].cycles-v.cycles));
  expect(maxCopyCycles).toBeGreaterThan(0);expect(maxCopyCycles).toBeLessThanOrEqual(limits[kind]);
  results.push({kind,baselineCycles:baseline[kind],maxCopyCycles,reduction:1-maxCopyCycles/baseline[kind],programBytes:diagnostics.programBytes});
 }
 await testInfo.attach('decoder-cpu-cycles.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
});
test('fast literal source advances and packed odd tails preserve all bytes across 255-byte boundaries',async({page})=>{
 test.setTimeout(60000);
 for(const length of [2,3,4,5,254,255,256,257,511,512,999,1000]){
  const {bytes,frames}=await page.evaluate(async length=>{
   const {createC64Program}=await import('./c64-export.js');
   const frames=[0,1].map(f=>({cells:Array.from({length:1000},(_,i)=>i<length?(i+f)%256:160),inks:Array.from({length:1000},(_,i)=>i<length?(i%16)^(f?7:0):i%16),durationMs:150}));
   const p=createC64Program({columns:40,rows:25,background:6,ink:14,frames,repetitions:1});return {bytes:[...p.bytes],frames};
  },length);
  const {snapshots}=emulate(bytes,{stopAfterTicks:30});expect(snapshots).toHaveLength(2);
  snapshots.forEach((s,i)=>{expect(s.screen).toEqual(frames[i].cells);expect(s.colors).toEqual(frames[i].inks)});
 }
});
