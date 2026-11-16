const {test,expect,project,loadProject,download,ui,waitForPreviewAdvance}=require('./helpers.cjs');
const {GifReader}=require('omggif');

const knobs={parallaxGroup:'ink',parallaxSpread:1,parallaxTravel:'same',fieldRamp:'cycle',fieldDirection:'forward',fieldLead:1};
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});

test('backdrop and parallax knobs persist and leave the drawing unchanged',async({page})=>{
 const art=project([160,''],2,1,{cellColors:[1,0],colors:{ink:1,background:6},animation:{effect:'parallax',colorEffect:'field',seconds:1,scale:1,background:'dark',scrollDirection:'left',...knobs}});
 await loadProject(page,art);
 await ui(page,'#animationDetails');
 await expect(page.locator('#parallaxGroup')).toBeVisible();
 await expect(page.locator('#fieldRamp')).toBeVisible();
 await expect(page.locator('#fieldLead')).toBeVisible();
 await ui(page,'#parallaxSpread','selectOption','0');
 await ui(page,'#parallaxTravel','selectOption','opposite');
 await ui(page,'#fieldRamp','selectOption','glow');
 await ui(page,'#fieldDirection','selectOption','reverse');
 await ui(page,'#fieldLead','selectOption','4');
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.grid).toEqual(art.grid);
 expect(saved.animation).toMatchObject({effect:'parallax',colorEffect:'none',backgroundEffect:'field',parallaxSpread:0,parallaxTravel:'opposite',fieldRamp:'glow',fieldDirection:'reverse',fieldLead:4});
 await loadProject(page,saved);
 await expect(page.locator('#parallaxSpread')).toHaveValue('0');
 await expect(page.locator('#fieldLead')).toHaveValue('4');
 await ui(page,'#animationEffect','selectOption','none');
 await expect(page.locator('#parallaxGroup')).toBeHidden();
 await ui(page,'#backdropEffect','selectOption','None');
 await expect(page.locator('#fieldRamp')).toBeHidden();
 await ui(page,'#backdropEffect','selectOption','Backdrop');
 await ui(page,'#quickPlay');
 await waitForPreviewAdvance(page);
 await ui(page,'#quickPlay');
 expect(JSON.parse(await download(page,'#saveProject')).grid).toEqual(art.grid);
 await ui(page,'#fieldRamp','selectOption','Plasma field');
 expect(JSON.parse(await download(page,'#saveProject')).animation.fieldRamp).toBe('plasma');
 for(const [key,value] of [['fieldLead',3],['parallaxSpread',3],['fieldRamp','field'],['fieldRamp','inverse']]){
  await loadProject(page,{...saved,animation:{...saved.animation,[key]:value}});
  await expect(page.locator('#status')).toContainText('Load failed');
  expect(JSON.parse(await download(page,'#saveProject')).animation[key]).not.toBe(value);
 }
});

test('backdrop spatial waves appear in the download animation preview',async({page})=>{
 await loadProject(page,project(['',''],2,1,{cellColors:[0,0],colors:{ink:1,background:6},animation:{effect:'none',colorEffect:'none',backgroundEffect:'field',fieldRamp:'color-wave',seconds:2,scale:1,background:'dark'}}));
 await ui(page,'#downloadOpen');
 await page.locator('#export-tab-motion').click();
 await expect(page.locator('#downloadPreview')).toBeVisible();
 const differs=await page.evaluate(()=>{
  const ctx=document.getElementById('downloadPreview').getContext('2d');
  const sample=(col)=>{const x=col*8+4,[r,g,b]=ctx.getImageData(x,4,1,1).data;return r*65536+g*256+b};
  return sample(0)!==sample(1);
 });
 expect(differs).toBe(true);
});

test('backdrop GIF fill follows the ramp and VDC hides border lead',async({page})=>{
 await loadProject(page,project([160,''],2,1,{cellColors:[1,0],colors:{ink:1,background:6},animation:{effect:'none',colorEffect:'field',seconds:1,scale:1,background:'dark',fieldLead:1}}));
 await ui(page,'#gifScale','selectOption','1');
 const gif=new GifReader(await download(page,'#exportGif'));
 expect(gif.numFrames()).toBe(16);
 const frame0=Buffer.alloc(gif.width*gif.height*4),frame1=Buffer.alloc(gif.width*gif.height*4);
 gif.decodeAndBlitFrameRGBA(0,frame0);
 gif.decodeAndBlitFrameRGBA(1,frame1);
 const empty=(buf)=>[...buf.subarray((4*gif.width+12)*4,(4*gif.width+12)*4+3)];
 expect(empty(frame0)).toEqual([0x6f,0x3d,0x86]);
 expect(empty(frame1)).toEqual([0x68,0x37,0x2b]);
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
 await ui(page,'#workspaceMachine','selectOption','c128-80');
 await ui(page,'#backdropEffect','selectOption','Backdrop');
 await expect(page.locator('#fieldRamp')).toBeVisible();
 await expect(page.locator('#fieldLead')).toBeHidden();
});
