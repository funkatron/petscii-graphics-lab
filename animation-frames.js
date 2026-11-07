import {bonfireFrame,bonfireHeat,BONFIRE_COLORS} from './bonfire.js';
import {spaceWarpFrame} from './space-warp.js';
import {depthSurfaceFrame} from './depth-surfaces.js';
import {solidMotionFrame,SOLID_EFFECTS} from './solid-motion.js';
import {DEPTH_EFFECTS,INTRO_MOTIONS,DIAGONAL_DIRECTIONS} from './project-validation.js';

const COLOR_CYCLES={
 bonfire:BONFIRE_COLORS,
 'raster-bars':[0,6,14,3,1,3,14,6],
 plasma:[6,4,2,8,7,13,3,14],
 'color-cycle':[0,11,12,15,1,7,13,5,3,14,6,4,2,10,8,9],
 'color-wave':[2,8,7,13,3,14,6,4],
 'color-glow':[9,8,2,10,7,1,7,10,2,8]
};

export function waveValue(shape,phase){
 const t=((phase%1)+1)%1;
 if(shape==='triangle')return 1-4*Math.abs(((t+.25)%1)-.5);
 if(shape==='square')return t<.5?1:-1;
 if(shape==='sawtooth')return 2*t-1;
 if(shape==='reverse-sawtooth')return 1-2*t;
 return Math.sin(t*Math.PI*2);
}

export function scrollDirection(s){return s.scrollDirection??(s.effect==='scroll-diagonal'?'up-left':s.effect==='scroll-y'?'up':'left')}

export function effectCycles(s){return {motion:s.effect==='none'?1:(s.motionCycles??1),color:s.colorEffect==='none'?1:(s.colorCycles??1)}}

export function animationPlan(s){
 const colorSteps=s.colorEffect==='bonfire'?48:s.colorEffect==='plasma'?24:COLOR_CYCLES[s.colorEffect]?.length??1,{motion,color}=effectCycles(s),budget=Math.floor(s.seconds*1000/20);
 if(s.effect==='replay'&&colorSteps===1&&motion===1)return {count:Math.max(2,Math.min(48,Math.floor(s.seconds*750/20)+1,s.events.length+1)),warning:''};
 const steps=s.effect==='bonfire'?48:(DEPTH_EFFECTS.includes(s.effect)||SOLID_EFFECTS.includes(s.effect))?48:s.effect==='starfield'?Math.max(24,(DIAGONAL_DIRECTIONS.includes(scrollDirection(s))?Math.max(s.W,s.H):['left','right'].includes(scrollDirection(s))?s.W:s.H)*3):INTRO_MOTIONS.includes(s.effect)?24:s.effect==='scroll-diagonal'?Math.max(s.W,s.H):['scroll-x','scroll-y'].includes(s.effect)?(['left','right'].includes(scrollDirection(s))?s.W:s.H):s.effect==='inverse'?2:s.effect==='sine-scroll'?Math.max(24,['left','right'].includes(scrollDirection(s))?s.W:s.H):['wave','ripple'].includes(s.effect)?24:s.effect==='replay'?Math.max(4,Math.min(48,Math.ceil(s.events.length/.75)+1)):1;
 if(motion===1&&color===1)return {count:Math.max(1,Math.min(s.effect==='replay'?48:Infinity,Math.max(steps,colorSteps),budget)),warning:''};
 const subdivision=Math.max(motion,color),wanted=Math.max(steps*motion,colorSteps*color);
 const minimum=Math.max(s.effect==='none'?1:motion*((s.effect==='bonfire'||s.effect==='starfield'||DEPTH_EFFECTS.includes(s.effect)||SOLID_EFFECTS.includes(s.effect))?12:INTRO_MOTIONS.includes(s.effect)?8:['wave','ripple','replay','sine-scroll'].includes(s.effect)?4:2),colorSteps===1?1:color*(['plasma','bonfire'].includes(s.colorEffect)?4:2));
 const count=Math.max(subdivision,Math.floor(Math.min(wanted,budget)/subdivision)*subdivision);
 const warning=count<minimum?'Too many cycles for this loop duration. Increase Loop duration or reduce cycles per loop.':'';
 return {count:Math.max(count,minimum),warning};
}

