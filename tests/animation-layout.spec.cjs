const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
test('animation controls are grouped, paired and preserve projects at iPad sizes and larger text',async({page})=>{
 for(const [width,height]of [[810,1080],[1080,810]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
  await loadProject(page,project([160,0],2,1,{animation:{effect:'wave',colorEffect:'color-wave',seconds:2,scale:1,background:'dark',waveAmplitude:75,colorWaveAmplitude:25}}));
  await expect(page.locator('#canvasSizeGroup #columns')).toHaveCount(1);await expect(page.locator('#paintColorsGroup #colorPalette')).toHaveCount(1);await expect(page.locator('#paintColorsGroup #recolorDrawing')).toHaveCount(0);
  const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#waveAmplitude','selectOption','75');
  for(const [id,name]of [['animationTimeline','Timeline & preview'],['animationMovement','Movement'],['animationColors','Color']])await expect(page.locator('#'+id)).toHaveAccessibleName(name);
  for(const [left,right]of [['waveDirection','waveShape'],['waveLength','waveAmplitude'],['colorWaveDirection','colorWaveShape'],['colorWaveLength','colorWaveAmplitude'],['animationCycles','animationColorCycles']]){
   const a=await page.locator('#'+left).boundingBox(),b=await page.locator('#'+right).boundingBox();expect(Math.abs(a.y-b.y)).toBeLessThan(2);expect(b.x).toBeGreaterThan(a.x+a.width-1);
  }
  for(const id of ['animationCycles','animationColorCycles'])await expect(page.locator('#animationTimeline #'+id)).toHaveCount(1);
  const bounds=await page.locator('#animationDetails').boundingBox();const stacked=await page.addStyleTag({content:'#animationDetails .animation-section{grid-template-columns:minmax(0,1fr)}#animationDetails .animation-section>.field{grid-column:1!important}'});const stackedHeight=(await page.locator('#animationDetails').boundingBox()).height;await stacked.evaluate(e=>e.remove());expect(bounds.height).toBeLessThan(stackedHeight*.85);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:'/tmp/animation-grouped-'+width+'.png',fullPage:true});
  await page.addStyleTag({content:'html{font-size:200%}'});await ui(page,'#waveAmplitude','selectOption','75');await ui(page,'#colorWaveAmplitude','selectOption','25');await ui(page,'#animationSeconds','selectOption','2');
  expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
  await ui(page,'#animationEffect','selectOption','none');await expect(page.locator('#waveAmplitude')).toBeHidden();await expect(page.locator('#colorWaveAmplitude')).toBeVisible();
  await ui(page,'#animationColor','selectOption','color-glow');await expect(page.locator('#colorWaveAmplitude')).toBeHidden();
 }
});
test('canvas and paint-color groups preserve staged edits and fit larger text in both iPad layouts',async({page})=>{
 for(const [width,height]of [[810,1080],[1080,810]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project([160,257],2,1));const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#columns','focus');await page.addStyleTag({content:'html{font-size:200%}'});
  await page.locator('#columns').selectOption('3');await expect(page.locator('#canvasSizeGroup #resizeDraft')).toBeVisible();await ui(page,'#cancelResize');await ui(page,'#backgroundTarget');await ui(page,'#inkTarget');
  await expect(page.locator('#canvasSizeGroup')).toHaveAccessibleName('Canvas size');await expect(page.locator('#paintColorsGroup')).toHaveAccessibleName('Paint colors');
  const overflow=await page.locator('#sidebar').evaluate(e=>e.scrollWidth-e.clientWidth);expect(overflow).toBeLessThanOrEqual(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 }
});
