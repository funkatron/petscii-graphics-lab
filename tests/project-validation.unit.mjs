import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProject,normalizeAnimation,ANIMATION_CYCLES} from '../project-validation.js';

const base={format:'petscii-stencil-lab',version:3,columns:2,rows:2,grid:[160,'',0,64],selectedGlyph:160,colors:{ink:14,background:6}};

test('accepts minimal v3 project',()=>{validateProject(base)});

test('rejects legacy charset field',()=>{
 assert.throws(()=>validateProject({...base,charset:1}),/character sets/);
});

test('rejects invalid animation effect',()=>{
 assert.throws(()=>validateProject({...base,animation:{effect:'color-wave',seconds:2,scale:2,background:'dark'}}),/animation settings/);
});

test('animation cycle rates use the shared allowlist',()=>{
 const anim={effect:'replay',colorEffect:'none',seconds:2,scale:2,background:'dark'};
 assert.deepEqual(ANIMATION_CYCLES,[1,2,3,4,5,6,8,10,12,14,16]);
 for(const cycles of [3,10,14])assert.doesNotThrow(()=>validateProject({...base,animation:{...anim,motionCycles:cycles,colorCycles:cycles}}));
 for(const cycles of [7,17])assert.throws(()=>validateProject({...base,animation:{...anim,motionCycles:cycles}}),/animation settings/);
});

test('accepts animation scale up to 8 px/cell',()=>{
 assert.doesNotThrow(()=>validateProject({...base,animation:{effect:'replay',seconds:2,scale:8,background:'dark'}}));
 assert.throws(()=>validateProject({...base,animation:{effect:'replay',seconds:2,scale:16,background:'dark'}}),/animation settings/);
});

test('accepts inverse as a color effect and migrates legacy motion inverse',()=>{
 assert.doesNotThrow(()=>validateProject({...base,animation:{effect:'none',colorEffect:'inverse',seconds:1,scale:1,background:'dark'}}));
 assert.doesNotThrow(()=>validateProject({...base,animation:{effect:'inverse',seconds:1,scale:1,background:'dark'}}));
 assert.deepEqual(
  normalizeAnimation({effect:'inverse',motionCycles:4,colorEffect:'none',seconds:1,scale:1,background:'dark'}),
  {effect:'none',colorEffect:'inverse',motionCycles:1,colorCycles:4,seconds:1,scale:1,background:'dark'},
 );
 assert.deepEqual(
  normalizeAnimation({effect:'inverse',colorEffect:'color-glow',seconds:1,scale:1,background:'dark'}),
  {effect:'none',colorEffect:'color-glow',seconds:1,scale:1,background:'dark'},
 );
});

test('missing machine validates inks against fallbackMachine',()=>{
 const tedInks={
  ...base,
  cellColors:[0,80,0,80],
  colors:{ink:0,background:80},
 };
 assert.throws(()=>validateProject(tedInks),/colors|cell/);
 assert.doesNotThrow(()=>validateProject(tedInks,{fallbackMachine:'plus4'}));
 assert.doesNotThrow(()=>validateProject(base));
});
