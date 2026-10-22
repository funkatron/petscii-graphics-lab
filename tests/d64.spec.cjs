const {test,expect,ui,download,contents,loadProject,project}=require('./helpers.cjs');
const {spawnSync}=require('node:child_process');

// Independent reader: follow on-disk links, then reconcile every allocation bit.
function readDisk(bytes,name){
 expect(bytes.length).toBe(174848);
 const sectors=t=>t<18?21:t<25?19:t<31?18:17;
 const block=(t,s)=>{expect(t).toBeGreaterThan(0);expect(t).toBeLessThanOrEqual(35);expect(s).toBeGreaterThanOrEqual(0);expect(s).toBeLessThan(sectors(t));let preceding=0;for(let n=1;n<t;n++)preceding+=sectors(n);return bytes.subarray((preceding+s)*256,(preceding+s+1)*256)};
 const bam=block(18,0),dir=block(18,1),used=new Set(['18/0','18/1']);
 expect([...bam.subarray(0,4)]).toEqual([18,1,65,0]);expect(bam.subarray(0x90,0x9b).toString()).toBe('PETSCII LAB');
 expect(bam.subarray(0xa2,0xa7).toString('hex')).toBe('504ca03241');
 expect([...dir.subarray(0,3)]).toEqual([0,255,130]);expect(dir.subarray(5,21).toString('latin1').replace(/\xa0+$/,'')).toBe(name);
 expect([...dir.subarray(32)]).toEqual(Array(224).fill(0));
 let t=dir[3],s=dir[4],blocks=0;const data=[];
 while(t){expect(t).not.toBe(18);const key=t+'/'+s;expect(used.has(key),'sector chain must not repeat').toBe(false);used.add(key);blocks++;const b=block(t,s);if(b[0]===0){expect(b[1]).toBeGreaterThanOrEqual(2);data.push(b.subarray(2,b[1]+1))}else data.push(b.subarray(2));[t,s]=b}
 expect(blocks).toBe(dir.readUInt16LE(30));
 let free=0;
 for(let track=1;track<=35;track++){let count=0;for(let sector=0;sector<24;sector++){const available=!!(bam[track*4+1+(sector>>3)]&(1<<(sector&7)));expect(available,track+'/'+sector).toBe(sector<sectors(track)&&!used.has(track+'/'+sector));if(available)count++}expect(bam[track*4]).toBe(count);if(track!==18)free+=count}
 expect(free).toBe(664-blocks);return Buffer.concat(data);
}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});

test('D64 downloads contain the exact runnable still and composite PRG, with stable repeat downloads',async({page})=>{
 for(const moving of [false,true]){
  await loadProject(page,project([0,160,'',255],4,1,{charset:1,cellColors:[0,2,14,15],animation:{effect:'scroll-x',colorEffect:'color-wave',motionCycles:2,colorCycles:4,seconds:4,scale:1,background:'dark'}}));
  await ui(page,'#c64Mode','selectOption',moving?'animation':'still');if(moving)await ui(page,'#c64Repeats','fill','2');await ui(page,'#c64Format','selectOption','prg');
  const prg=await download(page,'#exportC64'),before=await download(page,'#saveProject');
  await ui(page,'#c64Format','selectOption','d64');await expect(page.locator('#exportC64')).toHaveText('Download C64 disk (.d64)');await expect(page.locator('#c64DiskHelp')).toBeVisible();
  const wait=page.waitForEvent('download');await ui(page,'#exportC64');const file=await wait;expect(file.suggestedFilename()).toBe('petscii-'+(moving?'animation':'still')+'-4x1.d64');
  const disk=await contents(file),extracted=readDisk(disk,moving?'ANIMATION':'PICTURE');expect(extracted).toEqual(prg);
  const result=spawnSync('python3',['tests/c64-emulate.py'],{input:JSON.stringify({prg:[...extracted],stopAfterTicks:8}),encoding:'utf8'});expect(result.status,result.stderr).toBe(0);expect(JSON.parse(result.stdout).snapshots[0].screen.slice(0,4)).toEqual([0,160,32,255]);
  const url=await page.locator('#exportC64').getAttribute('data-download-url');expect(await download(page,'#exportC64')).toEqual(disk);await expect(page.locator('#status')).toHaveText('C64 disk download requested');await expect(page.locator('#exportC64')).toHaveAttribute('data-download-url',url);expect(await download(page,'#saveProject')).toEqual(before);
  await ui(page,'#c64Format','selectOption','prg');expect(await download(page,'#exportC64')).toEqual(prg);await expect(page.locator('#c64DiskHelp')).toBeHidden();
 }
});

