#!/usr/bin/env node
/**
 * Compat wrapper: maps old CLI to export_animation.mjs.
 * Usage:
 *   node export_color_animation.mjs <colorEffect> [out.json] [--project=path.json] [--motion=rotating-cube]
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const effect = args.find((a) => !a.startsWith('--') && !a.endsWith('.json')) || 'plus4-cycle';
const outArg = args.find((a) => a.endsWith('.json') && !a.startsWith('--'));
const projectArg = args.find((a) => a.startsWith('--project='));
const motionArg = args.find((a) => a.startsWith('--motion='));
const projectPath = projectArg
  ? projectArg.slice('--project='.length)
  : join(here, 'examples', 'golden-fuzzy-raven.json');
const motionEffect = motionArg ? motionArg.slice('--motion='.length) : 'rotating-cube';
const outPath = outArg || join(here, 'out', 'examples', `${effect}.frames.json`);

const settings = JSON.stringify({
  colorEffect: effect,
  motionEffect,
});

const result = spawnSync(
  process.execPath,
  [
    join(here, 'export_animation.mjs'),
    `--project=${projectPath}`,
    `--out=${outPath}`,
    `--settings=${settings}`,
  ],
  { encoding: 'utf8' },
);

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}
process.exit(result.status ?? 1);
