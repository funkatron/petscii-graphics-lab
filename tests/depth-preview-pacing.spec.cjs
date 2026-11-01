const {test,expect,project,loadProject,download,ui,waitForPreviewAdvance}=require('./helpers.cjs');

// Diagnostic, not a timing gate. rAF intervals include scheduling/presentation
// delays; they do not isolate CPU paint, compositing, or physical-device speed.
const effects=['space-warp','perspective-floor','curved-road','tunnel-flight'];
for(const effect of effects)test('browser preview pacing: '+effect,async({page},info)=>{
 test.setTimeout(60000);
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
 const width=40,height=25;
 const grid=Array.from({length:width*height},(_,i)=>i%7===0?'':[160,96,256,384,65][i%5]);
 const colors=grid.map((_,i)=>i%16);
 await loadProject(page,project(grid,width,height,{cellColors:colors,animation:{effect,seconds:4,scale:1,background:'dark'}}));
 const before=await download(page,'#saveProject');
 await ui(page,'#animationColor','selectOption','rainbow-wave');
 await ui(page,'#depthWaveShape','selectOption','sine');
 await ui(page,'#waveAmplitude','selectOption','100');
 await ui(page,'#waveLength','selectOption','100');
 // Baseline after configuring the animation, before entering preview.
 const configured=await download(page,'#saveProject');
 await ui(page,'#animationPlay');
 await waitForPreviewAdvance(page);
 const sample=await page.evaluate(async()=>{
  const c=document.querySelector('#canvas'),times=[],markers=[];
  for(let i=0;i<100;i++)await new Promise(resolve=>requestAnimationFrame(now=>{times.push(now);markers.push(c.dataset.animationFrame||null);resolve()}));
  const intervals=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b);
  const quantile=q=>Math.round(intervals[Math.min(intervals.length-1,Math.floor(q*(intervals.length-1)))]*1000)/1000;
  return {observedIntervals:intervals.length,medianIntervalMs:quantile(.5),p95IntervalMs:quantile(.95),maxIntervalMs:quantile(1),differentPreviewMarkers:new Set(markers).size,viewport:[innerWidth,innerHeight],devicePixelRatio,visibility:document.visibilityState};
 });
 expect(sample.observedIntervals).toBe(99);
 expect(sample.differentPreviewMarkers).toBeGreaterThan(1);
 await info.attach('depth-preview-pacing-'+effect,{body:JSON.stringify({effect,browser:info.project.name,...sample,scope:'requestAnimationFrame cadence, not complete renderer CPU cost or physical device performance'},null,2),contentType:'application/json'});
 await info.attach('depth-preview-'+effect,{body:await page.screenshot(),contentType:'image/png'});
 await ui(page,'#animationStop');
 expect(await download(page,'#saveProject')).toEqual(configured);
 // Changing animation settings is expected; preview itself must not touch artwork.
 expect(JSON.parse(configured).grid).toEqual(JSON.parse(before).grid);
 expect(JSON.parse(configured).cellColors).toEqual(JSON.parse(before).cellColors);
});
