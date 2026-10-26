import {planNativeRows,nativeFrameStream} from './c64-native-rows.js';

// Standard 35-track D64, with one closed PRG and no appended error table.
// Layout: https://vice-emu.sourceforge.io/vice_17.html (D64 disk image format).
export function createD64Disk(prg,filename='PICTURE'){
 if(!(prg instanceof Uint8Array)||prg.length<3)throw Error('A PRG with a load address and program data is required');
 if(!/^[A-Z0-9 -]{1,16}$/.test(filename))throw Error('Invalid C64 disk filename');
 const blocks=Math.ceil(prg.length/254);
 if(blocks>664)throw Error('Program exceeds the 35-track D64 disk capacity');
 const disk=new Uint8Array(174848),offsets=[0],counts=[0];let offset=0;
 for(let t=1;t<=35;t++){offsets[t]=offset;counts[t]=t<=17?21:t<=24?19:t<=30?18:17;offset+=counts[t]*256}
 const bam=disk.subarray(offsets[18],offsets[18]+256);
 bam.set([18,1,0x41,0]);
 for(let t=1;t<=35;t++){bam[t*4]=counts[t];for(let s=0;s<counts[t];s++)bam[t*4+1+(s>>3)]|=1<<(s&7)}
 const allocate=(t,s)=>{bam[t*4]--;bam[t*4+1+(s>>3)]&=~(1<<(s&7));return offsets[t]+s*256};
 allocate(18,0);allocate(18,1);
 bam.fill(0xa0,0x90,0xab);
 bam.set(new TextEncoder().encode('PETSCII LAB'),0x90);bam.set([0x50,0x4c],0xa2);bam.set([0x32,0x41],0xa5);
 // Allocate near the directory first, with the standard ten-sector interleave.
 const chain=[];
 for(const t of [...Array.from({length:17},(_,i)=>17-i),...Array.from({length:17},(_,i)=>19+i)]){
  const used=new Set();let s=0;
  while(used.size<counts[t]&&chain.length<blocks){while(used.has(s))s=(s+1)%counts[t];used.add(s);chain.push([t,s]);allocate(t,s);s=(s+10)%counts[t]}
  if(chain.length===blocks)break;
 }
 const directory=disk.subarray(offsets[18]+256,offsets[18]+512);
 directory.set([0,255,0x82,...chain[0]]);directory.fill(0xa0,5,21);directory.set(new TextEncoder().encode(filename),5);
 directory[30]=blocks&255;directory[31]=blocks>>8;
 chain.forEach(([t,s],i)=>{const pos=offsets[t]+s*256,start=i*254,length=Math.min(254,prg.length-start),next=chain[i+1];disk[pos]=next?next[0]:0;disk[pos+1]=next?next[1]:length+1;disk.set(prg.subarray(start,start+length),pos+2)});
 return disk;
}

// Reuse exact update bodies, without changing their durations or delta writes.
// Blocks contain only ordinary run commands and a zero-address return; calls
// are emitted only in the main frame stream, so nesting is bounded to one level.
function shareFrameBlocks(encoded){
 const {stream,records}=encoded,groups=new Map();
 for(const r of records){
  const body=stream.slice(r.start,r.end),key=body.join(',');
  if(!groups.has(key))groups.set(key,{body,records:[]});groups.get(key).records.push(r);
 }
 const blocks=[...groups.values()].filter(b=>(b.records.length-1)*b.body.length-4*b.records.length-2>0);
 const sharedBlockSavings=blocks.reduce((n,b)=>n+(b.records.length-1)*b.body.length-4*b.records.length-2,0);
 // The optional call/return routine adds 41 bytes, including no nested calls.
 if(sharedBlockSavings<=41)return {...encoded,sharedBlockSavings:0,sharedPointers:[],sharedOffsets:[]};
 const chosen=new Map();blocks.forEach((b,id)=>b.records.forEach(r=>chosen.set(r,id)));
 const output=[],sharedPointers=[],sharedOffsets=[],streamBytes={...encoded.streamBytes};let cursor=0;
 for(const r of records){
  for(let i=cursor;i<r.start;i++)output.push(stream[i]);
  if(chosen.has(r)){output.push(1,0,0,0);sharedPointers.push({at:output.length-2,id:chosen.get(r)})}
  else for(let i=r.start;i<r.end;i++)output.push(stream[i]);
  cursor=r.end;
 }
 for(let i=cursor;i<stream.length;i++)output.push(stream[i]);
 for(const b of blocks){
  sharedOffsets.push(output.length);for(const byte of b.body)output.push(byte);output.push(0,0);
  for(const kind of ['characters','screen','color'])streamBytes[kind]-=(b.records.length-1)*b.records[0].bytes[kind];
 }
 const translate=offset=>offset+records.reduce((n,r)=>n+(r.end<=offset&&chosen.has(r)?4-(r.end-r.start):0),0);
 const worstUpdateRatio=records.reduce((worst,r)=>r.initial?worst:Math.max(worst,(r.cost+(chosen.has(r)?300:0))/(r.ticks*985248/60)),0);
 return {...encoded,stream:output,streamBytes,worstUpdateRatio,sharedBlockSavings,sharedPointers,sharedOffsets,
  loopOffset:translate(encoded.loopOffset),continuationOffset:translate(encoded.continuationOffset),continuationPointer:translate(encoded.continuationPointer)};
}

