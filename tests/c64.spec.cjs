const {spawnSync}=require('node:child_process');
const {ui,test,expect,download,loadProject,project}=require('./helpers.cjs');
function emulate(bytes,options={}){const r=spawnSync('python3',['tests/c64-emulate.py'],{input:JSON.stringify({prg:[...bytes],stopAfterTicks:8,...options}),encoding:'utf8',maxBuffer:8e6});expect(r.status,r.stderr).toBe(0);return JSON.parse(r.stdout)}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('PRG RUN entry displays both character sets, code zero, inverse slots and cell colors with 40-column stride',async({page})=>{
 for(const charset of [0,1]){
  const p=project([0,128,160,255],2,2,{charset,cellColors:[0,2,3,15],colors:{ink:14,background:0}});await loadProject(page,p);const before=JSON.parse(await download(page,'#saveProject')),bytes=await download(page,'#exportC64');expect([...bytes.slice(0,2)]).toEqual([1,8]);expect(bytes.toString('ascii',7,11)).toBe('2061');
  const {snapshots,exitTick}=emulate(bytes),first=snapshots[0];expect(first.screen.slice(0,2)).toEqual([0,128]);expect(first.screen.slice(40,42)).toEqual([160,255]);expect(first.screen[2]).toBe(32);expect(first.colors.slice(0,2)).toEqual([0,2]);expect(first.colors.slice(40,42)).toEqual([3,15]);expect(first.colors[999]).toBe(14);expect(first.registers.slice(0,7)).toEqual([0x97,0x3f,0x1b,8,charset?0x17:0x15,0,0]);expect(exitTick).toBe(8);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);expect(await download(page,'#exportC64')).toEqual(bytes);
 }
});
test('C64 composite player executes two complete loops, holds its last frame, and survives clock-byte wrap on PAL/NTSC CPU speeds',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,14,14,14],colors:{ink:14,background:6},animation:{effect:'scroll-x',colorEffect:'color-wave',seconds:1,scale:1,background:'transparent'}}));await ui(page,'#c64Mode','selectOption','animation');await ui(page,'#c64Repeats','fill','2');const bytes=await download(page,'#exportC64'),ramp=[2,8,7,13,3,14,6,4];
 for(const clockHz of [985248,1022727]){
  const {snapshots,exitTick}=emulate(bytes,{stopAfterTicks:135,startJiffy:250,clockHz});expect(snapshots).toHaveLength(16);expect(exitTick).toBe(135);
  snapshots.forEach((s,f)=>{const i=f%8,x=(4-Math.floor(i/8*4))%4;expect(s.screen.slice(0,4)).toEqual(Array.from({length:4},(_,col)=>col===x?160:32));expect(s.colors[x]).toBe(ramp[(x+i)%8]);expect(s.registers[6]).toBe(6);expect(Math.abs(s.tick-Math.round(f*60/8))).toBeLessThanOrEqual(2)});
 }
 await ui(page,'#c64Repeats','fill','0');const loop=emulate(await download(page,'#exportC64'),{stopAfterTicks:135});expect(loop.snapshots.length).toBeGreaterThan(16);
});
test('C64 export rejects unsupported geometry, shapes, invalid loops, excessive speed and memory without damaging the project',async({page})=>{
 for(const [p,message] of [[project(Array(26).fill(160),1,26),'25 rows'],[project(['█']), 'Legacy shapes']]){await loadProject(page,p);const before=JSON.parse(await download(page,'#saveProject'));await ui(page,'#exportC64');await expect(page.locator('#status')).toContainText(message);expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}
 await loadProject(page,project([160]));await ui(page,'#c64Mode','selectOption','animation');await ui(page,'#c64Repeats','fill','1.5');await ui(page,'#exportC64');await expect(page.locator('#status')).toContainText('whole number');
 const errors=await page.evaluate(async()=>{const {createC64Program}=await import('./c64-export.js'),make=(frames)=>{try{createC64Program({columns:40,rows:25,charset:0,background:6,ink:14,frames});return 'NO ERROR'}catch(e){return e.message}},frame=(f,durationMs)=>({cells:Array.from({length:1000},(_,i)=>(i+f)%256),inks:Array.from({length:1000},(_,i)=>(i+f)%16),durationMs});return [make([frame(0,20),frame(1,20)]),make(Array.from({length:12},(_,f)=>frame(f,1000)))]});expect(errors[0]).toContain('playback speed');expect(errors[1]).toContain('memory budget');
});
test('C64 export snapshots the selected combination and supports cancellation during lazy loading',async({page})=>{
 await loadProject(page,project([160,''],2,1,{cellColors:[2,14],animation:{effect:'scroll-x',colorEffect:'color-wave',seconds:1,scale:1,background:'dark'}}));await ui(page,'#c64Mode','selectOption','animation');let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/c64-export.js',async route=>{started();await gate;await route.continue()});await ui(page,'#exportC64');await loading;await ui(page,'#cancelSheetDownload');release();await expect(page.locator('#status')).toContainText('Export canceled');await expect(page.locator('#exportC64')).toBeEnabled();
 const waiting=page.waitForEvent('download');await ui(page,'#exportC64');const file=await waiting;expect(file.suggestedFilename()).toContain('animation');
});
test('C64 lazy loading captures both effects and ink before later editing',async({page})=>{
 const {contents}=require('./helpers.cjs');await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,14,14,14],animation:{effect:'scroll-x',colorEffect:'color-wave',seconds:1,scale:1,background:'dark'}}));await ui(page,'#c64Mode','selectOption','animation');await ui(page,'#c64Repeats','fill','1');
 let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/c64-export.js',async route=>{started();await gate;await route.continue()});const waiting=page.waitForEvent('download');await ui(page,'#exportC64');await loading;
 await ui(page,'#animationEffect','selectOption','inverse');await ui(page,'#animationColor','selectOption','color-glow');await ui(page,'#recolorDrawing');release();const bytes=await contents(await waiting),{snapshots}=emulate(bytes,{stopAfterTicks:70});expect(snapshots).toHaveLength(8);expect(snapshots[0].colors[0]).toBe(2);expect(snapshots[2].screen.slice(0,4)).toEqual([32,32,32,160]);expect(snapshots[2].colors[3]).toBe(14);
 const url=await page.locator('#exportC64').getAttribute('data-download-url');await loadProject(page,project(['█']));await ui(page,'#exportC64');await expect(page.locator('#status')).toContainText('Legacy shapes');await expect(page.locator('#exportC64')).toHaveAttribute('data-download-url',url);
});
test('long C64 frame delays use both timer bytes across repeated clock wrap',async({page})=>{
 await loadProject(page,project([0,160],2,1,{animation:{effect:'inverse',colorEffect:'none',seconds:12,scale:1,background:'dark'}}));await ui(page,'#c64Mode','selectOption','animation');await ui(page,'#c64Repeats','fill','1');const {snapshots}=emulate(await download(page,'#exportC64'),{clockHz:100000,stopAfterTicks:750,startJiffy:245});expect(snapshots).toHaveLength(2);expect(snapshots[0].screen.slice(0,2)).toEqual([0,160]);expect(snapshots[1].screen.slice(0,2)).toEqual([128,32]);expect(Math.abs(snapshots[1].tick-snapshots[0].tick-360)).toBeLessThanOrEqual(2);
});
test('C64 animation respects rightward scroll and independent square color waves',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,14,14,14],animation:{effect:'scroll-x',scrollDirection:'right',colorEffect:'color-wave',colorWaveDirection:'right',colorWaveShape:'square',seconds:1,scale:1,background:'dark'}}));await ui(page,'#c64Mode','selectOption','animation');await ui(page,'#c64Repeats','fill','1');
 const {snapshots}=emulate(await download(page,'#exportC64'),{stopAfterTicks:70}),ramp=[2,8,7,13,3,14,6,4];
 // Consecutive equal states may be omitted by the independent CPU observer.
 const expected=Array.from({length:8},(_,f)=>{const x=Math.floor(f/8*4),level=((f/8-x/8)%1+1)%1<.5?7:0;return {screen:Array.from({length:4},(_,i)=>i===x?160:32),ink:ramp[level],x}}).filter((s,i,a)=>i===0||s.x!==a[i-1].x||s.ink!==a[i-1].ink);
 expect(snapshots).toHaveLength(expected.length);snapshots.forEach((s,i)=>{expect(s.screen.slice(0,4)).toEqual(expected[i].screen);expect(s.colors[expected[i].x]).toBe(expected[i].ink)});
});
test('C64 player repeats movement four times and colors twice within one two-second loop',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,14,14,14],animation:{effect:'scroll-x',colorEffect:'color-wave',motionCycles:4,colorCycles:2,seconds:2,scale:1,background:'dark'}}));await ui(page,'#c64Mode','selectOption','animation');await ui(page,'#c64Repeats','fill','1');const {snapshots}=emulate(await download(page,'#exportC64'),{stopAfterTicks:130}),ramp=[2,8,7,13,3,14,6,4];expect(snapshots).toHaveLength(16);snapshots.forEach((s,f)=>{const x=(4-f%4)%4;expect(s.screen.slice(0,4)).toEqual(Array.from({length:4},(_,i)=>i===x?160:32));expect(s.colors[x]).toBe(ramp[(x+f%8)%8]);expect(Math.abs(s.tick-Math.round(f*120/16))).toBeLessThanOrEqual(2)});
});
