const {GifReader}=require('omggif'),AdmZip=require('adm-zip');
const {test,expect,ui,waitForProjectAutosave,project,loadProject,download}=require('./helpers.cjs');
const palette=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'];
const rgb=i=>[0,2,4].map(n=>parseInt(palette[i].slice(n,n+2),16));
const settings={effect:'wave',colorEffect:'none',seconds:1,scale:1,background:'dark',waveDirection:'up',waveShape:'sine'};
const inks=Array.from({length:48},(_,i)=>i%16),grid=Array(48).fill(160);
function sample(shape,t){t=(t%1+1)%1;return shape==='square'?(t<.5?1:-1):shape==='triangle'?1-4*Math.abs((t+.25)%1-.5):shape==='sawtooth'?2*t-1:shape==='reverse-sawtooth'?1-2*t:Math.sin(t*2*Math.PI)}
function frames(amplitude,direction='up',shape='sine'){
 return Array.from({length:24},(_,f)=>({cells:grid.slice(),inks:inks.map((_,i)=>{
 const x=i%12,y=Math.floor(i/12),rows=['up','down'].includes(direction),size=rows?12:4,pos=rows?y/4:x/12,sign=['down','right'].includes(direction)?-1:1;
 const shift=Math.round((shape==='sine'?Math.sin(f/24*Math.PI*2*sign+pos*Math.PI*2):sample(shape,pos+f/24*sign))*Math.min(3,Math.max(1,size/4))*2*(amplitude/100)),wrap=(n,s)=>(n%s+s)%s;
 return inks[(rows?y:wrap(y+shift,4))*12+(rows?wrap(x+shift,12):x)];}),durationMs:(Math.round((f+1)*100/24)-Math.round(f*100/24))*10}));
}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('wave heights match independent movement and ink frames across directions and shapes',async({page})=>{
 test.setTimeout(120000);
 for(const [height,direction,shape]of [[10,'up','sine'],[25,'down','triangle'],[50,'left','square'],[75,'right','sawtooth'],[100,'up','reverse-sawtooth']]){
 await loadProject(page,project(grid,12,4,{cellColors:inks,animation:{...settings,waveAmplitude:height,waveDirection:direction,waveShape:shape}}));
 const gif=new GifReader(await download(page,'#exportGif')),expected=frames(height,direction,shape);expect(gif.numFrames()).toBe(24);
 for(let f=0;f<24;f++){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);for(let i=0;i<48;i++){const at=((Math.floor(i/12)*8+4)*gif.width+i%12*8+4)*4;expect([...pixels.subarray(at,at+3)],height+' '+shape+' '+direction+' frame '+f+' cell '+i).toEqual(rgb(expected[f].inks[i]))}}
 }
});
test('C64 bytes and ZIP metadata use the selected amplitude; omitted height retains original output',async({page})=>{
 for(const height of [10,25,50,75,100]){
 await loadProject(page,project(grid,12,4,{cellColors:inks,animation:{...settings,waveAmplitude:height}}));await ui(page,'#c64Mode','selectOption','animation');
 const zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));
 const bytes=await download(page,'#exportC64');const expected=await page.evaluate(async frames=>{const {createC64AdaptiveProgram}=await import('./c64-export.js');return [...createC64AdaptiveProgram({columns:12,rows:4,background:6,ink:14,frames,repetitions:0}).bytes]},frames(height).map((frame,i)=>({...frame,durationMs:timing.frames[i].durationMs})));expect([...bytes]).toEqual(expected);
 expect(timing.waveAmplitude).toBe(height);expect(JSON.parse(zip.readAsText('project.json')).animation.waveAmplitude).toBe(height);
 }
 await loadProject(page,project(grid,12,4,{cellColors:inks,animation:settings}));await expect(page.locator('#waveAmplitude')).toHaveValue('100');const original=await download(page,'#exportGif');await ui(page,'#waveAmplitude','selectOption','100');expect(await download(page,'#exportGif')).toEqual(original);
});
test('height is contextual, persists, follows history and rejects invalid imports atomically',async({page})=>{
 await expect(page.locator('#waveAmplitude')).toBeHidden();await loadProject(page,project(grid,12,4,{cellColors:inks,animation:settings}));await ui(page,'#waveAmplitude','selectOption','25');const before=JSON.parse(await download(page,'#saveProject'));expect(before.animation.waveAmplitude).toBe(25);
 await waitForProjectAutosave(page,before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await loadProject(page,{...before,animation:{...before.animation,waveAmplitude:75}});await ui(page,'#undo');await expect(page.locator('#waveAmplitude')).toHaveValue('25');await ui(page,'#redo');await expect(page.locator('#waveAmplitude')).toHaveValue('75');await ui(page,'#undo');
 for(const value of [0,101,20,'25',null]){await loadProject(page,{...before,animation:{...before.animation,waveAmplitude:value}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}
 await ui(page,'#animationEffect','selectOption','none');await ui(page,'#animationColor','selectOption','color-wave');await expect(page.locator('#waveAmplitude')).toBeHidden();const color=await download(page,'#exportGif');
 await loadProject(page,{...before,animation:{...before.animation,effect:'none',colorEffect:'color-wave',waveAmplitude:100}});expect(await download(page,'#exportGif')).toEqual(color);
});
test('height is snapshotted before asynchronous export and changing it invalidates the completed download',async({page})=>{
 const {contents}=require('./helpers.cjs');await loadProject(page,project(grid,12,4,{cellColors:inks,animation:{...settings,waveAmplitude:25}}));
 let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/vendor/gifenc.esm.js',async route=>{started();await gate;await route.continue()});
 const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await loading;await ui(page,'#waveAmplitude','selectOption','100');release();const old=await contents(await waiting),oldUrl=await page.locator('#exportGif').getAttribute('data-download-url');
 const current=await download(page,'#exportGif');expect(current).not.toEqual(old);expect(await page.locator('#exportGif').getAttribute('data-download-url')).not.toBe(oldUrl);
 await ui(page,'#waveAmplitude','selectOption','25');expect(await download(page,'#exportGif')).toEqual(old);
});
test('color height narrows waveform colors independently and preserves full-height output',async({page})=>{
 test.setTimeout(120000);const ramp=[2,8,7,13,3,14,6,4],wrap=n=>(n%8+8)%8;
 for(const height of [10,25,50,75,100])for(const shape of ['sine','triangle','square','sawtooth','reverse-sawtooth']){
  await loadProject(page,project([160,160,'',160],4,1,{cellColors:[2,7,14,3],animation:{...settings,effect:'none',colorEffect:'color-wave',colorWaveShape:shape,colorWaveDirection:'right',colorWaveAmplitude:height}}));
  const gif=new GifReader(await download(page,'#exportGif'));expect(gif.numFrames()).toBe(8);
  for(let f=0;f<8;f++){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);for(let x=0;x<4;x++){
   const t=f/8-x/8,raw=shape==='sawtooth'?-x+f:Math.min(7,Math.floor((sample(shape,t)+1)*4)),step=Math.floor(wrap(raw)*height/100),ink=x===2?6:ramp[wrap(ramp.indexOf([2,7,14,3][x])+step)],at=(4*gif.width+x*8+4)*4;
   expect([...pixels.subarray(at,at+3)],height+' '+shape+' '+f+' '+x).toEqual(rgb(ink));
  }}
 }
});
test('color height persists, validates, and supplies C64 and ZIP exports',async({page})=>{
 const art=project(grid,12,4,{cellColors:inks,animation:{...settings,colorEffect:'color-wave',colorWaveAmplitude:25,waveAmplitude:50}});await loadProject(page,art);await ui(page,'#colorWaveAmplitude','selectOption','50');await ui(page,'#colorWaveAmplitude','selectOption','25');
 const before=JSON.parse(await download(page,'#saveProject'));expect(before.animation.colorWaveAmplitude).toBe(25);expect(before.animation.waveAmplitude).toBe(50);
 await waitForProjectAutosave(page,before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 for(const value of [0,20,101,'50',null]){await loadProject(page,{...before,animation:{...before.animation,colorWaveAmplitude:value}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}
 const zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json'));expect(timing.colorWaveAmplitude).toBe(25);expect(JSON.parse(zip.readAsText('project.json')).animation.colorWaveAmplitude).toBe(25);
 const ramp=[2,8,7,13,3,14,6,4],expected=frames(50).map((f,i)=>({...f,durationMs:timing.frames[i].durationMs,inks:f.inks.map((ink,j)=>{const start=Math.max(0,ramp.indexOf(ink)),offset=j%12+Math.floor(j/12),step=Math.floor(((offset+Math.floor(i/24*8))%8)*.25);return ramp[(start+step)%8]})}));
 await ui(page,'#c64Mode','selectOption','animation');const bytes=await download(page,'#exportC64');const wanted=await page.evaluate(async frames=>{const {createC64AdaptiveProgram}=await import('./c64-export.js');return [...createC64AdaptiveProgram({columns:12,rows:4,background:6,ink:14,repetitions:0,frames}).bytes]},expected);expect([...bytes]).toEqual(wanted);
 await ui(page,'#animationColor','selectOption','color-glow');await expect(page.locator('#colorWaveAmplitude')).toBeHidden();
});
