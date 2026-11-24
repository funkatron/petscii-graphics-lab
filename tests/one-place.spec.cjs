const {chooseInk,reveal,ui,test,expect,loadProject,project}=require('./helpers.cjs');
// Raskin review M3: each action has one primary control.
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});

test('play, return to drawing and brush ink each have a single control',async({page})=>{
 await loadProject(page,project([160,''],2,1,{selectedGlyph:160,colors:{ink:1,background:0}}));
 await expect(page.locator('#animationPlay')).toHaveCount(0);
 await expect(page.locator('#animationStop')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/^(Play|Pause) animation$/})).toHaveCount(1);
 await expect(page.locator('#inkTarget, #backgroundTarget')).toHaveCount(0);
 // Sidebar palette sets the shared background only; brush ink stays put.
 await reveal(page,'#colorPalette');
 await expect(page.locator('#backgroundGroup')).toHaveAccessibleName('Background');
 await ui(page,'#colorPalette button:nth-child(7)');
 await expect(page.locator('#backgroundName')).toHaveText('Blue');
 await expect(page.locator('#inkQuick')).toHaveAttribute('aria-label','Choose ink color: White');
 await chooseInk(page,2);
 await expect(page.locator('#inkQuick')).toHaveAttribute('aria-label','Choose ink color: Red');
 await expect(page.locator('#backgroundName')).toHaveText('Blue');
 await expect(page.locator('#colorPalette button:nth-child(7)')).toHaveAttribute('aria-pressed','true');
 // Header play opens preview; the stage banner is the only way back.
 await ui(page,'#quickPlay');
 await expect(page.locator('#previewBanner')).toBeVisible();
 await expect(page.getByRole('button',{name:'Return to drawing'})).toHaveCount(1);
 await ui(page,'#returnDrawing');
 await expect(page.locator('#previewBanner')).toBeHidden();
 await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','false');
});
