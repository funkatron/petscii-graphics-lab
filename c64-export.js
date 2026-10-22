// C64 PRG exporter. No character ROM is embedded: the VIC-II selects the machine's own ROM.
// Each frame: 16-bit 60 Hz duration, then changed runs [addressLo,addressHi,count,value].
// Address 0 ends a frame; duration 0 ends a loop; $FFFF redirects the stream. Frame zero initializes both planes once.
export function createC64Program({columns,rows,charset,background,ink,frames,repetitions=0}){
 if(!Number.isInteger(columns)||columns<1||columns>40||!Number.isInteger(rows)||rows<1||rows>25)throw Error('C64 programs support up to 40 columns × 25 rows. Resize the canvas first.');
 if(![0,1].includes(charset)||![background,ink].every(c=>Number.isInteger(c)&&c>=0&&c<16))throw Error('Invalid C64 display settings');
 if(!Number.isInteger(repetitions)||repetitions<0||repetitions>100)throw Error('C64 repetitions must be a whole number from 0 to 100 (0 loops continuously)');
 if(!Array.isArray(frames)||!frames.length)throw Error('No C64 frames to export');
 const stream=[];
 const changedRuns=(values,previous,address)=>{
  let writes=0,runs=0;
  for(let i=0;i<values.length;){if(previous&&values[i]===previous[i]){i++;continue}let count=1;
   while(count<255&&i+count<values.length&&values[i+count]===values[i]&&(!previous||values[i+count]!==previous[i+count]))count++;
   const target=address+i;stream.push(target&255,target>>8,count,values[i]);writes+=count;runs++;i+=count;
  }
  return writes*13+runs*160;
 };
 let previousScreen,previousColors,firstScreen,firstColors,firstTicks,continuationOffset;
 let elapsed=0,previousTick=0;
 for(const frame of frames){
  if(frame.cells.length!==columns*rows||frame.inks.length!==columns*rows)throw Error('Invalid C64 frame dimensions');
  if(frame.cells.some(g=>g!==''&&(!Number.isInteger(g)||g<0||g>255)))throw Error('C64 programs require numeric screen codes from 0 to 255.');
  if(frame.inks.some(c=>!Number.isInteger(c)||c<0||c>15))throw Error('Invalid C64 cell colors');
  if(!Number.isFinite(frame.durationMs)||frame.durationMs<=0)throw Error('Invalid C64 frame timing');
  elapsed+=frame.durationMs;const endTick=Math.round(elapsed*60/1000),ticks=endTick-previousTick;previousTick=endTick;
  if(ticks<1||ticks>65534)throw Error('C64 frame duration is outside the supported range');
  stream.push(ticks&255,ticks>>8);
  const screen=Array(1000).fill(32),colors=Array(1000).fill(ink);
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const i=y*columns+x,d=y*40+x;screen[d]=frame.cells[i]===''?32:frame.cells[i];colors[d]=frame.inks[i]}
  const cost=changedRuns(screen,previousScreen,0x400)+changedRuns(colors,previousColors,0xd800)+2500;
  if(previousScreen&&cost>ticks*985248/60)throw Error('This animation changes too much for this C64 playback speed. Choose a longer loop or simplify the drawing.');
  stream.push(0,0);if(!firstScreen){firstScreen=screen;firstColors=colors;firstTicks=ticks;continuationOffset=stream.length}previousScreen=screen;previousColors=colors;
 }
 stream.push(0,0);
 const loopOffset=stream.length;stream.push(firstTicks&255,firstTicks>>8);
 const loopCost=changedRuns(firstScreen,previousScreen,0x400)+changedRuns(firstColors,previousColors,0xd800)+2500;
 if(frames.length>1&&loopCost>firstTicks*985248/60)throw Error('This animation changes too much for this C64 playback speed. Choose a longer loop or simplify the drawing.');
 stream.push(0,0,255,255);const continuationPointer=stream.length;stream.push(0,0);
 // Small label-aware emitter: operands/fixups are checked, including relative branch ranges.
 const origin=0x0801,bytes=[0x0b,0x08,10,0,0x9e,50,48,54,49,0,0,0],labels={},fixups=[];
 const emit=(...b)=>bytes.push(...b),label=n=>{labels[n]=origin+bytes.length},word=n=>emit(n&255,n>>8),abs=(op,target)=>{emit(op);if(typeof target==='string'){fixups.push({at:bytes.length,target});word(0)}else word(target)},branch=(op,target)=>{emit(op);fixups.push({at:bytes.length,target,relative:true});emit(0)},immLabel=(op,target,high=false)=>{emit(op);fixups.push({at:bytes.length,target,byte:true,high});emit(0)};
 // Preserve the four scratch zero-page bytes and display registers; KERNAL IRQs stay enabled.
 const registers=[0xdd00,0xdd02,0xd011,0xd016,0xd018,0xd020,0xd021,0x00cc,0x0288];
 for(let z=0xfb;z<=0xfe;z++)emit(0xa5,z,0x48);
 for(const address of registers){abs(0xad,address);emit(0x48)}
 emit(0xd8); // CLD: SYS callers should not leave decimal arithmetic enabled.
 abs(0xad,0xdd02);emit(0x09,3);abs(0x8d,0xdd02);
 abs(0xad,0xdd00);emit(0x09,3);abs(0x8d,0xdd00); // VIC bank 0.
 for(const [address,value] of [[0xd011,0x1b],[0xd016,8],[0xd018,charset?0x17:0x15],[0xd020,background],[0xd021,background],[0xcc,1],[0x0288,4]]){emit(0xa9,value);abs(0x8d,address)}
 emit(0xa9,repetitions);abs(0x8d,'remaining');
 emit(0xa9,0);abs(0x8d,'started');
 immLabel(0xa9,'data');emit(0x85,0xfb);immLabel(0xa9,'data',true);emit(0x85,0xfc);abs(0x4c,'frame');
 label('restart');immLabel(0xa9,'loopData');emit(0x85,0xfb);immLabel(0xa9,'loopData',true);emit(0x85,0xfc);
 label('frame');abs(0x20,'get');abs(0x8d,'delay');abs(0x20,'get');abs(0x8d,'delayHigh');abs(0x0d,'delay');branch(0xd0,'checkRedirect');
 abs(0xad,'remaining');branch(0xf0,'restart');abs(0xce,'remaining');branch(0xd0,'restart');abs(0x4c,'hold');
 label('checkRedirect');abs(0xad,'delayHigh');emit(0xc9,255);branch(0xd0,'picture');abs(0xad,'delay');emit(0xc9,255);branch(0xd0,'picture');
 abs(0x20,'get');emit(0xaa);abs(0x20,'get');emit(0x85,0xfc,0x86,0xfb);abs(0x4c,'frame');
 label('picture');abs(0x20,'plane');abs(0xad,'started');branch(0xd0,'wait');abs(0xee,'started');emit(0xa5,0xa2);abs(0x8d,'lastTick');
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
 label('plane');abs(0x20,'get');emit(0x85,0xfd);abs(0x20,'get');emit(0x85,0xfe);branch(0xf0,'planeEnd');
 abs(0x20,'get');emit(0xaa);abs(0x20,'get');
 label('run');emit(0x91,0xfd,0xc8,0xca);branch(0xd0,'run');abs(0x4c,'plane');label('planeEnd');emit(0x60);
 for(const name of ['remaining','lastTick','delay','delayHigh','started']){label(name);emit(0)}
 label('data');labels.loopData=labels.data+loopOffset;labels.continuation=labels.data+continuationOffset;fixups.push({at:bytes.length+continuationPointer,target:'continuation'});for(const byte of stream)emit(byte);
 // Stay below BASIC ROM ($A000), leaving KERNAL, I/O and the stack intact.
 if(origin+bytes.length>0xa000)throw Error('This animation exceeds the C64 player’s memory budget. Use a smaller canvas, a simpler drawing, or a shorter loop.');
 for(const f of fixups){const address=labels[f.target];if(address===undefined)throw Error('Unknown C64 player label');if(f.relative){const delta=address-(origin+f.at+1);if(delta< -128||delta>127)throw Error('C64 branch out of range');bytes[f.at]=delta&255}else if(f.byte)bytes[f.at]=f.high?address>>8:address&255;else{bytes[f.at]=address&255;bytes[f.at+1]=address>>8}}
 return {bytes:Uint8Array.from([1,8,...bytes]),durationTicks:previousTick,frameCount:frames.length};
}
