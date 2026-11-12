const {test,expect,ui,loadProject,download,project:baseProject}=require('./helpers.cjs');
const {PNG}=require('pngjs');

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
 await loadProject(page,fixture());
 await page.locator('#machineMenu > summary').click();
 await ui(page,'#workspaceMachine','selectOption','plus4');
 await ui(page,'#undo');
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.machine).toBe('c64');
 expect(saved.cellColors).toEqual([14,6]);
});
