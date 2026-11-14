// Interface look only. Never encode artwork, glyphs, palettes, or export formats here.
export const UI_THEME_STORAGE_KEY='petscii-ui-theme';
export const DEFAULT_UI_THEME='c64c';
export const UI_THEMES={
 c64c:{id:'c64c',label:'Commodore 64C',summary:'C64C'},
 c128:{id:'c128',label:'Commodore 128',summary:'C128'},
 plus4:{id:'plus4',label:'Commodore Plus/4',summary:'Plus/4'}
};

// Machine modes own appearance: each machine selects the matching interface look.
// Keys match MACHINE.* ids from machine-modes.js (full literal cleanup is a follow-up).
export const MACHINE_UI_THEMES=Object.freeze({c64:'c64c',c128:'c128','c128-80':'c128',plus4:'plus4'});

export function uiThemeForMachine(machineId){
 return Object.prototype.hasOwnProperty.call(MACHINE_UI_THEMES,machineId)?MACHINE_UI_THEMES[machineId]:DEFAULT_UI_THEME;
}

export function isUiThemeId(id){
 return typeof id==='string'&&Object.prototype.hasOwnProperty.call(UI_THEMES,id);
}

export function readStoredUiTheme(){
 try{
  const id=localStorage.getItem(UI_THEME_STORAGE_KEY);
  if(isUiThemeId(id))return id;
 }catch{}
 return DEFAULT_UI_THEME;
}

export function applyUiTheme(id,{persist=true}={}){
 const themeId=isUiThemeId(id)?id:DEFAULT_UI_THEME;
 document.documentElement.dataset.uiTheme=themeId;
 const root=document.documentElement;
 const themeColor=getComputedStyle(root).getPropertyValue('--theme-color').trim()
  ||getComputedStyle(root).getPropertyValue('--ui-case-bg').trim();
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta&&themeColor)meta.content=themeColor;
 if(persist){
  try{localStorage.setItem(UI_THEME_STORAGE_KEY,themeId)}catch{}
 }
 return themeId;
}
