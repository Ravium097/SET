import { db, type Settings } from '../data';
export type AppTheme = NonNullable<Settings['theme']>;
export const themeBackgrounds = {swiss:'#F5F5F7',midnight:'#101113',stone:'#f3f0e9',forest:'#eef3ed',glass:'#f5f5f7'} as const;
export type ResolvedTheme = keyof typeof themeBackgrounds;
const markerKey='base-theme-reload-v1', viewKey='base-theme-view-v1';
export function readStartupTheme():AppTheme {
 try {const value=localStorage.getItem('set-theme-startup');if(value==='system'||value&&Object.prototype.hasOwnProperty.call(themeBackgrounds,value))return value as AppTheme;return localStorage.getItem('set-theme')==='light'?'swiss':'midnight';}catch{return 'midnight';}
}
export function resolveTheme(choice:AppTheme,dark:boolean):ResolvedTheme {return choice==='system'?(dark?'midnight':'swiss'):choice;}
export function syncTheme(choice:AppTheme,dark:boolean):{resolved:ResolvedTheme;persisted:boolean} {
 const resolved=resolveTheme(choice,dark),color=themeBackgrounds[resolved],root=document.documentElement;
 let persisted=false;
 try{localStorage.setItem('set-theme-startup',choice);persisted=true;}catch{/* No automatic reload without a startup preference. */}
 root.dataset.theme=resolved;
 root.style.colorScheme=resolved==='midnight'?'dark':'light';
 root.style.setProperty('--startup-bg',color);
 root.style.backgroundColor=color;
 document.body.style.backgroundColor=color;
 const app=document.getElementById('root');if(app)app.style.backgroundColor=color;
 for(const [name,content] of [['theme-color',color],['apple-mobile-web-app-status-bar-style',resolved==='midnight'?'black':'default']]){
  let meta=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if(!meta){meta=document.createElement('meta');meta.name=name;document.head.append(meta);}
  meta.content=content;
 }
 return {resolved,persisted};
}
export function isIOSStandalone():boolean {
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 return ios&&((navigator as Navigator & {standalone?:boolean}).standalone===true||window.matchMedia('(display-mode: standalone)').matches);
}
let dirty=false;
export function observeThemeSafety():()=>void {
 const edit=(event:Event)=>{const target=event.target as Element|null;if(target?.matches('input,textarea,select,[contenteditable="true"]')&&!target.closest('[data-theme-switch]'))dirty=true;};
 document.addEventListener('input',edit,true);document.addEventListener('change',edit,true);
 return ()=>{document.removeEventListener('input',edit,true);document.removeEventListener('change',edit,true);};
}
export function resetThemeSafetyForRoute(){dirty=false;}
export function hasUnsavedThemeRisk(){return dirty||!!document.querySelector('dialog[open]')||!!document.activeElement?.matches('input,textarea,select:not([data-theme-switch]),[contenteditable="true"]');}
/** Called only after the direct DOM/meta synchronization has had time to paint. */
export async function reloadIOSThemeOnce(target:ResolvedTheme,bootTheme:ResolvedTheme,options:{persisted:boolean;reload?:()=>void;isCurrent?:()=>boolean}):Promise<boolean> {
 if(!isIOSStandalone()||target===bootTheme||!options.persisted||document.visibilityState==='hidden'||hasUnsavedThemeRisk())return false;
 // iOS cannot report whether native status-bar chrome accepted a dynamic meta update.
 // A brightness change in an installed app uses one guarded reload as a fallback.
 if((target==='midnight')===(bootTheme==='midnight'))return false;
 try {
  const marker=JSON.parse(sessionStorage.getItem(markerKey)||'null');
  if(marker?.target===target&&marker?.boot===bootTheme)return false;
  if(await db.workouts.where('status').equals('active').count())return false;
  const settings=await db.settings.get('settings');
  if(!settings||resolveTheme(settings.theme??readStartupTheme(),window.matchMedia('(prefers-color-scheme: dark)').matches)!==target)return false;
  if(options.isCurrent&&!options.isCurrent()||hasUnsavedThemeRisk()||document.visibilityState!=='visible')return false;
  if(!saveReloadView())return false;
  sessionStorage.setItem(markerKey,JSON.stringify({target,boot:bootTheme}));
  (options.reload??(()=>location.reload()))();return true;
 }catch{return false;}
}
export function restoreThemeView():boolean {
 try{
  const raw=sessionStorage.getItem(viewKey);if(!raw)return false;
  sessionStorage.removeItem(viewKey);
  const saved=JSON.parse(raw);
  if(saved.expires<Date.now()||saved.url!==location.pathname+location.search+location.hash||!Number.isFinite(saved.y)||!Number.isFinite(saved.x))return false;
  const main=document.querySelector('main');if(!main)return false;
  let stopped=false;const end=Date.now()+5000;
  const stop=()=>{stopped=true;document.removeEventListener('pointerdown',stop,true);document.removeEventListener('touchstart',stop,true);document.removeEventListener('wheel',stop,true);};
  document.addEventListener('pointerdown',stop,true);document.addEventListener('touchstart',stop,true);document.addEventListener('wheel',stop,true);
  const restore=()=>{if(stopped)return;main.scrollLeft=saved.x;main.scrollTop=saved.y;if(main.scrollTop>=saved.y||Date.now()>end){stop();return;}requestAnimationFrame(restore);};
  requestAnimationFrame(restore);return true;
 }catch{return false;}
}

export function saveReloadView():boolean {
 try {const main=document.querySelector('main');sessionStorage.setItem(viewKey,JSON.stringify({url:location.pathname+location.search+location.hash,x:main?.scrollLeft??0,y:main?.scrollTop??0,expires:Date.now()+60000}));return true;}catch{return false;}
}
