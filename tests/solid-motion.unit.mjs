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
