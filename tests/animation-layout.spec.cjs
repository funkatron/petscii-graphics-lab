const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
test('animation controls are grouped, paired and preserve projects at iPad sizes and larger text',async({page})=>{
 for(const [width,height]of [[810,1080],[1080,810]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
  await loadProject(page,project([160,0],2,1,{animation:{effect:'wave',colorEffect:'color-wave',seconds:2,scale:1,background:'dark',waveAmplitude:75,colorWaveAmplitude:25}}));
  const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#waveAmplitude','selectOption','75');
  for(const [id,name]of [['animationTimeline','Timeline & preview'],['animationMovement','Movement'],['animationColors','Color']])await expect(page.locator('#'+id)).toHaveAccessibleName(name);
  for(const [left,right]of [['waveDirection','waveShape'],['waveAmplitude','animationCycles'],['colorWaveDirection','colorWaveShape'],['colorWaveAmplitude','animationColorCycles']]){
   const a=await page.locator('#'+left).boundingBox(),b=await page.locator('#'+right).boundingBox();expect(Math.abs(a.y-b.y)).toBeLessThan(2);expect(b.x).toBeGreaterThan(a.x+a.width-1);
  }
  const bounds=await page.locator('#animationDetails').boundingBox();const stacked=await page.addStyleTag({content:'#animationDetails .animation-section{grid-template-columns:minmax(0,1fr)}#animationDetails .animation-section>.field{grid-column:1!important}'});const stackedHeight=(await page.locator('#animationDetails').boundingBox()).height;await stacked.evaluate(e=>e.remove());expect(bounds.height).toBeLessThan(stackedHeight*.85);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:'/tmp/animation-grouped-'+width+'.png',fullPage:true});
  await page.addStyleTag({content:'html{font-size:200%}'});await ui(page,'#waveAmplitude','selectOption','75');await ui(page,'#colorWaveAmplitude','selectOption','25');await ui(page,'#animationSeconds','selectOption','2');
  expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
  await ui(page,'#animationEffect','selectOption','none');await expect(page.locator('#waveAmplitude')).toBeHidden();await expect(page.locator('#colorWaveAmplitude')).toBeVisible();
  await ui(page,'#animationColor','selectOption','color-glow');await expect(page.locator('#colorWaveAmplitude')).toBeHidden();
 }
});
