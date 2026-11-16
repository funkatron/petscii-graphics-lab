const {test,expect,ui,loadProject,project,download,waitForPreviewAdvance}=require('./helpers.cjs');

test.beforeEach(async({page})=>{await page.goto('/');await page.locator('.app[data-ready=true]').waitFor()});

test('scroll, rainbow wave, and backdrop stack in the UI and saved project',async({page})=>{
 await loadProject(page,project([160,'','',''],4,1,{cellColors:[2,14,14,14],colors:{ink:2,background:6},animation:{effect:'scroll-x',colorEffect:'color-wave',backgroundEffect:'field',seconds:1,scale:1,background:'dark',motionCycles:1,colorCycles:1,backgroundCycles:1,fieldLead:1}}));
 await ui(page,'#animationDetails');
 await expect(page.locator('#animationEffect')).toHaveValue('scroll');
 await expect(page.locator('#animationColor')).toHaveValue('color-wave');
 await expect(page.locator('#backdropEffect')).not.toHaveValue('none');
 await expect(page.locator('#fieldWaveDirection')).toBeVisible();
 await ui(page,'#quickPlay');
 await waitForPreviewAdvance(page);
 await ui(page,'#quickPlay');
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.animation).toMatchObject({effect:'scroll-x',colorEffect:'color-wave',backgroundEffect:'field'});
 expect(saved.grid).toEqual(project([160,'','',''],4,1,{cellColors:[2,14,14,14]}).grid);
});