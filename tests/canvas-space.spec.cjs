const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
for(const [width,height] of [[568,320]])test(`canvas reclaims idle selection space at ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 // A tall drawing is height-limited, so reclaimed height must reach the artwork.
 await loadProject(page,project(Array(16).fill(160),2,8));const before=await download(page,'#saveProject');
 const dock=page.locator('.selection-dock'),canvas=page.locator('#canvas');
 for(const tool of ['#paint','#erase','#tool-fill','#tool-text']){await ui(page,tool);await expect(dock).toBeHidden()}
 await ui(page,'#paint');
 // Measure the actual drawing region. Canvas pixels are fitted asynchronously by
 // ResizeObserver and can briefly reflect a previous frame during layout changes.
 const frame=page.locator('.canvas-frame');
 const idleHeight=(await frame.boundingBox()).height;
 await expect(dock).toHaveCSS('display','none');
 const reserved=await page.addStyleTag({content:'.selection-dock{display:block!important}'});
 // WebKit can already hold the frame at its minimum height here, so compare with <=, not <.
 await expect.poll(async()=>(await frame.boundingBox()).height).toBeLessThanOrEqual(idleHeight);
 const reservedHeight=(await frame.boundingBox()).height;
 await reserved.evaluate(e=>e.remove());
 await expect.poll(async()=>(await frame.boundingBox()).height).toBeGreaterThanOrEqual(reservedHeight);
 // Verify the resized canvas remains contained rather than asserting a stale
 // intermediate backing size while a resize callback is pending.
 await expect.poll(async()=>{
  const box=await canvas.boundingBox(),region=await frame.boundingBox();
  return box.x>=region.x && box.y>=region.y && box.x+box.width<=region.x+region.width+1 && box.y+box.height<=region.y+region.height+1;
 }).toBe(true);
 await info.attach('idle-canvas',{body:await page.screenshot(),contentType:'image/png'});
 for(const tool of ['#tool-line','#tool-rectangle','#tool-select']){await ui(page,tool);await expect(dock).toBeVisible()}
 const initial=await canvas.boundingBox();await canvas.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(page.locator('#deselect')).toBeVisible();expect(await canvas.boundingBox()).toEqual(initial);
 const actions=await page.locator('.selection-actions').boundingBox();expect(actions.y).toBeGreaterThanOrEqual(initial.y+initial.height);
 await info.attach('selection-actions',{body:await page.screenshot(),contentType:'image/png'});
 await ui(page,'#deselect');await ui(page,'#paint');await expect(dock).toBeHidden();expect(await download(page,'#saveProject')).toEqual(before);
});

// Tablet and desktop: the hint and selection actions share one fixed footer row, so
// switching tools, selecting, previewing and status messages never move the canvas
// or the stage view controls (Raskin review H1).
for(const [width,height] of [[810,1080],[1080,810],[1180,820],[820,1180],[1440,900]])test(`stage layout stays fixed across tools, selection, status and preview at ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project(Array(16).fill(160),2,8));const before=await download(page,'#saveProject');
 const canvas=page.locator('#canvas'),zoom=page.locator('#editorZoom'),sym=page.locator('#symmetrySummary');
 await ui(page,'#paint');
 const geometry=async()=>({canvas:await canvas.boundingBox(),zoom:await zoom.boundingBox(),sym:await sym.boundingBox()});
 await expect.poll(async()=>JSON.stringify(await geometry())).toBe(JSON.stringify(await geometry()));
 const initial=await geometry();
 for(const tool of ['#erase','#tool-fill','#tool-text','#tool-line','#tool-rectangle','#tool-select','#paint']){await ui(page,tool);expect(await geometry()).toEqual(initial)}
 // Text entry sits in the footer row below the canvas and is usable there.
 await ui(page,'#tool-text');const entry=await page.locator('.text-entry').boundingBox();
 expect(entry.y).toBeGreaterThanOrEqual(initial.canvas.y+initial.canvas.height);expect(entry.height).toBeLessThanOrEqual(46);
 await expect(page.locator('#typedText')).toBeVisible();await expect(page.locator('#applyText')).toBeVisible();await expect(page.locator('#cancelText')).toBeVisible();
 await canvas.click({position:{x:5,y:5}});await page.locator('#typedText').fill('HI');expect(await geometry()).toEqual(initial);
 await ui(page,'#cancelText');await ui(page,'#paint');
 await ui(page,'#tool-select');await canvas.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(page.locator('#deselect')).toBeVisible();expect(await geometry()).toEqual(initial);
 const actions=await page.locator('.selection-actions').boundingBox();expect(actions.y).toBeGreaterThanOrEqual(initial.canvas.y+initial.canvas.height);
 await info.attach('selection-actions',{body:await page.screenshot(),contentType:'image/png'});
 await ui(page,'#deselect');await ui(page,'#paint');
 // Status messages of different lengths keep the centered view controls in place.
 await page.evaluate(()=>{document.getElementById('status').textContent='A much longer status message than the controls expect to share space with'});
 expect(await geometry()).toEqual(initial);
 // Preview overlays the stage bar instead of inserting a row above the canvas.
 await ui(page,'#quickPlay');await expect(page.locator('#previewBanner')).toBeVisible();
 expect(await canvas.boundingBox()).toEqual(initial.canvas);
 await expect(page.locator('#stageCanvasView')).toHaveJSProperty('inert',true);
 await info.attach('preview',{body:await page.screenshot(),contentType:'image/png'});
 await ui(page,'#returnDrawing');await expect(page.locator('#previewBanner')).toBeHidden();
 await expect(page.locator('#stageCanvasView')).toHaveJSProperty('inert',false);
 expect(await geometry()).toEqual(initial);
 expect(await download(page,'#saveProject')).toEqual(before);
});

test('download dialog keeps tabs and Close in place when switching tabs',async({page})=>{
 await page.setViewportSize({width:1180,height:820});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project([160,''],2,1));
 await ui(page,'#downloadOpen');await expect(page.locator('#downloadDialog')).toBeVisible();
 const boxes=async()=>({dialog:await page.locator('#downloadDialog').boundingBox(),tabs:await page.locator('#exportTabs').boundingBox(),close:await page.locator('#downloadClose').boundingBox()});
 const first=await boxes();
 for(const tab of ['#export-tab-motion','#export-tab-data','#export-tab-still']){await ui(page,tab);expect(await boxes()).toEqual(first)}
});
