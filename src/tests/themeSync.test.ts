// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { db, init } from '../data';
import { syncTheme, resolveTheme, isIOSStandalone, reloadIOSThemeOnce, observeThemeSafety, resetThemeSafetyForRoute, restoreThemeView } from '../services/themeSync';
beforeEach(async()=>{
 for(const table of db.tables)await table.clear();await init();
 localStorage.clear();sessionStorage.clear();resetThemeSafetyForRoute();
 document.head.innerHTML='<meta name="theme-color"><meta name="apple-mobile-web-app-status-bar-style">';
 document.body.innerHTML='<div id="root"><main></main></div>';
 Object.defineProperty(navigator,'userAgent',{configurable:true,value:'iPhone'});
 Object.defineProperty(navigator,'standalone',{configurable:true,value:true});
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
 Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn((query:string)=>({matches:query==='(prefers-color-scheme: dark)',addEventListener:vi.fn(),removeEventListener:vi.fn()}))});
});
afterEach(()=>vi.restoreAllMocks());
it('synchronizes all painted surfaces and metadata for light, dark and automatic system appearance',()=>{
 for(const [choice,dark,resolved,color,status] of [['swiss',false,'swiss','#F5F5F7','default'],['midnight',true,'midnight','#101113','black'],['system',false,'swiss','#F5F5F7','default'],['system',true,'midnight','#101113','black']] as const){
  expect(syncTheme(choice,dark)).toEqual({resolved,persisted:true});
  expect(document.documentElement.dataset.theme).toBe(resolved);
  expect(document.documentElement.style.getPropertyValue('--startup-bg')).toBe(color);
  expect(document.body.style.backgroundColor).toBe(document.documentElement.style.backgroundColor);
  expect(document.getElementById('root')?.style.backgroundColor).toBe(document.body.style.backgroundColor);
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(color);
  expect(document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content')).toBe(status);
  expect(localStorage.getItem('set-theme-startup')).toBe(choice);
 }
});
it('reloads at most once per transition after persistence and saves the current route and main scroll',async()=>{
 await db.settings.update('settings',{theme:'midnight'});syncTheme('midnight',true);
 const main=document.querySelector('main')!;main.scrollTop=420;const reload=vi.fn();
 expect(await reloadIOSThemeOnce('midnight','swiss',{persisted:true,reload})).toBe(true);
 expect(await reloadIOSThemeOnce('midnight','swiss',{persisted:true,reload})).toBe(false);
 expect(reload).toHaveBeenCalledTimes(1);
 expect(JSON.parse(sessionStorage.getItem('base-theme-view-v1')!)).toMatchObject({y:420,url:location.pathname+location.search+location.hash});
 // A new document starts with the target theme and never reloads again.
 expect(await reloadIOSThemeOnce('midnight','midnight',{persisted:true,reload})).toBe(false);
});
it('protects active workouts, unsaved edits, dialogs and unavailable storage',async()=>{
 await db.settings.update('settings',{theme:'swiss'});syncTheme('swiss',false);
 const reload=vi.fn();await db.workouts.put({id:'active',name:'Push Day',date:'2026-11-25',status:'active',started:0,duration:null,exercises:[]});
 expect(await reloadIOSThemeOnce('swiss','midnight',{persisted:true,reload})).toBe(false);
 await db.workouts.clear();const unwatch=observeThemeSafety();const input=document.createElement('input');document.body.append(input);input.dispatchEvent(new Event('input',{bubbles:true}));
 expect(await reloadIOSThemeOnce('swiss','midnight',{persisted:true,reload})).toBe(false);unwatch();resetThemeSafetyForRoute();
 const dialog=document.createElement('dialog');dialog.open=true;document.body.append(dialog);expect(await reloadIOSThemeOnce('swiss','midnight',{persisted:true,reload})).toBe(false);dialog.remove();
 expect(await reloadIOSThemeOnce('swiss','midnight',{persisted:false,reload})).toBe(false);expect(reload).not.toHaveBeenCalled();
});
it('does not reload Safari browser tabs or desktop and blocks obsolete requests',async()=>{
 await db.settings.update('settings',{theme:'midnight'});
 Object.defineProperty(navigator,'standalone',{configurable:true,value:false});expect(isIOSStandalone()).toBe(false);
 const reload=vi.fn();expect(await reloadIOSThemeOnce('midnight','swiss',{persisted:true,reload})).toBe(false);
 Object.defineProperty(navigator,'standalone',{configurable:true,value:true});expect(await reloadIOSThemeOnce('midnight','swiss',{persisted:true,reload,isCurrent:()=>false})).toBe(false);
 expect(resolveTheme('system',true)).toBe('midnight');expect(resolveTheme('system',false)).toBe('swiss');
});
it('restores scroll once and discards stale restoration data',()=>{
 const callback=vi.fn();vi.stubGlobal('requestAnimationFrame',(fn:()=>void)=>{callback.mockImplementation(fn);return 1;});
 sessionStorage.setItem('base-theme-view-v1',JSON.stringify({url:location.pathname+location.search+location.hash,x:0,y:340,expires:Date.now()+1000}));
 expect(restoreThemeView()).toBe(true);callback();expect(document.querySelector('main')?.scrollTop).toBe(340);expect(restoreThemeView()).toBe(false);
 vi.unstubAllGlobals();
});
