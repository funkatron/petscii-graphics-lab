import {depthPhase} from './depth-phase.js';
// Repeating whole-cell textures; no source artwork or glyph bitmap mutation.
export function depthSurfaceFrame(phase,s){
 const p=depthPhase(phase,s.depthWaveShape),travel=(s.depthTravel==='away'?-1:1)*p;
 const height=(s.waveAmplitude??100)/100,spacing=50/(s.waveLength??50),strength=d=>height===1?d:1+(d-1)*height;
 const cells=Array(s.W*s.H).fill(''),inks=s.inks.slice(),wrap=(n,size)=>(n%size+size)%size;
 for(let y=0;y<s.H;y++)for(let x=0;x<s.W;x++){
  const u=(x+.5)/s.W,v=(y+.5)/s.H;let tx,ty;
  if(s.effect==='tunnel-flight'){
   const nx=(2*x+1-s.W)/s.W,ny=(2*y+1-s.H)/s.H,radius=Math.hypot(nx,ny);
   if(radius<.12)continue;
   tx=(Math.atan2(ny,nx)/(2*Math.PI)+.5)*s.W*spacing;
   ty=(strength(Math.min(8,.7/radius))*spacing+travel)*s.H;
  }else{
   const distance=v,depth=strength(Math.min(8,.6/v));
   let lateral=u-.5;
   if(s.effect==='curved-road'){
    const center=.18*height*Math.sin(travel*2*Math.PI+depth*spacing*.7)*(1-distance),halfWidth=Math.max(.5/s.W,.12+.32*distance);
    lateral-=center;if(Math.abs(lateral)>halfWidth)continue;
    lateral=lateral/(2*halfWidth);
   }
   tx=(.5+lateral*depth*spacing)*s.W;ty=(depth*spacing+travel)*s.H;
  }
  const source=wrap(Math.floor(ty),s.H)*s.W+wrap(Math.floor(tx),s.W),destination=y*s.W+x;
  cells[destination]=s.grid[source];inks[destination]=s.inks[source];
 }
 return {cells,inks};
}
