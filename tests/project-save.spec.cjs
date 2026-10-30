const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
test('project download is self-contained, repeatable and preserves full project data without Blob URLs',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project([160,257,'',0],2,2,{cellColors:[2,3,4,5],animation:{effect:'ripple',colorEffect:'plasma',seconds:2,scale:1,background:'dark'}}));
 await page.evaluate(()=>{URL.createObjectURL=()=>{throw Error('Blob downloads unavailable')};window.projectClicks=[];document.addEventListener('click',e=>{if(e.target.tagName==='A')window.projectClicks.push({href:e.target.href,target:e.target.target,rel:e.target.rel,name:e.target.download})},true)});
 const first=await download(page,'#saveProject'),saved=JSON.parse(first);expect(saved.grid).toEqual([160,257,'',0]);expect(saved.cellColors).toEqual([2,3,4,5]);expect(saved.animation.effect).toBe('ripple');expect(await download(page,'#saveProject')).toEqual(first);await expect(page.locator('.app[data-ready=true]')).toBeVisible();const clicks=await page.evaluate(()=>window.projectClicks);expect(clicks).toHaveLength(2);expect(clicks[0].href).toMatch(/^data:application\/octet-stream;base64,/);expect(clicks[0]).toMatchObject({target:'_blank',rel:'noopener'});expect(clicks[0].name).toMatch(/^[a-z]+-[a-z]+-[a-z]+\.json$/);expect(Buffer.from(clicks[0].href.split(',')[1],'base64')).toEqual(first);await loadProject(page,saved);expect(await download(page,'#saveProject')).toEqual(first);
});
test('file-sharing fallback captures current JSON and recovers from cancellation and errors',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{value:({files})=>files?.[0]?.name==='petscii-project.json',configurable:true});Object.defineProperty(navigator,'share',{value:async({files})=>{window.shared={text:await files[0].text(),name:files[0].name,type:files[0].type};if(window.shareError)throw new DOMException('test',window.shareError)},configurable:true})});
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project([160,257],2,1));const name=await page.locator('#projectFilename').inputValue(),original=await download(page,'#saveProject');await ui(page,'#shareProject');await expect(page.locator('#shareProject')).toBeEnabled();expect(await page.evaluate(()=>window.shared)).toEqual({text:original.toString(),name,type:'application/json'});
 for(const name of ['AbortError','NotAllowedError']){await page.evaluate(name=>window.shareError=name,name);await ui(page,'#shareProject');await expect(page.locator('#shareProject')).toBeEnabled();await expect(page.locator('#status')).toContainText(name==='AbortError'?'canceled':'sharing failed');expect(await download(page,'#saveProject')).toEqual(original)}
});
test('unsupported sharing is hidden and project downloads remain available',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true}));await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#saveProject');await expect(page.locator('#shareProject')).toBeHidden();
});

test('chosen filename is used by both save paths, with JSON extension and safe characters',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:async({files})=>{window.savedName=files[0].name},configurable:true})});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await ui(page,'#projectFilename','fill','  Evening waves  ');const waiting=page.waitForEvent('download');await ui(page,'#saveProject');const file=await waiting;expect(file.suggestedFilename()).toBe('Evening waves.json');await ui(page,'#shareProject');expect(await page.evaluate(()=>window.savedName)).toBe('Evening waves.json');await ui(page,'#projectFilename','fill','art/work.JSON');await ui(page,'#shareProject');expect(await page.evaluate(()=>window.savedName)).toBe('art_work.JSON');await ui(page,'#projectFilename','fill',' ');await ui(page,'#saveProject');await expect(page.locator('#status')).toContainText('Enter a project file name');await expect(page.locator('.app[data-ready=true]')).toBeVisible();
});

test('memorable default uses random words once per page and leaves user names alone',async({page})=>{
 await page.addInitScript(()=>{crypto.getRandomValues=values=>{values.fill(0);return values}});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await expect(page.locator('#projectFilename')).toHaveValue('amber-lunar-otter.json');await download(page,'#saveProject');await expect(page.locator('#projectFilename')).toHaveValue('amber-lunar-otter.json');await ui(page,'#projectFilename','fill','My evening art');await download(page,'#saveProject');await expect(page.locator('#projectFilename')).toHaveValue('My evening art');
});

test('invalid filename stays visible for correction and a corrected file reopens exactly',async({page})=>{
 await page.addInitScript(()=>{window.shareRequests=0;Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:async()=>{window.shareRequests++},configurable:true})});
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project([160,257,'',0],2,2,{cellColors:[2,3,4,5]}));
 const before=JSON.parse(await download(page,'#saveProject'));let requests=0;page.on('download',()=>requests++);
 for(const action of ['#saveProject','#shareProject'])for(const value of [' ','.','...']){
  await ui(page,'#projectFilename','fill',value);await ui(page,action);
  await expect(page.locator('#projectMenu')).toHaveAttribute('open','');
  await expect(page.locator('#projectFilename')).toBeFocused();
  await expect(page.locator('#projectFilename')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#projectFilename')).toHaveValue(value);
 }
 expect(requests).toBe(0);expect(await page.evaluate(()=>window.shareRequests)).toBe(0);
 await ui(page,'#projectFilename','fill','Corrected evening');
 await expect(page.locator('#projectFilename')).not.toHaveAttribute('aria-invalid','true');
 const saved=JSON.parse(await download(page,'#saveProject'));expect(saved).toEqual(before);
 await loadProject(page,project([0],1,1));await loadProject(page,saved);
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});

test('project menu groups save and open actions and fits enlarged text in both iPad layouts',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:async()=>{},configurable:true})});
 for(const [width,height] of [[810,1080],[1080,810]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
  await page.addStyleTag({content:'html{font-size:200%}'});await ui(page,'#projectFilename','fill','Evening artwork');
  await expect(page.locator('#projectSaveGroup')).toHaveAccessibleName('Save editable project');
  await expect(page.locator('#projectOpenGroup')).toHaveAccessibleName('Open artwork');
  for(const id of ['saveProject','shareProject'])await expect(page.locator('#projectSaveGroup #'+id)).toHaveCount(1);
  for(const id of ['loadProject','openTextGrid'])await expect(page.locator('#projectOpenGroup #'+id)).toHaveCount(1);
  const menu=page.locator('.project-menu');await expect(menu).toBeVisible();
  const box=await menu.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y+box.height).toBeLessThanOrEqual(height);
  expect(await menu.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  for(const id of ['projectFilename','saveProject','shareProject','loadProject','openTextGrid']){await page.locator('#'+id).scrollIntoViewIfNeeded();await expect(page.locator('#'+id)).toBeInViewport()}
  await page.screenshot({path:'/tmp/project-menu-'+width+'.png',fullPage:true});
 }
});
