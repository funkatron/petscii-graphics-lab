const {test,expect,ui,project,loadProject,download,contents}=require('./helpers.cjs');
for(const native of [false,true]){
 const action=native?'#shareProject':'#saveProject';
 test.describe(native?'native project saving':'download fallback',()=>{
  test.beforeEach(async({page})=>{
   await page.addInitScript(native=>{
    crypto.getRandomValues=values=>{values.fill(0);return values};window.savedFiles=[];
    Object.defineProperty(navigator,'canShare',{value:()=>native,configurable:true});
    Object.defineProperty(navigator,'share',{value:async({files})=>{
     if(window.shareError)throw new DOMException('test',window.shareError);
     window.savedFiles.push({name:files[0].name,type:files[0].type,text:await files[0].text()});
    },configurable:true});
   },native);
   await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
  });
  async function save(page){
   if(native){await ui(page,action);await expect(page.locator('#status')).toContainText('handed to the share sheet');return page.evaluate(()=>window.savedFiles.at(-1))}
   const waiting=page.waitForEvent('download');await ui(page,action);const file=await waiting;return {name:file.suggestedFilename(),text:(await contents(file)).toString()};
  }
  test('one save action, fixed JSON suffix and editable memorable name',async({page})=>{
   await ui(page,'#projectFilename','focus');await expect(page.locator('#projectFilename')).toHaveValue('amber-lunar-otter');
   await expect(page.locator(native?'#saveProject':'#shareProject')).toBeHidden();
   await expect(page.locator('#projectExtension')).toHaveText('.json');
   const first=await save(page);expect(first.name).toBe('amber-lunar-otter.json');
   await expect(page.locator('#projectFilename')).toHaveValue('amber-lunar-otter');
   for(const [input,wanted]of [['  Evening waves  ','Evening waves.json'],['art/work.JSON','art_work.json'],['art.json.json','art.json'],['art.txt','art.txt.json']]){
    await ui(page,'#projectFilename','fill',input);expect((await save(page)).name).toBe(wanted);
   }
  });
  test('saving preserves full data and repeated save/open round trips',async({page})=>{
   await loadProject(page,project([160,257,'',0],2,2,{cellColors:[2,3,4,5],animation:{effect:'ripple',colorEffect:'plasma',seconds:2,scale:1,background:'dark'}}));
   await page.evaluate(()=>{URL.createObjectURL=()=>{throw Error('Blob URLs unavailable')};window.downloadLinks=[];document.addEventListener('click',e=>{if(e.target.tagName==='A')window.downloadLinks.push({href:e.target.href,target:e.target.target,rel:e.target.rel})},true)});
   const first=await save(page),saved=JSON.parse(first.text);if(native)expect(first.type).toBe('application/json');else{const link=await page.evaluate(()=>window.downloadLinks[0]);expect(link).toMatchObject({target:'_blank',rel:'noopener'});expect(link.href).toMatch(/^data:application\/octet-stream;base64,/);expect(Buffer.from(link.href.split(',')[1],'base64').toString()).toBe(first.text)}expect(saved.grid).toEqual([160,257,'',0]);expect(saved.cellColors).toEqual([2,3,4,5]);expect(saved.animation.effect).toBe('ripple');
   expect((await save(page)).text).toBe(first.text);await loadProject(page,project([0],1,1));await loadProject(page,saved);expect((await save(page)).text).toBe(first.text);
  });
  test('invalid names keep focus and can be corrected without file handoff',async({page})=>{
   let requests=0;page.on('download',()=>requests++);
   for(const value of [' ','.','...','.json']){
    await ui(page,'#projectFilename','fill',value);await ui(page,action);
    await expect(page.locator('#projectMenu')).toHaveAttribute('open','');await expect(page.locator('#projectFilename')).toBeFocused();await expect(page.locator('#projectFilename')).toHaveAttribute('aria-invalid','true');
   }
   expect(requests).toBe(0);expect(await page.evaluate(()=>window.savedFiles)).toEqual([]);
   await ui(page,'#projectFilename','fill','Corrected');expect((await save(page)).name).toBe('Corrected.json');await expect(page.locator('#projectFilename')).not.toHaveAttribute('aria-invalid','true');
  });
  test('save controls remain reachable at 200% text in both iPad layouts',async({page})=>{
   for(const [width,height] of [[810,1080],[1080,810]]){
    await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await page.addStyleTag({content:'html{font-size:200%}'});await ui(page,'#projectFilename','fill','Evening artwork');
    await expect(page.locator('#projectSaveGroup')).toHaveAccessibleName('Save editable project');await expect(page.locator('#projectSaveGroup button:visible')).toHaveCount(1);
    const menu=page.locator('.project-menu'),box=await menu.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y+box.height).toBeLessThanOrEqual(height);expect(await menu.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
    for(const id of ['#projectFilename',action,'#loadProject','#openTextGrid']){await page.locator(id).scrollIntoViewIfNeeded();await expect(page.locator(id)).toBeInViewport()}
   }
  });
  if(native)test('cancel and error restore the sole save action for retry',async({page})=>{
   for(const error of ['AbortError','NotAllowedError']){
    await page.evaluate(error=>window.shareError=error,error);await ui(page,action);await expect(page.locator(action)).toBeEnabled();await expect(page.locator('#status')).toContainText(error==='AbortError'?'canceled':'sharing failed');
    await page.evaluate(()=>window.shareError=null);expect((await save(page)).name).toBe('amber-lunar-otter.json');
   }
  });
 });
}
