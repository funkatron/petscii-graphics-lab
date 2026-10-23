// Optional full-machine integration suite. ROMs and VICE stay outside this repo.
import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {ViceMonitor,freePort} from './vice-monitor.mjs';

const source=await readFile(new URL('../c64-export.js',import.meta.url),'utf8');
const {createC64Program,createD64Disk}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const executable=process.env.VICE_EXECUTABLE;
const data=process.env.VICE_DATA_DIR;
assert.ok(executable&&data,'Set VICE_EXECUTABLE and VICE_DATA_DIR; see docs/vice-validation.md');
const rom=await readFile(join(data,'C64/chargen-901225-01.bin'));
assert.equal(createHash('sha256').update(rom).digest('hex'),'fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420','Reference C64 character ROM');
const displayRegisters=[0xdd00,0xdd02,0xd011,0xd016,0xd018,0xd020,0xd021,0xcc,0x288];

async function launch(t,model){
 const dir=await mkdtemp(join(tmpdir(),'petscii-vice-')),port=await freePort();
 const args=['-console','-default','-directory',resolve(data),'-model',model,
  '-kernal',join(data,'C64/kernal-901227-03.bin'),'-basic',join(data,'C64/basic-901226-01.bin'),
  '-chargen',join(data,'C64/chargen-901225-01.bin'),'-dos1541II',join(data,'DRIVES/dos1541ii-251968-03.bin'),
  '-drive8type','1542','-drive8truedrive','+virtualdev8','-autostartprgmode','1',
  '+sound','-warp','-binarymonitor','-binarymonitoraddress','127.0.0.1:'+port];
 const child=spawn(executable,args);let log='';
 child.on('error',e=>{log+=e.message});child.stdout.on('data',b=>{log+=b});child.stderr.on('data',b=>{log+=b});
 let monitor;
 t.after(async()=>{monitor?.close();child.kill('SIGKILL');await rm(dir,{recursive:true,force:true});});
 try{monitor=await ViceMonitor.connect(port,child)}catch(e){throw Error(e.message+'\n'+log)}
 return {monitor,dir};
}
async function resource(m,name){const text=Buffer.from(name);const {body}=await m.command(0x51,Buffer.concat([Buffer.from([text.length]),text]));assert.equal(body[0],1);return body.readUIntLE(2,body[1])}
async function tick(m){const b=await m.memory(0xa0,0xa2);return b[0]*65536+b[1]*256+b[2]}
async function io(m,address){const value=(await m.memory(address,address,3))[0];return address===0xd011?value&127:value}
async function registers(m){return Promise.all(displayRegisters.map(a=>io(m,a)))}
async function picture(m,frame,columns,rows,ink){
 const screen=Buffer.alloc(1000,32),colors=Buffer.alloc(1000,ink);
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const i=y*columns+x,d=y*40+x;screen[d]=frame.cells[i]===''?32:frame.cells[i];colors[d]=frame.inks[i]}
 assert.deepEqual(await m.memory(0x400,0x7e7),screen,'All 1000 screen codes');
 assert.deepEqual((await m.memory(0xd800,0xdbe7,3)).map(v=>v&15),colors,'All 1000 color cells');
 assert.deepEqual(await m.memory(0x7e8,0x7ff),m.spriteTail,'Sprite pointers preserved');
 assert.deepEqual((await m.memory(0xdbe8,0xdbff,3)).map(v=>v&15),m.colorTail,'Color writes stop after 1000 cells');
}
async function load(m,dir,program,format){
 const path=join(dir,'picture.'+format);await writeFile(path,format==='d64'?createD64Disk(program.bytes,'PICTURE'):program.bytes);
 await m.checkpoint(program.debugSymbols.entry);await m.autostart(path);await m.resume(program.debugSymbols.entry);
 assert.deepEqual(await m.memory(0x801,0x801+program.bytes.length-3),Buffer.from(program.bytes.slice(2)),'KERNAL/drive loaded exact player bytes');
 if(format==='d64'){assert.equal(await resource(m,'Drive8TrueEmulation'),1);assert.equal(await resource(m,'VirtualDevice8'),0);assert.equal(await resource(m,'Drive8Type'),1542)}
 m.spriteTail=await m.memory(0x7e8,0x7ff);m.colorTail=(await m.memory(0xdbe8,0xdbff,3)).map(v=>v&15);
 const before={registers:await registers(m),scratch:await m.memory(0xfb,0xfe),sp:(await m.registers()).get('SP')};
 // SYS's return address is already on the real machine stack.
 const ret=await m.memory(0x100+before.sp+1,0x100+before.sp+2);before.returnAddress=ret.readUInt16LE()+1;
 return before;
}
async function stopAndReturn(m,p,before){
 await m.checkpoint(p.debugSymbols.exit);
 // Inject the KERNAL's RUN/STOP scan result, leaving STOP/CHROUT ROM routines intact.
 // Physical keyboard/CIA scanning remains a separate hardware interaction check.
 await m.write(0x91,Buffer.from([0x7f]));await m.resume(p.debugSymbols.exit);
 await m.checkpoint(before.returnAddress);await m.resume(before.returnAddress);
 assert.deepEqual(await registers(m),before.registers,'Display registers restored');
 assert.deepEqual(await m.memory(0xfb,0xfe),before.scratch,'Scratch bytes restored');
 assert.equal((await m.registers()).get('SP'),before.sp+2,'SYS stack balanced');
 await m.checkpoint(0xffcf);await m.resume(0xffcf); // BASIC waits for keyboard input.
 const screen=await m.memory(0x400,0x7e7);
 assert.ok(screen.includes(Buffer.from([18,5,1,4,25,46])),'BASIC printed READY.');
}
async function pixels(m,cells,inks,charset,columns,rows,background){
 const {body}=await m.command(0x84,Buffer.from([1,0]));
 const width=body.readUInt16LE(4),height=body.readUInt16LE(6),x=body.readUInt16LE(8),y=body.readUInt16LE(10);
 assert.equal(body[16],8);const buffer=body.subarray(21);// VICE 3.7 truncates four trailing border bytes in this response.
 assert.ok([width*height,width*height-4].includes(buffer.length),'Expected display buffer length');
 // VICE 3.7's inner-screen Y metadata is one raster line later than its buffer.
 // Locate the origin in the adjacent border lines, then require every artwork pixel.
 const matches=(ox,oy)=>{for(let py=0;py<rows*8;py++)for(let px=0;px<columns*8;px++){
  const i=(py>>3)*columns+(px>>3),code=cells[i]===''?32:cells[i];
  const bits=rom[charset*2048+code*8+(py&7)],expected=bits&(128>>(px&7))?inks[i]:background;
  if(buffer[(oy+py)*width+ox+px]!==expected)return false;
 }return true};
 assert.ok([y-1,y,y+1].some(oy=>matches(x,oy)),'VIC-II pixels match character ROM and per-cell colors');
}

