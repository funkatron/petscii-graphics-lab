#!/usr/bin/env node
// Pure change-scope selector. No GitHub API access or side effects.
const path = require('node:path');
function select(files, {full=false, motionOnly=false}={}) {
  if (full) return {mode:'full', specs:[]};
  if (motionOnly) return {mode:'focused', specs:['tests/sine-scroll.spec.cjs','tests/diagonal-scroll.spec.cjs','tests/demoscene.spec.cjs','tests/wavelength.spec.cjs','tests/solid-motion.spec.cjs','tests/space-warp.spec.cjs','tests/depth-exports.spec.cjs']};
  if (!files.length || files.every(file => file.startsWith('docs/') || file.endsWith('.md')))
    return {mode:'none',specs:[]};
  const set = new Set();
  const changed = pattern => files.some(file => pattern.test(file));
  // Shared UI, dependencies and test infrastructure require a smoke test.
  if (changed(/^(index\.html|assets\/|vendor\/|package(-lock)?\.json$|playwright\.config\.cjs$|\.github\/|tests\/helpers\.cjs$)/))
    set.add('tests/layout.spec.cjs');
  // Capture reviewable iPad/desktop screenshots whenever the editor UI changes.
  if (changed(/^(index\\.html|assets\\/)/))
    set.add('tests/6581-theme-screenshots.spec.cjs');
  // Extracted shared modules affect multiple workflows, not just layout.
  if (changed(/^project-validation\.js$/)) {
    set.add('tests/c64-only.spec.cjs');
    set.add('tests/animation-controls.spec.cjs');
  }
  if (changed(/^animation-frames\.js$/)) {
    set.add('tests/animation.spec.cjs');
    set.add('tests/intro-motion.spec.cjs');
    set.add('tests/depth-exports.spec.cjs');
  }
  if (changed(/^pointer-stroke\.js$/)) set.add('tests/layout.spec.cjs');
  if (changed(/^(typed-text|text-grid|glyph-families|c64-colors)\.js$/))
    set.add('tests/c64-only.spec.cjs');
  if (changed(/^bonfire\.js$/)) set.add('tests/bonfire.spec.cjs');
  if (changed(/^(solid-motion\.js|depth-)/)) set.add('tests/solid-motion.spec.cjs');
  if (changed(/^space-warp\.js$/)) set.add('tests/space-warp.spec.cjs');
  // Run directly modified browser tests as well.
  for (const file of files) {
    if (/^tests\/[a-zA-Z0-9._-]+\.spec\.cjs$/.test(file)) set.add(file);
  }
  // Unknown source changes get a smoke check instead of silently passing.
  if (!set.size) set.add('tests/layout.spec.cjs');
  return {mode:'focused',specs:[...set]};
}
module.exports = {select};
if (require.main === module) {
  const fs = require('node:fs');
  const files = fs.readFileSync(0,'utf8').split('\n').filter(Boolean);
  const result = select(files,{full:process.env.FULL_REQUEST==='true',motionOnly:process.env.MOTION_ONLY==='true'});
  const out = process.env.GITHUB_OUTPUT;
  if (!out) throw new Error('GITHUB_OUTPUT is required');
  fs.appendFileSync(out,`mode=${result.mode}\nspecs=${result.specs.join(' ')}\n`);
}
