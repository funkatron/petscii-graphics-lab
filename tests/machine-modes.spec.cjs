const {test,expect,ui,loadProject,download,project:baseProject}=require('./helpers.cjs');
const {PNG}=require('pngjs');
const AdmZip=require('adm-zip');

const fixture=(extra={})=>baseProject([160,''],2,1,{cellColors:[14,6],colors:{ink:14,background:6},selectedGlyph:160,...extra});

test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
});

test('VIC ink palette tiles sit flush without chrome borders or gaps',async({page})=>{
 const metrics=await page.locator('#colorPalette').evaluate(grid=>{
  const style=getComputedStyle(grid),button=getComputedStyle(grid.querySelector('button'));
  const boxes=[...grid.querySelectorAll('button')].slice(0,2).map(b=>b.getBoundingClientRect());
  return {
   gap:style.gap,columnGap:style.columnGap,rowGap:style.rowGap,
   border:button.borderTopWidth,radius:button.borderTopLeftRadius,
   shadow:button.boxShadow,minHeight:button.minHeight,
   abut:boxes.length===2?Math.abs(boxes[0].right-boxes[1].left)<0.5:false,
  };
 });
 expect(metrics.gap).toBe('0px');
 expect(metrics.columnGap).toBe('0px');
 expect(metrics.rowGap).toBe('0px');
 expect(metrics.border).toBe('0px');
 expect(metrics.radius).toBe('0px');
 expect(metrics.shadow).toBe('none');
 expect(metrics.minHeight).toBe('0px');
 expect(metrics.abut).toBe(true);
 await page.locator('#inkQuick').click();
 await expect(page.locator('#quickInkPalette')).toBeVisible();
 expect(await page.locator('#quickInkPalette').evaluate(g=>getComputedStyle(g).gap)).toBe('0px');
 await page.keyboard.press('Escape');
});

test('header machine control switches chrome and persists machine in JSON',async({page})=>{
 await expect(page.locator('#machineMenu')).toBeVisible();
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 await expect(page.locator('html')).toHaveAttribute('data-machine','plus4');
 await expect(page.locator('html')).toHaveAttribute('data-ui-theme','plus4');
 const chrome=await page.evaluate(()=>{
  const style=getComputedStyle(document.documentElement);
  return {
   caseBg:style.getPropertyValue('--ui-case-bg').trim(),
   textStatus:style.getPropertyValue('--text-status').trim(),
   legacyFg:style.getPropertyValue('--chrome-fg').trim()
  };
 });
 expect(chrome.caseBg).toBe('#2f2f2f');
 expect(chrome.textStatus).toBe('#f0f0f0');
 expect(chrome.legacyFg).toBe('');
 await expect(page.locator('#displayPaletteField')).toBeHidden();
 await expect(page.locator('#colorPalette')).toHaveClass(/ted-grid/);
 // Ensure sidebar is open so TED row geometry reflects the tools column width.
 if(await page.locator('#sidebar').evaluate(e=>e.classList.contains('closed')))await page.locator('#toggle').click();
 const tedMetrics=await page.locator('#colorPalette').evaluate(grid=>{
  const style=getComputedStyle(grid),btn=getComputedStyle(grid.querySelector('button'));
  const buttons=[...grid.querySelectorAll('button')];
  const black=buttons[0].getBoundingClientRect();
  // Tiles 2–9 are the first chroma row (White L0–L7); black sits alone above.
  const chromaRow=buttons.slice(1,9).map(b=>b.getBoundingClientRect());
  return {
   count:buttons.length,
   gap:style.gap,
   columns:style.gridTemplateColumns.split(' ').length,
   border:btn.borderTopWidth,
   blackBottom:Math.round(black.bottom),
   chromaRowTops:chromaRow.map(b=>Math.round(b.top)),
   sidebarWidth:document.querySelector('#sidebar').getBoundingClientRect().width,
  };
 });
 expect(tedMetrics.count).toBe(121);
 expect(tedMetrics.gap).toBe('0px');
 expect(tedMetrics.columns).toBe(8);
 expect(tedMetrics.border).toBe('0px');
 expect(new Set(tedMetrics.chromaRowTops).size).toBe(1);
 expect(tedMetrics.blackBottom).toBeLessThanOrEqual(tedMetrics.chromaRowTops[0]);
 // Desktop 300px; mid-width (iPad portrait) 280px; phone overlay up to 320px.
 expect(tedMetrics.sidebarWidth).toBeGreaterThanOrEqual(279);
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.machine).toBe('plus4');
 expect(saved.colors.background).toBeGreaterThan(15);
});

