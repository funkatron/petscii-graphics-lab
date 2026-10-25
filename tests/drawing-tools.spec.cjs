const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
async function drag(page,a,b,cancel=false){await page.locator('#canvas').evaluate((c,{a,b,cancel})=>{const r=c.getBoundingClientRect(),fire=(type,p)=>c.dispatchEvent(new PointerEvent(type,{pointerId:42,pointerType:'pen',isPrimary:true,bubbles:true,cancelable:true,clientX:r.left+(p[0]+.5)*r.width/4,clientY:r.top+(p[1]+.5)*r.height/4}));fire('pointerdown',a);fire('pointermove',b);fire(cancel?'pointercancel':'pointerup',b)},{a,b,cancel})}
async function saved(page){return JSON.parse(await download(page,'#saveProject'))}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project(Array(16).fill(''),4,4,{selectedGlyph:160}));});
test('line and rectangle preview without changing project; cancel and undo are atomic',async({page})=>{
 await ui(page,'#tool-line');await drag(page,[0,0],[3,3],true);expect((await saved(page)).grid).toEqual(Array(16).fill(''));
 await drag(page,[0,0],[3,3]);expect((await saved(page)).grid).toEqual(Array.from({length:16},(_,i)=>i%5===0?160:''));await ui(page,'#undo');expect((await saved(page)).grid).toEqual(Array(16).fill(''));
 await ui(page,'#tool-rectangle');await drag(page,[0,0],[3,3]);expect((await saved(page)).grid.filter(g=>g===160)).toHaveLength(12);await ui(page,'#undo');expect((await saved(page)).grid).toEqual(Array(16).fill(''));
});
test('fill respects glyph/color boundaries and is one undo step',async({page})=>{
 const grid=[160,160,'','',160,160,'','',...Array(8).fill('')];await loadProject(page,project(grid,4,4,{selectedGlyph:257,cellColors:[2,3,...Array(14).fill(2)]}));await ui(page,'#tool-fill');await drag(page,[0,0],[0,0]);const p=await saved(page);expect(p.grid.slice(0,6)).toEqual([257,160,'','',257,257]);await ui(page,'#undo');expect((await saved(page)).grid).toEqual(grid);
});
test('selection moves overlapping cells and duplicates',async({page})=>{
 await loadProject(page,project([1,257,...Array(14).fill('')],4,4,{cellColors:[2,3,...Array(14).fill(14)]}));await ui(page,'#tool-select');await drag(page,[0,0],[1,0]);await drag(page,[0,0],[1,1]);let p=await saved(page);expect(p.grid.slice(0,7)).toEqual(['','','','','',1,257]);expect(p.cellColors.slice(5,7)).toEqual([2,3]);
 await ui(page,'#duplicateSelection');await drag(page,[1,2],[1,2]);p=await saved(page);expect(p.grid.slice(9,11)).toEqual([1,257]);expect(p.grid.slice(5,7)).toEqual([1,257]);

});
test('unfinished previews stay out of files; Escape cancels and selection delete is undoable',async({page})=>{
 await ui(page,'#tool-rectangle');await page.locator('#canvas').evaluate(c=>{const r=c.getBoundingClientRect();for(const [type,x] of [['pointerdown',.1],['pointermove',.9]])c.dispatchEvent(new PointerEvent(type,{pointerId:42,pointerType:'pen',isPrimary:true,bubbles:true,cancelable:true,clientX:r.left+r.width*x,clientY:r.top+r.height*x}))});
 expect((await saved(page)).grid).toEqual(Array(16).fill(''));await page.keyboard.press('Escape');await drag(page,[0,0],[3,3]);const original=(await saved(page)).grid;
 await ui(page,'#tool-select');await drag(page,[0,0],[3,3]);await ui(page,'#deleteSelection');expect((await saved(page)).grid).toEqual(Array(16).fill(''));await ui(page,'#undo');expect((await saved(page)).grid).toEqual(original);
 await ui(page,'#quickPlay');for(const tool of ['fill','line','rectangle','select'])await expect(page.locator('#tool-'+tool)).toBeDisabled();
});
test('palette shows one selected tool and restores saved eraser state',async({page})=>{
 await ui(page,'#tool-line');await expect(page.locator('#tool-line')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#paint')).toHaveAttribute('aria-pressed','false');
 await ui(page,'#erase');await saved(page);await page.reload();await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#erase')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#paint')).toHaveAttribute('aria-pressed','false');
});
