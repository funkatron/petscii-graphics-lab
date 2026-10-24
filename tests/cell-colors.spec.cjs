const {PNG}=require('pngjs'),{GifReader}=require('omggif'),AdmZip=require('adm-zip');
const {ui,test,expect,download,loadProject,project}=require('./helpers.cjs');
const {decodeVideo,nearPixel}=require('./video-utils.cjs');
const red=[104,55,43],cyan=[112,164,178],blue=[108,94,181],black=[0,0,0];
const pixel=(png,x,y)=>Array.from(png.data.slice((y*png.width+x)*4,(y*png.width+x)*4+4));
async function saved(page){return JSON.parse(await download(page,'#saveProject'))}
async function ink(page,index){await ui(page,'#inkTarget');await ui(page,'#colorPalette button:nth-child('+(index+1)+')')}
async function paint(page,x,y=.5){const b=await page.locator('#canvas').boundingBox();if(await page.locator('#glyphBackdrop').isVisible())await ui(page,'#glyphClose');await page.mouse.click(b.x+b.width*x,b.y+b.height*y)}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('brush paints individual colors, recolors the same glyph, and retains colored replay through undo and autosave',async({page})=>{
 await loadProject(page,project([160,160],2,1,{selectedGlyph:160}));await ink(page,2);expect((await saved(page)).cellColors).toEqual([14,14]);await paint(page,.25);let p=await saved(page);expect(p.cellColors).toEqual([2,14]);expect(p.drawingReplay.eventColors).toEqual([14,14,2]);
 await ink(page,3);await paint(page,.75);p=await saved(page);expect(p.cellColors).toEqual([2,3]);expect(await page.locator('#canvas').evaluate(c=>[.25,.75].map(x=>Array.from(c.getContext('2d').getImageData(c.width*x,c.height*.5,1,1).data)))).toEqual([[...red,255],[...cyan,255]]);await ui(page,'#undo');expect((await saved(page)).cellColors).toEqual([2,14]);await ui(page,'#redo');await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(await saved(page)).toEqual(p);
 await ui(page,'#recolorDrawing');expect((await saved(page)).cellColors).toEqual([3,3]);await ui(page,'#undo');expect((await saved(page)).cellColors).toEqual([2,3]);
});
test('color survives symmetry, resize, patterns, screen codes and separate color RAM',async({page})=>{
 await loadProject(page,project(['','','',''],4,1,{selectedGlyph:160}));await ink(page,0);await ui(page,'#sym','selectOption','horizontal');await paint(page,.125);expect((await saved(page)).cellColors).toEqual([0,14,14,0]);await ui(page,'#columns','selectOption','5');let p=await saved(page);expect(p.cellColors).toEqual([0,14,14,0,0]);await ink(page,2);await ui(page,'#border');p=await saved(page);expect(p.cellColors).toEqual([2,2,2,2,2]);expect(Array.from(await download(page,'#colorRam'))).toEqual(p.cellColors);expect(Array.from(await download(page,'#screenCodes'))).toEqual([160,0,160,0,160,0,160,0,160,0]);await ui(page,'#undo');expect((await saved(page)).cellColors).toEqual([0,14,14,0,0]);
});
test('older files inherit global ink and malformed color recordings fail atomically',async({page})=>{
 await loadProject(page,project([160,0],2,1,{colors:{ink:0,background:1},drawingReplay:{base:['',''],events:[[0,160],[1,0]]}}));const p=await saved(page);expect(p.cellColors).toEqual([0,0]);expect(p.drawingReplay.eventColors).toEqual([0,0]);
 for(const cellColors of [[],[0],[0,16],[0,-1],[0,'2'],null]){await loadProject(page,{...p,cellColors});await expect(page.locator('#status')).toContainText('Load failed');expect(await saved(page)).toEqual(p)}
 for(const r of [{...p.drawingReplay,eventColors:[1,0]},{...p.drawingReplay,eventColors:[]},{...p.drawingReplay,baseColors:[0,16]}]){await loadProject(page,{...p,drawingReplay:r});await expect(page.locator('#status')).toContainText('Load failed');expect(await saved(page)).toEqual(p)}
});
test('mixed cell colors match SVG, PNG, scrolling GIF/ZIP, inverse slots and transparent black',async({page})=>{
 const p=project([160,160,160,''],4,1,{cellColors:[2,3,0,14],colors:{ink:7,background:0},animation:{effect:'scroll-x',seconds:.5,scale:2,background:'transparent'}});await loadProject(page,p);
 const svg=(await download(page,'#svg')).toString();expect(svg).toContain('fill="#68372b" transform=');expect(svg).toContain('fill="#70a4b2" transform=');await ui(page,'#pngBg','selectOption','transparent');const png=PNG.sync.read(await download(page,'#png'));for(const [i,c] of [red,cyan,black].entries())expect(pixel(png,i*64+32,32)).toEqual([...c,255]);expect(pixel(png,224,32)[3]).toBe(0);
 const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),m=JSON.parse(zip.readAsText('timing.json'));expect(JSON.parse(zip.readAsText('project.json')).cellColors).toEqual(p.cellColors);
 for(let f=0;f<4;f++){const bytes=new Uint8Array(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,bytes);const frame=PNG.sync.read(zip.readFile(m.frames[f].file));for(let x=0;x<4;x++){const source=(x+f)%4,expected=source===3?[0,0,0,0]:[...[red,cyan,black][source],255],offset=(8*gif.width+x*16+8)*4;expect(Array.from(bytes.slice(offset,offset+4))).toEqual(expected);expect(pixel(frame,x*16+8,8)).toEqual(expected)}}
 await loadProject(page,{...p,grid:[32,32,32,''],animation:{...p.animation,effect:'inverse'}});const inv=new GifReader(await download(page,'#exportGif')),bytes=new Uint8Array(inv.width*inv.height*4);inv.decodeAndBlitFrameRGBA(1,bytes);expect(Array.from(bytes.slice((8*inv.width+8)*4,(8*inv.width+8)*4+4))).toEqual([...red,255]);
});
test('replay and native repeated video retain each color including same-glyph recoloring',async({page})=>{
 const p=project([160,160,'',''],4,1,{cellColors:[2,3,14,14],drawingReplay:{base:[160,160,'',''],baseColors:[14,14,14,14],events:[[0,160],[1,160]],eventColors:[2,3]},animation:{effect:'replay',seconds:.5,scale:4,background:'dark',videoRepeats:2}});await loadProject(page,p);
 const gif=new GifReader(await download(page,'#exportGif'));for(let f=0;f<3;f++){const b=new Uint8Array(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(f,b);for(let x=0;x<2;x++){const offset=(16*gif.width+x*32+16)*4;expect(Array.from(b.slice(offset,offset+3))).toEqual(x===0?(f?red:blue):(f===2?cyan:blue))}}
 const v=decodeVideo(await download(page,'#exportVideo'));expect(v.frames).toHaveLength(6);for(let f=0;f<6;f++){nearPixel(v,f,16,16,f%3?red:blue);nearPixel(v,f,48,16,f%3===2?cyan:blue)}
});
