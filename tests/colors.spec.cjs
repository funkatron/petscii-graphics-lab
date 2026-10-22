const {PNG}=require('pngjs'),{GifReader}=require('omggif'),AdmZip=require('adm-zip');
const {ui,test,expect,contents,download,loadProject,project}=require('./helpers.cjs');
const {decodeVideo,nearPixel}=require('./video-utils.cjs');
const hex=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'];
const rgb=index=>[0,2,4].map(i=>parseInt(hex[index].slice(i,i+2),16));
const pixel=(png,x,y)=>Array.from(png.data.subarray((y*png.width+x)*4,(y*png.width+x)*4+4));
async function choose(page,target,index){await ui(page,'#'+target+'Target');await ui(page,'#colorPalette button:nth-child('+(index+1)+')')}
async function canvasPixels(page){return page.locator('#canvas').evaluate(c=>{const t=c.getContext('2d');return [.25,.75].map(x=>Array.from(t.getImageData(Math.floor(c.width*x),Math.floor(c.height*.5),1,1).data))})}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
test('all sixteen C64 swatches use documented RGB values and update bitmap previews and canvas',async({page})=>{
 await loadProject(page,project([160,''],2,1,{selectedGlyph:160}));await ui(page,'#inkTarget');await expect(page.locator('#colorPalette button')).toHaveCount(16);
 const swatches=await page.locator('#colorPalette button').evaluateAll(buttons=>buttons.map(b=>getComputedStyle(b).backgroundColor));expect(swatches).toEqual(hex.map((_,i)=>'rgb('+rgb(i).join(', ')+')'));
 await choose(page,'ink',2);await ui(page,'#recolorDrawing');await expect(page.locator('#inkName')).toHaveText('Red');await expect(page.locator('#inkTarget')).toHaveAttribute('aria-pressed','true');
 expect(await canvasPixels(page)).toEqual([[...rgb(2),255],[...rgb(6),255]]);
 expect(await page.locator('#glyphPreview').evaluate(c=>Array.from(c.getContext('2d').getImageData(12,12,1,1).data))).toEqual([...rgb(2),255]);
 await choose(page,'background',1);expect(await canvasPixels(page)).toEqual([[...rgb(2),255],[255,255,255,255]]);await expect(page.locator('#backgroundName')).toHaveText('White');await expect(page.locator('#colorPalette button:nth-child(2)')).toHaveAttribute('aria-pressed','true');
});
test('project colors autosave, round-trip, undo, and reject corrupt indices atomically',async({page})=>{
 // Includes reload, undo/redo, and seven invalid-file round trips with real downloads.
 test.setTimeout(60000);
 await loadProject(page,project([160,''],2,1));await choose(page,'ink',2);await choose(page,'background',1);const saved=JSON.parse(await download(page,'#saveProject'));expect(saved.colors).toEqual({ink:2,background:1});
 await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject')).colors).toEqual({ink:2,background:6});await ui(page,'#redo');await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject')).colors).toEqual(saved.colors);
 await loadProject(page,project([160]));expect(JSON.parse(await download(page,'#saveProject')).colors).toEqual({ink:14,background:6});await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved);
 for(const colors of [null,{}, {ink:16,background:0},{ink:0,background:-1},{ink:'2',background:1},{ink:1.5,background:0},{ink:0}]){await loadProject(page,{...saved,colors});await expect(page.locator('#status')).toContainText('Load failed: Invalid C64 colors');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved)}
});
test('SVG and PNG use selected ink and canvas background, with explicit transparency and background overrides',async({page})=>{
 await loadProject(page,project([160,''],2,1,{colors:{ink:2,background:3}}));
 let svg=(await download(page,'#svg')).toString();expect(svg).toContain('fill="#68372b"');expect(svg).toContain('fill="#70a4b2"');
 let png=PNG.sync.read(await download(page,'#png'));expect(pixel(png,32,32)).toEqual([...rgb(2),255]);expect(pixel(png,96,32)).toEqual([...rgb(3),255]);
 await ui(page,'#pngBg','selectOption','transparent');png=PNG.sync.read(await download(page,'#png'));expect(pixel(png,32,32)).toEqual([...rgb(2),255]);expect(pixel(png,96,32)[3]).toBe(0);svg=(await download(page,'#svg')).toString();expect(svg).not.toContain('width="100%"');expect(svg).toContain('fill="#68372b"');
 await ui(page,'#pngBg','selectOption','black');png=PNG.sync.read(await download(page,'#png'));expect(pixel(png,32,32)).toEqual([...rgb(2),255]);expect(pixel(png,96,32)).toEqual([0,0,0,255]);
});
test('GIF and frame ZIP preserve selected colors, transparency, and snapshot metadata',async({page})=>{
 await loadProject(page,project([160,''],2,1,{colors:{ink:7,background:6},animation:{effect:'scroll-x',seconds:1,scale:1,background:'dark'}}));
 const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames'));const metadata=JSON.parse(zip.readAsText('timing.json'));expect(metadata).toMatchObject({colors:{ink:7,background:6},colorPalette:'pepto-pal'});expect(JSON.parse(zip.readAsText('project.json')).colors).toEqual({ink:7,background:6});
 for(let f=0;f<2;f++){const data=new Uint8Array(16*8*4);gif.decodeAndBlitFrameRGBA(f,data);const png=PNG.sync.read(zip.readFile(metadata.frames[f].file));for(let cell=0;cell<2;cell++){const expected=[...rgb(cell===f?7:6),255];expect(Array.from(data.slice((4*16+cell*8+4)*4,(4*16+cell*8+4)*4+4))).toEqual(expected);expect(pixel(png,cell*8+4,4)).toEqual(expected)}}
 await ui(page,'#gifBackground','selectOption','transparent');const transparent=new GifReader(await download(page,'#exportGif')),data=new Uint8Array(16*8*4);transparent.decodeAndBlitFrameRGBA(0,data);expect(Array.from(data.slice((4*16+4)*4,(4*16+4)*4+4))).toEqual([...rgb(7),255]);expect(data[(4*16+12)*4+3]).toBe(0);
});
test('native repeated video snapshots colors before encoder loading and uses canvas background for transparency',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{colors:{ink:7,background:6},animation:{effect:'scroll-x',seconds:.5,scale:4,background:'transparent',videoRepeats:3}}));let release,requested;const gate=new Promise(r=>release=r),started=new Promise(r=>requested=r);await page.route('**/video-export.js',async route=>{requested();await gate;await route.continue()});
 const waiting=page.waitForEvent('download');await ui(page,'#exportVideo');await started;await choose(page,'ink',3);await choose(page,'background',0);await ui(page,'#recolorDrawing');release();
 const v=decodeVideo(await contents(await waiting));expect(Number(v.info.format.duration)).toBeCloseTo(1.5,2);expect(v.frames).toHaveLength(12);for(let f=0;f<12;f++)for(let x=0;x<4;x++)nearPixel(v,f,x*32+16,16,rgb(x===(4-f%4)%4?7:6));expect(JSON.parse(await download(page,'#saveProject')).colors).toEqual({ink:3,background:0});
});
test('authentic bitmap geometry, black ink, swapped colors, and identical colors remain editable and exportable',async({page})=>{
 await loadProject(page,project([160,''],2,1,{selectedGlyph:160,colors:{ink:0,background:1}}));expect(await canvasPixels(page)).toEqual([[0,0,0,255],[255,255,255,255]]);await ui(page,'#swapColors');await ui(page,'#recolorDrawing');expect(await canvasPixels(page)).toEqual([[255,255,255,255],[0,0,0,255]]);await ui(page,'#undo');await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject')).colors).toEqual({ink:0,background:1});
 await choose(page,'ink',3);await choose(page,'background',3);await ui(page,'#recolorDrawing');const gif=new GifReader(await download(page,'#exportGif')),data=new Uint8Array(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(gif.numFrames()-1,data);expect(Array.from(data.slice(0,4))).toEqual([...rgb(3),255]);expect(Array.from(data.slice(-4))).toEqual([...rgb(3),255]);
});