// C64 PRG exporter. No character ROM is embedded: the VIC-II selects the machine's own ROM.
// Each frame: 16-bit 60 Hz duration, then changed repeated/literal runs.
// [addressLo,addressHi,count,value]; count 0 means [length,...literalBytes] instead.
// Address 0 ends a frame; duration 0 ends a loop; $FFFF redirects the stream. Frame zero initializes both planes once.
export function createC64Program(input){
 let result=compileC64Program(input,true);
 // Sharing costs CPU time. Keep a previously viable unshared program when the
 // call overhead would reject it; use actual compiled sizes, not a size guess.
 if(result.diagnostics.sharedBlockCount&&result.diagnostics.worstUpdateRatio>1){
  const fallback=compileC64Program(input,false),d=fallback.diagnostics;
  if(d.worstUpdateRatio<=1&&d.programBytes<=d.memoryLimit)result=fallback;
 }
 if(!input.analyze){
  const d=result.diagnostics;
  if(d.worstUpdateRatio>1)throw Error('This animation changes too much for this C64 playback speed. Choose a longer loop or simplify the drawing.');
  // Keep the complete program below BASIC ROM ($A000).
  if(d.programBytes>d.memoryLimit)throw Error('This animation exceeds the C64 player’s memory budget. Use a smaller canvas, a simpler drawing, or a shorter loop.');
 }
 return result;
}
// Preserve accepted generic bytes; promote only a native candidate that fits
// both limits. Analysis and downloads must select the identical program.
export function createC64AdaptiveProgram(input){
 let result=createC64Program({...input,analyze:true});
 const memoryFits=p=>p.diagnostics.programBytes<=p.diagnostics.memoryLimit;
 const fits=p=>p.diagnostics.worstUpdateRatio<=1&&memoryFits(p);
 if(!fits(result)&&input.frames.length>=2&&input.frames.length<=256){
  const native=createC64RowProgram({...input,analyze:true});
  if(fits(native)||(input.allowTimingOverrun&&memoryFits(native)&&(!memoryFits(result)||native.diagnostics.worstUpdateRatio<result.diagnostics.worstUpdateRatio)))result=native;
 }
 if(!input.analyze&&!fits(result)&&!(input.allowTimingOverrun&&memoryFits(result)))return createC64Program(input);
 return result;
}
// Explicit native API for measurement and regression checks.
export function createC64RowProgram(input){
 const result=compileC64Program(input,false,true),d=result.diagnostics;
 if(!input.analyze){
  if(d.worstUpdateRatio>1)throw Error('Native row rendering exceeds the estimated C64 timing budget.');
  if(d.programBytes>d.memoryLimit)throw Error('Native row rendering exceeds the C64 player memory budget.');
 }
 return result;
}
function compileC64Program({columns,rows,charset=0,background,ink,frames,repetitions=0,glyphBits},allowSharing,nativeRows=false){
 if(!Number.isInteger(columns)||columns<1||columns>40||!Number.isInteger(rows)||rows<1||rows>25)throw Error('C64 programs support up to 40 columns × 25 rows. Resize the canvas first.');
 if(![0,1].includes(charset)||![background,ink].every(c=>Number.isInteger(c)&&c>=0&&c<16))throw Error('Invalid C64 display settings');
 if(!Number.isInteger(repetitions)||repetitions<0||repetitions>100)throw Error('C64 repetitions must be a whole number from 0 to 100 (0 loops continuously)');
 if(!Array.isArray(frames)||!frames.length)throw Error('No C64 frames to export');
 const custom=glyphBits!==undefined;
 let characterBytes;
 if(custom){
  if(!(glyphBits instanceof Uint8Array)||glyphBits.length!==4096)throw Error('Invalid unified glyph data');
  characterBytes=new Uint8Array(2048);const patterns=new Map([['0,0,0,0,0,0,0,0',0]]),codes=new Map();
  frames=frames.map(frame=>({...frame,cells:frame.cells.map(g=>{
   if(g==='')return g;
   if(!Number.isInteger(g)||g<0||g>511)throw Error('Invalid unified glyph ID');
   if(codes.has(g))return codes.get(g);
   const rows=glyphBits.subarray(g*8,g*8+8),key=rows.join(',');let slot=patterns.get(key);
   if(slot===undefined){slot=patterns.size;if(slot>=256)throw Error('C64 export supports 256 distinct patterns across the animation, including blank space. Use fewer different glyphs; image and video exports remain available.');patterns.set(key,slot);characterBytes.set(rows,slot*8)}
   codes.set(g,slot);return slot;
  })}));
 }
 function encodeStream(packColors){
 let usesPackedColors=false,packedSavings=0;
 const stream=[],records=[],streamBytes={characters:0,screen:0,color:0,framing:0};
 const changedRuns=(values,previous,address)=>{
  let cost=0;const start=stream.length;
  const repeatLength=i=>{let count=1;while(count<255&&i+count<values.length&&values[i+count]===values[i]&&(!previous||values[i+count]!==previous[i+count]))count++;return count};
  for(let i=0;i<values.length;){if(previous&&values[i]===previous[i]){i++;continue}
   let count=repeatLength(i);const target=address+i;
   if(count>=3){stream.push(target&255,target>>8,count,values[i]);cost+=count*13+160}
   else{
    count=1;while(count<255&&i+count<values.length&&(!previous||values[i+count]!==previous[i+count])&&repeatLength(i+count)<3)count++;
    // Isolated one/two-byte repetitions are cheaper in the original run format.
    if(count<=2&&values[i]===values[i+count-1]){stream.push(target&255,target>>8,count,values[i]);cost+=count*13+160}
    else if(packColors&&address===0xd800&&count>=4){
     // Color RAM stores four-bit inks. Zero literal length introduces packed colors.
     usesPackedColors=true;packedSavings+=count-1-Math.ceil(count/2);stream.push(target&255,target>>8,0,0,count);
     for(let j=0;j<count;j+=2)stream.push(values[i+j]|((j+1<count?values[i+j+1]:0)<<4));
     cost+=count*40+320;
    }else{stream.push(target&255,target>>8,0,count,...values.slice(i,i+count));cost+=count*20+220}
   }
   i+=count;
  }
  streamBytes[address===0xc800?'characters':address===0xd800?'color':'screen']+=stream.length-start;return cost;
 };
 let previousScreen,previousColors,firstScreen,firstColors,firstTicks,continuationOffset;
 let elapsed=0,previousTick=0,worstUpdateRatio=0;
 for(const frame of frames){
  if(frame.cells.length!==columns*rows||frame.inks.length!==columns*rows)throw Error('Invalid C64 frame dimensions');
  if(frame.cells.some(g=>g!==''&&(!Number.isInteger(g)||g<0||g>255)))throw Error('C64 programs require numeric screen codes from 0 to 255.');
  if(frame.inks.some(c=>!Number.isInteger(c)||c<0||c>15))throw Error('Invalid C64 cell colors');
  if(!Number.isFinite(frame.durationMs)||frame.durationMs<=0)throw Error('Invalid C64 frame timing');
  elapsed+=frame.durationMs;const endTick=Math.round(elapsed*60/1000),ticks=endTick-previousTick;previousTick=endTick;
  if(ticks<1||ticks>65534)throw Error('C64 frame duration is outside the supported range');
  stream.push(ticks&255,ticks>>8);
  const screen=Array(1000).fill(custom?0:32),colors=Array(1000).fill(ink);
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const i=y*columns+x,d=y*40+x;screen[d]=frame.cells[i]===''?(custom?0:32):frame.cells[i];colors[d]=frame.inks[i]}
  const start=stream.length,before={...streamBytes},packingBefore=packedSavings;
  if(custom&&!previousScreen)changedRuns(characterBytes,undefined,0xc800);
  const cost=changedRuns(screen,previousScreen,custom?0xc400:0x400)+changedRuns(colors,previousColors,0xd800)+2500;
  records.push({start,end:stream.length,ticks,cost,initial:!previousScreen,packedSavings:packedSavings-packingBefore,bytes:Object.fromEntries(['characters','screen','color'].map(k=>[k,streamBytes[k]-before[k]]))});
  if(previousScreen)worstUpdateRatio=Math.max(worstUpdateRatio,cost/(ticks*985248/60));
  stream.push(0,0);if(!firstScreen){firstScreen=screen;firstColors=colors;firstTicks=ticks;continuationOffset=stream.length}previousScreen=screen;previousColors=colors;
 }
 stream.push(0,0);
 const loopOffset=stream.length;stream.push(firstTicks&255,firstTicks>>8);
 const start=stream.length,before={...streamBytes},packingBefore=packedSavings;
 const loopCost=changedRuns(firstScreen,previousScreen,custom?0xc400:0x400)+changedRuns(firstColors,previousColors,0xd800)+2500;
 records.push({start,end:stream.length,ticks:firstTicks,cost:loopCost,initial:frames.length===1,packedSavings:packedSavings-packingBefore,bytes:Object.fromEntries(['characters','screen','color'].map(k=>[k,streamBytes[k]-before[k]]))});
 if(frames.length>1)worstUpdateRatio=Math.max(worstUpdateRatio,loopCost/(firstTicks*985248/60));
 stream.push(0,0,255,255);const continuationPointer=stream.length;stream.push(0,0);
 return {stream,records,streamBytes,usesPackedColors,packedSavings,worstUpdateRatio,previousTick,loopOffset,continuationOffset,continuationPointer};
 }
 // The optional decoder adds 51 bytes. Keep the original encoding unless packing
 // saves more than its complete code footprint, including the dispatch branch.
 let encoded=encodeStream(true);
 if((nativeRows?encoded.records[0].packedSavings:encoded.packedSavings)<=51)encoded=encodeStream(false);
 const nativePlan=nativeRows?planNativeRows({columns,rows,frames,screenAddress:custom?0xc400:0x400,blank:custom?0:32}):null;
 encoded=nativePlan?nativeFrameStream(encoded,nativePlan):allowSharing?shareFrameBlocks(encoded):{...encoded,sharedBlockSavings:0,sharedPointers:[],sharedOffsets:[]};
 const {stream,streamBytes,usesPackedColors,packedSavings,worstUpdateRatio,previousTick,loopOffset,continuationOffset,continuationPointer,sharedBlockSavings,sharedPointers,sharedOffsets}=encoded;
 const usesSharedBlocks=sharedPointers.length>0;
 // Small label-aware emitter: operands/fixups are checked, including relative branch ranges.
 const origin=0x0801,bytes=[0x0b,0x08,10,0,0x9e,50,48,54,49,0,0,0],labels={},fixups=[];
 const emit=(...b)=>bytes.push(...b),label=n=>{labels[n]=origin+bytes.length},word=n=>emit(n&255,n>>8),abs=(op,target)=>{emit(op);if(typeof target==='string'){fixups.push({at:bytes.length,target});word(0)}else word(target)},branch=(op,target)=>{emit(op);fixups.push({at:bytes.length,target,relative:true});emit(0)},immLabel=(op,target,high=false)=>{emit(op);fixups.push({at:bytes.length,target,byte:true,high});emit(0)};
 // Preserve the four scratch zero-page bytes and display registers; KERNAL IRQs stay enabled.
 const registers=[0xdd00,0xdd02,0xd011,0xd016,0xd018,0xd020,0xd021,0x00cc,0x0288];
 for(let z=0xfb;z<=0xfe;z++)emit(0xa5,z,0x48);
 for(const address of registers){abs(0xad,address);emit(0x48)}
 emit(0xd8); // CLD: SYS callers should not leave decimal arithmetic enabled.
 abs(0xad,0xdd02);emit(0x09,3);abs(0x8d,0xdd02);
 abs(0xad,0xdd00);emit(custom?0x29:0x09,custom?0xfc:3);abs(0x8d,0xdd00); // RAM glyphs use VIC bank 3; ROM glyphs use bank 0.
 for(const [address,value] of [[0xd011,0x1b],[0xd016,8],[0xd018,custom?0x12:charset?0x17:0x15],[0xd020,background],[0xd021,background],[0xcc,1],[0x0288,custom?0xc4:4]]){emit(0xa9,value);abs(0x8d,address)}
 emit(0xa9,repetitions);abs(0x8d,'remaining');
 emit(0xa9,0);abs(0x8d,'started');
 immLabel(0xa9,'data');emit(0x85,0xfb);immLabel(0xa9,'data',true);emit(0x85,0xfc);abs(0x4c,'frame');
 label('restart');immLabel(0xa9,'loopData');emit(0x85,0xfb);immLabel(0xa9,'loopData',true);emit(0x85,0xfc);
 label('frame');abs(0x20,'get');abs(0x8d,'delay');abs(0x20,'get');abs(0x8d,'delayHigh');abs(0x0d,'delay');branch(0xd0,'checkRedirect');
 abs(0xad,'remaining');branch(0xf0,'restart');abs(0xce,'remaining');branch(0xd0,'restart');abs(0x4c,'hold');
 label('checkRedirect');abs(0xad,'delayHigh');emit(0xc9,255);branch(0xd0,'picture');abs(0xad,'delay');emit(0xc9,255);branch(0xd0,'picture');
 abs(0x20,'get');emit(0xaa);abs(0x20,'get');emit(0x85,0xfc,0x86,0xfb);abs(0x4c,'frame');
 label('picture');abs(0x20,'plane');label('frameReady');abs(0xad,'started');branch(0xd0,'wait');abs(0xee,'started');emit(0xa5,0xa2);abs(0x8d,'lastTick');
 label('wait');abs(0x20,0xffe1);branch(0xd0,'clock');abs(0x4c,'exit');
 label('clock');emit(0xa5,0xa2);abs(0xcd,'lastTick');branch(0xf0,'wait');abs(0xee,'lastTick');
 abs(0xad,'delay');branch(0xd0,'decrement');abs(0xce,'delayHigh');label('decrement');abs(0xce,'delay');abs(0xad,'delay');abs(0x0d,'delayHigh');branch(0xd0,'wait');abs(0x4c,'frame');
 label('hold');abs(0x20,0xffe1);branch(0xd0,'hold');
 label('exit');
 for(const address of [...registers].reverse()){emit(0x68);abs(0x8d,address)}
 for(let z=0xfe;z>=0xfb;z--)emit(0x68,0x85,z);
 // Clear the picture before BASIC prints READY; restore its normal cursor behavior.
 emit(0xa9,147);abs(0x20,0xffd2);emit(0x60);
 label('get');emit(0xa0,0,0xb1,0xfb,0xe6,0xfb);branch(0xd0,'got');emit(0xe6,0xfc);label('got');emit(0xc9,0,0x60);
 label('plane');abs(0x20,'get');emit(0x85,0xfd);abs(0x20,'get');emit(0x85,0xfe);branch(0xf0,nativePlan?'nativeControl':usesSharedBlocks?'planeControl':'planeEnd');
 abs(0x20,'get');emit(0xaa);branch(0xf0,'literal');abs(0x20,'get');
 label('run');emit(0x91,0xfd,0xc8,0xca);branch(0xd0,'run');abs(0x4c,'plane');label('planeEnd');emit(0x60);
 if(nativePlan){
  label('nativeControl');emit(0xa5,0xfd);branch(0xf0,'planeEnd');
  abs(0x20,'get');emit(0xaa);abs(0x20,'nativeRender');abs(0x4c,'plane');
 }
 // Address $0001 invokes one pooled update body, then resumes this frame.
 if(usesSharedBlocks){
  label('planeControl');emit(0xa5,0xfd);branch(0xf0,'planeEnd');
  abs(0x20,'get');emit(0xaa);abs(0x20,'get');emit(0x85,0xfe,0x86,0xfd);
  emit(0xa5,0xfb,0x48,0xa5,0xfc,0x48,0xa5,0xfd,0x85,0xfb,0xa5,0xfe,0x85,0xfc);
  abs(0x20,'plane');emit(0x68,0x85,0xfc,0x68,0x85,0xfb);abs(0x4c,'plane');
 }
 label('literal');abs(0x20,'get');emit(0xaa);if(usesPackedColors)branch(0xf0,'packed');
 // Copy a literal with indexed addressing; advance the source once per run.
 // The next run supplies a new destination, so no destination advance is needed.
 label('literalByte');emit(0xb1,0xfb,0x91,0xfd,0xc8,0xca);branch(0xd0,'literalByte');
 emit(0x98,0x18,0x65,0xfb,0x85,0xfb);branch(0x90,'literalDone');emit(0xe6,0xfc);
 label('literalDone');abs(0x4c,'plane');
 // Packed ink literals: low nibble first, with no padding write for odd counts.
 if(usesPackedColors){
  label('packed');abs(0x20,'get');emit(0xaa);
  // Y stays zero. Inline the byte read and both nibble writes to avoid three
  // subroutine calls per pair, retaining source/destination page carry handling.
  label('packedByte');emit(0xb1,0xfb,0xe6,0xfb);branch(0xd0,'packedGot');emit(0xe6,0xfc);
  label('packedGot');emit(0x48,0x29,15,0x91,0xfd,0xe6,0xfd);branch(0xd0,'packedLow');emit(0xe6,0xfe);
  label('packedLow');emit(0xca);branch(0xf0,'packedOdd');
  emit(0x68,0x4a,0x4a,0x4a,0x4a,0x91,0xfd,0xe6,0xfd);branch(0xd0,'packedHigh');emit(0xe6,0xfe);
  label('packedHigh');emit(0xca);branch(0xd0,'packedByte');abs(0x4c,'plane');
  label('packedOdd');emit(0x68);abs(0x4c,'plane');
 }
 let nativeBytes=0;
 if(nativePlan){
  const start=bytes.length;label('nativeRender');
  nativePlan.calls.forEach((call,i)=>{
   abs(0xbd,'nativeLo'+i);abs(0x8d,'nativeCallLo'+i);abs(0xbd,'nativeHi'+i);abs(0x8d,'nativeCallHi'+i);
   emit(0xa0,call.offset);label('nativeCall'+i);labels['nativeCallLo'+i]=labels['nativeCall'+i]+1;labels['nativeCallHi'+i]=labels['nativeCall'+i]+2;emit(0x20,0,0);
  });emit(0x60);
  nativePlan.kernels.forEach((kernel,i)=>{label('nativeKernel'+i);for(const {value,positions} of kernel.groups){emit(0xa9,value);for(const x of positions)abs(0x99,kernel.page+x)}emit(0x60)});
  nativePlan.calls.forEach((call,i)=>{for(const high of [false,true]){label((high?'nativeHi':'nativeLo')+i);for(const id of call.ids){fixups.push({at:bytes.length,target:'nativeKernel'+id,byte:true,high});emit(0)}}});
  nativeBytes=bytes.length-start;
 }
 for(const name of ['remaining','lastTick','delay','delayHigh','started']){label(name);emit(0)}
 label('data');labels.loopData=labels.data+loopOffset;labels.continuation=labels.data+continuationOffset;fixups.push({at:bytes.length+continuationPointer,target:'continuation'});for(const [id,offset] of sharedOffsets.entries())labels['shared'+id]=labels.data+offset;for(const {at,id} of sharedPointers)fixups.push({at:bytes.length+at,target:'shared'+id});for(const byte of stream)emit(byte);
 // Resolve pointers after optional decoders have fixed the code/data layout.
 for(const f of fixups){const address=labels[f.target];if(address===undefined)throw Error('Unknown C64 player label');if(f.relative){const delta=address-(origin+f.at+1);if(delta< -128||delta>127)throw Error('C64 branch out of range');bytes[f.at]=delta&255}else if(f.byte)bytes[f.at]=f.high?address>>8:address&255;else{bytes[f.at]=address&255;bytes[f.at+1]=address>>8}}
 // Host-side symbols let full-machine checks observe frames without changing the PRG.
 return {bytes:Uint8Array.from([1,8,...bytes]),diagnostics:{renderer:nativePlan?'native-rows':'generic',nativeBytes,nativeRowKernels:nativePlan?.kernels.length??0,nativeFrameStates:nativePlan?.stateCount??0,programBytes:bytes.length,memoryLimit:0xa000-origin,worstUpdateRatio,playerBytes:labels.data-origin,packedColorSavings:packedSavings,sharedBlockSavings,sharedBlockCount:sharedOffsets.length,sharedFrameReferences:sharedPointers.length,streamBytes:{...streamBytes,framing:stream.length-streamBytes.characters-streamBytes.screen-streamBytes.color}},durationTicks:previousTick,frameCount:frames.length,debugSymbols:{entry:0x080d,frameStart:labels.picture,frameReady:labels.frameReady,hold:labels.hold,exit:labels.exit}};
}
