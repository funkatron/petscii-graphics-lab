const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {PNG}=require('pngjs'),{GifReader}=require('omggif');
const {test,expect,ui,project,loadProject,download}=require('./helpers.cjs');
const svg=fs.readFileSync('assets/c64-glyphs.svg','utf8');
function rows(id){const body=svg.match(new RegExp('<symbol id="c64-'+Math.floor(id/256)+'-'+id%256+'"[^>]*>([\\s\\S]*?)</symbol>'))[1],bits=Array(8).fill(0);for(const r of body.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g))for(let x=+r[1];x<+r[1]+ +r[3];x++)bits[+r[2]]|=128>>x;return bits}
const ids=[1,257,160,385,351];
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('one palette exposes both alphabets while selection leaves existing mixed artwork intact',async({page})=>{
 await loadProject(page,project(ids,5,1));await expect(page.locator('#charset')).toHaveCount(0);await ui(page,'#showAlphanumerics','check');
 for(const id of [1,257,129,385,160])await expect(page.locator('#palette [data-g="'+id+'"]').first()).toHaveCount(1);
 expect(await page.locator('#palette [data-family="alphanumerics"]').evaluateAll(bs=>bs.slice(0,8).map(b=>Number(b.dataset.g)))).toEqual([1,129,257,385,2,130,258,386]);
 await ui(page,'#palette [data-g="257"]');const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.grid).toEqual(ids);expect(saved.version).toBe(3);expect(saved).not.toHaveProperty('charset');
 await loadProject(page,{...saved,version:2});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved);
});
test('PNG and inverse GIF pixels use each cell’s source bank, including new graphics',async({page})=>{
 await loadProject(page,project(ids,5,1));await ui(page,'#pngScale','selectOption','1');await ui(page,'#pngBg','selectOption','transparent');const png=PNG.sync.read(await download(page,'#png'));
 for(let c=0;c<ids.length;c++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)expect(png.data[((y*2+1)*png.width+c*16+x*2+1)*4+3]>0).toBe(!!(rows(ids[c])[y]&(128>>x)));
 await ui(page,'#animationEffect','selectOption','inverse');await ui(page,'#gifScale','selectOption','1');await ui(page,'#gifBackground','selectOption','transparent');const gif=new GifReader(await download(page,'#exportGif'));
 expect(gif.numFrames()).toBe(2);for(let f=0;f<2;f++){const pixels=Buffer.alloc(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,pixels);for(let c=0;c<ids.length;c++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)expect(pixels[(y*gif.width+c*8+x)*4+3]>0).toBe(!!(rows(ids[c]^(f*128))[y]&(128>>x)))}
});
test('mixed PRG runs from RAM glyphs and restores the machine after continuous animation',async({page})=>{
 await loadProject(page,project(ids,5,1,{animation:{effect:'inverse',seconds:1,scale:1,background:'dark'}}));await ui(page,'#c64Mode','selectOption','animation');const bytes=await download(page,'#exportC64');
 for(const clockHz of [985248,1022727]){const r=spawnSync('python3',['tests/c64-emulate.py'],{input:JSON.stringify({prg:[...bytes],stopAfterTicks:140,startJiffy:250,clockHz,maxSteps:8000000}),encoding:'utf8',maxBuffer:8e6});expect(r.status,r.stderr).toBe(0);const {snapshots}=JSON.parse(r.stdout);expect(snapshots.length).toBeGreaterThanOrEqual(4);
 snapshots.forEach((s,f)=>{for(let c=0;c<ids.length;c++)expect(s.characters.slice(s.screen[497+c]*8,s.screen[497+c]*8+8)).toEqual(rows(ids[c]^((f%2)*128)));expect(s.characters.slice(s.screen[999]*8,s.screen[999]*8+8)).toEqual(Array(8).fill(0))});
 }});
test('mixed ZIP and native video retain the same uppercase, lowercase and graphics pixels',async({page})=>{
 const AdmZip=require('adm-zip'),{decodeVideo}=require('./video-utils.cjs');
 await loadProject(page,project(ids,5,1,{animation:{effect:'inverse',seconds:1,scale:4,background:'dark'}}));
 const zip=new AdmZip(await download(page,'#exportFrames')),meta=JSON.parse(zip.readAsText('timing.json')),video=decodeVideo(await download(page,'#exportVideo'));
 expect(meta.glyphEncoding).toBe('c64-atlas-id');expect(JSON.parse(zip.readAsText('project.json')).grid).toEqual(ids);expect(video.frames).toHaveLength(2);
 for(let f=0;f<2;f++){const png=PNG.sync.read(zip.readFile(meta.frames[f].file));for(let c=0;c<ids.length;c++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){const on=!!(rows(ids[c]^(f*128))[y]&(128>>x)),px=c*32+x*4+2,py=y*4+2,index=py*png.width+px;expect(png.data[index*4]).toBe(on?108:53);expect(Math.abs(video.frames[f][index*3]-(on?108:53))).toBeLessThanOrEqual(20)}}
});
test('C64 pattern limit rejects the whole export instead of dropping glyphs',async({page})=>{
 const error=await page.evaluate(async()=>{const doc=new DOMParser().parseFromString(await (await fetch('./assets/c64-glyphs.svg')).text(),'image/svg+xml'),bits=new Uint8Array(4096);for(let id=0;id<512;id++)for(const r of doc.getElementById('c64-'+Math.floor(id/256)+'-'+id%256).children){for(let x=+r.getAttribute('x');x<+r.getAttribute('x')+ +r.getAttribute('width');x++)bits[id*8+ +r.getAttribute('y')]|=128>>x}const {createC64Program}=await import('./c64-export.js');try{createC64Program({columns:32,rows:16,background:6,ink:14,glyphBits:bits,frames:[{cells:Array.from({length:512},(_,i)=>i),inks:Array(512).fill(14),durationMs:1000}]});return 'NO ERROR'}catch(e){return e.message}});expect(error).toContain('256 distinct patterns');
});
