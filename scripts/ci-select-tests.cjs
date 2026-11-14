#!/usr/bin/env node
// Pure change-scope selector. No GitHub API access or side effects.
const path = require('node:path');
// Specs that decode MP4/WebM via tests/video-utils.cjs (ffprobe/ffmpeg).
const FFMPEG_SPECS = new Set([
  'tests/animation-controls.spec.cjs',
  'tests/cell-colors.spec.cjs',
  'tests/color-animation.spec.cjs',
  'tests/colors.spec.cjs',
  'tests/composite.spec.cjs',
  'tests/cycles.spec.cjs',
  'tests/demoscene.spec.cjs',
  'tests/depth-exports.spec.cjs',
  'tests/intro-motion.spec.cjs',
  'tests/plasma.spec.cjs',
  'tests/ripple.spec.cjs',
  'tests/unified.spec.cjs',
  'tests/video.spec.cjs',
  'tests/wavelength.spec.cjs',
]);
// Specs that execute native PRG/D64 with py65 (tests/c64-emulate.py).
const PY65_SPECS = new Set([
  'tests/c64.spec.cjs',
  'tests/c64-centering.spec.cjs',
  'tests/c64-decoder.spec.cjs',
  'tests/c64-native.spec.cjs',
  'tests/c64-packed.spec.cjs',
  'tests/c64-paired.spec.cjs',
  'tests/c64-shared.spec.cjs',
  'tests/d64.spec.cjs',
  'tests/unified.spec.cjs',
]);
function toolNeeds(result) {
  if (result.mode === 'full') return {ffmpeg: true, py65: true};
  if (result.mode === 'none') return {ffmpeg: false, py65: false};
  return {
    ffmpeg: result.specs.some(spec => FFMPEG_SPECS.has(spec)),
    py65: result.specs.some(spec => PY65_SPECS.has(spec)),
  };
}
function select(files, {full=false, motionOnly=false, light=false}={}) {
  if (full) return {mode:'full', specs:[]};
  if (motionOnly) return {mode:'focused', specs:['tests/sine-scroll.spec.cjs','tests/diagonal-scroll.spec.cjs','tests/demoscene.spec.cjs','tests/wavelength.spec.cjs','tests/solid-motion.spec.cjs','tests/space-warp.spec.cjs','tests/depth-exports.spec.cjs']};
  if (!files.length || files.every(file => file.startsWith('docs/') || file.endsWith('.md')))
    return {mode:'none',specs:[]};
  const set = new Set();
  const changed = pattern => files.some(file => pattern.test(file));
  // Shared UI, dependencies and test infrastructure require a smoke test.
  if (changed(/^(index\.html|styles\/|ui-themes\.js$|assets\/|vendor\/|package(-lock)?\.json$|playwright\.config\.cjs$|\.github\/|tests\/helpers\.cjs$)/))
    set.add('tests/layout.spec.cjs');
  // Capture reviewable iPad/desktop screenshots whenever the editor UI changes.
  if (changed(/^(index\.html|styles\/|ui-themes\.js$|assets\/)/))
    set.add('tests/6581-theme-screenshots.spec.cjs');
  // Extracted shared modules affect multiple workflows, not just layout.
  if (changed(/^project-validation\.js$/)) {
    set.add('tests/c64-only.spec.cjs');
    set.add('tests/animation-controls.spec.cjs');
    set.add('tests/machine-modes.spec.cjs');
  }
  if (changed(/^animation-frames\.js$/)) {
    set.add('tests/animation.spec.cjs');
    set.add('tests/intro-motion.spec.cjs');
    set.add('tests/depth-exports.spec.cjs');
  }
  // Machine modes drive chrome, palettes, Plus/4 inks and export gates from index.html.
  if (changed(/^(machine-modes|plus4-colors)\.js$/)) {
    set.add('tests/machine-modes.spec.cjs');
    set.add('tests/ui-theme.spec.cjs');
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
  let specs = [...set];
  // ci: light — drop native-emulation and video-decode suites for small UI/animation PRs.
  if (light) {
    const heavy = new Set([
      ...PY65_SPECS,
      ...FFMPEG_SPECS,
      'tests/intro-motion.spec.cjs',
      'tests/depth-exports.spec.cjs',
    ]);
    specs = specs.filter(spec => !heavy.has(spec));
    if (
      changed(/^(animation-frames|project-validation)\.js$/)
      || files.includes('tests/animation.spec.cjs')
    ) {
      if (!specs.includes('tests/animation.spec.cjs')) {
        specs.push('tests/animation.spec.cjs');
      }
    }
    if (!specs.length) {
      specs = ['tests/layout.spec.cjs'];
    }
  }
  return {mode:'focused',specs};
}
module.exports = {select, toolNeeds, FFMPEG_SPECS, PY65_SPECS};
if (require.main === module) {
  const fs = require('node:fs');
  const files = fs.readFileSync(0,'utf8').split('\n').filter(Boolean);
  const result = select(files,{
    full:process.env.FULL_REQUEST==='true',
    motionOnly:process.env.MOTION_ONLY==='true',
    light:process.env.LIGHT_REQUEST==='true',
  });
  const tools = toolNeeds(result);
  const out = process.env.GITHUB_OUTPUT;
  if (!out) throw new Error('GITHUB_OUTPUT is required');
  fs.appendFileSync(out,`mode=${result.mode}\nspecs=${result.specs.join(' ')}\nffmpeg=${tools.ffmpeg}\npy65=${tools.py65}\n`);
}
