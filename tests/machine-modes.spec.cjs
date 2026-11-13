const {test,expect,ui,loadProject,download,project:baseProject}=require('./helpers.cjs');
const {PNG}=require('pngjs');
const AdmZip=require('adm-zip');

const fixture=(extra={})=>baseProject([160,''],2,1,{cellColors:[14,6],colors:{ink:14,background:6},selectedGlyph:160,...extra});

test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
});

test('header machine control switches chrome and persists machine in JSON',async({page})=>{
 await expect(page.locator('#machineMenu')).toBeVisible();
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 await expect(page.locator('html')).toHaveAttribute('data-machine','plus4');
 const fg=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--chrome-fg').trim());
 expect(fg).toBe('#101010');
 await expect(page.locator('#displayPaletteField')).toBeHidden();
 await expect(page.locator('#colorPalette')).toHaveClass(/ted-grid/);
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

test('Plus/4 gates C64 program, color RAM and color text; export controls return to C64 normally',async({page})=>{
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 await expect(page.locator('#exportC64')).toBeDisabled();
 await expect(page.locator('#colorRam')).toBeDisabled();
 await expect(page.locator('#textColors')).toBeDisabled();
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','c64');
 await expect(page.locator('#exportC64')).toBeEnabled();
 await expect(page.locator('#colorRam')).toBeEnabled();
 await expect(page.locator('#textColors')).toBeEnabled();
});

test('Plus/4 animation exports stay TED-tagged and native C64 export stays disabled afterwards',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await loadProject(page,fixture());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 const zip=new AdmZip(await download(page,'#exportFrames'));
 const timing=JSON.parse(zip.readAsText('timing.json'));
 expect(timing).toMatchObject({colorPalette:'ted-pal',machine:'plus4'});
 await expect(page.locator('#exportC64')).toBeDisabled();
 await expect(page.locator('#exportGif')).toBeEnabled();
});
