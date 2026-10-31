import {test} from 'node:test';
import assert from 'node:assert/strict';
import {depthSurfaceFrame} from '../depth-surfaces.js';
for(const effect of ['perspective-floor','curved-road','tunnel-flight'])for(const [W,H]of [[1,1],[1,7],[7,1],[4,4],[7,5],[40,25]])test(`${effect} preserves texture pairs and closes on ${W}x${H}`,()=>{
 const s={effect,W,H,grid:Array.from({length:W*H},(_,i)=>i%4===0?'':i%512),inks:Array.from({length:W*H},(_,i)=>i%16)},original=JSON.stringify(s);
 for(const depthTravel of ['toward','away']){
  const input={...s,depthTravel};assert.deepEqual(depthSurfaceFrame(0,input),depthSurfaceFrame(1,input));
  for(let f=0;f<48;f++){const p=depthSurfaceFrame(f/48,input);assert.equal(p.cells.length,W*H);p.cells.forEach((g,i)=>{if(g!=='')assert.ok(s.grid.some((v,j)=>v===g&&s.inks[j]===p.inks[i]))})}
 }
 assert.equal(JSON.stringify(s),original);
 const empty={...s,grid:Array(W*H).fill('')};assert.ok(depthSurfaceFrame(.25,empty).cells.every(g=>g===''));
});
test('floor leaves sky empty; road clips the sides; tunnel leaves its center empty',()=>{
 const s={W:9,H:9,grid:Array(81).fill(160),inks:Array(81).fill(3)};
 assert.ok(depthSurfaceFrame(0,{...s,effect:'perspective-floor'}).cells.slice(0,18).every(g=>g===''));
 const road=depthSurfaceFrame(0,{...s,effect:'curved-road'});assert.equal(road.cells[72],'');assert.equal(road.cells[80],'');assert.equal(road.cells[76],160);
 assert.equal(depthSurfaceFrame(.5,{...s,effect:'tunnel-flight'}).cells[40],'');
});
test('floor uses the specified repeating texture coordinates at phase zero',()=>{
 const s={effect:'perspective-floor',W:4,H:4,grid:Array.from({length:16},(_,i)=>i),inks:Array.from({length:16},(_,i)=>i)};
 const p=depthSurfaceFrame(0,s);assert.deepEqual(p.cells,['','','','',14,15,12,13,11,9,10,8,12,13,14,15]);p.cells.forEach((g,i)=>{if(g!=='')assert.equal(p.inks[i],g)});
});
