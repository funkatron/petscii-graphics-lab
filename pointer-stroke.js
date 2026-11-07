// Canvas cell picking and symmetric brush strokes (one module; index.html wires grid updates).
export function canvasCell(canvas,W,H,clientX,clientY){
 const r=canvas.getBoundingClientRect();
 return [Math.max(0,Math.min(W-1,Math.floor((clientX-r.left)*W/r.width))),Math.max(0,Math.min(H-1,Math.floor((clientY-r.top)*H/r.height)))];
}

export function createPainter({getW,getH,getSymmetry,getGlyph,getErasing,getInk,onCell}){
 function paint(x,y){
  if(x<0||y<0||x>=getW()||y>=getH())return;
  const sym=getSymmetry(),pts=[[x,y]];
  const W=getW(),H=getH();
  if(sym==='horizontal'||sym==='both')pts.push([W-1-x,y]);
  if(sym==='vertical'||sym==='both')pts.push([x,H-1-y]);
  if(sym==='both')pts.push([W-1-x,H-1-y]);
  const g=getErasing()?'':getGlyph(),ink=getInk();
  for(const [a,b] of pts){const i=b*W+a;onCell(i,g,ink)}
 }
 function stroke(a,b){
  const n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),1);
  for(let i=0;i<=n;i++)paint(Math.round(a[0]+(b[0]-a[0])*i/n),Math.round(a[1]+(b[1]-a[1])*i/n));
 }
 return {paint,stroke};
}
