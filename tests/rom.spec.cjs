const {test,expect}=require('@playwright/test');
test('ROM import enables pixel palette and authentic screen code drawing',async({page})=>{
 await page.goto('/');
 const rom=Buffer.alloc(4096,0);
 // Bank zero code zero: top-left pixel; code 128: bottom-right pixel.
 rom[0]=0x80;rom[128*8+7]=0x01;
 // Second charset bank code zero: top-right pixel.
 rom[2048]=0x01;
 await page.locator('#romInput').setInputFiles({name:'test-rom.bin',mimeType:'application/octet-stream',buffer:rom});
 await expect(page.locator('#romInfo')).toContainText('Authentic');
 await expect(page.locator('#palette button')).toHaveCount(64);
 await page.locator('#glyphPage').selectOption('2');
 await expect(page.locator('#palette button').first()).toHaveAttribute('data-g','128');
 await page.locator('#glyphPage').selectOption('0');
 await page.locator('#palette button').first().click();
 const box=await page.locator('#canvas').boundingBox();
 await page.mouse.click(box.x+box.width*.1,box.y+box.height*.1);
 await expect(page.locator('#output')).toContainText('00');
 const [svgDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#svg').click()]);
 const stream=await svgDownload.createReadStream(),chunks=[];
 for await(const chunk of stream)chunks.push(chunk);
 const markup=Buffer.concat(chunks).toString('utf8');
 expect(markup).toContain('scale(2)');
 expect(markup).toContain('<rect x="0" y="0" width="1" height="1"/>');
 const [binDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#screenCodes').click()]);
 const binaryStream=await binDownload.createReadStream(),binaryChunks=[];
 for await(const chunk of binaryStream)binaryChunks.push(chunk);
 expect(Buffer.concat(binaryChunks).length).toBe(256);
 await page.locator('#charset').selectOption('1');
 await expect(page.locator('#romInfo')).toContainText('Authentic');
});
test('ROM import refuses invalid length',async({page})=>{
 await page.goto('/');
 await page.locator('#romInput').setInputFiles({name:'bad.bin',mimeType:'application/octet-stream',buffer:Buffer.alloc(1024)});
 await expect(page.locator('#status')).toContainText('4096');
 await expect(page.locator('#romInfo')).toContainText('ROM not loaded');
});
