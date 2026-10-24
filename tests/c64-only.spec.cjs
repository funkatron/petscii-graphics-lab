const {ui,test,expect,download,loadProject,project}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('palette and drawing tools expose only authentic C64 artwork',async({page})=>{
 await expect(page.locator('#paletteMode, #glyphPage')).toHaveCount(0);await expect(page.locator('#showAlphanumerics')).not.toBeChecked();await expect(page.locator('#checkStencil')).toHaveCount(0);await expect(page.locator('#loadRom')).toHaveCount(0);
 await loadProject(page,project([0,128,160,''],2,2,{charset:1,selectedGlyph:0}));const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.selectedGlyph).toBe(256);expect(saved.grid).toEqual([256,384,416,'']);expect((await download(page,'#text')).toString()).toBe('# PETSCII-GLYPHS 1 2 2\n100 180\n1A0 --');await expect(page.locator('#output')).toHaveValue('# PETSCII-GLYPHS 1 2 2\n100 180\n1A0 --');
});
test('removed project formats, string glyphs and replay events fail without changing artwork or history',async({page})=>{
 await loadProject(page,project([160],1,1,{selectedGlyph:0}));const before=JSON.parse(await download(page,'#saveProject'));
 const bad=[{...before,version:1},{...before,grid:['█']},{...before,selectedGlyph:'█'},{...before,glyphSource:'custom'},{...before,drawingReplay:{base:['█'],events:[[0,160]]}},{...before,drawingReplay:{base:[''],events:[[0,'█'],[0,160]]}},{...before,animation:{...before.animation,effect:'color-wave'}}];
 for(const p of bad){await loadProject(page,p);await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(Array(256).fill(''));await expect(page.locator('#undo')).toBeDisabled();
});
test('unlabeled and mixed Unicode text imports fail atomically; numeric text remains undoable',async({page})=>{
 await loadProject(page,project([0,160],2,1));const before=JSON.parse(await download(page,'#saveProject'));
 for(const text of ['█▀','# PETSCII-GLYPHS 1 2 1\n000 █','00 A0']){await ui(page,'#output','fill',text);await ui(page,'#import');await expect(page.locator('#status')).toContainText('Import failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}
 await ui(page,'#output','fill','# PETSCII-GLYPHS 1 2 1\n180 --');await ui(page,'#import');expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual([384,'']);await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});
