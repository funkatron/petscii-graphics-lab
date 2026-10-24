"""Execute exported PRG machine code in independent py65; stub documented KERNAL calls.

This checks CPU execution and display-memory writes, not VIC/CIA/ROM behavior.
Input: {prg:[bytes],stopAfterTicks:N,clockHz:CPU_HZ,maxSteps:N}.
"""
import json, sys
from py65.devices.mpu6502 import MPU
p=json.load(sys.stdin)
m=MPU(); mem=m.memory
b=p['prg']; origin=b[0]+b[1]*256;mem[origin:origin+len(b)-2]=b[2:]
# Enter the BASIC SYS address with a synthetic RTS return at $0200.
start=bytes(b[7:]).split(b'\0',1)[0].decode('ascii');m.pc=int(start)
m.sp=0xfd;mem[0x1fe]=0xff;mem[0x1ff]=1
registers=[0xdd00,0xdd02,0xd011,0xd016,0xd018,0xd020,0xd021,0xcc,0x288]
initial=[0x97,0x3f,0x1b,8,0x15,14,6,0,4]
for a,v in zip(registers,initial):mem[a]=v
for a in range(0xfb,0xff):mem[a]=a
mem[0x7e8:0x800]=[0x55]*24;mem[0xdbe8:0xdc00]=[0x66]*24
mem[0xc7e8:0xc800]=[0x77]*24
mem[0xa2]=p.get('startJiffy',0);start_jiffy=mem[0xa2]
tick=0;last=-1;snapshots=[];clears=0
for step in range(p.get('maxSteps',3000000)):
    tick=int(m.processorCycles*60/p.get('clockHz',985248))
    mem[0xa2]=(start_jiffy+tick)&255
    # Called after complete frame copies; stop polling is safe for coherent observations.
    if m.pc==0xffe1:
        custom=mem[0xd018]==0x12 and (mem[0xdd00]&3)==0
        screen_base=0xc400 if custom else 0x400
        state=(tuple(mem[screen_base:screen_base+1000]),tuple(mem[0xd800:0xdbe8]))
        if not snapshots or state!=last:
            snapshots.append({'tick':tick,'screen':list(state[0]),'colors':list(state[1]),'registers':[mem[a] for a in registers],**({'characters':mem[0xc800:0xd000]} if custom else {})});last=state
        m.p=(m.p|2) if tick>=p.get('stopAfterTicks',120) else (m.p&~2)
        mem[0xffe1]=0x60
    elif m.pc==0xffd2:
        assert m.a==147, 'Only clear-screen KERNAL output is expected'
        clears+=1;mem[0xffd2]=0x60
    if m.pc==0x200:break
    m.step()
else:raise RuntimeError('Player did not return within the instruction budget')
assert mem[0x7e8:0x800]==[0x55]*24,'Sprite pointers were overwritten'
assert mem[0xc7e8:0xc800]==[0x77]*24,'RAM-screen sprite pointers were overwritten'
assert mem[0xdbe8:0xdc00]==[0x66]*24,'Color writes exceeded 1000 cells'
assert [mem[a] for a in registers]==initial,'Display registers were not restored'
assert [mem[a] for a in range(0xfb,0xff)]==list(range(0xfb,0xff)),'Scratch memory was not restored'
assert m.sp==0xff,'Stack was not balanced'
assert clears==1,'Expected one clear-screen request on exit'
print(json.dumps({'snapshots':snapshots,'exitTick':tick,'cycles':m.processorCycles}))
