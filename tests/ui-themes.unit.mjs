import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DEFAULT_UI_THEME,
 UI_THEME_STORAGE_KEY,
 UI_THEMES,
 applyUiTheme,
 isUiThemeId,
 readStoredUiTheme,
 uiThemeForMachine
} from '../ui-themes.js';

const storage=new Map();
globalThis.localStorage={
 getItem(key){return storage.has(key)?storage.get(key):null},
 setItem(key,value){storage.set(key,String(value))},
 removeItem(key){storage.delete(key)}
};
globalThis.document={
 documentElement:{dataset:{}},
 querySelector(){return null}
};
globalThis.getComputedStyle=()=>({getPropertyValue:()=>'#d4cbb7'});

test('known theme ids and default',()=>{
 assert.equal(DEFAULT_UI_THEME,'c64c');
 assert.equal(UI_THEME_STORAGE_KEY,'petscii-ui-theme');
 assert.ok(isUiThemeId('c64c'));
 assert.ok(isUiThemeId('c128'));
 assert.ok(isUiThemeId('plus4'));
 assert.equal(isUiThemeId('ted'),false);
 assert.equal(UI_THEMES.c64c.summary,'C64C');
 assert.equal(UI_THEMES.c128.summary,'C128');
 assert.equal(UI_THEMES.plus4.summary,'Plus/4');
});

test('applyUiTheme sets data-ui-theme and ignores unknown ids',()=>{
 document.documentElement.dataset.uiTheme='c64c';
 assert.equal(applyUiTheme('plus4',{persist:false}),'plus4');
 assert.equal(document.documentElement.dataset.uiTheme,'plus4');
 assert.equal(applyUiTheme('not-a-theme',{persist:false}),'c64c');
 assert.equal(document.documentElement.dataset.uiTheme,'c64c');
});

test('readStoredUiTheme uses the preference key when valid',()=>{
 storage.clear();
 assert.equal(readStoredUiTheme(),'c64c');
 localStorage.setItem(UI_THEME_STORAGE_KEY,'c128');
 assert.equal(readStoredUiTheme(),'c128');
 localStorage.setItem(UI_THEME_STORAGE_KEY,'bogus');
 assert.equal(readStoredUiTheme(),'c64c');
 applyUiTheme('plus4');
 assert.equal(localStorage.getItem(UI_THEME_STORAGE_KEY),'plus4');
 assert.equal(readStoredUiTheme(),'plus4');
 storage.clear();
});

test('machines map to interface themes, defaulting to C64C',()=>{
 assert.equal(uiThemeForMachine('c64'),'c64c');
 assert.equal(uiThemeForMachine('c128'),'c128');
 assert.equal(uiThemeForMachine('plus4'),'plus4');
 assert.equal(uiThemeForMachine('unknown'),'c64c');
 assert.equal(uiThemeForMachine(undefined),'c64c');
});