test('D64 sector endings and all track-density boundaries preserve data and free space',async({page})=>{
 for(const size of [3,253,254,255,508,17*21*254+1,664*254]){
  const disk=await page.evaluate(async size=>{const {createD64Disk}=await import('./c64-export.js');return [...createD64Disk(Uint8Array.from({length:size},(_,i)=>(i*17+3)&255))]},size);
  const data=readDisk(Buffer.from(disk),'PICTURE');expect(data).toEqual(Buffer.from(Array.from({length:size},(_,i)=>(i*17+3)&255)));
 }
 const errors=await page.evaluate(async()=>{const {createD64Disk}=await import('./c64-export.js');return [()=>createD64Disk(new Uint8Array(2)),()=>createD64Disk(new Uint8Array(664*254+1)),()=>createD64Disk(new Uint8Array(3),'bad/name')].map(fn=>{try{fn();return 'NO ERROR'}catch(e){return e.message}})});
 expect(errors).toEqual([expect.stringContaining('load address'),expect.stringContaining('capacity'),expect.stringContaining('filename')]);
});

test('D64 captures its format and artwork during loading and preserves the last disk after failure',async({page})=>{
 await loadProject(page,project([0,160],2,1));await ui(page,'#c64Format','selectOption','d64');
 let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/c64-export.js',async route=>{started();await gate;await route.continue()});
 const waiting=page.waitForEvent('download');await ui(page,'#exportC64');await loading;await ui(page,'#c64Format','selectOption','prg');await loadProject(page,project([255,128],2,1));release();
 const file=await waiting;expect(file.suggestedFilename()).toMatch(/\.d64$/);const original=readDisk(await contents(file),'PICTURE');expect(original[0]).toBe(1);await expect(page.locator('#exportC64')).toHaveText('Download C64 program (.prg)');
 await ui(page,'#c64Format','selectOption','d64');const changed=readDisk(await download(page,'#exportC64'),'PICTURE');expect(changed).not.toEqual(original);const url=await page.locator('#exportC64').getAttribute('data-download-url');
 await loadProject(page,project(Array(26).fill(160),1,26));await ui(page,'#exportC64');await expect(page.locator('#status')).toContainText('25 rows');await expect(page.locator('#exportC64')).toHaveAttribute('data-download-url',url);
});

test('D64 cancellation while loading publishes no disk and restores the selected download label',async({page})=>{
 await loadProject(page,project([160]));await ui(page,'#c64Format','selectOption','d64');let downloads=0;page.on('download',()=>downloads++);
 let release,started;const gate=new Promise(r=>release=r),loading=new Promise(r=>started=r);await page.route('**/c64-export.js',async route=>{started();await gate;await route.continue()});
 await ui(page,'#exportC64');await loading;await ui(page,'#cancelSheetDownload');release();await expect(page.locator('#status')).toContainText('Export canceled');await expect(page.locator('#exportC64')).toBeEnabled();await expect(page.locator('#exportC64')).toHaveText('Download C64 disk (.d64)');expect(downloads).toBe(0);await expect(page.locator('#exportC64')).not.toHaveAttribute('data-download-url',/./);
 readDisk(await download(page,'#exportC64'),'PICTURE');
});