test('display palette remaps PNG RGB without changing cell indices',async({page})=>{
 await loadProject(page,fixture());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspacePalette','selectOption','rgb');
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.palette).toBe('rgb');
 expect(saved.cellColors).toEqual([14,6]);
 const png=PNG.sync.read(await download(page,'#png'));
 const at=(x,y)=>[...png.data.subarray((y*png.width+x)*4,(y*png.width+x)*4+3)];
 // RGB light blue is #8080ff — not Pepto #6c5eb5
 expect(at(4,4)).toEqual([128,128,255]);
});

test('undo restores VIC indices after leaving Plus/4',async({page})=>{
 const prompts=[];
 page.on('dialog',async dialog=>{prompts.push(dialog.message());await dialog.accept()});
 await loadProject(page,fixture());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 expect(prompts).toHaveLength(1);
 await expect(page.locator('html')).toHaveAttribute('data-machine','plus4');
 await ui(page,'#undo');
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.machine).toBe('c64');
 expect(saved.cellColors).toEqual([14,6]);
});

test('declining the VIC to TED confirmation leaves machine and inks unchanged',async({page})=>{
 const prompts=[];
 page.on('dialog',async dialog=>{prompts.push(dialog.message());await dialog.dismiss()});
 await loadProject(page,fixture());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 await expect(page.locator('html')).toHaveAttribute('data-machine','c64');
 await expect(page.locator('#workspaceMachine')).toHaveValue('c64');
 expect(prompts).toHaveLength(1);
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.machine).toBe('c64');
 expect(saved.cellColors).toEqual([14,6]);
});

test('machine maps to the interface theme and drives contextual animation colors',async({page})=>{
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','c128');
 await expect(page.locator('html')).toHaveAttribute('data-ui-theme','c128');
 await expect(page.locator('#machineSummary')).toHaveText('C128 · Pepto');
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 await expect(page.locator('html')).toHaveAttribute('data-ui-theme','plus4');
 await expect(page.locator('#machineSummary')).toHaveText('Plus/4 · TED');
 await expect(page.locator('#uiThemeMenu')).toHaveCount(0);
 const values=await page.locator('#animationColor option').evaluateAll(o=>o.map(e=>e.value));
 expect(values).toContain('plus4-cycle');
 expect(values).not.toContain('color-cycle');
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','c64');
 await expect(page.locator('html')).toHaveAttribute('data-ui-theme','c64c');
 const vic=await page.locator('#animationColor option').evaluateAll(o=>o.map(e=>e.value));
 expect(vic).toContain('color-cycle');
 expect(vic).not.toContain('plus4-cycle');
});

test('Plus/4 keeps native program, gates color RAM and color text; VIC controls return on C64',async({page})=>{
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 await expect(page.locator('#exportC64')).toBeEnabled();
 await expect(page.locator('#colorRam')).toBeDisabled();
 await expect(page.locator('#textColors')).toBeDisabled();
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','c64');
 await expect(page.locator('#exportC64')).toBeEnabled();
 await expect(page.locator('#colorRam')).toBeEnabled();
 await expect(page.locator('#textColors')).toBeEnabled();
});

