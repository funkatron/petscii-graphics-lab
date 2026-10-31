const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,project,loadProject,ui,download,waitForProjectAutosave}=require('./helpers.cjs');
const effects=['perspective-floor','curved-road','tunnel-flight'];
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const effect of effects)for(const depthTravel of ['toward','away'])test(`${effect} ${depthTravel} produces moving identical GIF and ZIP pixels`,async({page})=>{
 const p=project(Array.from({length:35},(_,i)=>i%4===0?'':160),7,5,{cellColors:Array.from({length:35},(_,i)=>i%16),animation:{effect,depthTravel,colorEffect:'none',seconds:2,scale:1,background:'dark'}});await loadProject(page,p);
 const before=JSON.parse(await download(page,'#saveProject')),gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json')),pictures=new Set();
 expect(gif.numFrames()).toBe(48);expect(timing).toMatchObject({effect,depthTravel,durationMs:2000});
 for(let f=0;f<48;f++){const b=Buffer.alloc(56*40*4);gif.decodeAndBlitFrameRGBA(f,b);expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(b);pictures.add(b.toString('base64'));}
 expect(pictures.size).toBeGreaterThan(1);expect(JSON.parse(zip.readAsText('project.json'))).toEqual(before);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await expect(page.locator('#depthTravel')).toHaveValue(depthTravel);await waitForProjectAutosave(page,before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await loadProject(page,{...before,animation:{...before.animation,depthTravel:'invalid'}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await ui(page,'#animationEffect','selectOption','none');await expect(page.locator('#depthOptions')).toBeHidden();
});
