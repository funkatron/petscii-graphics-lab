#!/usr/bin/env node
/**
 * Download the editor's own exports for a list of projects (used by editor_parity.py).
 *
 * Usage: node smoke/editor-parity.mjs cases.json out-dir
 * cases.json: [{name, project, cellAspect, outputs: ["png","svg","gif","prg"]}]
 * Needs the pre-installed Playwright (require('playwright')) and Chromium. Serves the repo itself.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from '../pgl-shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [casesPath, outDir] = process.argv.slice(2);
const cases = JSON.parse(readFileSync(casesPath, 'utf8'));
mkdirSync(outDir, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  try {
    const file = statSync(path).isDirectory() ? join(path, 'index.html') : path;
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

/** Open the Download sheet on the control's tab, pick its format, and click it like the helpers do. */
async function download(page, selector, selects = {}) {
  await page.evaluate(({ selector, selects }) => {
    const dialog = document.getElementById('downloadDialog');
    if (!dialog.open) document.getElementById('downloadOpen').click();
    const target = document.querySelector(selector);
    const mode = target.closest('[data-export-mode]')?.dataset.exportMode;
    if (mode) document.querySelector(`[data-export-tab="${mode}"]`).click();
    for (let p = target.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    for (const [id, value] of Object.entries(selects)) {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { selector, selects });
  const [file] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.evaluate((sel) => document.querySelector(sel).click(), selector),
  ]);
  const chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const browser = await chromium.launch();
const results = [];
try {
  for (const item of cases) {
    const context = await browser.newContext({ acceptDownloads: true });
    const prefs = { machine: item.project.machine ?? 'c64', palette: item.project.palette ?? 'pepto', cellAspect: item.cellAspect ?? 'square', canvasZoom: 1, centerGuides: false };
    await context.addInitScript((p) => localStorage.setItem('petscii-workspace-prefs', JSON.stringify(p)), prefs);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    process.stderr.write(`editor: ${item.name}\n`);
    await page.goto(base);
    try {
      // Paint enables once glyphs load, before the rest of the editor wires its handlers.
      await page.waitForFunction(
        () => !document.getElementById('paint').disabled && typeof document.getElementById('projectFile').onchange === 'function',
        null,
        { timeout: 60000 },
      );
    } catch (error) {
      const status = await page.locator('#status').textContent().catch(() => '');
      throw Error(`${item.name}: editor did not become ready (status ${JSON.stringify(status)}; errors ${errors.join(' | ')})`);
    }
    // Same path as choosing a file: set the input's files, then fire `change`.
    await page.evaluate((text) => {
      const input = document.getElementById('projectFile');
      const transfer = new DataTransfer();
      transfer.items.add(new File([text], 'project.json', { type: 'application/json' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
    }, JSON.stringify(item.project));
    await page.waitForFunction(() => document.getElementById('projectFile').value === '');
    const loaded = await page.locator('#status').textContent();
    if (!loaded.startsWith('Project loaded')) throw Error(`${item.name}: editor rejected the MCP project: ${loaded}`);
    // A machine change can reload the glyph sheet; Paint re-enables when glyphs are ready.
    await page.waitForFunction(() => !document.getElementById('paint').disabled, null, { timeout: 60000 });
    const statusAfter = await page.locator('#status').textContent();
    const written = {};
    for (const output of item.outputs) {
      let bytes;
      if (output === 'png') bytes = await download(page, '#png', { stillFormat: 'png', pngScale: '1', pngBg: 'canvas' });
      else if (output === 'svg') bytes = await download(page, '#svg', { stillFormat: 'svg', pngBg: 'canvas' });
      else if (output === 'gif') bytes = await download(page, '#exportGif', { animationFormat: 'gif' });
      else if (output === 'prg') bytes = await download(page, '#exportC64', { c64Mode: item.nativeMode ?? 'still', c64Format: 'prg' });
      const file = join(outDir, `${item.name}.${output}`);
      writeFileSync(file, bytes);
      written[output] = file;
    }
    results.push({ name: item.name, files: written, loaded, statusAfter });
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ ok: true, results }));
