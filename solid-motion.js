// Sample the nearest opaque surface once per destination cell. Empty texture
// cells show background, not the back face; authentic glyphs remain unscaled.
export const SOLID_EFFECTS=['rotating-cube','spinning-globe','rolling-drum'];
export function solidMotionFrame(phase,s){
 const p=((phase%1)+1)%1,a=p*2*Math.PI;
 const yaw=s.effect==='rolling-drum'?.35:a;
 const tilt=s.effect==='rotating-cube'?.45+.3*Math.sin(a):s.effect==='rolling-drum'?a:.25;
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(tilt),sx=Math.sin(tilt);
 // Inverse of world Y rotation followed by X rotation.
 const local=([x,y,z])=>{const yy=cx*y+sx*z,zz=-sx*y+cx*z;return [cy*x-sy*zz,yy,sy*x+cy*zz]};
 // Orbit opposite the globe's spin so the camera keeps revealing new texture.
 const orbit=(s.cameraOrbit??0)*Math.PI/180-(s.cameraMotion===1?a:0),elevation=(s.cameraElevation??0)*Math.PI/180;
 const cosOrbit=Math.cos(orbit),sinOrbit=Math.sin(orbit),cosElevation=Math.cos(elevation),sinElevation=Math.sin(elevation);
 // Move both the ray origin and direction with the camera to keep the object centered.
 const cameraLocal=(x,y,z)=>{
  const forward=y*sinElevation+z*cosElevation;
  return local([x*cosOrbit+forward*sinOrbit,y*cosElevation-z*sinElevation,forward*cosOrbit-x*sinOrbit]);
 };
 const origin=cameraLocal(0,0,-(s.cameraDistance??4)),size=Math.max(1,Math.min(s.W,s.H));
 const cells=Array(s.W*s.H).fill(''),inks=s.inks.slice();
 const wrap=v=>((v%1)+1)%1;
 for(let y=0;y<s.H;y++)for(let x=0;x<s.W;x++){
  const d=cameraLocal((2*x+1-s.W)/size*.55,(2*y+1-s.H)/size*.55,1);
  let t=Infinity,axis=-1;
  if(s.effect==='rotating-cube'){
   let near=-Infinity,far=Infinity;
   for(let k=0;k<3;k++){
    if(Math.abs(d[k])<1e-12){if(Math.abs(origin[k])>1){far=-Infinity;break}continue}
    const q=(-1-origin[k])/d[k],r=(1-origin[k])/d[k],lo=Math.min(q,r),hi=Math.max(q,r);
    if(lo>near){near=lo;axis=k}far=Math.min(far,hi);
   }
   if(near>0&&near<=far)t=near;
  }else{
   const axes=s.effect==='spinning-globe'?[0,1,2]:[1,2];
   const A=axes.reduce((n,k)=>n+d[k]*d[k],0),B=2*axes.reduce((n,k)=>n+origin[k]*d[k],0),C=axes.reduce((n,k)=>n+origin[k]*origin[k],-1),disc=B*B-4*A*C;
   if(A>1e-12&&disc>=0){const q=(-B-Math.sqrt(disc))/(2*A);if(q>0&&(s.effect==='spinning-globe'||Math.abs(origin[0]+q*d[0])<=1))t=q}
   // End caps on the drum, including when a ray misses the curved side.
   if(s.effect==='rolling-drum'&&Math.abs(d[0])>1e-12)for(const cap of [-1,1]){
    const q=(cap-origin[0])/d[0],yy=origin[1]+q*d[1],zz=origin[2]+q*d[2];
    if(q>0&&q<t&&yy*yy+zz*zz<=1){t=q;axis=0}
   }
  }
  if(!Number.isFinite(t))continue;
  const hit=origin.map((v,k)=>v+t*d[k]);let u,v;
  if(s.effect==='rotating-cube'){
   const sign=hit[axis]>0?1:-1;
   [u,v]=axis===0?[(1-sign*hit[2])/2,(hit[1]+1)/2]:axis===1?[(hit[0]+1)/2,(1-sign*hit[2])/2]:[(1+sign*hit[0])/2,(hit[1]+1)/2];
  }else if(s.effect==='spinning-globe'){
   u=wrap(Math.atan2(hit[0],-hit[2])/(2*Math.PI)+.5);v=Math.acos(Math.max(-1,Math.min(1,-hit[1])))/Math.PI;
  }else if(axis===0){u=(hit[2]+1)/2;v=(hit[1]+1)/2}
  else{u=(hit[0]+1)/2;v=wrap(Math.atan2(hit[1],-hit[2])/(2*Math.PI)+.5)}
  const tx=Math.max(0,Math.min(s.W-1,Math.floor(u*s.W))),ty=Math.max(0,Math.min(s.H-1,Math.floor(v*s.H))),src=ty*s.W+tx,dst=y*s.W+x;
  cells[dst]=s.grid[src];inks[dst]=s.inks[src];
 }
 return {cells,inks};
}
