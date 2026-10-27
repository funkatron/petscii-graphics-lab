const {test,expect,loadProject,project,download}=require('./helpers.cjs');

for(const viewport of [{width:810,height:1080},{width:1080,height:810}]){
 test(`200% text keeps drawing and downloads reachable at ${viewport.width} × ${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
  // Enlarge text without shrinking the viewport or scaling bitmap artwork.
  await page.addStyleTag({content:'html{font-size:200%}'});
  await loadProject(page,project([160,0,66,192],2,2));
  const original=await page.locator('#output').inputValue();
  for(const id of ['toggle','downloadOpen','quickPlay','glyphToggle','inkQuick','paint','erase','undo','redo']){
   await expect(page.locator('#'+id)).toBeInViewport();
  }
  const header=await page.locator('header').evaluate(e=>{
   const r=e.getBoundingClientRect();return [...e.children].filter(c=>getComputedStyle(c).display!=='none').every(c=>{const b=c.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom+1&&b.left>=0&&b.right<=innerWidth});
  });expect(header,'header contains enlarged controls').toBe(true);
  await page.locator('#glyphToggle').click();
  await page.getByRole('button',{name:'C64 glyph ID 64',exact:true}).click();
  if(await page.locator('#glyphClose').isVisible())await page.locator('#glyphClose').click();
  await page.locator('#inkQuick').click();await page.locator('#inkClose').click();
  await page.locator('#downloadOpen').click();
  for(const tab of ['still','motion','data']){
   await page.locator('#export-tab-'+tab).click();
   await expect(page.locator('#export-tab-'+tab)).toHaveAttribute('aria-selected','true');
  }
  await page.locator('#downloadClose').click();
  expect(await page.locator('#output').inputValue()).toBe(original);
  const saved=JSON.parse(await download(page,'#saveProject'));
  expect(saved.grid).toEqual([160,0,66,192]);
  expect(saved.columns).toBe(2);expect(saved.rows).toBe(2);
 });
}
