// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { db, init, type Workout } from '../data';
import { Training } from '../features/Training';
const template:Workout={id:'push',name:'Push Day',date:'2026-11-25',started:null,duration:null,status:'template',exercises:[]};
function Location(){return <output aria-label="Route">{useLocation().pathname}</output>;}
function open(){return render(<MemoryRouter initialEntries={['/training']}><Training/><Location/></MemoryRouter>);}
beforeEach(async()=>{for(const t of db.tables)await t.clear();await init();await db.workouts.put(template);HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('opens the existing weekly planner and keeps template groups',async()=>{
 open();const planner=await screen.findByRole('button',{name:/Trainingsplan/});await waitFor(()=>expect((planner as HTMLButtonElement).disabled).toBe(false));fireEvent.click(planner);
 await screen.findByRole('dialog',{name:'Wochenplan'});expect(screen.getByText('Drück- und Zugtraining')).toBeTruthy();
});
it('provides a library shortcut and a click-accessible explanation',async()=>{
 open();expect((await screen.findByRole('link',{name:/Übungsbibliothek/})).getAttribute('href')).toBe('/library');
 const info=screen.getByLabelText('Information zu vorherigen Satzwerten');fireEvent.click(info);
 expect(info.parentElement?.hasAttribute('open')).toBe(true);expect(screen.getByRole('tooltip').textContent).toContain('Letzte Satzwerte');
});
it('creates a new template using the section plus button',async()=>{
 open();fireEvent.click(await screen.findByRole('button',{name:'Vorlage erstellen'}));
 await waitFor(()=>expect(screen.getByLabelText('Route').textContent).toMatch(/^\/workout\//));
 expect(await db.workouts.where('status').equals('template').count()).toBe(2);
});
it('starts templates and reuses the existing workout service',async()=>{
 open();fireEvent.click(await screen.findByRole('button',{name:'Push Day starten'}));
 await waitFor(()=>expect(screen.getByLabelText('Route').textContent).toMatch(/^\/workout\//));
 expect((await db.workouts.where('status').equals('active').first())?.templateId).toBe('push');
});
it('keeps edit, duplicate and delete actions',async()=>{
 open();fireEvent.click(await screen.findByLabelText('Optionen für Push Day'));
 expect(screen.getByRole('link',{name:'Bearbeiten'}).getAttribute('href')).toBe('/workout/push');
 fireEvent.click(screen.getByRole('button',{name:'Duplizieren'}));await screen.findByText('Push Day Kopie');
 vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click([...screen.getByText('Push Day').closest('article')!.querySelectorAll('button')].find(button=>button.textContent==='Löschen')!);
 await waitFor(async()=>expect(await db.workouts.get('push')).toBeUndefined());
});
