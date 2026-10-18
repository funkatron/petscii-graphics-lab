const {test:base,expect}=require('@playwright/test');
const test=base.extend({page:async({page},use)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await use(page);expect(errors,'No uncaught application exceptions').toEqual([]);
}});
async function contents(download){const chunks=[];for await(const c of await download.createReadStream())chunks.push(c);return Buffer.concat(chunks)}
async function download(page,selector){const [file]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);return contents(file)}
async function loadProject(page,data){await page.locator('#projectFile').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))})}
function project(grid,columns=grid.length,rows=1,extra={}){return {format:'petscii-stencil-lab',version:2,columns,rows,grid,selectedGlyph:0,charset:0,symmetry:'none',...extra}}
module.exports={test,expect,contents,download,loadProject,project};
