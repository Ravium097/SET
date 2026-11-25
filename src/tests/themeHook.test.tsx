// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, fireEvent, screen, waitFor, act, cleanup } from '@testing-library/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, init } from '../data';
import { useTheme, ThemeStudio } from '../features/ThemeStudio';
let dark=false;
let listener:()=>void=()=>{};
const removed=vi.fn();
function App(){const settings=useLiveQuery(()=>db.settings.get('settings'));useTheme(settings?.theme,!!settings,'/settings');return settings?<ThemeStudio settings={settings}/>:null;}
beforeEach(async()=>{
 for(const table of db.tables)await table.clear();await init();localStorage.clear();sessionStorage.clear();dark=false;
 Object.defineProperty(navigator,'standalone',{configurable:true,value:false});
 Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({get matches(){return dark;},addEventListener:(_name:string,callback:()=>void)=>{listener=callback;},removeEventListener:removed})});
 document.head.innerHTML='<meta name="theme-color"><meta name="apple-mobile-web-app-status-bar-style">';
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('persists manual selections and follows automatic system changes without reloading Safari',async()=>{
 render(<App/>);const select=await screen.findByLabelText('Design');
 fireEvent.change(select,{target:{value:'swiss'}});await waitFor(()=>expect(document.documentElement.dataset.theme).toBe('swiss'));
 expect((await db.settings.get('settings'))?.theme).toBe('swiss');expect(localStorage.getItem('set-theme-startup')).toBe('swiss');
 fireEvent.change(select,{target:{value:'midnight'}});await waitFor(()=>expect(document.documentElement.dataset.theme).toBe('midnight'));
 fireEvent.change(select,{target:{value:'system'}});await waitFor(()=>expect(localStorage.getItem('set-theme-startup')).toBe('system'));
 expect(document.documentElement.dataset.theme).toBe('swiss');act(()=>{dark=true;listener();});expect(document.documentElement.dataset.theme).toBe('midnight');
 act(()=>{dark=false;listener();});expect(document.documentElement.dataset.theme).toBe('swiss');
});
it('does not apply a preference that failed to persist',async()=>{
 await db.settings.update('settings',{theme:'swiss'});render(<App/>);const select=await screen.findByLabelText('Design');
 await waitFor(()=>expect(document.documentElement.dataset.theme).toBe('swiss'));
 vi.spyOn(db.settings,'update').mockRejectedValueOnce(new Error('quota'));
 fireEvent.change(select,{target:{value:'midnight'}});await screen.findByRole('alert');expect(document.documentElement.dataset.theme).toBe('swiss');expect(localStorage.getItem('set-theme-startup')).toBe('swiss');
});
