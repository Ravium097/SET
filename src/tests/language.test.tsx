// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { format } from 'date-fns';
import { db, init, exportData, restore } from '../data';
import { LanguagePicker } from '../components/settings/LanguagePicker';
import { Training } from '../features/Training';
import { Dashboard } from '../features/Dashboard';
import { activateLanguage, tr, getLocale, getDateLocale, useLanguage } from '../i18n/runtime';
function App(){useLanguage();return <MemoryRouter><LanguagePicker/><Training/><Dashboard/></MemoryRouter>;}
beforeEach(async()=>{activateLanguage('de');for(const table of db.tables)await table.clear();await init();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(()=>{cleanup();activateLanguage('de');});
it('switches both ways immediately and preserves user template names and notes',async()=>{
 await db.workouts.put({id:'custom',name:'Deine Vorlagen',date:'2026-11-25',started:null,duration:null,status:'template',exercises:[]});
 await db.dayNotes.put({id:'training-notes',notes:'Mein Push Day'});
 render(<App/>);
 fireEvent.change(await screen.findByLabelText('App-Sprache'),{target:{value:'en'}});
 await screen.findByRole('heading',{name:'Your templates'});
 expect(screen.getByRole('heading',{name:'Deine Vorlagen',level:3})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Start free workout'})).toBeTruthy();
 expect(document.documentElement.lang).toBe('en');expect(localStorage.getItem('base-language')).toBe('en');
 expect((await db.settings.get('settings'))?.language).toBe('en');
 expect((await db.workouts.get('custom'))?.name).toBe('Deine Vorlagen');expect((await db.dayNotes.get('training-notes'))?.notes).toBe('Mein Push Day');
 fireEvent.change(screen.getByLabelText('App language'),{target:{value:'de'}});
 await screen.findByRole('button',{name:'Freies Training starten'});expect(document.documentElement.lang).toBe('de');
});
it('keeps gym terminology and interpolation values intact while translating dates, numbers and messages',()=>{
 activateLanguage('en');
 expect(tr('Push Day')).toBe('Push Day');expect(tr('RPE')).toBe('RPE');
 expect(tr('Vorlage „{0}“ löschen?',['Deine Vorlagen'])).toBe('Delete template “Deine Vorlagen”?');
 expect(tr('3 Übungen ergänzt. Jetzt auch offline verfügbar.')).toBe('Added 3 exercises. Now also available offline.');
 expect(tr('{0}{1}',['a','b'])).toBe('ab');
 expect(format(new Date('2026-11-23T12:00:00'),'EEEE',{locale:getDateLocale()})).toBe('Monday');
 expect((12.5).toLocaleString(getLocale())).toBe('12.5');
 activateLanguage('de');expect((12.5).toLocaleString(getLocale())).toBe('12,5');
});
it('round-trips the language preference without changing legacy backups',async()=>{
 await db.settings.update('settings',{language:'en'});const backup=await exportData();await restore(backup);
 expect((await db.settings.get('settings'))?.language).toBe('en');delete backup.settings.language;await restore(backup);
 expect((await db.settings.get('settings'))?.language).toBeUndefined();
});
it('opens the weekly planner entirely in English and keeps weekday assignment canonical',async()=>{
 await db.settings.update('settings',{language:'en',trainingPlans:[{id:'p',name:'Mein Split',days:Array.from({length:7},()=>[]),overrides:{}}],activeTrainingPlan:'p'});
 activateLanguage('en');render(<App/>);
 const button=await screen.findByRole('button',{name:/Training plan Weekly overview/});
 await waitFor(()=>expect((button as HTMLButtonElement).disabled).toBe(false));fireEvent.click(button);
 await screen.findByRole('dialog',{name:'Weekly plan'});expect(screen.getByRole('heading',{name:'Monday'})).toBeTruthy();
 expect(screen.getByRole('option',{name:'Mein Split'})).toBeTruthy();
});
