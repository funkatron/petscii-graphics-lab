// Repeating whole-cell textures; no source artwork or glyph bitmap mutation.
export function depthSurfaceFrame(phase,s){
 const p=((phase%1)+1)%1,travel=(s.depthTravel==='away'?-1:1)*p;
 const cells=Array(s.W*s.H).fill(''),inks=s.inks.slice(),wrap=(n,size)=>(n%size+size)%size;
 for(let y=0;y<s.H;y++)for(let x=0;x<s.W;x++){
  const u=(x+.5)/s.W,v=(y+.5)/s.H;let tx,ty;
  if(s.effect==='tunnel-flight'){
   const nx=2*u-1,ny=2*v-1,radius=Math.hypot(nx,ny);
   if(radius<.12)continue;
   tx=(Math.atan2(ny,nx)/(2*Math.PI)+.5)*s.W;
   ty=(Math.min(8,.7/radius)+travel)*s.H;
  }else{
   if(v<=.25)continue;
   const distance=(v-.25)/.75,depth=Math.min(8,.6/(v-.25));
   let lateral=u-.5;
   if(s.effect==='curved-road'){
    const center=.18*Math.sin(travel*2*Math.PI+depth*.7)*(1-distance),halfWidth=.12+.32*distance;
    lateral-=center;if(Math.abs(lateral)>halfWidth)continue;
    lateral=lateral/(2*halfWidth);
   }
   tx=(.5+lateral*depth)*s.W;ty=(depth+travel)*s.H;
  }
  const source=wrap(Math.floor(ty),s.H)*s.W+wrap(Math.floor(tx),s.W),destination=y*s.W+x;
  cells[destination]=s.grid[source];inks[destination]=s.inks[source];
 }
 return {cells,inks};
}
