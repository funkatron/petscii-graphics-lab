const {test,expect,ui}=require('./helpers.cjs');
// Raskin review M5: 11-inch iPad landscape (1180 CSS px) docks the glyph panel beside
// the canvas instead of covering artwork; narrower screens keep the overlay.
for(const [width,height,docked] of [[1180,820,true],[1179,820,false]])test(`glyph panel ${docked?'docks':'overlays'} at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const picker=page.locator('.glyph-picker');
 if(!await picker.isVisible())await ui(page,'#glyphToggle');
 await expect(picker).toBeVisible();
 const p=await picker.boundingBox(),c=await page.locator('#canvas').boundingBox();
 const overlaps=p.x<c.x+c.width&&c.x<p.x+p.width&&p.y<c.y+c.height&&c.y<p.y+p.height;
 expect(overlaps).toBe(!docked);
});
