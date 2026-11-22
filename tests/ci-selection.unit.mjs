import test from 'node:test';
import assert from 'node:assert/strict';
import selector from '../scripts/ci-select-tests.cjs';
const {select,toolNeeds}=selector;
test('documentation-only changes skip browser and unit jobs',()=>{
  assert.deepEqual(select(['README.md','docs/roadmap.md']),{mode:'none',specs:[]});
});
test('UI changes run a smoke check without unrelated animation exports',()=>{
  assert.deepEqual(select(['index.html']),{mode:'focused',specs:['tests/layout.spec.cjs','tests/6581-theme-screenshots.spec.cjs','tests/tool-mode-screenshots.spec.cjs']});
  assert.deepEqual(select(['styles/editor.css','ui-themes.js']),{mode:'focused',specs:['tests/layout.spec.cjs','tests/6581-theme-screenshots.spec.cjs','tests/tool-mode-screenshots.spec.cjs']});
});
test('Bonfire and solid-motion changes select their respective tests',()=>{
  assert.deepEqual(select(['bonfire.js','solid-motion.js']),{mode:'focused',specs:['tests/bonfire.spec.cjs','tests/solid-motion.spec.cjs']});
});
test('test-only changes run modified browser tests',()=>{
  assert.deepEqual(select(['tests/colors.spec.cjs']),{mode:'focused',specs:['tests/colors.spec.cjs']});
});
test('unknown source and security workflow changes never bypass checks',()=>{
  assert.ok(select(['c64-export.js']).specs.includes('tests/machine-modes.spec.cjs'));
  assert.ok(select(['plus4-export.js']).specs.includes('tests/machine-modes.spec.cjs'));
  assert.ok(select(['c128-vdc-export.js']).specs.includes('tests/machine-modes.spec.cjs'));
  assert.deepEqual(select(['.github/workflows/security.yml']),{mode:'focused',specs:['tests/layout.spec.cjs']});
});
test('full validation overrides all other selections',()=>{
  assert.deepEqual(select(['README.md'],{full:true}),{mode:'full',specs:[]});
});
test('legacy motion-only label remains supported',()=>{
  const specs = select(['README.md'],{motionOnly:true}).specs;
  assert.ok(specs.includes('tests/solid-motion.spec.cjs'));
  assert.ok(specs.includes('tests/sine-scroll.spec.cjs'));
  assert.ok(specs.includes('tests/diagonal-scroll.spec.cjs'));
});

test('extracted shared modules select affected browser workflows',()=>{
  const animation=select(['animation-frames.js']).specs;
  for(const spec of ['tests/animation.spec.cjs','tests/intro-motion.spec.cjs','tests/depth-exports.spec.cjs'])
    assert.ok(animation.includes(spec),spec);
  assert.ok(select(['project-validation.js']).specs.includes('tests/c64-only.spec.cjs'));
  assert.ok(select(['pointer-stroke.js']).specs.includes('tests/layout.spec.cjs'));
  for(const module of ['typed-text.js','text-grid.js','glyph-families.js','c64-colors.js'])
    assert.ok(select([module]).specs.includes('tests/c64-only.spec.cjs'),module);
});

test('machine-mode modules select machine and theme browser workflows',()=>{
  for(const module of ['machine-modes.js','plus4-colors.js']){
    const specs=select([module]).specs;
    assert.ok(specs.includes('tests/machine-modes.spec.cjs'),module);
    assert.ok(specs.includes('tests/ui-theme.spec.cjs'),module);
  }
  assert.ok(select(['project-validation.js']).specs.includes('tests/machine-modes.spec.cjs'));
});

test('tool installs follow selected video and native specs',()=>{
  assert.deepEqual(toolNeeds(select(['README.md'])),{ffmpeg:false,py65:false});
  assert.deepEqual(toolNeeds(select(['index.html'])),{ffmpeg:false,py65:false});
  assert.equal(toolNeeds(select(['project-validation.js'])).ffmpeg,true);
  assert.equal(toolNeeds(select(['project-validation.js'])).py65,false);
  assert.equal(toolNeeds(select(['tests/video.spec.cjs'])).ffmpeg,true);
  assert.equal(toolNeeds(select(['tests/d64.spec.cjs'])).py65,true);
  assert.equal(toolNeeds(select(['tests/c64.spec.cjs'])).py65,true);
  assert.equal(toolNeeds(select(['tests/c64-procedural-playback.spec.cjs'])).py65,true);
  assert.equal(toolNeeds(select(['tests/unified.spec.cjs'])).py65,true);
  assert.ok(select(['c64-procedural-codegen.js']).specs.includes('tests/c64-procedural-playback.spec.cjs'));
  assert.deepEqual(toolNeeds(select(['README.md'],{full:true})),{ffmpeg:true,py65:true});
  assert.equal(toolNeeds(select(['README.md'],{motionOnly:true})).ffmpeg,true);
});

test('ci: light drops native and video suites but keeps animation coverage',()=>{
  const files=[
    'project-validation.js',
    'animation-frames.js',
    'index.html',
    'tests/animation.spec.cjs',
    'tests/c64.spec.cjs',
    'tests/unified.spec.cjs',
    'tests/cell-colors.spec.cjs',
  ];
  const light=select(files,{light:true});
  assert.equal(light.mode,'focused');
  assert.ok(light.specs.includes('tests/animation.spec.cjs'));
  assert.ok(light.specs.includes('tests/layout.spec.cjs'));
  assert.ok(!light.specs.includes('tests/c64.spec.cjs'));
  assert.ok(!light.specs.includes('tests/unified.spec.cjs'));
  assert.ok(!light.specs.includes('tests/animation-controls.spec.cjs'));
  assert.ok(!light.specs.includes('tests/cell-colors.spec.cjs'));
  assert.deepEqual(toolNeeds(light),{ffmpeg:false,py65:false});
});

test('MCP-only changes run the MCP job without browser checks',()=>{
  const {mcpNeeded}=selector;
  const files=['agents/petscii-preview/src/drawing.py','agents/petscii-preview/tests/test_drawing.py'];
  assert.deepEqual(select(files),{mode:'none',specs:[]});
  assert.equal(mcpNeeded(files),true);
  assert.equal(mcpNeeded(['agents/petscii-preview/README.md']),false);
  assert.equal(mcpNeeded(['project-validation.js']),true);
  assert.equal(mcpNeeded(['assets/ted-glyphs.svg']),true);
  assert.equal(mcpNeeded(['tests/colors.spec.cjs']),false);
  assert.equal(mcpNeeded(['README.md'],{full:true}),true);
});
