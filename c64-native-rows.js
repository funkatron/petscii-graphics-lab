// Compile sampled row states to exact native drawing kernels. No wave math is
// approximated: each lookup entry describes the browser's original frame.
export function planNativeRows({columns,rows,frames,screenAddress,blank,screenOffset=0}){
 if(frames.length<2||frames.length>256)throw Error('Native row rendering supports 2–256 sampled frames.');
 // Repeated cycles can contain identical complete pictures at different times.
 // Share their lookup columns, but keep every original duration in the stream.
 const states=[],stateLookup=new Map(),frameIndices=frames.map(frame=>{
  const key=JSON.stringify([frame.cells.map(v=>v===''?blank:v),frame.inks]);
  let id=stateLookup.get(key);
  if(id===undefined){id=states.length;stateLookup.set(key,id);states.push(frame)}
  return id;
 });
 const kernels=[],lookup=new Map(),calls=[],stateCosts=Array(states.length).fill(2500);
 for(const plane of ['cells','inks'])for(let y=0;y<rows;y++){
  const destination=(plane==='cells'?screenAddress:0xd800)+screenOffset+y*40,page=destination&0xff00,offset=destination&255,ids=[];
  for(let f=0;f<states.length;f++){
   const values=states[f][plane].slice(y*columns,(y+1)*columns).map(v=>v===''?blank:v),key=page+':'+values.join(',');
   let id=lookup.get(key);
   if(id===undefined){
    id=kernels.length;lookup.set(key,id);const byValue=new Map();
    values.forEach((value,x)=>{if(!byValue.has(value))byValue.set(value,[]);byValue.get(value).push(x)});
    kernels.push({page,groups:[...byValue].map(([value,positions])=>({value,positions}))});
   }
   ids.push(id);stateCosts[f]+=32+2*kernels[id].groups.length+5*columns;
  }
  calls.push({offset,ids});
 }
 return {kernels,calls,costs:frameIndices.map(id=>stateCosts[id]),frameIndices,stateCount:states.length};
}

export function nativeFrameStream(encoded,plan){
 const first=encoded.records[0],stream=encoded.stream.slice(0,encoded.continuationOffset),records=[first];
 for(let i=1;i<encoded.records.length-1;i++){
  const ticks=encoded.records[i].ticks;stream.push(ticks&255,ticks>>8,2,0,plan.frameIndices[i],0,0);
  records.push({ticks,cost:plan.costs[i],initial:false});
 }
 stream.push(0,0);const loopOffset=stream.length,firstTicks=first.ticks;
 stream.push(firstTicks&255,firstTicks>>8,2,0,0,0,0,255,255);const continuationPointer=stream.length;stream.push(0,0);
 records.push({ticks:firstTicks,cost:plan.costs[0],initial:false});
 const worstUpdateRatio=records.reduce((n,r)=>r.initial?n:Math.max(n,r.cost/(r.ticks*985248/60)),0);
 return {...encoded,stream,records,loopOffset,continuationPointer,worstUpdateRatio,packedSavings:first.packedSavings,
  streamBytes:{...first.bytes,framing:0},sharedBlockSavings:0,sharedPointers:[],sharedOffsets:[]};
}
