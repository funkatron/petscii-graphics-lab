#!/usr/bin/env node
/** Export surprise carpet PNG under each editor machine mode (true lab palettes). */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const renderDir = resolve(fileURLToPath(new URL('..', import.meta.url)), 'out/gallery/renders');
const outDir = resolve(
  fileURLToPath(new URL('..', import.meta.url)),
  'out/gallery/renders/machine-modes',
);

const MACHINES = [
  { id: 'c64', label: 'C64 · Pepto VIC' },
  { id: 'c128', label: 'C128 40-col · VIC' },
  { id: 'plus4', label: 'Plus/4 · TED' },
  { id: 'c128-80', label: 'C128 80-col · VDC' },
];

const PALETTES = [
  { id: 'pepto', machines: ['c64', 'c128', 'c128-80'] },
  { id: 'colodore', machines: ['c64', 'c128'] },
  { id: 'rgb', machines: ['c64', 'c128'] },
];

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    const route = new URL(req.url ?? '/', 'http://localhost').pathname;
    const path = resolve(root, route === '/' ? 'index.html' : route.slice(1));
    if (!path.startsWith(root)) throw new Error('Invalid path');
    res.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
const baseUrl = `http://127.0.0.1:${server.address().port}/`;
async function loadProject(page, machineId) {
  const projectPath = resolve(renderDir, `surprise-carpet-${machineId}.json`);
  const projectJson = await readFile(projectPath, 'utf8');
  await page.locator('#projectFile').setInputFiles({
    name: `surprise-carpet-${machineId}.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(projectJson),
  });
  await page.locator('.app[data-ready=true]').waitFor();
  await page.waitForFunction(
    (m) => document.documentElement.dataset.machine === m,
    machineId,
  );
}

async function closeDownloadDialog(page) {
  await page.evaluate(() => {
    const d = document.getElementById('downloadDialog');
    if (d?.open) d.close();
  });
  await page.locator('#downloadDialog').waitFor({ state: 'hidden' }).catch(() => {});
}


async function setPalette(page, palette) {
  const field = page.locator('#displayPaletteField');
  if (!(await field.isVisible())) return;
  await page.locator('#workspacePalette').selectOption(palette);
}

async function downloadPng(page) {
  if (!(await page.locator('#downloadDialog').evaluate((e) => e.open))) {
    await page.locator('#downloadOpen').click();
    await page.locator('#downloadDialog').waitFor({ state: 'visible' });
  }
  await page.locator('#stillFormat').selectOption('png');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#png').click(),
  ]);
  const path = await download.path();
  assert(path);
  const bytes = await readFile(path);
  await closeDownloadDialog(page);
  return bytes;
}

await mkdir(outDir, { recursive: true });
const manifest = [];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.goto(baseUrl);
  await page.locator('.app[data-ready=true]').waitFor();
  for (const machine of MACHINES) {
    const palettes =
      machine.id === 'plus4' ? [{ id: 'ted', machines: [] }] : PALETTES.filter((p) => p.machines.includes(machine.id));
    for (const pal of palettes) {
      await loadProject(page, machine.id);
      if (pal.id !== 'ted') await setPalette(page, pal.id);
      const bytes = await downloadPng(page);
      const file = `surprise-${machine.id}-${pal.id}.png`;
      await writeFile(resolve(outDir, file), bytes);
      manifest.push({
        machine: machine.id,
        palette: pal.id,
        label: `${machine.label}${pal.id !== 'ted' ? ' · ' + pal.id : ''}`,
        file,
      });
      console.log('wrote', file);
    }
  }
} finally {
  await browser.close();
  server.close();
}

const galleryManifest = resolve(outDir, '../machine-modes-manifest.json');
await writeFile(galleryManifest, JSON.stringify({ ok: true, renders: manifest }, null, 2));
console.log('manifest', manifest.length);