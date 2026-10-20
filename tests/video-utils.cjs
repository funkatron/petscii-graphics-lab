const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {expect}=require('@playwright/test');
function decodeVideo(bytes){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'petscii-video-')),file=path.join(folder,'video.bin');
 try{
  fs.writeFileSync(file,bytes);const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-show_frames','-of','json',file],{maxBuffer:10000000}));
  const stream=info.streams.find(s=>s.codec_type==='video'),size=stream.width*stream.height*3;
  const raw=execFileSync('ffmpeg',['-v','error','-threads','1','-i',file,'-map','0:v:0','-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:64000000});
  return {info,stream,frames:Array.from({length:raw.length/size},(_,i)=>raw.subarray(i*size,(i+1)*size))};
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
}
function nearPixel(video,frame,x,y,expected){const offset=(y*video.stream.width+x)*3;for(let c=0;c<3;c++)expect(Math.abs(video.frames[frame][offset+c]-expected[c])).toBeLessThanOrEqual(12)}
module.exports={decodeVideo,nearPixel};