for(const model of ['c64','ntsc'])for(const charset of [0,1]){
 test(`${model}, bank ${charset}: still ${charset?'D64':'PRG'}, all 256 glyphs, real VIC-II pixels and BASIC return`,{timeout:60000},async t=>{
  const {monitor:m,dir}=await launch(t,model),frame={cells:Array.from({length:256},(_,i)=>i),inks:Array.from({length:256},(_,i)=>i%15+(i%15>=6?1:0)),durationMs:500};
  const p=createC64Program({columns:16,rows:16,charset,background:6,ink:14,frames:[frame],repetitions:1});
  const before=await load(m,dir,p,charset?'d64':'prg');
  await m.checkpoint(p.debugSymbols.hold);await m.resume(p.debugSymbols.hold);
  await picture(m,frame,16,16,14);assert.equal(await io(m,0xd018),charset?0x17:0x15);
  await pixels(m,frame.cells,frame.inks,charset,16,16,6);
  await stopAndReturn(m,p,before);
 });
 test(`${model}, bank ${charset}: D64 composite ${charset?'continuous':'two loops and hold'}, IRQ timing and STOP`,{timeout:60000},async t=>{
  const {monitor:m,dir}=await launch(t,model);
  const ramp=[2,8,7,13,3,14,6,4],frames=Array.from({length:8},(_,f)=>({
   cells:Array.from({length:8},(_,i)=>i%4===(4-f%4)%4?(i<4?0:160):''),
   inks:Array.from({length:8},(_,i)=>ramp[(i+f)%8]),durationMs:125}));
  const p=createC64Program({columns:4,rows:2,charset,background:6,ink:14,frames,repetitions:charset?0:2});
  const before=await load(m,dir,p,'d64');
  await m.write(0xa0,Buffer.from([0,0,245]));let first;
  for(let i=0;i<(charset?24:16);i++){
   await m.checkpoint(p.debugSymbols.frameReady);await m.resume(p.debugSymbols.frameReady);
   await picture(m,frames[i%8],4,2,14);const now=await tick(m);first??=now;
   assert.ok(Math.abs(now-first-Math.round(i*7.5))<=1,`Frame ${i} clock timing: ${now-first}`);
  }
  if(!charset){await m.checkpoint(p.debugSymbols.hold);await m.resume(p.debugSymbols.hold);assert.ok(Math.abs((await tick(m))-first-120)<=1);await picture(m,frames[7],4,2,14)}
  await stopAndReturn(m,p,before);

 });
}
