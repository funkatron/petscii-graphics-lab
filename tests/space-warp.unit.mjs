import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spaceWarpFrame} from '../space-warp.js';
for(const [W,H]of [[1,1],[1,7],[7,1],[7,5],[40,25]])test(`projection is deterministic, bounded and source-preserving on ${W}x${H}`,()=>{
 for(const depthTravel of ['toward','away']){
  const s={W,H,grid:Array.from({length:W*H},(_,i)=>i%3===1?'':i%512),inks:Array.from({length:W*H},(_,i)=>i%16),depthTravel},before=JSON.stringify(s);
  assert.deepEqual(spaceWarpFrame(0,s),spaceWarpFrame(1,s));
  for(let f=0;f<48;f++){
   const picture=spaceWarpFrame(f/48,s);assert.deepEqual(picture,spaceWarpFrame(f/48,s));assert.equal(picture.cells.length,W*H);assert.equal(picture.inks.length,W*H);
   picture.cells.forEach((g,i)=>{if(g!=='')assert.ok(s.grid.some((source,j)=>source===g&&s.inks[j]===picture.inks[i]))});
  }
  assert.equal(JSON.stringify(s),before);
 }
});
test('empty artwork stays empty and the central glyph remains central',()=>{
 const s={W:3,H:3,grid:Array(9).fill(''),inks:Array(9).fill(2)};assert.deepEqual(spaceWarpFrame(.5,s),{cells:s.grid,inks:s.inks});s.grid[4]=0;
 for(let f=0;f<48;f++){const p=spaceWarpFrame(f/48,s);assert.equal(p.cells[4],0);assert.equal(p.cells.filter(g=>g!=='').length,1)}
});
