import { useSyncExternalStore } from 'react';
import { de, enGB } from 'date-fns/locale';
import english from './en.json';
export type Language = 'de' | 'en';
const dictionary: Record<string,string> = english;
const listeners = new Set<() => void>();
const reverse = new Map(Object.entries(dictionary).map(([de,en])=>[en,de]));
const escapePattern=(value:string)=>Array.from(value).map(char=>[46,42,43,63,94,36,123,125,40,41,124,91,93,92].includes(char.charCodeAt(0))?String.fromCharCode(92)+char:char).join('');
const patterns=Object.entries(dictionary).filter(([key])=>/\{\d+\}/.test(key)&&key.replace(/\{\d+\}/g,'').trim().length>=4).flatMap(([de,en])=>[de,en].map(text=>{
 const indices:number[]=[];let pattern='',cursor=0;
 for(const match of text.matchAll(/\{(\d+)\}/g)){pattern+=escapePattern(text.slice(cursor,match.index))+'(.*?)';indices.push(Number(match[1]));cursor=match.index!+match[0].length;}
 return {regex:new RegExp('^'+pattern+escapePattern(text.slice(cursor))+'$','s'),indices,de,en};
}));
let language: Language = 'de';
try { if (localStorage.getItem('base-language') === 'en') language = 'en'; } catch { /* IndexedDB is the durable setting. */ }
export const getLanguage = () => language;
export const getLocale = () => language === 'en' ? 'en-GB' : 'de-DE';
export const getDateLocale = () => language === 'en' ? enGB : de;
export function activateLanguage(next: Language) {
  const changed = language !== next;
  language = next;
  if (typeof document !== 'undefined') {document.documentElement.lang = next;document.title=next==='en'?'BASE. · Training & Diary':'BASE. · Training & Tagebuch';}
  try { localStorage.setItem('base-language',next); } catch { /* Keep the saved IndexedDB preference. */ }
  if (changed) listeners.forEach(listener => listener());
}
export function useLanguage() {
  return useSyncExternalStore(listener => {listeners.add(listener);return () => {listeners.delete(listener);};},getLanguage,() => 'de' as Language);
}
/** Only app-owned copy is translated. Interpolation values are never translated. */
export function tr(input: string | number, values: readonly unknown[] = []): string {
  const source=String(input);
  const key = source.trim();
  const prefix = source.slice(0,source.length-source.trimStart().length);
  const suffix = source.slice(source.trimEnd().length);
  let translated = language === 'en' ? dictionary[key] ?? key : reverse.get(key) ?? key;
  let parameters=values;
  if(!values.length&&!Object.prototype.hasOwnProperty.call(dictionary,key)) {
    for(const pattern of patterns){const match=pattern.regex.exec(key);if(!match)continue;parameters=[];const found:unknown[]=[];pattern.indices.forEach((index,i)=>{found[index]=match[i+1];});parameters=found;translated=language==='en'?pattern.en:pattern.de;break;}
  }
  return prefix + translated.replace(/\{(\d+)\}/g,(match,index) => Number(index)<parameters.length ? String(parameters[Number(index)]) : match) + suffix;
}
export const hasEnglishTranslation = (source:string) => Object.prototype.hasOwnProperty.call(dictionary,source.trim());
export function formatDay(date:string):string {
  const value=new Date(date+'T12:00:00');
  return Number.isFinite(value.getTime())?value.toLocaleDateString(getLocale()):date;
}
