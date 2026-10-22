const {GifReader}=require('omggif');
const {test,expect,download,loadProject,project}=require('./helpers.cjs');
test('color can run eight cycles while movement runs four inside the same eight-second loop',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,14,14,14],animation:{effect:'scroll-x',colorEffect:'color-wave',motionCycles:4,colorCycles:8,seconds:8,scale:1,background:'dark'}}));
 const before=JSON.parse(await download(page,'#saveProject')),gif=new GifReader(await download(page,'#exportGif')),colors=[[104,55,43],[111,79,37],[184,199,111],[154,210,132],[112,164,178],[108,94,181],[53,40,121],[111,61,134]],background=[53,40,121];expect(gif.numFrames()).toBe(64);expect(Array.from({length:64},(_,f)=>gif.frameInfo(f).delay*10).reduce((a,b)=>a+b,0)).toBe(8000);
 for(let f=0;f<64;f++){const b=new Uint8Array(32*8*4);gif.decodeAndBlitFrameRGBA(f,b);const x=(4-Math.floor((f%16)/4))%4;for(let col=0;col<4;col++){const i=(4*32+col*8+4)*4;expect([...b.subarray(i,i+3)]).toEqual(col===x?colors[(x+f%8)%8]:background)}}
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});
