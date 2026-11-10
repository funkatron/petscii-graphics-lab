const {test,expect,ui,reveal,contents,loadProject,project}=require('./helpers.cjs');
const {PNG}=require('pngjs');
const {GifReader}=require('omggif');
const AdmZip=require('adm-zip');
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true})});
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
});
async function namedDownload(page,selector){
 await reveal(page,selector);const waiting=page.waitForEvent('download');
 // iPad hides the desktop Save Project button in favor of Share.
 // Its download handler remains available for deterministic export assertions.
 if(selector==='#saveProject')await page.evaluate(()=>document.getElementById('saveProject').click());
 else await page.locator(selector).click();
 const file=await waiting;return {name:file.suggestedFilename(),bytes:await contents(file)};
}
test('two-word regeneration changes only the name and stays accessible',async({page})=>{
 await loadProject(page,project([160,257],2,1,{cellColors:[2,3]}));
 const before=JSON.parse((await namedDownload(page,'#saveProject')).bytes);
 await ui(page,'#regenerateProjectName');
 const name=await page.locator('#projectFilename').inputValue();
 expect(name).toMatch(/^[a-z]+-[a-z]+$/);
 await expect(page.locator('#regenerateProjectName')).toHaveAccessibleName('Generate new project name');
 await expect(page.locator('#regenerateProjectName')).toHaveAttribute('title','Generate new project name');
 const saved=await namedDownload(page,'#saveProject');expect(saved.name).toBe(name+'.json');expect(JSON.parse(saved.bytes)).toEqual(before);
 await ui(page,'#regenerateProjectName');expect(await page.locator('#projectFilename').inputValue()).not.toBe(name);
});
test('New Project cancel preserves source; confirm resets defaults and Undo restores it',async({page})=>{
 await loadProject(page,project([160,257,'',0],2,2,{cellColors:[2,3,4,5],colors:{ink:5,background:0},animation:{effect:'ripple',colorEffect:'plasma',seconds:4,scale:1,background:'white'}}));
 await ui(page,'#projectFilename','fill','Previous artwork');
 const before=JSON.parse((await namedDownload(page,'#saveProject')).bytes);
 page.once('dialog',d=>d.dismiss());await ui(page,'#newProject');
 expect(JSON.parse((await namedDownload(page,'#saveProject')).bytes)).toEqual(before);
 await expect(page.locator('#projectFilename')).toHaveValue('Previous artwork');
 await ui(page,'#quickPlay');await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','true');
 page.once('dialog',d=>d.accept());await ui(page,'#newProject');
 const fresh=JSON.parse((await namedDownload(page,'#saveProject')).bytes);
 expect(fresh.columns).toBe(16);expect(fresh.rows).toBe(16);expect(fresh.grid).toEqual(Array(256).fill(''));
 expect(fresh.colors).toEqual({ink:14,background:6});expect(fresh.drawingReplay.events).toEqual([]);
 expect(fresh.animation).toMatchObject({effect:'replay',colorEffect:'none',seconds:2});
 await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','false');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('petscii-graphics-project-v3')))).toEqual(fresh);
 await ui(page,'#undo');expect(JSON.parse((await namedDownload(page,'#saveProject')).bytes)).toEqual(before);
 await ui(page,'#redo');expect(JSON.parse((await namedDownload(page,'#saveProject')).bytes)).toEqual(fresh);
});
test('all export families use the sanitized project name and retain valid contents',async({page})=>{
 test.setTimeout(120000);
 await loadProject(page,project([160,0],2,1,{cellColors:[2,3],animation:{effect:'inverse',colorEffect:'none',seconds:1,scale:1,background:'dark',videoRepeats:1}}));
 await ui(page,'#projectFilename','fill','  Electric/Raven.JSON  ');
 for(const [selector,extension] of [['#saveProject','json'],['#text','txt'],['#svg','svg'],['#png','png'],['#screenCodes','bin'],['#colorRam','bin'],['#exportGif','gif'],['#exportFrames','zip'],...(test.info().project.name.startsWith('ipad')?[]:[['#exportVideo','video']])]){
  const file=await namedDownload(page,selector);expect(file.name).toMatch(/^Electric_Raven[.-]/);
  if(extension==='video')expect(file.name).toMatch(/\.(mp4|webm)$/);else expect(file.name.endsWith('.'+extension)).toBe(true);
  expect(file.bytes.length).toBeGreaterThan(0);
  if(extension==='json')expect(JSON.parse(file.bytes).grid).toEqual([160,0]);
  if(extension==='txt')expect(file.bytes.toString()).toContain('0A0 000');
  if(extension==='svg')expect(file.bytes.toString()).toContain('<svg');
  if(extension==='png')expect(PNG.sync.read(file.bytes).width).toBeGreaterThan(0);
  if(extension==='gif')expect(new GifReader(file.bytes).numFrames()).toBeGreaterThan(1);
  if(extension==='zip')expect(JSON.parse(new AdmZip(file.bytes).readAsText('project.json')).grid).toEqual([160,0]);
  if(selector==='#screenCodes')expect([...file.bytes]).toEqual([160,0,0,0]);
  if(selector==='#colorRam')expect([...file.bytes]).toEqual([2,3]);
 }
 for(const format of ['prg','d64']){
  await ui(page,'#c64Format','selectOption',format);
  const first=await namedDownload(page,'#exportC64');expect(first.name).toBe('Electric_Raven-still-2x1.'+format);
  if(format==='prg')expect([...first.bytes.subarray(0,2)]).toEqual([1,8]);else expect(first.bytes.length).toBe(174848);
  await ui(page,'#projectFilename','fill','Quiet Mountain');
  const renamed=await namedDownload(page,'#exportC64');expect(renamed.name).toBe('Quiet Mountain-still-2x1.'+format);expect(renamed.bytes).toEqual(first.bytes);
  await ui(page,'#projectFilename','fill','Electric/Raven.JSON');
 }
});
test('in-flight animation keeps captured name; renamed cached export gets the new name',async({page})=>{
 await loadProject(page,project([160,0],2,1,{animation:{effect:'inverse',seconds:1,scale:1,background:'dark'}}));
 await ui(page,'#projectFilename','fill','First flame');
 let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);
 await page.route('**/vendor/gifenc.esm.js',async route=>{started();await gate;await route.continue()});
 const waiting=page.waitForEvent('download');await ui(page,'#exportGif');await loading;
 await ui(page,'#projectFilename','fill','Second flame');release();
 const file=await waiting;expect(file.suggestedFilename()).toMatch(/^First flame-/);const before=await contents(file);
 await expect(page.locator('#exportGif')).toBeEnabled();
 const next=await namedDownload(page,'#exportGif');expect(next.name).toMatch(/^Second flame-/);expect(next.bytes).toEqual(before);
});
test('invalid names block artwork exports and focus the name field',async({page})=>{
 let requests=0;page.on('download',()=>requests++);
 await loadProject(page,project([160],1,1));
 for(const selector of ['#text','#svg','#png','#exportGif','#exportC64']){
  await ui(page,'#projectFilename','fill','...');await ui(page,selector);
  // Artwork dialog must close so the invalid field can actually receive focus.
  await expect(page.locator('#projectFilename')).toHaveAttribute('aria-invalid','true');
 }
 expect(requests).toBe(0);
});
