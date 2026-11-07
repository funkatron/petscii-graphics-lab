// Stateless periodic fire: no random state, warm-up, or dependence on frame order.
export const BONFIRE_COLORS=Object.freeze([9,2,10,8,7,1]);
const TAU=Math.PI*2,wrap=t=>((t%1)+1)%1,clamp=v=>Math.max(0,Math.min(1,v));
// x is horizontal; height rises from the bottom. Integer temporal harmonics close the loop.
export function bonfireHeat(x,y,W,H,phase){
 const t=wrap(phase),u=(x+.5)/W*2-1,v=(H-1-y)/Math.max(1,H);
 let heat=0;
 for(let k=0;k<5;k++){
  const offset=(k-2)*.22,height=.65+.16*Math.sin(TAU*(t+k*.19))+(k===2?.16:0);
  if(v>=height)continue;
  const rise=t*2-v*2.5+k*.23;
  const center=offset+.10*v*Math.sin(TAU*rise)+.045*Math.sin(TAU*(3*t+k*.31));
  const width=(.27+.035*Math.sin(TAU*(t*2+k*.17)))*(1-v/height)+.025;
  const core=Math.max(0,1-((u-center)/width)**2);
  heat=Math.max(heat,core*(1-v/height));
 }
 return clamp(heat*1.35);
}
export function bonfireFrame(phase,s){
 const t=wrap(phase),cells=Array(s.W*s.H).fill(''),inks=s.inks.slice(),sources=[];
 for(let i=0;i<s.grid.length;i++)if(s.grid[i]!=='')sources.push(i);
 if(!sources.length)return {cells,inks};
 for(let y=0;y<s.H;y++)for(let x=0;x<s.W;x++){
  if(bonfireHeat(x,y,s.W,s.H,t)<=.10)continue;
  // Scroll the source texture upward, preserving complete glyph/ink pairs.
  const row=(y+Math.floor(t*s.H*2))%s.H;
  const source=sources[(row*s.W+x)%sources.length],i=y*s.W+x;
  cells[i]=s.grid[source];inks[i]=s.inks[source];
 }
 return {cells,inks};
}
