const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
async function drag(page,a,b,cancel=false){await page.locator('#canvas').evaluate((c,{a,b,cancel})=>{const r=c.getBoundingClientRect(),fire=(type,p)=>c.dispatchEvent(new PointerEvent(type,{pointerId:42,pointerType:'pen',isPrimary:true,bubbles:true,cancelable:true,clientX:r.left+(p[0]+.5)*r.width/4,clientY:r.top+(p[1]+.5)*r.height/4}));fire('pointerdown',a);fire('pointermove',b);fire(cancel?'pointercancel':'pointerup',b)},{a,b,cancel})}
async function saved(page){return JSON.parse(await download(page,'#saveProject'))}
async function armFill(page,mode='both'){await page.locator('#tool-fill').click();await page.locator('#fillMenu .tool-mode-option[data-mode="'+mode+'"]').click()}
async function armPicker(page,mode='ink'){await page.locator('#tool-picker').click();await page.locator('#pickerMenu .tool-mode-option[data-mode="'+mode+'"]').click()}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project(Array(16).fill(''),4,4,{selectedGlyph:160}));});
test('line and rectangle preview without changing project; cancel and undo are atomic',async({page})=>{
 await ui(page,'#tool-line');await drag(page,[0,0],[3,3],true);expect((await saved(page)).grid).toEqual(Array(16).fill(''));
 await drag(page,[0,0],[3,3]);expect((await saved(page)).grid).toEqual(Array.from({length:16},(_,i)=>i%5===0?160:''));await ui(page,'#undo');expect((await saved(page)).grid).toEqual(Array(16).fill(''));
 await ui(page,'#tool-rectangle');await drag(page,[0,0],[3,3]);expect((await saved(page)).grid.filter(g=>g===160)).toHaveLength(12);await ui(page,'#undo');expect((await saved(page)).grid).toEqual(Array(16).fill(''));
});
test('fill respects glyph/color boundaries and is one undo step',async({page})=>{
 const grid=[160,160,'','',160,160,'','',...Array(8).fill('')];await loadProject(page,project(grid,4,4,{selectedGlyph:257,cellColors:[2,3,...Array(14).fill(2)]}));await armFill(page,'both');await drag(page,[0,0],[0,0]);const p=await saved(page);expect(p.grid.slice(0,6)).toEqual([257,160,'','',257,257]);await ui(page,'#undo');expect((await saved(page)).grid).toEqual(grid);
});
test('fill glyph-only and ink-only modes respect connectivity',async({page})=>{
 const grid=[160,160,'','',...Array(12).fill('')];const inks=[2,3,2,2,...Array(12).fill(2)];
 await loadProject(page,project(grid,4,4,{selectedGlyph:257,cellColors:inks,colors:{ink:14,background:6}}));
 await armFill(page,'glyph');await drag(page,[0,0],[0,0]);
 let p=await saved(page);expect(p.grid.slice(0,2)).toEqual([257,160]);expect(p.cellColors.slice(0,2)).toEqual([2,3]);
 await ui(page,'#undo');
 await armFill(page,'ink');await drag(page,[2,0],[2,0]);
 p=await saved(page);expect(p.cellColors[2]).toBe(14);expect(p.grid[2]).toBe('');
});
test('canvas picker copies ink, glyph, and background from cells',async({page})=>{
 const inks=Array(16).fill(6);inks[0]=5;inks[1]=3;
 await loadProject(page,project([160,'',...Array(14).fill('')],4,4,{cellColors:inks,colors:{ink:14,background:6}}));
 await armPicker(page,'ink');await drag(page,[0,0],[0,0]);
 let p=await saved(page);expect(p.colors.ink).toBe(5);
 await armPicker(page,'glyph');await drag(page,[0,0],[0,0]);p=await saved(page);expect(p.selectedGlyph).toBe(160);
 await armPicker(page,'background');await drag(page,[1,0],[1,0]);
 p=await saved(page);expect(p.colors.background).toBe(3);
});
test('selection moves overlapping cells and duplicates',async({page})=>{
 await loadProject(page,project([1,257,...Array(14).fill('')],4,4,{cellColors:[2,3,...Array(14).fill(14)]}));await ui(page,'#tool-select');await drag(page,[0,0],[1,0]);await drag(page,[0,0],[1,1]);let p=await saved(page);expect(p.grid.slice(0,7)).toEqual(['','','','','',1,257]);expect(p.cellColors.slice(5,7)).toEqual([2,3]);
 await ui(page,'#duplicateSelection');await drag(page,[1,2],[1,2]);p=await saved(page);expect(p.grid.slice(9,11)).toEqual([1,257]);expect(p.grid.slice(5,7)).toEqual([1,257]);

});
test('unfinished previews stay out of files; Escape cancels and selection delete is undoable',async({page})=>{
 await ui(page,'#tool-rectangle');await page.locator('#canvas').evaluate(c=>{const r=c.getBoundingClientRect();for(const [type,x] of [['pointerdown',.1],['pointermove',.9]])c.dispatchEvent(new PointerEvent(type,{pointerId:42,pointerType:'pen',isPrimary:true,bubbles:true,cancelable:true,clientX:r.left+r.width*x,clientY:r.top+r.height*x}))});
 expect((await saved(page)).grid).toEqual(Array(16).fill(''));await page.keyboard.press('Escape');await drag(page,[0,0],[3,3]);const original=(await saved(page)).grid;
 await ui(page,'#tool-select');await drag(page,[0,0],[3,3]);await ui(page,'#deleteSelection');expect((await saved(page)).grid).toEqual(Array(16).fill(''));await ui(page,'#undo');expect((await saved(page)).grid).toEqual(original);
 await ui(page,'#quickPlay');await expect(page.locator('#fillMenu')).toHaveAttribute('inert','');await expect(page.locator('#pickerMenu')).toHaveAttribute('inert','');
 for(const tool of ['#tool-line','#tool-rectangle','#tool-select'])await expect(page.locator(tool)).toBeDisabled();
});
test('palette shows one selected tool and restores saved eraser state',async({page})=>{
 await ui(page,'#tool-line');await expect(page.locator('#tool-line')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#paint')).toHaveAttribute('aria-pressed','false');
 await ui(page,'#erase');await saved(page);await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#erase')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#paint')).toHaveAttribute('aria-pressed','false');
});

test('rectangle and selection corner taps only enter two-tap mode when explicitly enabled',async({page})=>{
 const canvas=page.locator('#canvas');
 const tap=async(x,y)=>canvas.evaluate((c,p)=>{
  const r=c.getBoundingClientRect(),cx=r.left+(p.x+.5)*r.width/4,cy=r.top+(p.y+.5)*r.height/4;
  for(const type of ['pointerdown','pointerup'])c.dispatchEvent(new PointerEvent(type,{pointerId:83,pointerType:'touch',isPrimary:true,bubbles:true,cancelable:true,clientX:cx,clientY:cy}));
 },{x,y});
 const blank=Array(16).fill('');
 await expect(page.locator('#tapPoints')).not.toBeChecked();
 await ui(page,'#tool-rectangle');
 await tap(0,0);
 await expect(page.locator('#tapPoints')).not.toBeChecked();
 await tap(3,3);
 // Two independent taps must not create a rectangle or leave a pending corner.
 expect((await saved(page)).grid.filter(g=>g===160).length).toBeLessThan(12);
 await loadProject(page,project(blank,4,4,{selectedGlyph:160}));
 await ui(page,'#tool-select');
 await tap(0,0);
 await expect(page.locator('#selectionInfo')).toHaveText('1 × 1 selected');
 await tap(3,3);
 await expect(page.locator('#tapPoints')).not.toBeChecked();
 // Two independent taps select the most recently tapped cell, not the entire diagonal.
 await expect(page.locator('#selectionInfo')).toHaveText('1 × 1 selected');
 await loadProject(page,project(blank,4,4,{selectedGlyph:160}));
 await ui(page,'#tool-rectangle');
 await expect(page.locator('#tapPoints')).toBeVisible();
 await ui(page,'#tapPoints','check');
 await tap(0,0);await tap(3,3);
 expect((await saved(page)).grid.filter(g=>g===160)).toHaveLength(12);
 await ui(page,'#undo');
 expect((await saved(page)).grid).toEqual(blank);
 await ui(page,'#tool-select');
 await tap(0,0);await tap(3,3);
 await expect(page.locator('#selectionInfo')).toHaveText('4 × 4 selected');
 await page.keyboard.press('Escape');
 await ui(page,'#tapPoints','uncheck');
 await tap(0,0);await tap(3,3);
 await expect(page.locator('#tapPoints')).not.toBeChecked();
});
