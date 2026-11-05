import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solidMotionFrame,SOLID_EFFECTS} from '../solid-motion.js';
for(const effect of SOLID_EFFECTS)for(const [W,H] of [[1,1],[1,7],[7,1],[8,8],[13,9],[40,25]])test(`${effect} preserves source pairs and closes on ${W}x${H}`,()=>{
 const s={effect,W,H,grid:Array.from({length:W*H},(_,i)=>i%5===1?'':i%512),inks:Array.from({length:W*H},(_,i)=>i%16)},before=JSON.stringify(s),pictures=new Set();
 assert.deepEqual(solidMotionFrame(0,s),solidMotionFrame(1,s));
 for(let f=0;f<48;f++){
  const frame=solidMotionFrame(f/48,s);assert.equal(frame.cells.length,W*H);assert.equal(frame.inks.length,W*H);
  frame.cells.forEach((g,i)=>{if(g!=='')assert.ok(s.grid.some((v,j)=>v===g&&s.inks[j]===frame.inks[i]))});pictures.add(JSON.stringify(frame.cells));
 }
 if(W>1&&H>1)assert.ok(pictures.size>8);
 assert.equal(JSON.stringify(s),before);
 assert.ok(solidMotionFrame(.3,{...s,grid:Array(W*H).fill('')}).cells.every(g=>g===''));
});
test('opaque surfaces keep their silhouettes inside a square viewport',()=>{
 for(const effect of SOLID_EFFECTS)for(let f=0;f<48;f++){
  const W=40,H=40,frame=solidMotionFrame(f/48,{effect,W,H,grid:Array(W*H).fill(0),inks:Array(W*H).fill(7)});
  assert.equal(frame.cells[20*W+20],0);
  for(let i=0;i<W;i++){assert.equal(frame.cells[i],'');assert.equal(frame.cells[(H-1)*W+i],'');assert.equal(frame.cells[i*W],'');assert.equal(frame.cells[i*W+W-1],'')}
 }
});
test('tilted globe center samples the expected latitude and preserves ink',()=>{
 const s={effect:'spinning-globe',W:9,H:9,grid:Array.from({length:81},(_,i)=>i),inks:Array.from({length:81},(_,i)=>i%16)};
 const f=solidMotionFrame(0,s);assert.equal(f.cells[40],31);assert.equal(f.inks[40],15);
});

test('camera distance enlarges the globe and orbit changes the sampled texture',()=>{
 const W=40,H=25;
 const s={effect:'spinning-globe',W,H,grid:Array.from({length:W*H},(_,i)=>i%512),inks:Array.from({length:W*H},(_,i)=>i%16)};
 const standard=solidMotionFrame(0,s);
 const close=solidMotionFrame(0,{...s,cameraDistance:2.5});
 const orbit={...s,cameraDistance:2.5,cameraOrbit:90,cameraElevation:30};
 const rotated=solidMotionFrame(0,orbit);
 const coverage=frame=>frame.cells.map(g=>g!=='');
 assert.ok(coverage(close).filter(Boolean).length>coverage(standard).filter(Boolean).length);
 assert.deepEqual(coverage(rotated),coverage(close));
 assert.notDeepEqual(rotated.cells,close.cells);
 assert.deepEqual(solidMotionFrame(1,orbit),rotated);
});

test('animated camera orbits from the chosen angle and closes with object motion',()=>{
 for(const effect of SOLID_EFFECTS){
  const W=31,H=25;
  const s={effect,W,H,cameraOrbit:90,cameraElevation:30,grid:Array.from({length:W*H},(_,i)=>i%512),inks:Array(W*H).fill(7)};
  const orbit={...s,cameraMotion:1};
  assert.deepEqual(solidMotionFrame(0,orbit),solidMotionFrame(0,s));
  assert.deepEqual(solidMotionFrame(.25,orbit),solidMotionFrame(.25,{...s,cameraOrbit:0}));
  assert.notDeepEqual(solidMotionFrame(.25,orbit),solidMotionFrame(.25,s));
  assert.deepEqual(solidMotionFrame(1,orbit),solidMotionFrame(0,orbit));
 }
});

test('camera travel returns to the starting distance and can combine with orbit',()=>{
 for(const effect of SOLID_EFFECTS){
  const W=32,H=24;
  const s={effect,W,H,grid:Array.from({length:W*H},(_,i)=>i%512),inks:Array(W*H).fill(7)};
  for(const [start,end] of [[4,2.5],[2.5,4]]){
   for(const [motion,midpointMotion] of [[2,0],[3,1]]){
    const camera={...s,cameraDistance:start,cameraMotion:motion};
    const first=solidMotionFrame(0,camera);
    assert.deepEqual(first,solidMotionFrame(0,{...s,cameraDistance:start}));
    assert.deepEqual(solidMotionFrame(1,camera),first);
    assert.deepEqual(solidMotionFrame(.5,camera),solidMotionFrame(.5,{...s,cameraDistance:end,cameraMotion:midpointMotion}));
    assert.notDeepEqual(solidMotionFrame(.5,camera),solidMotionFrame(.5,{...s,cameraDistance:start,cameraMotion:midpointMotion}));
   }
  }
 }
});