test('header exposes System Project and Download groups; sidebar is editor settings',async({page})=>{
 await expect(page.locator('header .header-system')).toHaveAttribute('aria-label','System');
 await expect(page.locator('header .header-project')).toHaveAttribute('aria-label','Project');
 await expect(page.locator('header .header-actions')).toHaveAttribute('aria-label','Download and preview');
 await expect(page.locator('#sidebar')).toHaveAttribute('aria-label','Editor settings');
 await expect(page.locator('#machineMenu')).toBeVisible();
 await expect(page.locator('#projectMenu')).toBeVisible();
 await expect(page.locator('#downloadOpen')).toBeVisible();
 await expect(page.locator('#quickPlay')).toBeVisible();
 await expect(page.locator('#saveStatus .save-status-full')).toBeAttached();
 await expect(page.locator('#saveStatus .save-status-compact')).toBeAttached();
});

test('opening a project without machine keeps the current host',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','c128');
 await expect(page.locator('html')).toHaveAttribute('data-machine','c128');
 const legacy={format:'petscii-stencil-lab',version:3,columns:2,rows:1,grid:[160,''],cellColors:[13,11],colors:{ink:13,background:11},selectedGlyph:160};
 await loadProject(page,legacy);
 await expect(page.locator('html')).toHaveAttribute('data-machine','c128');
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.machine).toBe('c128');
});

test('New Project keeps the current machine in the saved file',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','c128');
 await page.locator('#projectMenu > summary').click();
 await ui(page,'#newProject');
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.machine).toBe('c128');
 expect(saved.columns).toBe(16);
});

test('preview banner opens Animation settings without new tabs',async({page})=>{
 await loadProject(page,fixture());
 await ui(page,'#animationDetails');
 await ui(page,'#animationEffect','selectOption','scroll');
 await ui(page,'#quickPlay');
 await expect(page.locator('#previewBanner')).toBeVisible();
 await page.locator('#editAnimationFromPreview').click();
 await expect(page.locator('#animationDetails')).toHaveJSProperty('open',true);
 await expect(page.locator('#sidebar')).not.toHaveClass(/closed/);
 await expect(page.locator('#animationEffect')).toBeFocused();
});

test('C128 80-col enables VDC width, RGBI drawing, and native download',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','c128-80');
 await expect(page.locator('html')).toHaveAttribute('data-machine','c128-80');
 await expect(page.locator('html')).toHaveAttribute('data-ui-theme','c128');
 await expect(page.locator('html')).toHaveAttribute('data-palette','vdc');
 await expect(page.locator('#displayPaletteField')).toBeHidden();
 await expect(page.locator('#machineSummary')).toHaveText('C128-80 · RGBI');
 // Reveal Canvas setup (closed details / possibly closed sidebar) before the preset.
 await ui(page,'#c64CanvasPreset');
 await expect(page.locator('#c64CanvasPreset')).toHaveText('VDC screen · 80 × 25');
 await expect(page.locator('#columns')).toHaveValue('80');
 await expect(page.locator('#rows')).toHaveValue('25');
 await ui(page,'#applyResize');
 await expect(page.locator('#dimensions')).toHaveText('80 × 25');
 await page.locator('#downloadOpen').click();
 await page.locator('#export-tab-data').click();
 await expect(page.locator('#exportC64')).toBeEnabled();
 await expect(page.locator('#exportC64')).toContainText('C128 80-col');
 await expect(page.locator('#colorRam')).toBeDisabled();
 await expect(page.locator('#textColors')).toBeEnabled();
});

test('Plus/4 animation exports stay TED-tagged and native Plus/4 program stays enabled',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await loadProject(page,fixture());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 const zip=new AdmZip(await download(page,'#exportFrames'));
 const timing=JSON.parse(zip.readAsText('timing.json'));
 expect(timing).toMatchObject({colorPalette:'ted-pal',machine:'plus4'});
 await expect(page.locator('#exportC64')).toBeEnabled();
 await expect(page.locator('#exportGif')).toBeEnabled();
});
