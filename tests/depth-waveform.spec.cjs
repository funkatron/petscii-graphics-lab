const {GifReader}=require('omggif');
const {test,expect,project,loadProject,download,ui,waitForProjectAutosave}=require('./helpers.cjs');
function rgba(gif,f){const b=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,b);return b}
for(const effect of ['space-warp','perspective-floor','curved-road','tunnel-flight'])test(effect+' travel waveforms map quarter cycles and persist',async({page})=>{
 test.setTimeout(60000);await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project(Array.from({length:35},(_,i)=>i%3?'':160),7,5,{cellColors:Array.from({length:35},(_,i)=>i%16),animation:{effect,seconds:2,scale:1,background:'dark'}}));
 await expect(page.locator('#depthWaveShape option')).toHaveText(['Sine','Triangle','Square','Sawtooth','Reverse sawtooth']);
 const baseline=new GifReader(await download(page,'#exportGif'));await expect(page.locator('#depthWaveShape')).toHaveValue('sawtooth');
 for(const [shape,indices]of [['triangle',[0,24,0,24]],['sine',[0,24,0,24]],['reverse-sawtooth',[0,36,24,12]],['square',[0,0,24,24]]]){
  await ui(page,'#depthWaveShape','selectOption',shape);const gif=new GifReader(await download(page,'#exportGif'));for(let q=0;q<4;q++)expect(rgba(gif,q*12)).toEqual(rgba(baseline,indices[q]));
 }
 await ui(page,'#waveAmplitude','selectOption','25');await ui(page,'#waveLength','selectOption','100');await expect(page.locator('#animationSeconds')).toHaveValue('2');await expect(page.locator('#animationCycles')).toHaveValue('1');
 const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.animation).toMatchObject({depthWaveShape:'square',waveAmplitude:25,waveLength:100,colorWaveAmplitude:100,colorWaveLength:50});await waitForProjectAutosave(page,saved);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved);
 await loadProject(page,{...saved,animation:{...saved.animation,depthWaveShape:'invalid'}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved);
 await ui(page,'#animationEffect','selectOption','none');await expect(page.locator('#depthOptions')).toBeHidden();
});
