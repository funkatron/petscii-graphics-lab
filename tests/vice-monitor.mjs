// VICE binary monitor v2: https://vice-emu.sourceforge.io/vice_13.html
// This is a test client, not an emulator or a replacement KERNAL.
import net from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

export class ViceMonitor {
 constructor(socket){
  this.socket=socket;this.nextId=1;this.pending=new Map();this.buffer=Buffer.alloc(0);this.run=null;this.hits=[];this.checkpointHit=false;
  socket.on('data',chunk=>{
   this.buffer=Buffer.concat([this.buffer,chunk]);
   while(this.buffer.length>=12){
    if(this.buffer[0]!==2||this.buffer[1]!==2){this.fail(Error('Invalid VICE monitor response header'));return}
    const size=this.buffer.readUInt32LE(2);if(size>2e6){this.fail(Error('Oversized VICE monitor response'));return}if(this.buffer.length<size+12)return;
    const message={type:this.buffer[6],error:this.buffer[7],id:this.buffer.readUInt32LE(8),body:Buffer.from(this.buffer.subarray(12,12+size))};this.buffer=this.buffer.subarray(size+12);
    if(process.env.VICE_MONITOR_TRACE)console.error('VICE response',message.type.toString(16),message.id,message.body.subarray(0,10));
    const request=this.pending.get(message.id);
    if(request){this.pending.delete(message.id);clearTimeout(request.timer);if(message.error)request.reject(Error('VICE command failed: 0x'+message.error.toString(16)));else request.resolve(message)}
    else if(message.id===0xffffffff&&message.type===0x11&&message.body[4])this.checkpointHit=true;
    else if(message.id===0xffffffff&&message.type===0x62&&this.checkpointHit){this.checkpointHit=false;const pc=message.body.readUInt16LE(0),run=this.run;if(run){this.run=null;clearTimeout(run.timer);if(pc!==run.address)run.reject(Error('Unexpected VICE breakpoint at $'+pc.toString(16)));else run.resolve(pc)}else this.hits.push(pc)}
   }
  });
  socket.on('error',e=>this.fail(e));socket.on('close',()=>this.fail(Error('VICE monitor connection closed')));
 }
 fail(error){for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(error)}this.pending.clear();if(this.run){clearTimeout(this.run.timer);this.run.reject(error);this.run=null}}
 static async connect(port,child,timeout=15000){
  const end=Date.now()+timeout;
  while(Date.now()<end){
   if(child.exitCode!==null)throw Error('VICE exited before opening the monitor');
   try{const socket=await new Promise((resolve,reject)=>{const s=net.createConnection({host:'127.0.0.1',port});s.once('connect',()=>{s.removeListener('error',reject);resolve(s)});s.once('error',e=>{s.destroy();reject(e)})});return new ViceMonitor(socket)}catch(e){if(e.code!=='ECONNREFUSED')throw e;await delay(50)}
  }
  throw Error('VICE monitor did not open within '+timeout+' ms');
 }
 command(type,body=Buffer.alloc(0)){
  const id=this.nextId++,header=Buffer.alloc(11);header[0]=2;header[1]=2;header.writeUInt32LE(body.length,2);header.writeUInt32LE(id,6);header[10]=type;
  if(process.env.VICE_MONITOR_TRACE)console.error('VICE command',type.toString(16),id);
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('VICE command timed out: 0x'+type.toString(16)))},15000);this.pending.set(id,{resolve,reject,timer});this.socket.write(Buffer.concat([header,body]))});
 }
 resume(address,timeout=30000){
  if(this.run)throw Error('A VICE run is already pending');
  if(this.hits.length){const pc=this.hits.shift();if(pc!==address)return Promise.reject(Error('Unexpected queued VICE breakpoint'));return Promise.resolve(pc)}
  return new Promise((resolve,reject)=>{const run={resolve,reject,address};run.timer=setTimeout(()=>{this.run=null;reject(Error('VICE did not reach breakpoint $'+address.toString(16)))},timeout);this.run=run;this.command(0xaa).catch(e=>this.fail(e))});
 }
 async checkpoint(address,{temporary=true,operation=4}={}){const body=Buffer.alloc(9);body.writeUInt16LE(address,0);body.writeUInt16LE(address,2);body.set([1,1,operation,Number(temporary),0],4);const r=await this.command(0x12,body);return r.body.readUInt32LE(0)}
 async memory(start,end,bank=0){const body=Buffer.alloc(8);body.writeUInt16LE(start,1);body.writeUInt16LE(end,3);body.writeUInt16LE(bank,6);const r=await this.command(1,body);return r.body.subarray(2)}
 async write(start,bytes,bank=0){const body=Buffer.alloc(8+bytes.length);body.writeUInt16LE(start,1);body.writeUInt16LE(start+bytes.length-1,3);body.writeUInt16LE(bank,6);body.set(bytes,8);await this.command(2,body)}
 async autostart(path){const name=Buffer.from(path);if(name.length>255)throw Error('VICE path is too long');await this.command(0xdd,Buffer.concat([Buffer.from([1,0,0,name.length]),name]))}
 async banks(){const {body}=await this.command(0x82);const result=new Map();for(let i=0,pos=2;i<body.readUInt16LE(0);i++){const size=body[pos],id=body.readUInt16LE(pos+1),length=body[pos+3];result.set(body.subarray(pos+4,pos+4+length).toString(),id);pos+=size+1}return result}
 async registers(){
  if(!this.registerNames){const {body}=await this.command(0x83,Buffer.from([0]));this.registerNames=new Map();for(let i=0,pos=2;i<body.readUInt16LE(0);i++){const length=body[pos+3];this.registerNames.set(body[pos+1],body.subarray(pos+4,pos+4+length).toString());pos+=body[pos]+1}}
  const {body}=await this.command(0x31,Buffer.from([0]));const result=new Map();for(let i=0,pos=2;i<body.readUInt16LE(0);i++){result.set(this.registerNames.get(body[pos+1]),body.readUInt16LE(pos+2));pos+=body[pos]+1}return result;
 }
 close(){this.socket.destroy()}
}

export async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port}
