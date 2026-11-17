const fs=require('fs');
const path=require('path');
const {PNG}=require('pngjs');
const {test,expect,ui,download,loadProject,project}=require('./helpers.cjs');

const fixture=path.join(__dirname,'fixtures','reference-2x2.png');

function writeFixture(){
 const png=new PNG({width:16,height:16});
 for(let y=0;y<16;y++){
  for(let x=0;x<16;x++){
   const idx=(y*16+x)*4;
   const v=(x<8)!==(y<8)?255:0;
   png.data[idx]=v;
   png.data[idx+1]=v;
   png.data[idx+2]=v;
   png.data[idx+3]=255;
  }
 }
 fs.mkdirSync(path.dirname(fixture),{recursive:true});
 fs.writeFileSync(fixture,PNG.sync.write(png));
}

test.beforeAll(()=>writeFixture());

test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.locator('.app[data-ready=true]').waitFor();
});

test('reference overlay applies approximate grid and can be removed without apply',async({page})=>{
 await loadProject(page,project(['','','',''],2,2));
 const before=JSON.parse(await download(page,'#saveProject'));
 await ui(page,'#openReferenceImage');
 await page.locator('#referenceImageFile').setInputFiles(fixture);
 await expect(page.locator('#referenceOverlayBar')).toBeVisible();
 await ui(page,'#referenceCancel');
 await expect(page.locator('#referenceOverlayBar')).toBeHidden();
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(before);
});

test('apply reference updates 2×2 grid with undo restore',async({page})=>{
 await loadProject(page,project(['','','',''],2,2));
 const empty=JSON.parse(await download(page,'#saveProject'));
 await ui(page,'#openReferenceImage');
 await page.locator('#referenceImageFile').setInputFiles(fixture);
 await ui(page,'#referenceApply');
 await expect(page.locator('#referenceOverlayBar')).toBeHidden();
 const after=JSON.parse(await download(page,'#saveProject'));
 expect(after.grid.some((g)=>typeof g==='number')).toBe(true);
 expect(after).not.toEqual(empty);
 await ui(page,'#undo');
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(empty);
});