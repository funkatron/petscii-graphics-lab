import {depthPhase} from './depth-phase.js';
// Whole-cell perspective projection. Pure phase input keeps preview/export identical.
export function spaceWarpFrame(phase,s){
 const p=depthPhase(phase,s.depthWaveShape),cells=Array(s.W*s.H).fill(''),inks=s.inks.slice(),objects=[];
 const height=(s.waveAmplitude??100)/100,length=(s.waveLength??50)/50;
 const cx=(s.W-1)/2,cy=(s.H-1)/2,sign=s.depthTravel==='away'?1:-1;
 for(let i=0;i<s.grid.length;i++)if(s.grid[i]!==''){
  const seed=((i*37)%101+.5)/101,z=.35+1.4*length*((seed+sign*p+1)%1);
  const dx=i%s.W-cx,dy=Math.floor(i/s.W)-cy,scale=1+height*(.8/z-1);
  const x=Math.round(cx+(height===1?dx*.8/z:dx*scale)),y=Math.round(cy+(height===1?dy*.8/z:dy*scale));
  if(x>=0&&x<s.W&&y>=0&&y<s.H)objects.push({i,z,d:y*s.W+x});
 }
 // Near objects overwrite far objects; later source index wins equal depths.
 objects.sort((a,b)=>b.z-a.z||a.i-b.i);
 for(const {i,d}of objects){cells[d]=s.grid[i];inks[d]=s.inks[i]}
 return {cells,inks};
}
