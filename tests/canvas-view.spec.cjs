const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
const {PNG}=require('pngjs');

test.beforeEach(async({page})=>{
  await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
});

test('zoom and guides live in the stage bar above the canvas',async({page})=>{
  await expect(page.locator('#stageCanvasView #editorZoom')).toBeVisible();
  await expect(page.locator('#stageCanvasView #centerGuides')).toBeVisible();
  await expect(page.locator('.stage-view-guides span')).toHaveText('Grid');
  await expect(page.locator('#stageCanvasView #symmetryMenu')).toBeVisible();
  await expect(page.locator('#stageCanvasView #tapPoints')).toBeVisible();
  await expect(page.locator('.drawing-strip #symmetryMenu')).toHaveCount(0);
  await expect(page.locator('#canvasViewGroup')).toHaveCount(0);
});

test('canvas zoom enlarges the editor surface without changing export pixels',async({page})=>{
  await loadProject(page,project([160],4,4));
  const read=()=>page.evaluate(()=>({w:document.getElementById('canvas').offsetWidth,z:Number(document.querySelector('.canvas-frame').dataset.zoom||1)}));
  await page.locator('#editorZoom').selectOption('1');
  const atFit=await read();
  await page.locator('#editorZoom').selectOption('2');
  await expect(page.locator('#editorZoom')).toHaveValue('2');
  const zoomed=await read();
  expect(zoomed.z).toBe(2);
  expect(zoomed.w).toBeGreaterThan(atFit.w*1.9);
  await expect(page.locator('.canvas-frame')).toHaveClass(/canvas-zoomed/);
  const png1=PNG.sync.read(await download(page,'#png'));
  await ui(page,'#editorZoom','selectOption','1');
  const png2=PNG.sync.read(await download(page,'#png'));
  expect([png1.width,png1.height]).toEqual([png2.width,png2.height]);
});

test('center guides render on the canvas but not in PNG export',async({page})=>{
  await loadProject(page,project([160],8,8,{colors:{ink:14,background:6}}));
  const sample=()=>page.locator('#canvas').evaluate(c=>{
    const x=Math.floor(c.width/2),y=Math.floor(c.height/2);
    const px=c.getContext('2d');
    return [px.getImageData(x,2,1,1).data[0],px.getImageData(2,y,1,1).data[0]];
  });
  const off=await sample();
  await ui(page,'#centerGuides','check');
  const on=await sample();
  expect(on[0]).toBeGreaterThan(off[0]+40);
  expect(on[1]).toBeGreaterThan(off[1]+40);
  const pngOn=PNG.sync.read(await download(page,'#png'));
  await ui(page,'#centerGuides','uncheck');
  const pngOff=PNG.sync.read(await download(page,'#png'));
  const i=(pngOn.width*Math.floor(pngOn.height/2)+Math.floor(pngOn.width/2))*4;
  expect(pngOn.data.slice(i,i+3)).toEqual(pngOff.data.slice(i,i+3));
});

test('center guides stay visible during rectangle preview drag',async({page})=>{
  await ui(page,'#centerGuides','check');
  await ui(page,'#tool-rectangle');
  const sampleGuide=()=>page.locator('#canvas').evaluate(c=>{
    const x=Math.floor(c.width/2),px=c.getContext('2d');
    return px.getImageData(x,2,1,1).data[0];
  });
  const baseline=await sampleGuide();
  expect(baseline).toBeGreaterThan(200);
  await page.locator('#canvas').evaluate(c=>{
    const r=c.getBoundingClientRect();
    const fire=(type,x,y)=>c.dispatchEvent(new PointerEvent(type,{pointerId:42,pointerType:'pen',isPrimary:true,bubbles:true,cancelable:true,clientX:r.left+r.width*x,clientY:r.top+r.height*y}));
    fire('pointerdown',.1,.1);
    fire('pointermove',.5,.5);
  });
  expect(await sampleGuide()).toBeGreaterThan(200);
  await page.locator('#canvas').evaluate(c=>{
    const r=c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent('pointerup',{pointerId:42,bubbles:true,clientX:r.left+r.width*.5,clientY:r.top+r.height*.5}));
  });
});

async function openAnimationGroup(page){
  if(test.info().project.name==='ipad-portrait'){
    if(await page.locator('#sidebar').evaluate(e=>e.classList.contains('closed')))await ui(page,'#toggle');
  }
  await page.locator('#animationDetails').evaluate(d=>{d.open=true});
}

test('animation derived frame summary appears when movement is enabled',async({page})=>{
  await openAnimationGroup(page);
  await page.locator('#animationEffect').selectOption('wave');
  const summary=page.locator('#animationDerivedSummary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText(/derived frames per loop/);
  await page.locator('#animationEffect').selectOption('none');
  await expect(summary).toBeHidden();
});

test('center guides preference survives reload',async({page})=>{
  await ui(page,'#centerGuides','check');
  await page.reload();await page.locator('.app[data-ready=true]').waitFor();
  await expect(page.locator('#centerGuides')).toBeChecked();
});

test('two-finger drag pans a zoomed canvas',async({page})=>{
  await loadProject(page,project([160],24,24));
  await page.locator('#editorZoom').selectOption('2');
  await page.locator('#frame').evaluate(f=>{f.scrollLeft=0;f.scrollTop=0;});
  const before=await page.locator('#frame').evaluate(f=>({sl:f.scrollLeft,st:f.scrollTop,sw:f.scrollWidth,cw:f.clientWidth}));
  expect(before.sw).toBeGreaterThan(before.cw);
  await page.locator('#canvas').evaluate(c=>{
    const r=c.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    const fire=(type,id,dx,dy)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===1,bubbles:true,cancelable:true,clientX:cx+dx,clientY:cy+dy}));
    fire('pointerdown',1,-30,0);fire('pointerdown',2,30,0);
    fire('pointermove',1,-80,-40);fire('pointermove',2,-20,20);
    fire('pointerup',1,-80,-40);fire('pointerup',2,-20,20);
  });
  const after=await page.locator('#frame').evaluate(f=>({sl:f.scrollLeft,st:f.scrollTop}));
  expect(after.sl+after.st).toBeGreaterThan(before.sl+before.st);
});