import { readTheme } from "../services/theme";
import { useEffect } from "react";
import { db, type Settings } from "../data";
export const themes = [["swiss","Swiss Light"],["midnight","Midnight"],["stone","Stone"],["forest","Forest"],["glass","Liquid Glass"],["system","Systemdesign"]] as const;
export function useTheme(theme:Settings["theme"]) {
  useEffect(()=>{
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const selected = theme === "system" ? media.matches ? "midnight" : "swiss" : theme ?? (readTheme() === "dark" ? "midnight" : "swiss");
      document.documentElement.dataset.theme = selected;
      document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute("content", selected === "midnight" ? "black" : "default");
      try { localStorage.setItem("set-theme-startup", theme ?? selected); } catch { /* IndexedDB remains authoritative. */ }
      document.documentElement.style.backgroundColor = {swiss:"#f7f7f7",midnight:"#121416",stone:"#f3f0e9",forest:"#eef3ed",glass:"#eaf0f8"}[selected];
      document.documentElement.style.colorScheme = selected === "midnight" ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", {swiss:"#f7f7f7",midnight:"#121416",stone:"#f3f0e9",forest:"#eef3ed",glass:"#eaf0f8"}[selected]);
    };
    apply(); media.addEventListener("change",apply); return ()=>media.removeEventListener("change",apply);
  },[theme]);
}
export function ThemeStudio({settings}:{settings:Settings}) {
  return <article><h2>Theme Studio</h2><label>Design<select aria-label="Design" value={settings.theme ?? (readTheme() === "dark" ? "midnight" : "swiss")} onChange={e=>{void db.settings.update("settings",{theme:e.target.value as Settings["theme"]});}}>{themes.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label><p>Deine Auswahl wird auf diesem Gerät gespeichert und ist im Backup enthalten.</p></article>;
}
