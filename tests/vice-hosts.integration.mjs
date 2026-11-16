// Optional Plus/4 and C128 80-col smoke. ROMs and VICE stay outside this repo.
import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {access,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {ViceMonitor,freePort} from './vice-monitor.mjs';
import {tedIndex,tedToAttr} from '../plus4-colors.js';
import {atlasIdToVdcCell,vdcAttr} from '../vdc-colors.js';

const {createPlus4Program}=await import(new URL('../plus4-export.js',import.meta.url));
const {createC128VdcProgram}=await import(new URL('../c128-vdc-export.js',import.meta.url));
const {animationCells}=await import(new URL('../animation-frames.js',import.meta.url));
const {prepareNativeBackdropFrames}=await import(new URL('../native-backdrop-export.js',import.meta.url));

const executable=process.env.VICE_EXECUTABLE;
const data=process.env.VICE_DATA_DIR;
assert.ok(executable&&data,'Set VICE_EXECUTABLE and VICE_DATA_DIR; see docs/vice-validation.md');

// 2 KB TED chargen inside kernal 318005-05 at $D000. Same image as the glyph atlas.
const PLUS4_CHARGEN_SHA256='978c07ee0c9c30ad7fa2193e64e4196da8d10d614554132741f0033d1a0872a8';
// Published MAME identity of the 8 KB C128 character ROM 390059-01.
const C128_CHARGEN_SHA1='29ed066d513f2d5c09ff26d9166ba23c2afb2b3f';
const READY=Buffer.from([18,5,1,4,25,46]);

function emulator(name,override){
 if(override)return override;
 return join(dirname(executable),name);
}
const plus4Executable=emulator('xplus4',process.env.PLUS4_EXECUTABLE);
const c128Executable=emulator('x128',process.env.C128_EXECUTABLE);
await access(plus4Executable).catch(()=>{throw Error('Missing '+plus4Executable+'. See docs/vice-validation.md')});
await access(c128Executable).catch(()=>{throw Error('Missing '+c128Executable+'. See docs/vice-validation.md')});

async function rom(relative){
 const path=join(data,relative);
 try{
  return await readFile(path);
 }catch(error){
  throw Error('Missing '+path+' ('+error.code+'). See docs/vice-validation.md');
 }
}
function sha(bytes,algorithm){
 return createHash(algorithm).update(bytes).digest('hex');
}

const plus4Kernal=await rom('PLUS4/kernal-318005-05.bin');
const plus4Chargen=plus4Kernal.subarray(0x1000,0x1800);
assert.equal(plus4Chargen.length,2048,'Plus/4 kernal must contain the 2 KB chargen at offset 0x1000');
assert.equal(sha(plus4Chargen,'sha256'),PLUS4_CHARGEN_SHA256,'Plus/4 TED chargen');
await rom('PLUS4/basic-318006-01.bin');
await rom('PLUS4/3plus1-317053-01.bin');
await rom('PLUS4/3plus1-317054-01.bin');

const c128Chargen=await rom('C128/chargen-390059-01.bin');
assert.equal(sha(c128Chargen,'sha1'),C128_CHARGEN_SHA1,'C128 character ROM 390059-01');
await rom('C128/kernal-318020-05.bin');
await rom('C128/basiclo-318018-04.bin');
await rom('C128/basichi-318019-04.bin');
await rom('C128/kernal64-901227-03.bin');
await rom('C128/basic64-901226-01.bin');

function launch(t,bin,args){
 return (async()=>{
  const dir=await mkdtemp(join(tmpdir(),'petscii-vice-host-'));
  const port=await freePort();
  const child=spawn(bin,[
   '-console','-default','-directory',resolve(data),
   '+sound','-warp','-binarymonitor','-binarymonitoraddress','127.0.0.1:'+port,
   '-autostartprgmode','1',...args,
  ]);
  let log='';
  child.on('error',error=>{log+=error.message});
  child.stdout.on('data',chunk=>{log+=chunk});
  child.stderr.on('data',chunk=>{log+=chunk});
  let monitor;
  t.after(async()=>{
   monitor?.close();
   child.kill('SIGKILL');
   await rm(dir,{recursive:true,force:true});
  });
  try{
   monitor=await ViceMonitor.connect(port,child);
  }catch(error){
   throw Error(error.message+'\n'+log);
  }
  return {monitor,dir};
 })();
}

async function memspace(monitor,fragment){
 const banks=await monitor.banks();
 for(const [name,id] of banks){
  if(name.toLowerCase().includes(fragment))return id;
 }
 const names=[...banks.keys()].join(', ');
 throw Error('No VICE memspace containing "'+fragment+'". Available: '+names);
}

async function kernalMemory(monitor,start,end){
 const direct=await monitor.memory(start,end);
 if(direct[0]===0x6c||direct[0]===0xa5)return direct;
 const banks=await monitor.banks();
 for(const [name,id] of banks){
  const lowered=name.toLowerCase();
  if(!lowered.includes('cpu')&&!lowered.includes('rom'))continue;
  const bytes=await monitor.memory(start,end,id);
  if(bytes[0]===0x6c||bytes[0]===0xa5)return bytes;
 }
 return direct;
}

// $FFE1 jumps through the STOP vector. The routine must be LDA zp / CMP #$7F.
// Published C16 and C128 maps call that flag STKEY at $91. This is not a keypress.
async function injectStop(monitor){
 const gate=await kernalMemory(monitor,0xffe1,0xffe3);
 assert.equal(gate[0],0x6c,'$FFE1 should be JMP (STOP vector)');
 const vector=gate[1]+(gate[2]<<8);
 const pointer=await monitor.memory(vector,vector+1);
 const routine=pointer[0]+(pointer[1]<<8);
 const code=await kernalMemory(monitor,routine,routine+3);
 const listed=[...code].map(byte=>byte.toString(16).padStart(2,'0')).join(' ');
 assert.equal(code[0],0xa5,'STOP routine at $'+routine.toString(16)+' is not LDA zp: '+listed);
 assert.equal(code[2],0xc9,'STOP routine at $'+routine.toString(16)+' is not CMP: '+listed);
 assert.equal(code[3],0x7f,'STOP routine compares with a value other than $7F: '+listed);
 assert.equal(code[1],0x91,'STOP flag is not STKEY at $91 (saw $'+code[1].toString(16)+')');
 await monitor.write(0x91,Buffer.from([0x7f]));
}

async function loadProgram(monitor,dir,program){
 const path=join(dir,'picture.prg');
 await writeFile(path,program.bytes);
 const origin=program.bytes[0]+(program.bytes[1]<<8);
 await monitor.checkpoint(program.debugSymbols.entry);
 await monitor.autostart(path);
 await monitor.resume(program.debugSymbols.entry);
 const loaded=await monitor.memory(origin,origin+program.bytes.length-3);
 assert.deepEqual(loaded,Buffer.from(program.bytes.slice(2)),'Autostart loaded the PRG bytes');
 const sp=(await monitor.registers()).get('SP');
 const ret=await monitor.memory(0x100+sp+1,0x100+sp+2);
 return ret.readUInt16LE()+1;
}

function tedPicture(cells,inks,background,ink){
 const columns=2;
 const rows=1;
 const screen=Buffer.alloc(1000,32);
 const attrs=Buffer.alloc(1000,tedToAttr(ink));
 const origin=Math.floor((25-rows)/2)*40+Math.floor((40-columns)/2);
 for(let index=0;index<cells.length;index++){
  const slot=origin+index;
  const cell=cells[index];
  screen[slot]=cell===''?32:cell&255;
  attrs[slot]=tedToAttr(inks[index]);
 }
 return {screen,attrs,border:tedToAttr(background)};
}

function vdcPicture(cells,inks,backgroundInk){
 const columns=2;
 const rows=1;
 const blank=vdcAttr(backgroundInk,0);
 const screen=Buffer.alloc(2000,32);
 const attrs=Buffer.alloc(2000,blank);
 const origin=Math.floor((25-rows)/2)*80+Math.floor((80-columns)/2);
 for(let index=0;index<cells.length;index++){
  const slot=origin+index;
  const cell=cells[index];
  if(cell===''){
   screen[slot]=32;
   attrs[slot]=blank;
  }else{
   const mapped=atlasIdToVdcCell(cell);
   screen[slot]=mapped.screen;
   attrs[slot]=vdcAttr(inks[index],mapped.attrHi);
  }
 }
 return {screen,attrs};
}

async function returnToBasic(monitor,program,returnAddress){
 await monitor.checkpoint(program.debugSymbols.exit);
 await injectStop(monitor);
 await monitor.resume(program.debugSymbols.exit);
 await monitor.checkpoint(returnAddress);
 await monitor.resume(returnAddress);
 await monitor.checkpoint(0xffcf);
 await monitor.resume(0xffcf);
}

test('Plus/4: backdrop PRG paints block 160 in empty cells with TED matte attrs.',{timeout:60000},async t=>{
 const {monitor,dir}=await launch(t,plus4Executable,[
  '-kernal',join(data,'PLUS4/kernal-318005-05.bin'),
  '-basic',join(data,'PLUS4/basic-318006-01.bin'),
  '-functionlo',join(data,'PLUS4/3plus1-317053-01.bin'),
  '-functionhi',join(data,'PLUS4/3plus1-317054-01.bin'),
 ]);
 const background=tedIndex(1,4);
 const source={
  machine:'plus4',
  W:2,
  H:1,
  grid:['',''],
  inks:[0,0],
  colors:{ink:tedIndex(2,4),background},
  effect:'none',
  colorEffect:'none',
  backgroundEffect:'plus4-field',
  fieldRamp:'cycle',
  seconds:1,
 };
 const frame=animationCells(0,source);
 const [prepared]=prepareNativeBackdropFrames([{...frame,durationMs:1000}]);
 const program=createPlus4Program({
  columns:2,rows:1,background,ink:0,
  frames:[prepared],
  repetitions:1,
 });
 const expected=tedPicture(prepared.cells,prepared.inks,background,0);
 const returnAddress=await loadProgram(monitor,dir,program);
 await monitor.checkpoint(program.debugSymbols.frameReady);
 await monitor.resume(program.debugSymbols.frameReady);
 assert.deepEqual(await monitor.memory(0x0c00,0x0fe7),expected.screen,'TED screen');
 assert.deepEqual(await monitor.memory(0x0800,0x0be7),expected.attrs,'TED attributes');
 assert.equal((await monitor.memory(0xff19,0xff19))[0]&0x7f,expected.border,'TED border $FF19');
 await returnToBasic(monitor,program,returnAddress);
});

test('Plus/4: still PRG paints TED screen, attributes, and border, then BASIC prints READY.',{timeout:60000},async t=>{
 const {monitor,dir}=await launch(t,plus4Executable,[
  '-kernal',join(data,'PLUS4/kernal-318005-05.bin'),
  '-basic',join(data,'PLUS4/basic-318006-01.bin'),
  '-functionlo',join(data,'PLUS4/3plus1-317053-01.bin'),
  '-functionhi',join(data,'PLUS4/3plus1-317054-01.bin'),
 ]);
 const background=tedIndex(1,4);
 const cells=[160,''];
 const inks=[80,0];
 const program=createPlus4Program({
  columns:2,rows:1,background,ink:0,
  frames:[{cells,inks,durationMs:1000}],
  repetitions:1,
 });
 const expected=tedPicture(cells,inks,background,0);
 const returnAddress=await loadProgram(monitor,dir,program);
 await monitor.checkpoint(program.debugSymbols.frameReady);
 await monitor.resume(program.debugSymbols.frameReady);
 assert.deepEqual(await monitor.memory(0x0c00,0x0fe7),expected.screen,'TED screen');
 assert.deepEqual(await monitor.memory(0x0800,0x0be7),expected.attrs,'TED attributes');
 assert.equal((await monitor.memory(0xff19,0xff19))[0]&0x7f,expected.border,'TED border $FF19');
 await returnToBasic(monitor,program,returnAddress);
 const screen=await monitor.memory(0x0c00,0x0fe7);
 assert.ok(screen.includes(READY),'BASIC printed READY. on the TED screen');
});

test('C128 80-col: still PRG paints VDC screen and attributes, stays in 80-col, then BASIC prints READY.',{timeout:60000},async t=>{
 const {monitor,dir}=await launch(t,c128Executable,[
  '-80col',
  '-kernal',join(data,'C128/kernal-318020-05.bin'),
  '-basiclo',join(data,'C128/basiclo-318018-04.bin'),
  '-basichi',join(data,'C128/basichi-318019-04.bin'),
  '-chargen',join(data,'C128/chargen-390059-01.bin'),
  '-kernal64',join(data,'C128/kernal64-901227-03.bin'),
  '-basic64',join(data,'C128/basic64-901226-01.bin'),
 ]);
 const cells=[1,''];
 const inks=[2,14];
 const program=createC128VdcProgram({
  columns:2,rows:1,background:6,ink:14,
  frames:[{cells,inks,durationMs:1000}],
  repetitions:1,
 });
 const expected=vdcPicture(cells,inks,14);
 const returnAddress=await loadProgram(monitor,dir,program);
 assert.ok((await monitor.memory(0xd7,0xd7))[0]&0x80,'Display is 80-column before the picture');
 const vdc=await memspace(monitor,'vdc');
 await monitor.checkpoint(program.debugSymbols.frameReady);
 await monitor.resume(program.debugSymbols.frameReady);
 assert.deepEqual(await monitor.memory(0x0000,0x07cf,vdc),expected.screen,'VDC screen');
 assert.deepEqual(await monitor.memory(0x0800,0x0fcf,vdc),expected.attrs,'VDC attributes');
 await returnToBasic(monitor,program,returnAddress);
 assert.ok((await monitor.memory(0xd7,0xd7))[0]&0x80,'Exit stays in 80-column mode');
 const screen=await monitor.memory(0x0000,0x07cf,vdc);
 assert.ok(screen.includes(READY),'BASIC printed READY. in VDC RAM');
});
