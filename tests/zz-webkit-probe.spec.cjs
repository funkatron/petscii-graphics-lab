// TEMPORARY CI probe (do not merge): why does WebKit see #import as "not stable"?
const {test,ui,project,loadProject,download}=require('./helpers.cjs');
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});
async function sample(page,label){
 const frames=await page.evaluate(()=>new Promise(done=>{const out=[];const r=e=>{const b=e?.getBoundingClientRect();return b?[b.x,b.y,b.width,b.height].map(v=>Math.round(v*100)/100).join(','):'-'};
  const tick=()=>{const d=document.getElementById('downloadDialog');out.push({imp:r(document.getElementById('import')),dl:r(document.getElementById('downloadOpen')),dlg:d.open?r(d)+' st'+d.scrollTop:'closed',cv:r(document.getElementById('canvas')),frame:r(document.querySelector('.canvas-frame')),stage:r(document.querySelector('.stage')),vv:window.visualViewport?[visualViewport.width,visualViewport.height,visualViewport.offsetTop,visualViewport.scale].join(','):'',sy:Math.round(scrollY),st:document.getElementById('status').textContent.slice(0,40)});out.length<12?requestAnimationFrame(tick):done(out)};requestAnimationFrame(tick)}));
 const keys=Object.keys(frames[0]);const changing=keys.filter(k=>new Set(frames.map(f=>f[k])).size>1);
 console.log('PROBE',label,'changing=',JSON.stringify(changing),'first=',JSON.stringify(frames[0]));
 for(const k of changing)console.log('PROBE',label,k,JSON.stringify([...new Set(frames.map(f=>f[k]))].slice(0,6)));
}
test('probe color-text stability',async({page})=>{
 await loadProject(page,project([160],1,1,{colors:{ink:3,background:6},cellColors:[8]}));
 await sample(page,'loaded');
 await download(page,'#saveProject');await sample(page,'after-save');
 for(const [i,text] of ['# PETSCII-GLYPHS 2 1 1\n000:0','# PETSCII-GLYPHS 1 1 1 F\n000'].entries()){
  await ui(page,'#output','fill',text);await sample(page,'iter'+i+'-filled');
  try{await page.locator('#import').click({timeout:4000});console.log('PROBE iter'+i+' import click OK')}catch(e){console.log('PROBE iter'+i+' import click FAILED')}
  await sample(page,'iter'+i+'-after-import');
  try{await download(page,'#saveProject');console.log('PROBE iter'+i+' save OK')}catch(e){console.log('PROBE iter'+i+' save FAILED '+e.message.slice(0,80))}
  await sample(page,'iter'+i+'-after-save');
 }
});
