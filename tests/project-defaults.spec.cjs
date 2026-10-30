const {test,expect,project,loadProject,download,waitForProjectAutosave}=require('./helpers.cjs');
// This is an import/serialization contract, deliberately independent of UI defaults.
const normalized={waveLength:50,colorWaveLength:50,wipePattern:'diagonal',motionCycles:1,colorCycles:1,scrollDirection:'left',waveDirection:'up',waveShape:'sine',waveAmplitude:100,colorWaveDirection:'up-left',colorWaveShape:'sawtooth',colorWaveAmplitude:100,effect:'replay',colorEffect:'none',seconds:4,scale:2,background:'dark',videoRepeats:1};
test('omitted optional animation fields normalize independently of the preceding project',async({page})=>{
 await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const sparse=project([160,257,'',0],2,2,{cellColors:[2,3,4,5]});
 // Load a different value for every optional field first: omissions must reset,
 // rather than inherit session state from the previous drawing.
 await loadProject(page,{...sparse,animation:{...normalized,waveLength:10,colorWaveLength:100,wipePattern:'blinds',motionCycles:4,colorCycles:8,scrollDirection:'right',waveDirection:'down',waveShape:'triangle',waveAmplitude:25,colorWaveDirection:'down-right',colorWaveShape:'square',colorWaveAmplitude:50,colorEffect:'plasma',videoRepeats:3}});
 await loadProject(page,sparse);
 const saved=JSON.parse(await download(page,'#saveProject'));
 expect(saved.animation).toEqual(normalized);expect(saved.grid).toEqual(sparse.grid);expect(saved.cellColors).toEqual(sparse.cellColors);
 await loadProject(page,{...sparse,animation:{...normalized}});
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved);
 await waitForProjectAutosave(page,saved);await page.reload();await page.locator('.app[data-ready=true]').waitFor();
 expect(JSON.parse(await download(page,'#saveProject'))).toEqual(saved);
 await expect(page.locator('#quickPlay')).toHaveAttribute('aria-pressed','false');
});
