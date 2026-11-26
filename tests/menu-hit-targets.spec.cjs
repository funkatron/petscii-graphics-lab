const {test,expect}=require('./helpers.cjs');
// Help buttons have an enlarged invisible ::after hit area. It must never cover other menu controls.
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});

for(const [menu,summary] of [['#machineMenu','#machineSummary'],['#projectMenu','#projectMenu > summary']]){
 test(`every control in ${menu} receives its own taps`,async({page})=>{
  await page.locator(summary).click();
  const blocked=await page.locator(menu).evaluate(root=>{
   const out=[];
   for(const el of root.querySelectorAll('select,input:not([type=hidden]),button,label,textarea')){
    const r=el.getBoundingClientRect();if(!r.width||!r.height||el.closest('[hidden]'))continue;
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    if(hit&&hit!==el&&!el.contains(hit)&&!(el.tagName==='LABEL'&&el.control===hit))out.push((el.id||el.tagName)+' covered by '+(hit.id||hit.className||hit.tagName));
   }
   return out;
  });
  expect(blocked).toEqual([]);
 });
}

test('every help button anchors its enlarged hit area to itself',async({page})=>{
 // position:static would anchor the ::after (inset:-6px) to the nearest positioned ancestor instead.
 const unanchored=await page.evaluate(()=>[...document.querySelectorAll('.help-trigger')].filter(b=>getComputedStyle(b).position==='static').map(b=>b.getAttribute('aria-label')||b.closest('[id]')?.id||'help-trigger'));
 expect(unanchored).toEqual([]);
});
