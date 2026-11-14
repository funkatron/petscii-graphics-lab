import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {createC64Program,createC128Program,createC128AdaptiveProgram,createD64Disk} from '../c64-export.js';

function emulate(bytes,options={}){
 const runners=[process.env.PETSCII_PY,'/tmp/petscii-test-venv/bin/python','python3'].filter(Boolean);
 let r;
 for(const py of runners){
  r=spawnSync(py,['tests/c64-emulate.py'],{input:JSON.stringify({prg:[...bytes],...options}),encoding:'utf8',maxBuffer:8e6});
  if(r.status===0||!(r.stderr||'').includes('No module named'))break;
 }
 assert.equal(r.status,0,r.stderr);
 return JSON.parse(r.stdout);
}

test('C128 native still loads at $1C01 and paints centered VIC cells',()=>{
 const frame={cells:[160,''],inks:[1,6],durationMs:1000/60};
 const result=createC128Program({columns:2,rows:1,background:11,ink:13,frames:[frame],repetitions:1});
 assert.equal(result.bytes[0]+(result.bytes[1]<<8),0x1c01);
 assert.equal(String.fromCharCode(...result.bytes.slice(7,11)),'7181');
 assert.equal(result.debugSymbols.entry,0x1c0d);
 assert.equal(result.diagnostics.machine,'c128');
 const shot=emulate(result.bytes,{stopAfterTicks:8}).snapshots[0];
 assert.deepEqual(shot.screen.slice(499,501),[160,32]);
 assert.deepEqual(shot.colors.slice(499,501),[1,6]);
 assert.equal(shot.registers[5],11);
 assert.equal(shot.registers[6],11);
 assert.equal(createD64Disk(result.bytes,'PICTURE').length,174848);
});

test('C128 adaptive still matches createC128Program for a one-frame ROM still',()=>{
 const input={columns:2,rows:1,background:11,ink:13,frames:[{cells:[160,''],inks:[1,6],durationMs:1000}],repetitions:1};
 const a=createC128Program(input),b=createC128AdaptiveProgram(input);
 assert.deepEqual([...a.bytes],[...b.bytes]);
});

test('C64 default stub and load address stay unchanged',()=>{
 const result=createC64Program({columns:2,rows:1,background:6,ink:14,frames:[{cells:[160,''],inks:[1,6],durationMs:1000}],repetitions:1});
 assert.equal(result.bytes[0]+(result.bytes[1]<<8),0x0801);
 assert.equal(String.fromCharCode(...result.bytes.slice(7,11)),'2061');
 assert.equal(result.diagnostics.machine,'c64');
 assert.deepEqual([...result.bytes.slice(0,14)],[1,8,0x0b,0x08,10,0,0x9e,50,48,54,49,0,0,0]);
});
