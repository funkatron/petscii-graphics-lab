const {test,expect}=require('@playwright/test');

const modeMenus=[
  {menu:'#fillMenu',trigger:'#tool-fill',modes:['both','glyph','ink']},
  {menu:'#pickerMenu',trigger:'#tool-picker',modes:['ink','glyph','background']},
];

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.removeItem('petscii-workspace-prefs'));
  await page.goto('/');
  await page.locator('.app[data-ready=true]').waitFor();
});

test('Pick and Fill menus use uniform 44px targets and open cleanly',async({page},testInfo)=>{
  const paint=await page.locator('#paint').boundingBox();
  expect(paint).toBeTruthy();
  for(const {menu,trigger,modes} of modeMenus){
    const box=await page.locator(trigger).boundingBox();
    expect(box?.width).toBeCloseTo(44,0);
    expect(box?.height).toBeCloseTo(44,0);
    for(const mode of modes){
      await page.locator(trigger).click();
      await expect(page.locator(menu)).toHaveJSProperty('open',true);
      const option=await page.locator(`${menu} .tool-mode-option[data-mode="${mode}"]`);
      const optionBox=await option.boundingBox();
      expect(optionBox?.width).toBeCloseTo(44,0);
      expect(optionBox?.height).toBeCloseTo(44,0);
      await option.click();
      await expect(page.locator(menu)).toHaveJSProperty('open',false);
      await expect(page.locator(trigger)).toHaveAttribute('aria-pressed','true');
    }
    await page.locator(trigger).click();
    await expect(page.locator(menu)).toHaveJSProperty('open',true);
    await testInfo.attach(`tool-mode-${menu.slice(1)}-${testInfo.project.name}`,{
      body:await page.screenshot({animations:'disabled'}),
      contentType:'image/png',
    });
    await page.locator(trigger).click();
  }
});