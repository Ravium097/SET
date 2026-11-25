import { tr } from "../i18n/runtime";
import { readTheme } from "../services/theme";
import { useEffect, useLayoutEffect, useState } from "react";
import { readStartupTheme, resolveTheme, syncTheme, isIOSStandalone, reloadIOSThemeOnce, observeThemeSafety, resetThemeSafetyForRoute } from "../services/themeSync";
import { db, type Settings } from "../data";
export const themes = [["swiss", "Hell"], ["midnight", "Dunkel"], ["stone", "Stein"], ["forest", "Wald"], ["glass", "Neutral"], ["system", "Systemdesign"]] as const;
const bootTheme = resolveTheme(readStartupTheme(),typeof window!=="undefined"&&!!window.matchMedia?.('(prefers-color-scheme: dark)').matches);
export function useTheme(theme: Settings["theme"],ready=true,route='') {
    useLayoutEffect(() => {
        const media=window.matchMedia('(prefers-color-scheme: dark)');
        let disposed=false,requested:ReturnType<typeof syncTheme>;
        let timer:ReturnType<typeof setTimeout>;
        const attempt=async()=>{
            if(disposed||!ready||!isIOSStandalone()||requested.resolved===bootTheme||!requested.persisted)return;
            const reloaded=await reloadIOSThemeOnce(requested.resolved,bootTheme,{persisted:requested.persisted,isCurrent:()=>!disposed});
            if(!disposed&&!reloaded)timer=setTimeout(attempt,2000);
        };
        const apply=()=>{
            clearTimeout(timer);
            requested=syncTheme(theme??readStartupTheme(),media.matches);
            // Direct synchronization first, then a guarded iOS-only fallback.
            timer=setTimeout(attempt,800);
        };
        apply();
        const visible=()=>{if(document.visibilityState==='visible')apply();};
        if(media.addEventListener)media.addEventListener('change',apply);else media.addListener(apply);
        document.addEventListener('visibilitychange',visible);
        return ()=>{disposed=true;clearTimeout(timer);if(media.removeEventListener)media.removeEventListener('change',apply);else media.removeListener(apply);document.removeEventListener('visibilitychange',visible);};
    },[theme,ready]);
    useEffect(observeThemeSafety,[]);
    useEffect(()=>{resetThemeSafetyForRoute();},[route]);
}
export function ThemeStudio({ settings }: {
    settings: Settings;
}) {
    const [message,setMessage]=useState("");
    return <article><h2>{tr("Design")}</h2><label>{tr("Design")}<select aria-label={tr("Design")} value={settings.theme ?? (readTheme() === "dark" ? "midnight" : "swiss")} data-theme-switch onChange={async e => {
        const theme=e.target.value as Settings['theme'];
        try {const saved=await db.settings.update('settings',{theme});if(!saved)throw new Error('Missing settings');setMessage('');}
        catch{setMessage('Darstellung konnte nicht gespeichert werden.');}
    }}>{themes.map(([value, name]) => <option key={value} value={value}>{tr(name)}</option>)}</select></label><p>{tr("Deine Auswahl wird auf diesem Ger\u00E4t gespeichert und ist im Backup enthalten.")}</p>{message&&<p role="alert">{tr(message)}</p>}</article>;
}
