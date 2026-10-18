const {test:base,expect}=require('@playwright/test');
const test=base.extend({page:async({page},use)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await use(page);expect(errors,'No uncaught application exceptions').toEqual([]);
}});
async function contents(download){const chunks=[];for await(const c of await download.createReadStream())chunks.push(c);return Buffer.concat(chunks)}
async function download(page,selector){const [file]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);return contents(file)}
async function loadProject(page,data){await page.locator('#projectFile').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))})}
function project(grid,columns=grid.length,rows=1,extra={}){return {format:'petscii-stencil-lab',version:2,columns,rows,grid,selectedGlyph:0,charset:0,symmetry:'none',...extra}}
function fixtureRom(){
 const rom=Buffer.alloc(4096);
 // Deliberately asymmetric probe: MSB is left, first byte is the top row.
 rom[0]=0x80;rom[1]=0x40;rom[7]=0x01;
 for(let i=0;i<8;i++)rom[128*8+i]=rom[i]^255;
 rom[2048]=0x01;rom[2048+7]=0x80;
 rom[64*8]=0xff;rom[192*8+7]=0xff;
 return rom;
}
async function loadRom(page,rom=fixtureRom()){await page.locator('#romInput').setInputFiles({name:'probe.bin',mimeType:'application/octet-stream',buffer:rom});await expect(page.locator('#romInfo')).toContainText('4 KB ROM')}
module.exports={test,expect,contents,download,loadProject,project,fixtureRom,loadRom};
