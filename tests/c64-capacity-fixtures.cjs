// Deterministic full-screen fixtures and a test-only bridge to the real sampler.
const profiles=['sparse','repeated','detailed','mixed-bank','detailed-fast'];
const ramp=[2,8,7,13,3,14,6,4];
function artwork(profile){
 const grid=Array.from({length:960},(_,i)=>{
  const x=i%40,y=Math.floor(i/40);
  if(profile==='sparse')return x===y||x===39-y?160:'';
  if(profile==='repeated')return (x+y)%4<2?160:102;
  if(profile==='mixed-bank')return [1,257,2,258,160,102,127,255][(x*7+y*11)%8];
  return (x*17+y*31+x*y)%256;
 });
 return {grid,cellColors:grid.map((_,i)=>ramp[(i%40+Math.floor(i/40)*3)%8])};
}
async function capacityPage(page){
 await page.route('**/',async route=>{
  const response=await route.fetch();
  const body=(await response.text()).replace('(async()=>{',`(async()=>{
   window.capacityInput=()=>{const s=animationSource();const frames=animationExportFrames(s).map(f=>({...animationCells(f.index,s),durationMs:f.durationMs}));return {columns:s.W,rows:s.H,background:s.colors.background,ink:s.colors.ink,frames,...(frames.some(f=>f.cells.some(g=>g>255))?{glyphBits:rom.slice()}:{})}};
  `);
  await route.fulfill({response,body});
 });
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
}
module.exports={profiles,artwork,capacityPage};
