// A normalized depth-travel phase. Steady travel preserves existing output.
export function depthPhase(phase,shape='sawtooth'){
 const p=((phase%1)+1)%1;
 if(shape==='sine'&&(p===.25||p===.75))return .5;
 if(shape==='sine')return ((1-Math.cos(2*Math.PI*p))/2)%1;
 if(shape==='triangle')return (p<.5?2*p:2-2*p)%1;
 if(shape==='reverse-sawtooth')return (1-p)%1;
 if(shape==='square')return p<.5?0:.5;
 return p;
}
