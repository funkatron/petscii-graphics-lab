const {GifReader}=require('omggif'),AdmZip=require('adm-zip'),{PNG}=require('pngjs');
const {test,expect,ui,project,loadProject,download,waitForPreviewAdvance,previewSample,waitForProjectAutosave}=require('./helpers.cjs');
const rgb=['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f','6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595'].map(c=>[0,2,4].map(n=>parseInt(c.slice(n,n+2),16)));
const directions=['up-left','up-right','down-left','down-right'];
function frame(p,d,f,count){
 const cells=[],inks=[],wrap=(n,size)=>(n%size+size)%size;
 for(let y=0;y<p.rows;y++)for(let x=0;x<p.columns;x++){
  const sx=wrap(x+(d.includes('right')?-1:1)*Math.floor(f/count*p.columns),p.columns),sy=wrap(y+(d.includes('down')?-1:1)*Math.floor(f/count*p.rows),p.rows),i=sy*p.columns+sx;
  cells.push(p.grid[i]);inks.push(p.cellColors[i]);
 }return {cells,inks};
}
function pixels(p,picture){const out=Buffer.alloc(p.columns*8*p.rows*8*4);for(let y=0;y<p.rows*8;y++)for(let x=0;x<p.columns*8;x++){const i=Math.floor(y/8)*p.columns+Math.floor(x/8);out.set([...rgb[picture.cells[i]===''?6:picture.inks[i]],255],(y*p.columns*8+x)*4)}return out}
function art(w,h,d){return project(Array.from({length:w*h},(_,i)=>i%3===1?'':160),w,h,{cellColors:Array.from({length:w*h},(_,i)=>(i+2)%16),animation:{effect:'scroll-diagonal',scrollDirection:d,colorEffect:'none',seconds:2,scale:1,background:'dark'}})}
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
for(const [w,h]of [[4,4],[5,3],[1,4],[4,1]])for(const d of directions)test(`${d} on ${w} by ${h} matches independent GIF and ZIP frames`,async({page})=>{
 const p=art(w,h,d);await loadProject(page,p);const gif=new GifReader(await download(page,'#exportGif')),zip=new AdmZip(await download(page,'#exportFrames')),timing=JSON.parse(zip.readAsText('timing.json')),count=Math.max(w,h);
 expect(gif.numFrames()).toBe(count);expect(timing.frames).toHaveLength(count);expect(timing.scrollDirection).toBe(d);expect(timing.durationMs).toBe(2000);
 for(let f=0;f<count;f++){const actual=Buffer.alloc(w*8*h*8*4);gif.decodeAndBlitFrameRGBA(f,actual);const expected=pixels(p,frame(p,d,f,count));expect(actual).toEqual(expected);expect(PNG.sync.read(zip.readFile(timing.frames[f].file)).data).toEqual(expected)}
 expect(frame(p,d,count,count)).toEqual(frame(p,d,0,count));
});
test('diagonal controls, preview, history and saved projects preserve direction and source',async({page})=>{
 const p=art(5,3,'down-right');await loadProject(page,p);const before=JSON.parse(await download(page,'#saveProject'));
 await loadProject(page,project([160],1,1));await ui(page,'#undo');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 await ui(page,'#quickPlay');await waitForPreviewAdvance(page);await ui(page,'#quickPlay');const {f,pixels:actual}=await previewSample(page,5,3),picture=frame(p,'down-right',f,5);expect(actual).toEqual(picture.cells.map((g,i)=>rgb[g===''?6:picture.inks[i]]));
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);await ui(page,'#returnDrawing');await waitForProjectAutosave(page,before);await page.reload();await page.locator('.app[data-ready=true]').waitFor();expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
 for(const effect of ['starfield','sine-scroll','wipe','scroll-x']){await loadProject(page,{...before,animation:{...before.animation,effect}});await expect(page.locator('#status')).toContainText('Load failed');expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before)}
 await ui(page,'#animationEffect','selectOption','starfield');await expect(page.locator('#scrollDirection')).toHaveValue('left');await ui(page,'#animationEffect','selectOption','scroll-diagonal');await expect(page.locator('#scrollDirection')).toHaveValue('up-left');
});
