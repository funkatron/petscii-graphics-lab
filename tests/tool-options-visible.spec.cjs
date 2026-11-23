const {test,expect,ui}=require('./helpers.cjs');
// Raskin review H3: a tool's chosen option is visible on its button, Paint and Fill
// never share an icon, and the canvas hint names the tool first.
test('tool options show on the button face and the hint names the tool',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const icon=id=>page.locator('#'+id+' > svg path').getAttribute('d');
 const paintIcon=await icon('paint'),fillIcon=await icon('tool-fill');
 await expect(page.locator('#paint .tool-mode-badge')).toHaveCount(0);
 await expect(page.locator('#stageHint')).toHaveText(/^Paint · Glyph and ink · /);
 for(const [tool,menu,mode,label] of [['paint','paintMenu','ink','Paint: ink only'],['tool-fill','fillMenu','ink','Fill: ink only'],['tool-picker','pickerMenu','background','Pick from canvas: background']]){
  await page.locator('#'+tool).click();await expect(page.locator('#'+menu)).toHaveJSProperty('open',true);await page.locator('#'+menu+' .tool-mode-option[data-mode='+mode+']').click();
  await expect(page.locator('#'+tool)).toHaveAttribute('aria-label',label);
  await expect(page.locator('#'+tool+' .tool-mode-badge')).toBeVisible();
 }
 // Each tool keeps its own icon whatever option is chosen.
 expect(await icon('paint')).toBe(paintIcon);expect(await icon('tool-fill')).toBe(fillIcon);expect(paintIcon).not.toBe(fillIcon);
 await expect(page.locator('#stageHint')).toHaveText('Pick · Background · Tap a cell');
 await ui(page,'#paint');await expect(page.locator('#stageHint')).toHaveText(/^Paint · Ink only · .+ · Drag to draw$/);
 await ui(page,'#tool-line');await expect(page.locator('#stageHint')).toHaveText(/^Line · .+ · Drag$/);
 // Returning to the default option removes the badge and restores the plain name.
 await page.locator('#paint').click();await expect(page.locator('#paintMenu')).toHaveJSProperty('open',true);await page.locator('#paintMenu .tool-mode-option[data-mode=both]').click();
 await expect(page.locator('#paint .tool-mode-badge')).toHaveCount(0);await expect(page.locator('#paint')).toHaveAttribute('aria-label','Paint');
});