export function animationCount(s){return animationPlan(s).count}
export function animationDelay(i,s){const n=animationCount(s);return s.effect==='replay'&&s.colorEffect==='none'&&(s.motionCycles??1)===1?(i===n-1?s.seconds*250:s.seconds*750/(n-1)):s.seconds*1000/n}
export function cyclePhase(frame,count,cycles){const samples=count/cycles;return (frame%samples)/samples}

export function introMotionFrame(phase,s){
 const cells=Array(s.W*s.H).fill(''),inks=s.inks.slice(),put=(destination,source)=>{cells[destination]=s.grid[source];inks[destination]=s.inks[source]};
 if(s.effect==='starfield'){
  const direction=scrollDirection(s),horizontal=['left','right'].includes(direction),size=horizontal?s.W:s.H,sign=['left','up'].includes(direction)?-1:1;
  for(let depth=1;depth<=3;depth++)for(let i=0;i<s.grid.length;i++)if(s.grid[i]!==''&&1+(i%s.W*17+Math.floor(i/s.W)*31)%3===depth){
   const x=i%s.W,y=Math.floor(i/s.W),travel=Math.floor(phase*size*depth)*sign,wrap=v=>(v%size+size)%size;
   if(DIAGONAL_DIRECTIONS.includes(direction)){
    const dx=Math.floor(phase*s.W*depth)*(direction.endsWith('left')?-1:1);
    const dy=Math.floor(phase*s.H*depth)*(direction.startsWith('up')?-1:1);
    put(((y+dy)%s.H+s.H)%s.H*s.W+((x+dx)%s.W+s.W)%s.W,i);
   }else put(horizontal?y*s.W+wrap(x+travel):wrap(y+travel)*s.W+x,i);
  }
 }else if(s.effect==='wipe'){
  const d=scrollDirection(s),horizontal=['left','right'].includes(d),size=horizontal?s.W:s.H,reverse=['left','up'].includes(d),progress=Math.min(1,phase/.35,(1-phase)/.35),pattern=s.wipePattern??'diagonal';
  for(let y=0;y<s.H;y++)for(let x=0;x<s.W;x++){
   const axis=horizontal?x:y,along=(axis+.5)/size,u=reverse?1-along:along,v=horizontal?(y+.5)/s.H:(x+.5)/s.W,stripe=Math.min(4,size),blind=(axis%stripe+.5)/stripe;
   const rank=pattern==='checkerboard'?((x+y)%2+u)/2:pattern==='blinds'?(reverse?1-blind:blind):(u+v)/2;
   if(rank<=progress)put(y*s.W+x,y*s.W+x);
  }
 }else{
  let left=s.W,top=s.H,right=-1,bottom=-1;
  for(let i=0;i<s.grid.length;i++)if(s.grid[i]!==''){left=Math.min(left,i%s.W);right=Math.max(right,i%s.W);top=Math.min(top,Math.floor(i/s.W));bottom=Math.max(bottom,Math.floor(i/s.W))}
  if(right<0)return {cells,inks};
  const width=right-left+1,height=bottom-top+1,amount=(s.waveAmplitude??100)/100;
  if(s.effect==='logo-bounce'){
   const dx=Math.round((s.W-width)/2*(1-Math.sin(phase*Math.PI*2)*amount))-left,dy=Math.round((s.H-height)/2*(1-Math.cos(phase*Math.PI*4)*amount))-top;
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)put((y+dy)*s.W+x+dx,y*s.W+x);
  }else{
   const w=Math.max(1,Math.round(width*(1-amount*.25*(1-Math.cos(phase*Math.PI*2))))),h=Math.max(1,Math.round(height*(1-amount*.25*(1-Math.cos(phase*Math.PI*4))))),dx=left+Math.floor((width-w)/2),dy=top+Math.floor((height-h)/2);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)put((dy+y)*s.W+dx+x,(top+Math.min(height-1,Math.floor((y+.5)*height/h)))*s.W+left+Math.min(width-1,Math.floor((x+.5)*width/w)));
  }
 }
 return {cells,inks};
}

