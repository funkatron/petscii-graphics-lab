const {test,expect,ui,download,loadProject,project}=require('./helpers.cjs');
const {capacityPage,artwork}=require('./c64-capacity-fixtures.cjs');
test('timing override permits a bounded program but cannot bypass memory or input validation',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const r=await page.evaluate(async()=>{
  const {createC64AdaptiveProgram}=await import('./c64-export.js');
  const input={columns:40,rows:25,background:6,ink:14,frames:[0,1].map(f=>({cells:Array.from({length:1000},(_,i)=>(i+f)%256),inks:Array.from({length:1000},(_,i)=>(i+f)%16),durationMs:20}))};
  const before=JSON.stringify(input);let rejected=false;try{createC64AdaptiveProgram(input)}catch{rejected=true}
  const allowed=createC64AdaptiveProgram({...input,allowTimingOverrun:true}),analysis=createC64AdaptiveProgram({...input,allowTimingOverrun:true,analyze:true});
  const invalid=[{...input,columns:41},{...input,frames:[{cells:Array(1000).fill(512),inks:Array(1000).fill(1),durationMs:20}]},{...input,frames:Array.from({length:40},(_,f)=>({cells:Array.from({length:1000},(_,i)=>(i*31+f*17)%256),inks:Array.from({length:1000},(_,i)=>(i+f)%16),durationMs:20}))}];
  return {rejected,unchanged:before===JSON.stringify(input),same:allowed.bytes.length===analysis.bytes.length&&allowed.bytes.every((v,i)=>v===analysis.bytes[i]),d:allowed.diagnostics,invalid:invalid.map(x=>{try{createC64AdaptiveProgram({...x,allowTimingOverrun:true});return false}catch{return true}})};
 });
 expect(r.rejected).toBe(true);expect(r.unchanged).toBe(true);expect(r.same).toBe(true);expect(r.d.worstUpdateRatio).toBeGreaterThan(1);expect(r.d.programBytes).toBeLessThanOrEqual(r.d.memoryLimit);expect(r.d.renderer).toBe('native-rows');expect(r.invalid).toEqual([true,true,true]);
});
test('explicit timing consent enables real downloads, preserves warnings and cannot reuse a cached override after withdrawal',async({page})=>{
 await capacityPage(page);const {grid,cellColors}=artwork('detailed-fast');
 await loadProject(page,project(grid,40,24,{cellColors,animation:{effect:'wave',colorEffect:'color-wave',seconds:2,motionCycles:4,colorCycles:4,scale:1,background:'dark'}}));
 await ui(page,'#c64Mode','selectOption','animation');const panel=page.locator('#c64Readiness'),override=page.getByRole('checkbox',{name:'Download despite timing warning'});
 await expect(panel).toContainText('Needs adjustment');await expect(override).toBeVisible();await expect(override).not.toBeChecked();
 let downloads=0;page.on('download',()=>downloads++);await ui(page,'#exportC64');await expect(page.locator('#status')).toContainText('playback speed');expect(downloads).toBe(0);
 await override.check();await expect(panel).toContainText('Timing warning — download allowed');await expect(panel).toContainText('Updates exceed');
 const expected=await page.evaluate(async()=>{const {createC64AdaptiveProgram,createD64Disk}=await import('./c64-export.js'),p=createC64AdaptiveProgram({...window.capacityInput(),allowTimingOverrun:true});return {prg:[...p.bytes],disk:[...createD64Disk(p.bytes,'ANIMATION')]}});
 const prg=await download(page,'#exportC64');expect([...prg]).toEqual(expected.prg);await expect(page.locator('#status')).toContainText('Timing warning overridden');
 await ui(page,'#c64Format','selectOption','d64');await expect(override).toBeChecked();expect([...(await download(page,'#exportC64'))]).toEqual(expected.disk);
 const url=await page.locator('#exportC64').getAttribute('data-download-url');await override.uncheck();await expect(panel).toContainText('Needs adjustment');
 const count=downloads;await ui(page,'#exportC64');await expect(page.locator('#status')).toContainText('playback speed');expect(downloads).toBe(count);await expect(page.locator('#exportC64')).toHaveAttribute('data-download-url',url);
 await override.check();await ui(page,'#animationSeconds','selectOption','4');await ui(page,'#c64Mode','selectOption','animation');await expect(override).not.toBeChecked();
 await loadProject(page,project(Array(26).fill(160),1,26));await expect(panel).toContainText('40 × 25');await expect(override).toBeHidden();
});
