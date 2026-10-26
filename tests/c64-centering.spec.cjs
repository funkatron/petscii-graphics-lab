const {spawnSync}=require('node:child_process');
const {test,expect}=require('./helpers.cjs');
const {glyphRows}=require('./glyph-reference.cjs');
test('generic and native players center ROM/RAM artwork with blank margins and fixed placement across loops',async({page})=>{
 test.setTimeout(90000);await page.goto('/');await page.locator('.app[data-ready=true]').waitFor();
 const glyphBits=Array.from({length:512},(_,i)=>glyphRows(i)).flat();
 for(const custom of [false,true])for(const native of [false,true])for(const [columns,rows] of [[1,1],[2,2],[3,2],[40,1],[1,25],[40,25]]){
  const {bytes,frames}=await page.evaluate(async({columns,rows,custom,native,glyphBits})=>{
   const api=await import('./c64-export.js'),frames=[0,1].map(f=>({cells:Array.from({length:columns*rows},(_,i)=>i%3===2?'':(f?160:0)+(custom?256:0)),inks:Array.from({length:columns*rows},(_,i)=>(i+f)%16),durationMs:200}));
   const p=api[native?'createC64RowProgram':'createC64Program']({columns,rows,background:6,ink:14,frames,repetitions:2,...(custom?{glyphBits:Uint8Array.from(glyphBits)}:{})});return {bytes:[...p.bytes],frames};
  },{columns,rows,custom,native,glyphBits});
  const run=spawnSync('python3',['tests/c64-emulate.py'],{input:JSON.stringify({prg:bytes,stopAfterTicks:50}),encoding:'utf8',maxBuffer:8e6});expect(run.status,run.stderr).toBe(0);
  const {snapshots}=JSON.parse(run.stdout);expect(snapshots).toHaveLength(4);
  const left=Math.floor((40-columns)/2),top=Math.floor((25-rows)/2);
  snapshots.forEach((s,f)=>{
   const expected=Array(1000).fill(custom?'0,0,0,0,0,0,0,0':32),inks=Array(1000).fill(14);
   for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const from=y*columns+x,to=(top+y)*40+left+x,g=frames[f%2].cells[from];expected[to]=custom?(g===''?'0,0,0,0,0,0,0,0':glyphRows(g).join(',')):(g===''?32:g);inks[to]=frames[f%2].inks[from]}
   const actual=custom?s.screen.map(code=>s.characters.slice(code*8,code*8+8).join(',')):s.screen;
   expect(actual).toEqual(expected);expect(s.colors).toEqual(inks);expect(s.registers[6]).toBe(6);
  });
 }
});
