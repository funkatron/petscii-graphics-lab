// Expected source lookup, independent of the application's frame renderer.
function reference(p,d,phase){
 const W=p.columns,H=p.rows,cells=[],inks=[],wrap=(a,n)=>((a%n)+n)%n;
 const diagonal=d.includes('-'),right=d.includes('right'),down=d.includes('down');
 const amount=(p.animation.waveAmplitude??100)/100,spacing=50/(p.animation.waveLength??50);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  let sx=x,sy=y;
  if(diagonal){
   const east=right?1:-1,south=down?1:-1;
   const along=(x/W+east*south*y/H)/2;
   const height=2*Math.min(3,Math.max(1,Math.min(W,H)/4))*amount;
   const displacement=height*Math.sin(2*Math.PI*along*spacing);
   // Rotate the travel vector by a quarter turn, then normalize it.
   const normalX=-south*H/Math.sqrt(W*W+H*H),normalY=east*W/Math.sqrt(W*W+H*H);
   sx-=east*Math.floor(phase*W);sy-=south*Math.floor(phase*H);
   sx+=Math.round(normalX*displacement);sy+=Math.round(normalY*displacement);
  }else{
   const horizontal=d==='left'||d==='right',span=horizontal?W:H,cross=horizontal?H:W;
   const bend=Math.round(Math.sin(2*Math.PI*(horizontal?x/W:y/H)*spacing)*2*Math.min(3,Math.max(1,cross/4))*amount);
   const travel=Math.floor(phase*span)*(right||down?-1:1);
   if(horizontal){sx+=travel;sy+=bend}else{sy+=travel;sx+=bend}
  }
  const i=wrap(sy,H)*W+wrap(sx,W);cells.push(p.grid[i]);inks.push(p.cellColors[i]);
 }
 return {cells,inks};
}
module.exports={reference};
