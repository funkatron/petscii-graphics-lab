const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('compact iPad palette keeps recovery together and selection leaves canvas stationary',async({page})=>{
 for(const [width,height] of [[810,1080],[1080,810]]){await page.setViewportSize({width,height});const u=await page.locator('#undo').boundingBox(),r=await page.locator('#redo').boundingBox();expect(u.y).toBe(r.y);expect(await page.locator('#tool-stamp').count()).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)}
 await loadProject(page,project(Array(16).fill(160),4,4));await ui(page,'#tool-select');const before=await page.locator('#canvas').boundingBox();await page.locator('#tapPoints').check();await page.locator('#canvas').focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#deleteSelection')).toBeVisible();expect(await page.locator('#canvas').boundingBox()).toEqual(before);
});
test('help opens by keyboard, closes without painting, and returns focus',async({page})=>{
 const button=page.getByRole('button',{name:'Help about drawing tools'});await button.focus();await page.keyboard.press('Enter');await expect(page.locator('#contextHelp')).toBeVisible();await page.locator('#canvas').click();await expect(page.locator('#contextHelp')).toBeHidden();await expect(button).toBeFocused();expect(JSON.parse(await download(page,'#saveProject')).grid.every(g=>g==='')).toBe(true);
});
test('two endpoints draw one undoable line and keep Line selected after undo',async({page})=>{
 await loadProject(page,project(Array(16).fill(''),4,4,{selectedGlyph:160}));await ui(page,'#tool-line');await page.locator('#canvas').focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');let p=JSON.parse(await download(page,'#saveProject'));expect(p.grid.slice(0,4)).toEqual([160,160,160,'']);await ui(page,'#undo');await expect(page.locator('#tool-line')).toHaveAttribute('aria-pressed','true');expect(JSON.parse(await download(page,'#saveProject')).grid.every(g=>g==='')).toBe(true);
});
test('a secondary pointer cannot finish a pending two-tap shape',async({page})=>{
 await loadProject(page,project(Array(16).fill(''),4,4,{selectedGlyph:160}));await ui(page,'#tool-line');await page.locator('#canvas').focus();await page.keyboard.press('Enter');await page.locator('#canvas').evaluate(c=>{const r=c.getBoundingClientRect();for(const type of ['pointerdown','pointerup'])c.dispatchEvent(new PointerEvent(type,{pointerId:22,pointerType:'touch',isPrimary:false,bubbles:true,cancelable:true,clientX:r.right-4,clientY:r.bottom-4}))});expect(JSON.parse(await download(page,'#saveProject')).grid.every(g=>g==='')).toBe(true);await ui(page,'#cancelTool');
});
test('C64 preflight reports geometry before attempting a download',async({page})=>{
 await loadProject(page,project(Array(26).fill(160),1,26));await ui(page,'#c64Mode','selectOption','still');await expect(page.locator('#c64Readiness')).toContainText('Needs adjustment');await expect(page.locator('#c64Readiness')).toContainText('40 × 25');
 await loadProject(page,project([160]));await expect(page.locator('#c64Readiness')).toContainText('Ready');await expect(page.locator('#c64Readiness')).toContainText('program bytes');
});
test('shared C64 analysis exposes independent memory and speed blockers without relaxing export',async({page})=>{
 const result=await page.evaluate(async()=>{const {createC64Program}=await import('./c64-export.js');const input={columns:40,rows:24,background:6,ink:14,frames:Array.from({length:24},(_,f)=>({cells:Array.from({length:960},(_,i)=>(i+f)%256),inks:Array.from({length:960},(_,i)=>(i+f)%16),durationMs:20}))};const d=createC64Program({...input,analyze:true}).diagnostics;let rejected=false;try{createC64Program(input)}catch{rejected=true}const small={columns:1,rows:1,background:6,ink:14,frames:[{cells:[160],inks:[14],durationMs:1000}]};return {d,rejected,unchanged:JSON.stringify([...createC64Program(small).bytes])===JSON.stringify([...createC64Program({...small,analyze:true}).bytes])}});
 expect(result.d.programBytes).toBeGreaterThan(result.d.memoryLimit);expect(result.d.worstUpdateRatio).toBeGreaterThan(1);expect(result.rejected).toBe(true);expect(result.unchanged).toBe(true);
});
