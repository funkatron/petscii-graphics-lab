// Native WebCodecs encoding with explicit timestamps; no screen recording or media permissions.
export async function createVideo(canvas, checkpoint){
 if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined')throw Error('Video encoding is unavailable in this browser. Use GIF or PNG frames instead.');
 // Initialize the media backend before WebCodecs probing (required by GTK/WPE WebKit).
 document.createElement('video').canPlayType('video/mp4');
 const {Output,BufferTarget,CanvasSource,Mp4OutputFormat,WebMOutputFormat,canEncodeVideo,Quality}=await import('./vendor/mediabunny-video.esm.js');
 checkpoint();
 const quality=new Quality({bitrate:Math.max(2000000,Math.min(20000000,canvas.width*canvas.height*12))});
 const formats=[{codec:'avc',extension:'mp4',mime:'video/mp4',format:()=>new Mp4OutputFormat({fastStart:'in-memory'})},{codec:'vp9',extension:'webm',mime:'video/webm',format:()=>new WebMOutputFormat()},{codec:'vp8',extension:'webm',mime:'video/webm',format:()=>new WebMOutputFormat()}];
 let selected;
 for(const candidate of formats){
  let supported=false;try{supported=await canEncodeVideo(candidate.codec,{width:canvas.width,height:canvas.height,quality})}catch{}
  checkpoint();if(supported){selected=candidate;break}
 }
 if(!selected)throw Error('No supported video encoder is available here. Use GIF or PNG frames instead.');
 const target=new BufferTarget(),output=new Output({format:selected.format(),target});
 const source=new CanvasSource(canvas,{codec:selected.codec,quality,latencyMode:'quality'});output.addVideoTrack(source);
 let cancelPromise;
 const cancel=()=>{if(output.state==='finalized')return Promise.resolve();return cancelPromise??=(output.cancel())};
 try{await output.start();checkpoint()}catch(error){await cancel();throw error}
 return {
  extension:selected.extension,mime:selected.mime,
  add:frame=>source.add(frame.startMs/1000,frame.durationMs/1000,{keyFrame:frame.index===0}),
  finish:async()=>{await output.finalize();checkpoint();if(!target.buffer?.byteLength)throw Error('Video encoder returned an empty file');return new Blob([target.buffer],{type:selected.mime})},
  cancel,
 };
}
