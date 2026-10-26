const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('color text preserves both banks, code zero, empty-cell inks and background through import and undo',async({page})=>{
 const original=project([0,511,'',160],2,2,{cellColors:[0,15,7,2],colors:{ink:9,background:0}});
 await loadProject(page,original);await ui(page,'#textColors','check');
 const text=(await download(page,'#text')).toString();expect(text).toBe('# PETSCII-GLYPHS 2 2 2 0\n000:0 1FF:F\n--:7 0A0:2');
 await loadProject(page,project([66],1,1,{colors:{ink:3,background:6},cellColors:[8]}));
 const before=JSON.parse(await download(page,'#saveProject'));
 await ui(page,'#output','fill',text+'\r\n');await ui(page,'#import');
 const after=JSON.parse(await download(page,'#saveProject'));
 expect(after.grid).toEqual(original.grid);expect(after.cellColors).toEqual(original.cellColors);expect(after.colors).toEqual({ink:3,background:0});expect(after.columns).toBe(2);expect(after.rows).toBe(2);
 await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await ui(page,'#redo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(after);
});
test('malformed color text is rejected atomically and glyph-only imports retain brush inks',async({page})=>{
 await loadProject(page,project([160],1,1,{colors:{ink:3,background:6},cellColors:[8]}));const before=JSON.parse(await download(page,'#saveProject'));
 for(const text of ['# PETSCII-GLYPHS 2 1 1\n000:0','# PETSCII-GLYPHS 1 1 1 F\n000','# PETSCII-GLYPHS 2 1 1 10\n000:0','# PETSCII-GLYPHS 2 1 1 0\n200:F','# PETSCII-GLYPHS 2 1 1 0\n000:10','# PETSCII-GLYPHS 2 1 1 0\n--','# PETSCII-GLYPHS 2 2 1 0\n000:F','# PETSCII-GLYPHS 2 41 1 0\n000:F']){
  await ui(page,'#output','fill',text);await ui(page,'#import');await expect(page.locator('#status')).toContainText('Import failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 }
 await ui(page,'#output','fill','# PETSCII-GLYPHS 1 2 1\n000 --');await ui(page,'#import');const after=JSON.parse(await download(page,'#saveProject'));expect(after.grid).toEqual([0,'']);expect(after.cellColors).toEqual([3,3]);expect(after.colors).toEqual(before.colors);
 await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});
