// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db, init } from '../data';
import { Dashboard } from '../features/Dashboard';
import { dayKey } from '../features/planner';
beforeEach(async()=>{
 for(const t of db.tables)await t.clear();await init();
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const open=()=>render(<MemoryRouter><Dashboard/></MemoryRouter>);
it('resizes, moves, hides and restores dashboard cards through the real controls',async()=>{
 open();fireEvent.click(await screen.findByRole('button',{name:'Dashboard anpassen'}));
 fireEvent.change(screen.getByLabelText('Training Größe'),{target:{value:'large'}});
 await waitFor(async()=>expect((await db.settings.get('settings'))?.dashboardLayout?.[0].size).toBe('large'));
 fireEvent.click(screen.getByLabelText('Training nach unten'));
 await waitFor(async()=>expect((await db.settings.get('settings'))?.dashboardLayout?.[1].kind).toBe('training'));
 fireEvent.click(screen.getByRole('checkbox',{name:'Körpergewicht'}));
 await waitFor(async()=>expect((await db.settings.get('settings'))?.dashboardLayout?.find(w=>w.kind==='body')?.hidden).toBe(true));
 fireEvent.click(screen.getByRole('button',{name:'Standard wiederherstellen'}));
 await waitFor(async()=>expect((await db.settings.get('settings'))?.dashboardLayout?.[0]).toMatchObject({kind:'training',size:'small',hidden:false}));
});
it('creates, duplicates and switches weekly plans and persists temporary rest days',async()=>{
 vi.spyOn(window,'prompt').mockReturnValueOnce('Mein Split').mockReturnValueOnce('Split Kopie');
 open();fireEvent.click(await screen.findByRole('button',{name:'Dashboard anpassen'}));fireEvent.click(screen.getByRole('button',{name:'Wochenplan öffnen'}));
 fireEvent.click(screen.getByRole('button',{name:'Neuer Plan'}));
 await screen.findByRole('option',{name:'Mein Split'});
 fireEvent.change(screen.getByLabelText('Eigenes Training'),{target:{value:'Technik'}});
 fireEvent.click(screen.getAllByRole('button',{name:'Eigenes Training hinzufügen'})[0]);
 await waitFor(async()=>expect((await db.settings.get('settings'))?.trainingPlans?.[0].days[0][0].name).toBe('Technik'));
 fireEvent.click(screen.getByRole('button',{name:'Duplizieren'}));
 await screen.findByRole('option',{name:'Split Kopie'});
 fireEvent.change(screen.getByLabelText('Bearbeiten'),{target:{value:'date'}});
 fireEvent.click(screen.getByRole('button',{name:'Als Ruhetag planen'}));
 await waitFor(async()=>expect((await db.settings.get('settings'))?.trainingPlans?.[1].overrides[dayKey(new Date())]).toEqual([]));
 fireEvent.change(screen.getByLabelText('Aktiver Plan'),{target:{value:(await db.settings.get('settings'))!.trainingPlans![0].id}});
 await waitFor(async()=>{const s=(await db.settings.get('settings'))!;expect(s.activeTrainingPlan).toBe(s.trainingPlans![0].id);});
});
it('updates the next widget immediately after actual completion',async()=>{
 const date=dayKey(new Date()),days=Array.from({length:7},()=>[] as {id:string;name:string}[]);days[(new Date().getDay()+6)%7]=[{id:'a',name:'Technik'},{id:'b',name:'Mobilität'}];
 await db.settings.update('settings',{dashboardLayout:[{id:'next',kind:'next',size:'medium',hidden:false}],trainingPlans:[{id:'p',name:'Plan',days,overrides:{}}],activeTrainingPlan:'p'});
 open();await screen.findByText('Technik');
 await db.workouts.put({id:'finished',name:'Technik',date,started:0,duration:60,status:'completed',exercises:[],scheduledSlot:'a',scheduledDate:date});
 await screen.findByText('Mobilität');expect(screen.queryByText('Technik')).toBeNull();
});
it('reorders cards with pointer drag and drop and persists the result',async()=>{
 const capture=vi.fn();HTMLElement.prototype.setPointerCapture=capture;
 open();fireEvent.click(await screen.findByRole('button',{name:'Dashboard anpassen'}));
 const target=document.querySelector('[data-widget-id="body"]')!;
 Object.defineProperty(document,'elementFromPoint',{configurable:true,value:()=>target});
 const handle=screen.getByRole('button',{name:'Training verschieben'});
 fireEvent.pointerDown(handle,{pointerId:1,clientX:20,clientY:20});fireEvent.pointerUp(handle,{pointerId:1,clientX:200,clientY:200});
 await waitFor(async()=>expect((await db.settings.get('settings'))?.dashboardLayout?.[1].kind).toBe('training'));expect(capture).toHaveBeenCalled();
});
it('adds a live gallery widget, replaces it and removes it independently',async()=>{
 open();fireEvent.click(await screen.findByRole('button',{name:'Widget hinzufügen'}));
 const next=screen.getByRole('heading',{name:'Nächstes Training',level:3}).parentElement!;
 fireEvent.click(next.querySelector(':scope > button')!);
 await waitFor(async()=>expect((await db.settings.get('settings'))?.dashboardLayout?.at(-1)?.kind).toBe('next'));
 const widget=document.querySelector('[data-widget-id]:last-of-type')!;
 fireEvent.click([...widget.querySelectorAll('button')].find(b=>b.textContent==='Ersetzen')!);
 const quick=screen.getByRole('heading',{name:'Schnellstart',level:3}).parentElement!;fireEvent.click(quick.querySelector(':scope > button')!);
 await waitFor(async()=>expect((await db.settings.get('settings'))?.dashboardLayout?.at(-1)?.kind).toBe('quick'));
 fireEvent.click([...document.querySelector('[data-widget-id]:last-of-type')!.querySelectorAll('button')].find(b=>b.textContent==='Entfernen')!);
 await waitFor(async()=>expect((await db.settings.get('settings'))?.dashboardLayout).toHaveLength(6));
});
it('opens the plan by tapping its widget without extra card buttons',async()=>{
 await db.settings.update('settings',{dashboardLayout:[{id:'next',kind:'next',size:'small',hidden:false}]});
 open();const card=await screen.findByRole('button',{name:'Nächstes Training'});
 expect(card.querySelectorAll('button,a')).toHaveLength(0);
 expect(screen.queryByText('Plan bearbeiten')).toBeNull();
 fireEvent.click(card);await screen.findByRole('dialog',{name:'Wochenplan'});
});
it('opens notes for editing from a compact widget and saves locally',async()=>{
 await db.settings.update('settings',{dashboardLayout:[{id:'notes',kind:'notes',size:'small',hidden:false}]});
 open();fireEvent.click(await screen.findByRole('button',{name:'Trainingsnotizen'}));
 fireEvent.change(screen.getByLabelText('Trainingsnotizen bearbeiten'),{target:{value:'Technik ruhig ausführen'}});
 await waitFor(async()=>expect((await db.dayNotes.get('training-notes'))?.notes).toBe('Technik ruhig ausführen'));
});
