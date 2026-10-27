const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
const saved=async page=>JSON.parse(await download(page,'#saveProject'));
async function openText(page,text){
 await ui(page,'#openTextGrid');
 // The button opens the system file chooser; Playwright supplies its selected file.
 await page.locator('#textGridFile').setInputFiles({name:'drawing.txt',mimeType:'text/plain',buffer:Buffer.from(text)});
 await expect(page.locator('#textGridFile')).toHaveValue('');
}
test('Project opens downloaded color text with one-step Undo, Redo and autosave',async({page})=>{
 const art=project([0,511,'',160],2,2,{cellColors:[0,15,7,2],colors:{ink:9,background:0}});
 await loadProject(page,art);await ui(page,'#textColors','check');const text=(await download(page,'#text')).toString();
 await loadProject(page,project([66],1,1,{colors:{ink:3,background:6},cellColors:[8]}));const before=await saved(page);
 await page.locator('#projectMenu > summary').click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Open text grid',exact:true}).click();
 await (await chooser).setFiles({name:'drawing.txt',mimeType:'text/plain',buffer:Buffer.from(text.replace(/\n/g,'\r\n')+'\r\n')});
 await expect(page.locator('#status')).toHaveText('Imported text file');await expect(page.locator('#projectMenu')).not.toHaveAttribute('open');
 const after=await saved(page);expect(after.grid).toEqual(art.grid);expect(after.cellColors).toEqual(art.cellColors);expect(after.colors).toEqual({ink:3,background:0});expect(after.animation).toEqual(before.animation);expect(after.selectedGlyph).toBe(before.selectedGlyph);
 await ui(page,'#undo');expect(await saved(page)).toEqual(before);await ui(page,'#redo');expect(await saved(page)).toEqual(after);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('petscii-graphics-project-v3')))).toEqual(after);
 await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(await saved(page)).toEqual(after);
});
test('glyph-only file imports keep brush/background and can reopen the same file',async({page})=>{
 await loadProject(page,project([160],1,1,{colors:{ink:3,background:6},cellColors:[8]}));const before=await saved(page);
 const text='# PETSCII-GLYPHS 1 2 1\n000 --';
 for(let i=0;i<2;i++){
  await openText(page,text);const after=await saved(page);expect(after.grid).toEqual([0,'']);expect(after.cellColors).toEqual([3,3]);expect(after.colors).toEqual(before.colors);
  await ui(page,'#undo');expect(await saved(page)).toEqual(before);
 }
});
test('invalid, oversized and unreadable text files preserve drawing and redo history',async({page})=>{
 await loadProject(page,project([0],1,1));const before=await saved(page);
 await loadProject(page,project([511],1,1));const future=await saved(page);await ui(page,'#undo');
 for(const text of ['hello','# PETSCII-GLYPHS 2 2 1 0\n000:F 200:0',' '.repeat(65537)]){
  await openText(page,text);await expect(page.locator('#status')).toContainText('Import failed:');expect(await saved(page)).toEqual(before);await expect(page.locator('#redo')).toBeEnabled();
 }
 await page.evaluate(()=>{File.prototype.text=async()=>{throw Error('Could not read file')}});
 await openText(page,'# PETSCII-GLYPHS 1 1 1\n000');await expect(page.locator('#status')).toContainText('Could not read file');expect(await saved(page)).toEqual(before);
 await ui(page,'#redo');expect(await saved(page)).toEqual(future);
});
test('canceling file choice leaves preview and artwork intact',async({page})=>{
 await loadProject(page,project([0,160],2,1));const before=await saved(page);await ui(page,'#quickPlay');
 await openText(page,'invalid');await expect(page.locator('#canvas')).toHaveClass(/preview-locked/);
 // A canceled selection may deliver a change event with no file.
 await page.locator('#textGridFile').setInputFiles([]);await expect(page.locator('#canvas')).toHaveClass(/preview-locked/);expect(await saved(page)).toEqual(before);
});
