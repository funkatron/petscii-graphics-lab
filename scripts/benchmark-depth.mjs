// Diagnostic baseline, not a wall-clock CI gate or a browser/rendering benchmark.
import {performance} from 'node:perf_hooks';
import {cpus,arch,platform} from 'node:os';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spaceWarpFrame} from '../space-warp.js';
import {depthSurfaceFrame} from '../depth-surfaces.js';
const effects=['space-warp','perspective-floor','curved-road','tunnel-flight'];
const shapes=['sawtooth','sine','triangle','square','reverse-sawtooth'];
const fixtures={empty:()=>'',sparse:i=>i%17===0?i%512:'',dense:i=>i%512,asymmetric:i=>i%40<13&&Math.floor(i/40)>7?i%512:''};
const results=[];let checksum=0;
for(const effect of effects)for(const [fixture,glyph]of Object.entries(fixtures))for(const depthTravel of ['toward','away'])for(const depthWaveShape of shapes){
 const s={W:40,H:25,grid:Array.from({length:1000},(_,i)=>glyph(i)),inks:Array.from({length:1000},(_,i)=>i%16),effect,depthTravel,depthWaveShape,waveAmplitude:100,waveLength:50};
 const before=JSON.stringify(s),kernel=effect==='space-warp'?spaceWarpFrame:depthSurfaceFrame;
 for(let i=0;i<96;i++)kernel((i%48)/48,s);
 const times=[];
 for(let i=0;i<480;i++){
  const start=performance.now(),frame=kernel((i%48)/48,s);times.push(performance.now()-start);
  if(frame.cells.length!==1000||frame.inks.length!==1000)throw Error('Invalid frame dimensions');
  checksum=(checksum+frame.cells.reduce((sum,g)=>sum+(g===''?0:g+1),0))>>>0;
 }
 if(JSON.stringify(s)!==before)throw Error('Projection mutated source settings');
 times.sort((a,b)=>a-b);const rounded=n=>Number(n.toFixed(4));
 results.push({effect,fixture,depthTravel,depthWaveShape,frames:480,medianMs:rounded(times[239]),p95Ms:rounded(times[455]),maxMs:rounded(times[479])});
}
const hashes=Object.fromEntries(['space-warp.js','depth-surfaces.js','depth-phase.js'].map(file=>[file,createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex')]));
console.log(JSON.stringify({scope:'Pure geometry only; excludes color pass, glyph rasterization, layout, encoding and physical devices. Times are diagnostic, without pass/fail thresholds.',node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,dimensions:[40,25],warmupFrames:96,samplesPerCase:480,hashes,checksum,results},null,2));
