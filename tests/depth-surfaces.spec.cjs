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

test('tunnel mirrored texture bands render identically on left and right',async({page})=>{
 await loadProject(page,project(Array.from({length:15},(_,i)=>Math.floor(i/5)%2?'':160),5,3,{cellColors:Array.from({length:15},(_,i)=>Math.floor(i/5)+2),animation:{effect:'tunnel-flight',seconds:2,scale:1,background:'dark'}}));const gif=new GifReader(await download(page,'#exportGif'));
 for(let f=0;f<48;f++){const b=Buffer.alloc(40*24*4);gif.decodeAndBlitFrameRGBA(f,b);for(let y=0;y<3;y++)for(let x=0;x<2;x++){const a=((y*8+4)*40+x*8+4)*4,c=((y*8+4)*40+(4-x)*8+4)*4;expect(b.subarray(a,a+4)).toEqual(b.subarray(c,c+4))}}
});
for(const effect of ['perspective-floor','curved-road'])test(effect+' reaches the top throughout its exported loop',async({page})=>{
 await loadProject(page,project(Array(35).fill(160),7,5,{cellColors:Array(35).fill(2),animation:{effect,seconds:2,scale:1,background:'dark'}}));const gif=new GifReader(await download(page,'#exportGif'));
 for(let f=0;f<48;f++){const b=Buffer.alloc(56*40*4);gif.decodeAndBlitFrameRGBA(f,b);const top=Array.from({length:7},(_,x)=>[...b.subarray((4*56+x*8+4)*4,(4*56+x*8+4)*4+3)]);expect(top.some(rgb=>rgb.join(',')==='104,55,43')).toBe(true);if(effect==='perspective-floor')expect(top.every(rgb=>rgb.join(',')==='104,55,43')).toBe(true)}
});
