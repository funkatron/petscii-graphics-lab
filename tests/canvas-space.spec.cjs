const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
for(const [width,height] of [[810,1080],[1080,810],[1440,900],[568,320]])test(`canvas reclaims idle selection space at ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 // A tall drawing is height-limited, so reclaimed height must reach the artwork.
 await loadProject(page,project(Array(16).fill(160),2,8));const before=await download(page,'#saveProject');await page.locator('#downloadClose').click();
 const dock=page.locator('.selection-dock'),canvas=page.locator('#canvas');
 for(const tool of ['#paint','#erase','#tool-fill','#tool-text']){await ui(page,tool);await expect(dock).toBeHidden()}
 await ui(page,'#paint');const idle=(await canvas.boundingBox()).height;const reserved=await page.addStyleTag({content:'.selection-dock{display:block!important}'});
 await expect.poll(async()=>(await canvas.boundingBox()).height).toBeLessThan(idle);
 const old=(await canvas.boundingBox()).height;await reserved.evaluate(e=>e.remove());
 await expect.poll(async()=>(await canvas.boundingBox()).height).toBeGreaterThan(old);
 await info.attach('idle-canvas',{body:await page.screenshot(),contentType:'image/png'});
 for(const tool of ['#tool-line','#tool-rectangle','#tool-select']){await ui(page,tool);await expect(dock).toBeVisible()}
 const initial=await canvas.boundingBox();await canvas.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(page.locator('#deselect')).toBeVisible();expect(await canvas.boundingBox()).toEqual(initial);
 const actions=await page.locator('.selection-actions').boundingBox();expect(actions.y).toBeGreaterThanOrEqual(initial.y+initial.height);
 await info.attach('selection-actions',{body:await page.screenshot(),contentType:'image/png'});
 await ui(page,'#deselect');await ui(page,'#paint');await expect(dock).toBeHidden();expect(await download(page,'#saveProject')).toEqual(before);
});
