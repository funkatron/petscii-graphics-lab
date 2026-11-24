const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
// Raskin review L1: quasimodes end when released, and a two-finger tap undoes.
test('holding Alt picks from the canvas and releasing returns to the previous tool',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project([160,160],2,1,{cellColors:[5,5]}));
 await ui(page,'#tool-line');
 await page.keyboard.down('Alt');
 await expect(page.locator('#tool-picker')).toHaveClass(/active/);
 await page.locator('#canvas').click({position:{x:10,y:10}});
 await expect(page.locator('#status')).toContainText('Brush ink');
 await page.keyboard.up('Alt');
 await expect(page.locator('#tool-line')).toHaveAttribute('aria-pressed','true');
});
test('two-finger tap undoes without leaving a stray cell',async({page,browserName},info)=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project(['',''],2,1));
 const before=await download(page,'#saveProject');
 const c=await page.locator('#canvas').boundingBox();
 // Paint one cell (one undo step), then two-finger tap.
 await page.mouse.click(c.x+c.width*.25,c.y+c.height*.5);
 const painted=await download(page,'#saveProject');expect(painted).not.toEqual(before);
 await page.evaluate(({x,y})=>{
  const frame=document.getElementById('frame'),canvas=document.getElementById('canvas');
  const fire=(type,id,dx,t)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===11,clientX:x+dx,clientY:y,bubbles:true,cancelable:true}));
  fire('pointerdown',11,0);fire('pointerdown',12,40);fire('pointerup',11,0);fire('pointerup',12,40);
 },{x:c.x+c.width*.75,y:c.y+c.height*.5});
 await expect.poll(()=>download(page,'#saveProject')).toEqual(before);
});
test('holding Space and dragging pans a zoomed canvas without drawing',async({page})=>{
 await page.setViewportSize({width:1180,height:820});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 await loadProject(page,project(Array(256).fill(''),16,16));
 const before=await download(page,'#saveProject');
 await page.locator('#editorZoom').selectOption({index:(await page.locator('#editorZoom option').count())-1});
 const frame=page.locator('#frame');await expect.poll(()=>frame.evaluate(f=>f.scrollWidth>f.clientWidth)).toBe(true);
 const start=await frame.evaluate(f=>[f.scrollLeft,f.scrollTop]);
 const b=await frame.boundingBox();
 await page.locator('#canvas').hover();await page.keyboard.down('Space');
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-120,b.y+b.height/2-80,{steps:6});await page.mouse.up();
 await page.keyboard.up('Space');
 const end=await frame.evaluate(f=>[f.scrollLeft,f.scrollTop]);
 expect(end[0]+end[1]).toBeGreaterThan(start[0]+start[1]);
 expect(await download(page,'#saveProject')).toEqual(before);
});

// Raskin review L3/L4: help buttons have a larger touch area; animation summaries use the full width.
test('help buttons have a 40px touch area and animation summaries span their section',async({page})=>{
 await page.setViewportSize({width:1180,height:820});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const hit=await page.locator('.stagebar .help-trigger').first().evaluate(b=>{const r=b.getBoundingClientRect(),a=getComputedStyle(b,'::after');return r.width-parseFloat(a.left)-parseFloat(a.right)});
 expect(hit).toBeGreaterThanOrEqual(38);
 await page.evaluate(()=>{document.getElementById('animationDetails').open=true});
 await page.locator('#animationEffect').selectOption('scroll');
 const note=page.locator('#animationDerivedSummary');await expect(note).toBeVisible();
 const [n,s]=await note.evaluate(e=>[e.getBoundingClientRect().width,e.parentElement.getBoundingClientRect().width]);
 expect(n).toBeGreaterThan(s*.8);
});
