const {test:base,expect}=require('@playwright/test');
const test=base.extend({page:async({page},use)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await use(page);expect(errors,'No uncaught application exceptions').toEqual([]);
}});
async function contents(download){const chunks=[];for await(const c of await download.createReadStream())chunks.push(c);return Buffer.concat(chunks)}
async function reveal(page,selector){
 const target=page.locator(selector).first();
 const location=await target.evaluate(e=>({dialog:!!e.closest('#downloadDialog'),picker:!!e.closest('#glyphPicker'),sidebar:!!e.closest('#sidebar'),mode:e.closest('[data-export-mode]')?.dataset.exportMode,format:e.closest('[data-motion-format]')?.dataset.motionFormat}));
 if(location.dialog){if(!await page.locator('#downloadDialog').evaluate(e=>e.open))await page.locator('#downloadOpen').click()}
 else if(await page.locator('#downloadDialog').evaluate(e=>e.open))await page.locator('#downloadClose').click();
 if(location.picker){if(await page.locator('#glyphPicker').isHidden())await page.locator('#glyphToggle').click()}
 else if(location.sidebar){
  if(await page.locator('#glyphBackdrop').isVisible())await page.locator('#glyphClose').click();
  if(await page.locator('#sidebar').evaluate(e=>e.classList.contains('closed')))await page.locator('#toggle').click();
 }
 if(location.mode)await page.locator('[data-export-tab="'+location.mode+'"]').click();
 // Open disclosures from outside in, using actual user controls.
 const details=await target.evaluate(e=>{const ids=[];for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&p.id)ids.unshift(p.id);return ids});
 for(const id of details)if(!await page.locator('#'+id).evaluate(e=>e.open))await page.locator('#'+id+' > summary').click();
 if(selector==='#png'||selector==='#svg')await page.locator('#stillFormat').selectOption(selector.slice(1));
 if(location.format)await page.locator('#animationFormat').selectOption(location.format);
}
async function ui(page,selector,method='click',...args){await reveal(page,selector);const result=await page.locator(selector).first()[method](...args);if(method==='selectOption'&&['#columns','#rows'].includes(selector))await page.locator('#applyResize').click();return result}
async function download(page,selector){await reveal(page,selector);const [file]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);return contents(file)}
// Wait for observable state, not a runner-speed-dependent sleep.
async function waitForPreviewAdvance(page){await expect.poll(async()=>Number(await page.locator('#canvas').getAttribute('data-animation-frame')||0)).toBeGreaterThan(0)}
async function waitForProjectAutosave(page,expected){await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('petscii-graphics-project-v3')))).toEqual(expected)}
async function loadProject(page,data){await page.locator('#projectFile').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await expect(page.locator('#projectFile')).toHaveValue('')}
// Keep historical fixtures at an explicit four-second baseline; new-project speed is tested separately.
function project(grid,columns=grid.length,rows=1,extra={}){
 const p={format:'petscii-stencil-lab',version:3,columns,rows,grid,selectedGlyph:0,symmetry:'none',animation:{effect:'replay',seconds:4,scale:2,background:'dark'},...extra};
 // Existing test vectors describe source ROM banks; fixtures encode them as absolute atlas IDs.
 if(p.charset===1){const id=g=>g===''?g:g+256;p.grid=p.grid.map(id);p.selectedGlyph=id(p.selectedGlyph);if(p.drawingReplay)p.drawingReplay={...p.drawingReplay,base:p.drawingReplay.base.map(id),events:p.drawingReplay.events.map(([i,g])=>[i,id(g)])}}
 delete p.charset;return p;
}
module.exports={waitForPreviewAdvance,waitForProjectAutosave,reveal,ui,test,expect,contents,download,loadProject,project};
