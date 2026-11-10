import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProject} from '../project-validation.js';

const base={format:'petscii-stencil-lab',version:3,columns:2,rows:2,grid:[160,'',0,64],selectedGlyph:160,colors:{ink:14,background:6}};

test('accepts minimal v3 project',()=>{validateProject(base)});

test('rejects legacy charset field',()=>{
 assert.throws(()=>validateProject({...base,charset:1}),/character sets/);
});

test('rejects invalid animation effect',()=>{
 assert.throws(()=>validateProject({...base,animation:{effect:'color-wave',seconds:2,scale:2,background:'dark'}}),/animation settings/);
});
