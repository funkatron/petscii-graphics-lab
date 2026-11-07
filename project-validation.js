import {SOLID_EFFECTS} from './solid-motion.js';

export const ANIMATION_CYCLES=[1,2,4,8,16];
export const DEPTH_EFFECTS=['space-warp','perspective-floor','curved-road','tunnel-flight'];
export const INTRO_MOTIONS=['logo-bounce','logo-stretch','starfield','wipe'];
export const WIPE_PATTERNS=['diagonal','checkerboard','blinds'];
export const WAVE_AMPLITUDES=[10,25,50,75,100];
export const WAVE_LENGTHS=[10,25,50,75,100];
export const WAVE_SHAPES=['sine','triangle','square','sawtooth','reverse-sawtooth'];
export const WAVE_DIRECTIONS=['left','right','up','down'];
export const DIAGONAL_DIRECTIONS=['up-left','up-right','down-left','down-right'];
export const COLOR_WAVE_DIRECTIONS=[...WAVE_DIRECTIONS,'up-left','up-right','down-left','down-right'];
export const SOLID_CAMERA_VALUES={cameraDistance:[4,5,3.25,2.5],cameraOrbit:[0,45,90,135,180,225,270,315],cameraElevation:[0,-60,-30,30,60],cameraMotion:[0,1,2,3]};
export const MOTION_EFFECTS=['none','bonfire','replay','scroll-x','scroll-y','scroll-diagonal','wave','inverse','sine-scroll','ripple',...DEPTH_EFFECTS,...SOLID_EFFECTS,...INTRO_MOTIONS];
export const COLOR_EFFECTS=['none','bonfire','raster-bars','plasma','color-cycle','color-wave','color-glow'];

export function validateProject(data){
 if(data?.colors!==undefined){const c=data.colors;if(!c||!['ink','background'].every(key=>Number.isInteger(c[key])&&c[key]>=0&&c[key]<16))throw Error('Invalid C64 colors')}
 if(data&&data.glyphSource!==undefined&&data.glyphSource!=='builtin')throw Error('Only built-in C64 glyph projects are supported');
 if(data?.selectedGlyph!==undefined&&(!Number.isInteger(data.selectedGlyph)||data.selectedGlyph<0||data.selectedGlyph>511))throw Error('Invalid selected C64 glyph');
 if(!data||data.format!=='petscii-stencil-lab'||data.version!==3)throw Error('Only version 3 unified glyph projects are supported');
 if(data.charset!==undefined)throw Error('Whole-drawing character sets are no longer supported');
 if(!Number.isInteger(data.columns)||!Number.isInteger(data.rows)||data.columns<1||data.columns>40||data.rows<1||data.rows>40)throw Error('Invalid dimensions');
 if(!Array.isArray(data.grid)||data.grid.length!==data.columns*data.rows||data.grid.some(g=>g!==''&&!(Number.isInteger(g)&&g>=0&&g<=511)))throw Error('Invalid glyph grid: use numeric atlas glyph IDs or empty cells');
 const validColor=c=>Number.isInteger(c)&&c>=0&&c<16;
 const validColors=(values,length)=>Array.isArray(values)&&values.length===length&&values.every(validColor);
 if(data.cellColors!==undefined&&!validColors(data.cellColors,data.grid.length))throw Error('Invalid cell colors');
 const validGlyph=g=>g===''||(Number.isInteger(g)&&g>=0&&g<=511);
 if(data.drawingReplay!==undefined){const r=data.drawingReplay;if(!r||!Array.isArray(r.base)||r.base.length!==data.grid.length||r.base.some(g=>!validGlyph(g))||!Array.isArray(r.events)||r.events.length>20000||r.events.some(e=>!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||e[0]<0||e[0]>=data.grid.length||!validGlyph(e[1])))throw Error('Invalid drawing replay');const end=r.base.slice();for(const [i,g] of r.events)end[i]=g;if(end.some((g,i)=>g!==data.grid[i]))throw Error('Replay does not match drawing')}
 if(data.drawingReplay){const r=data.drawingReplay;if((r.baseColors!==undefined&&!validColors(r.baseColors,data.grid.length))||(r.eventColors!==undefined&&!validColors(r.eventColors,r.events.length)))throw Error('Invalid replay colors');const ink=data.colors?.ink??14,end=r.baseColors?.slice()??Array(data.grid.length).fill(ink);r.events.forEach(([i],j)=>end[i]=r.eventColors?.[j]??ink);if(end.some((c,i)=>c!==(data.cellColors?.[i]??ink)))throw Error('Replay colors do not match drawing')}
 if(data.animation!==undefined){const a=data.animation;if(!a||Object.entries(SOLID_CAMERA_VALUES).some(([key,values])=>a[key]!==undefined&&!values.includes(a[key]))||(a.depthWaveShape!==undefined&&!WAVE_SHAPES.includes(a.depthWaveShape))||(a.depthTravel!==undefined&&!['toward','away'].includes(a.depthTravel))||['waveLength','colorWaveLength'].some(key=>a[key]!==undefined&&!WAVE_LENGTHS.includes(a[key]))||(a.wipePattern!==undefined&&!WIPE_PATTERNS.includes(a.wipePattern))||['waveAmplitude','colorWaveAmplitude'].some(key=>a[key]!==undefined&&!WAVE_AMPLITUDES.includes(a[key]))||['motionCycles','colorCycles'].some(key=>a[key]!==undefined&&!ANIMATION_CYCLES.includes(a[key]))||Object.entries({scrollDirection:a.effect==='scroll-diagonal'?DIAGONAL_DIRECTIONS:a.effect==='starfield'?COLOR_WAVE_DIRECTIONS:WAVE_DIRECTIONS,waveDirection:WAVE_DIRECTIONS,waveShape:WAVE_SHAPES,colorWaveDirection:COLOR_WAVE_DIRECTIONS,colorWaveShape:WAVE_SHAPES}).some(([key,values])=>a[key]!==undefined&&!values.includes(a[key]))||!MOTION_EFFECTS.includes(a.effect)||(a.colorEffect!==undefined&&!COLOR_EFFECTS.includes(a.colorEffect))||![0.5,1,2,4,8,12].includes(a.seconds)||![1,2,4].includes(a.scale)||!['dark','white','transparent'].includes(a.background)||(a.videoRepeats!==undefined&&(!Number.isInteger(a.videoRepeats)||a.videoRepeats<1||a.videoRepeats>100)))throw Error('Invalid animation settings')}
}
