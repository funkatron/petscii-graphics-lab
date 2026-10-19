const {test:base,expect}=require('@playwright/test');
const test=base.extend({page:async({page},use)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await use(page);expect(errors,'No uncaught application exceptions').toEqual([]);
}});
async function contents(download){const chunks=[];for await(const c of await download.createReadStream())chunks.push(c);return Buffer.concat(chunks)}
async function reveal(page,selector){
 const target=page.locator(selector).first();
 const location=await target.evaluate(e=>({picker:!!e.closest('#glyphPicker'),sidebar:!!e.closest('#sidebar'),mode:e.closest('[data-export-mode]')?.dataset.exportMode,format:e.closest('[data-motion-format]')?.dataset.motionFormat}));
 if(location.picker){if(await page.locator('#glyphPicker').isHidden())await page.locator('#glyphToggle').click()}
 else if(location.sidebar){
  if(await page.locator('#glyphBackdrop').isVisible())await page.locator('#glyphClose').click();
  if(await page.locator('#sidebar').evaluate(e=>e.classList.contains('closed')))await page.locator('#toggle').click();
 }
 // Open disclosures from outside in, using actual user controls.
 const details=await target.evaluate(e=>{const ids=[];for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&p.id)ids.unshift(p.id);return ids});
 for(const id of details)if(!await page.locator('#'+id).evaluate(e=>e.open))await page.locator('#'+id+' > summary').click();
 if(location.mode)await page.locator('[data-export-tab="'+location.mode+'"]').click();
 if(location.format)await page.locator('#animationFormat').selectOption(location.format);
}
async function ui(page,selector,method='click',...args){await reveal(page,selector);return page.locator(selector).first()[method](...args)}
async function download(page,selector){await reveal(page,selector);const [file]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);return contents(file)}
async function loadProject(page,data){await page.locator('#projectFile').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await expect(page.locator('#projectFile')).toHaveValue('')}
// Keep historical fixtures at an explicit four-second baseline; new-project speed is tested separately.
function project(grid,columns=grid.length,rows=1,extra={}){return {format:'petscii-stencil-lab',version:2,columns,rows,grid,selectedGlyph:0,charset:0,symmetry:'none',animation:{effect:'replay',seconds:4,scale:2,background:'dark'},...extra}}
module.exports={reveal,ui,test,expect,contents,download,loadProject,project};
