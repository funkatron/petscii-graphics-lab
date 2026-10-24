const fs=require('node:fs');
const svg=fs.readFileSync('assets/c64-glyphs.svg','utf8');
function glyphRows(id){
 const body=svg.match(new RegExp('<symbol id="c64-'+Math.floor(id/256)+'-'+id%256+'"[^>]*>([\\s\\S]*?)</symbol>'))[1],bits=Array(8).fill(0);
 for(const r of body.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g))for(let x=+r[1];x<+r[1]+ +r[3];x++)bits[+r[2]]|=128>>x;
 return bits;
}
module.exports={glyphRows};
