import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bonfireFrame,bonfireHeat,BONFIRE_COLORS} from '../bonfire.js';
for(const [W,H] of [[1,1],[1,9],[9,1],[7,5],[40,25]])test(`Bonfire preserves glyph/ink pairs and closes on ${W}x${H}`,()=>{
 const s={W,H,grid:Array.from({length:W*H},(_,i)=>i%3===0?'':i%512),inks:Array.from({length:W*H},(_,i)=>i%16)},before=JSON.stringify(s);
 assert.deepEqual(bonfireFrame(0,s),bonfireFrame(1,s));
 for(let f=0;f<48;f++){const p=bonfireFrame(f/48,s);assert.equal(p.cells.length,W*H);assert.equal(p.inks.length,W*H);p.cells.forEach((g,i)=>{if(g!=='')assert.ok(s.grid.some((v,j)=>v===g&&s.inks[j]===p.inks[i]))});
  for(let i=0;i<W*H;i++){const h=bonfireHeat(i%W,Math.floor(i/W),W,H,f/48);assert.ok(Number.isFinite(h)&&h>=0&&h<=1)}
 }
 assert.equal(JSON.stringify(s),before);
 assert.ok(bonfireFrame(.2,{...s,grid:s.grid.map(()=>'')}).cells.every(g=>g===''));
});
test('Bonfire has a stable broad base, tapered tips and animated silhouette',()=>{
 const s={W:40,H:25,grid:Array(1000).fill(160),inks:Array(1000).fill(7)},pictures=[];
 for(let f=0;f<48;f++){
  const p=bonfireFrame(f/48,s);pictures.push(p.cells.join(','));
  const occupied=row=>p.cells.slice(row*40,(row+1)*40).filter(g=>g!=='').length;
  assert.ok(occupied(24)>occupied(5));assert.ok(occupied(24)>0);
  assert.equal(p.cells[0],'');assert.equal(p.cells[39],'');
 }
 assert.ok(new Set(pictures).size>24);
 assert.deepEqual(BONFIRE_COLORS,[9,2,10,8,7,1]);
});
test('Bonfire heat and frames are independent of evaluation order',()=>{
 const s={W:13,H:9,grid:Array(117).fill(160),inks:Array(117).fill(2)};
 const a=bonfireFrame(.375,s);bonfireFrame(.9,s);assert.deepEqual(bonfireFrame(.375,s),a);
 for(let y=0;y<9;y++)for(let x=0;x<13;x++)assert.equal(bonfireHeat(x,y,13,9,0),bonfireHeat(x,y,13,9,1));
});
