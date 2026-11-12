import test from 'node:test';
import assert from 'node:assert/strict';
import selector from '../scripts/ci-select-tests.cjs';
const {select}=selector;
test('documentation-only changes skip browser and unit jobs',()=>{
  assert.deepEqual(select(['README.md','docs/roadmap.md']),{mode:'none',specs:[]});
});
test('UI changes run a smoke check without unrelated animation exports',()=>{
  assert.deepEqual(select(['index.html']),{mode:'focused',specs:['tests/layout.spec.cjs','tests/6581-theme-screenshots.spec.cjs']});
});
test('Bonfire and solid-motion changes select their respective tests',()=>{
  assert.deepEqual(select(['bonfire.js','solid-motion.js']),{mode:'focused',specs:['tests/bonfire.spec.cjs','tests/solid-motion.spec.cjs']});
});
test('test-only changes run modified browser tests',()=>{
  assert.deepEqual(select(['tests/colors.spec.cjs']),{mode:'focused',specs:['tests/colors.spec.cjs']});
});
test('unknown source and security workflow changes never bypass checks',()=>{
  assert.equal(select(['c64-export.js']).mode,'focused');
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
