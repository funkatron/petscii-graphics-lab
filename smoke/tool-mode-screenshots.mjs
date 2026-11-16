// Reproducible captures for Pick/Fill mode menus (human review; not pixel diff).
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const VIEWPORT_PROFILES={
  desktop:{width:1280,height:900,deviceScaleFactor:1,prefix:'desktop-'},
  'ipad-portrait':{width:834,height:1194,deviceScaleFactor:2,prefix:'ipad-portrait-'},
  'ipad-landscape':{width:1194,height:834,deviceScaleFactor:2,prefix:'ipad-landscape-'},
};
const profileNames=(process.env.PETSCII_SCREENSHOT_PROFILES??'desktop').split(',').map(s=>s.trim()).filter(Boolean);
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(process.env.PETSCII_SCREENSHOT_DIR??'artifacts/tool-mode-screenshots');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const route=new URL(req.url??'/','http://localhost').pathname;
    const path=resolve(root,route==='/'?'index.html':route.slice(1));
    if(!path.startsWith(root))throw Error('Invalid path');
    res.setHeader('Content-Type',mime[extname(path)]??'application/octet-stream');
    res.end(await readFile(path));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const baseUrl=`http://127.0.0.1:${server.address().port}/`;

async function openMenu(page,trigger,menuId){
  if(await page.locator(menuId).evaluate(el=>el.open))return;
  await page.locator(trigger).click();
  await page.waitForFunction(id=>document.querySelector(id)?.open,[menuId]);
}
async function captureStrip(page,prefix,shots){
  async function shot(name,fn){
    if(fn)await fn();
    await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
    const file=`${prefix}${name}.png`;
    await page.screenshot({path:resolve(output,file),animations:'disabled',fullPage:false});
    shots.push({file,profile:prefix});
  }
  await page.goto(baseUrl);
  await page.locator('.app[data-ready=true]').waitFor();
  await shot('01-drawing-strip-idle');
  await shot('02-fill-menu-open',async()=>{await openMenu(page,'#tool-fill','#fillMenu')});
  for(const mode of ['both','glyph','ink']){
    await shot(`03-fill-mode-${mode}`,async()=>{
      await openMenu(page,'#tool-fill','#fillMenu');
      await page.locator('#fillMenu .tool-mode-option[data-mode="'+mode+'"]').click({force:true});
    });
  }
  await shot('04-picker-menu-open',async()=>{await openMenu(page,'#tool-picker','#pickerMenu')});
  for(const mode of ['ink','glyph','background']){
    await shot(`05-picker-mode-${mode}`,async()=>{
      await openMenu(page,'#tool-picker','#pickerMenu');
      await page.locator('#pickerMenu .tool-mode-option[data-mode="'+mode+'"]').click({force:true});
    });
  }
}

let browser;
try{
  browser=await chromium.launch({headless:true});
  const allShots=[];
  const profiles=[];
  await mkdir(output,{recursive:true});
  for(const name of profileNames){
    const profile=VIEWPORT_PROFILES[name];
    if(!profile)throw new Error(`Unknown screenshot profile: ${name}`);
    profiles.push({name,...profile});
    const page=await browser.newPage({
      viewport:{width:profile.width,height:profile.height},
      deviceScaleFactor:profile.deviceScaleFactor,
      reducedMotion:'reduce',
    });
    const errors=[];
    page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());});
    page.on('pageerror',error=>errors.push(error.message));
    const shots=[];
    await captureStrip(page,profile.prefix,shots);
    assert.deepEqual(errors,[],`Browser must not report uncaught errors (${name})`);
    allShots.push(...shots);
    await page.close();
  }
  const metadata={
    purpose:'Human-reviewed Pick/Fill toolbar screenshots',
    commit:process.env.GITHUB_SHA??null,
    browser:'Playwright Chromium',
    profiles,
    note:'Set PETSCII_SCREENSHOT_PROFILES=desktop,ipad-portrait,ipad-landscape for the full matrix.',
    shots:allShots,
  };
  await writeFile(resolve(output,'manifest.json'),JSON.stringify(metadata,null,2)+'\n');
  console.log(`Saved ${allShots.length} screenshots and manifest to ${output}`);
}finally{
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
}