export function animationCells(frame,s){
 const n=animationCount(s),cycles=effectCycles(s),phase=cyclePhase(frame,n,cycles.motion),colorPhase=cyclePhase(frame,n,cycles.color),cells=s.effect==='replay'?s.base.slice():Array(s.W*s.H).fill(''),inks=s.effect==='replay'?s.baseColors.slice():s.inks.slice();
 if(s.effect==='replay'){
  const progress=s.colorEffect==='none'&&cycles.motion===1?frame/(n-1):Math.min(1,phase/.75),end=Math.floor(progress*s.events.length);
  for(let j=0;j<end;j++){const [i,g]=s.events[j];cells[i]=g;inks[i]=s.eventColors[j]}
 }else if(s.effect==='bonfire'){
  const picture=bonfireFrame(phase,s);cells.splice(0,cells.length,...picture.cells);inks.splice(0,inks.length,...picture.inks);
 }else if(SOLID_EFFECTS.includes(s.effect)){
  const picture=solidMotionFrame(phase,s);cells.splice(0,cells.length,...picture.cells);inks.splice(0,inks.length,...picture.inks);
 }else if(DEPTH_EFFECTS.includes(s.effect)){
  const picture=s.effect==='space-warp'?spaceWarpFrame(phase,s):depthSurfaceFrame(phase,s);cells.splice(0,cells.length,...picture.cells);inks.splice(0,inks.length,...picture.inks);
 }else if(INTRO_MOTIONS.includes(s.effect)){
  const picture=introMotionFrame(phase,s);cells.splice(0,cells.length,...picture.cells);inks.splice(0,inks.length,...picture.inks);
 }else{
  const wrap=(x,size)=>(x%size+size)%size;
  for(let y=0;y<s.H;y++)for(let x=0;x<s.W;x++){
   let xx=x,yy=y;
   if(s.effect==='scroll-diagonal'){
    const d=scrollDirection(s);xx=wrap(x+Math.floor(phase*s.W)*(d.endsWith('right')?-1:1),s.W);yy=wrap(y+Math.floor(phase*s.H)*(d.startsWith('down')?-1:1),s.H);
   }
   if(['scroll-x','scroll-y'].includes(s.effect)){
    const d=scrollDirection(s),horizontal=['left','right'].includes(d),step=Math.floor(phase*(horizontal?s.W:s.H))*(d==='right'||d==='down'?-1:1);
    if(horizontal)xx=wrap(x+step,s.W);else yy=wrap(y+step,s.H);
   }
   if(s.effect==='sine-scroll'){
    const direction=scrollDirection(s),horizontal=['left','right'].includes(direction),sign=['right','down'].includes(direction)?-1:1;
    const travel=Math.floor(phase*(horizontal?s.W:s.H))*sign,position=(horizontal?x/s.W:y/s.H)*(50/(s.waveLength??50)),size=horizontal?s.H:s.W;
    const bend=Math.round(Math.sin(position*Math.PI*2)*Math.min(3,Math.max(1,size/4))*2*((s.waveAmplitude??100)/100));
    if(horizontal){xx=wrap(x+travel,s.W);yy=wrap(y+bend,s.H)}else{yy=wrap(y+travel,s.H);xx=wrap(x+bend,s.W)}
   }
   if(s.effect==='ripple'){
    const dx=x-(s.W-1)/2,dy=y-(s.H-1)/2,radius=Math.hypot(dx,dy),reach=Math.max(1,Math.hypot((s.W-1)/2,(s.H-1)/2));
    if(radius>0){
     const value=waveValue(s.waveShape??'sine',radius/reach*(50/(s.waveLength??50))-phase),shift=value*Math.min(3,Math.max(1,Math.min(s.W,s.H)/4))*2*((s.waveAmplitude??100)/100);
     xx=Math.round(x+dx/radius*shift);yy=Math.round(y+dy/radius*shift);
    }
    if(xx<0||xx>=s.W||yy<0||yy>=s.H)continue;
   }
   if(s.effect==='wave'){
    const d=s.waveDirection??'up',rows=d==='up'||d==='down',position=(rows?y/Math.max(1,s.H):x/Math.max(1,s.W))*(50/(s.waveLength??50)),size=rows?s.W:s.H;
    const sign=d==='down'||d==='right'?-1:1,value=(s.waveShape??'sine')==='sine'?Math.sin(phase*Math.PI*2*sign+position*Math.PI*2):waveValue(s.waveShape,position+phase*sign);
    const shift=Math.round(value*Math.min(3,Math.max(1,size/4))*2*((s.waveAmplitude??100)/100));
    if(rows)xx=wrap(x+shift,s.W);else yy=wrap(y+shift,s.H);
   }
   let g=s.grid[yy*s.W+xx];if(s.effect==='inverse'&&Math.floor(phase*2)&&g!=='')g=g^128;
   cells[y*s.W+x]=g;inks[y*s.W+x]=s.inks[yy*s.W+xx];
  }
 }
 const cycle=COLOR_CYCLES[s.colorEffect];
 if(cycle)for(let i=0;i<cells.length;i++)if(cells[i]!==''){
  const start=['raster-bars','plasma'].includes(s.colorEffect)?0:Math.max(0,cycle.indexOf(inks[i]));let step=Math.floor(colorPhase*cycle.length);
  if(['color-wave','raster-bars'].includes(s.colorEffect)){
   const d=s.colorWaveDirection??(s.colorEffect==='raster-bars'?'up':'up-left'),x=i%s.W,y=Math.floor(i/s.W),offset=((d.includes('left')?x:d.includes('right')?-x:0)+(d.includes('up')?y:d.includes('down')?-y:0))*(50/(s.colorWaveLength??50));
   const t=colorPhase+offset/cycle.length,shape=s.colorWaveShape??'sawtooth';
   step=shape==='sawtooth'?Math.floor(offset+Math.floor(colorPhase*cycle.length)):Math.min(cycle.length-1,Math.floor((waveValue(shape,t)+1)/2*cycle.length));
   step=Math.floor(((step%cycle.length+cycle.length)%cycle.length)*((s.colorWaveAmplitude??100)/100));
  }
  if(s.colorEffect==='plasma'){
   const d=s.colorWaveDirection??'up-left',dx=d.includes('left')?1:d.includes('right')?-1:0,dy=d.includes('up')?1:d.includes('down')?-1:0;
   const spatial=50/(s.colorWaveLength??50),x=(i%s.W)/s.W*spatial,y=Math.floor(i/s.W)/s.H*spatial,shape=s.colorWaveShape??'sine';
   const value=(waveValue(shape,x+dx*colorPhase)+waveValue(shape,y+dy*colorPhase)+waveValue(shape,x+y+(dx+dy)*colorPhase))/3;
   step=Math.min(cycle.length-1,Math.floor(Math.max(0,Math.min(1,(value+1)/2))*((s.colorWaveAmplitude??100)/100)*cycle.length+1e-10));
  }
  if(s.colorEffect==='bonfire'){
   const heat=bonfireHeat(i%s.W,Math.floor(i/s.W),s.W,s.H,colorPhase);
   inks[i]=BONFIRE_COLORS[Math.min(BONFIRE_COLORS.length-1,Math.floor(heat*BONFIRE_COLORS.length))];
  }else inks[i]=cycle[((start+step)%cycle.length+cycle.length)%cycle.length];
 }
 return {cells,inks};
}
