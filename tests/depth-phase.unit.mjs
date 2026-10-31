import {test} from 'node:test';import assert from 'node:assert/strict';
import {depthPhase} from '../depth-phase.js';
import {spaceWarpFrame} from '../space-warp.js';import {depthSurfaceFrame} from '../depth-surfaces.js';
test('travel waveforms have explicit quarter-cycle phases and closed boundaries',()=>{
 const wanted={sawtooth:[0,.25,.5,.75],sine:[0,.5,0,.5],triangle:[0,.5,0,.5],'reverse-sawtooth':[0,.75,.5,.25],square:[0,0,.5,.5]};
 for(const [shape,values]of Object.entries(wanted)){values.forEach((v,i)=>assert.ok(Math.abs(depthPhase(i/4,shape)-v)<1e-12));assert.equal(depthPhase(0,shape),depthPhase(1,shape))}
});
test('steady default preserves frames and all depth effects close for each waveform',()=>{
 for(const effect of ['space-warp','perspective-floor','curved-road','tunnel-flight'])for(const depthWaveShape of ['sawtooth','sine','triangle','reverse-sawtooth','square']){
 const s={effect,W:7,H:5,grid:Array.from({length:35},(_,i)=>i%4?'':160),inks:Array(35).fill(2),depthWaveShape},render=effect==='space-warp'?spaceWarpFrame:depthSurfaceFrame;
 assert.deepEqual(render(0,s),render(1,s));for(let f=0;f<48;f++)if(depthWaveShape==='sawtooth')assert.deepEqual(render(f/48,s),render(f/48,{...s,depthWaveShape:undefined}));
 }
});

test('height and wavelength alter geometry independently while preserving default frames',()=>{
 for(const effect of ['space-warp','perspective-floor','curved-road','tunnel-flight']){
  const s={effect,W:13,H:9,grid:Array.from({length:117},(_,i)=>i%4?'':160),inks:Array.from({length:117},(_,i)=>i%16)},render=effect==='space-warp'?spaceWarpFrame:depthSurfaceFrame;
  let heightChanges=false,lengthChanges=false;
  for(let f=0;f<48;f++){
   const base=render(f/48,s);assert.deepEqual(base,render(f/48,{...s,waveAmplitude:100,waveLength:50}));
   heightChanges||=JSON.stringify(base)!==JSON.stringify(render(f/48,{...s,waveAmplitude:25}));lengthChanges||=JSON.stringify(base)!==JSON.stringify(render(f/48,{...s,waveLength:100}));
  }
  assert.ok(heightChanges,effect+' height');assert.ok(lengthChanges,effect+' length');
  for(const waveAmplitude of [10,25,50,75,100])for(const waveLength of [10,25,50,75,100]){const input={...s,waveAmplitude,waveLength};assert.deepEqual(render(0,input),render(1,input))}
 }
});
