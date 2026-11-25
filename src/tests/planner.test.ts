// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { db, init, exportData, restore, id, type TrainingPlan, type Workout } from '../data';
import { defaultLayout, reorder, scheduledDay, nextScheduled, weekSchedule } from '../features/planner';
import { startWorkout } from '../services/carryForward';
const date=new Date('2026-11-23T12:00:00');
const plan=():TrainingPlan=>({id:'plan',name:'Split',days:[[{id:'a',name:'Push',templateId:'template'},{id:'b',name:'Push',templateId:'template'}],[],[],[],[],[],[]],overrides:{}});
const completed=(slot?:string):Workout=>({id:id(),name:'Push',date:'2026-11-23',status:'completed',exercises:[],started:0,duration:60,templateId:'template',scheduledSlot:slot,scheduledDate:slot?'2026-11-23':undefined});
beforeEach(async()=>{for(const t of db.tables)await t.clear();await init();});
it('matches actual completions once per scheduled slot and skips intentional rest days',()=>{
 const p=plan(),w=completed('a');expect(scheduledDay(p,date,[w]).map(s=>s.completed)).toEqual([true,false]);
 expect(nextScheduled(p,date,[w])?.id).toBe('b');
 expect(nextScheduled(p,date,[w,completed('b')])?.date).toBe('2026-11-30');
 expect(weekSchedule(p,date,[w]).slice(1).every(d=>d.slots.length===0)).toBe(true);
 expect(scheduledDay(p,date,[completed()]).filter(s=>s.completed)).toHaveLength(1);
});
it('respects temporary recovery overrides and next-week recurrence without mutating the plan',()=>{
 const p=plan();p.overrides['2026-11-23']=[];
 expect(scheduledDay(p,date,[])).toEqual([]);expect(nextScheduled(p,date,[])?.date).toBe('2026-11-30');expect(p.days[0]).toHaveLength(2);
});
it('persists resized, reordered and hidden widgets plus multiple plans through a backup round trip',async()=>{
 const layout=defaultLayout();layout[0].size='large';layout[1].hidden=true;
 const moved=reorder(layout,'activity','training');
 const p=plan();p.overrides['2026-11-24']=[p.days[0][0]];
 await db.settings.update('settings',{dashboardLayout:moved,trainingPlans:[p,{...p,id:'second',name:'Other'}],activeTrainingPlan:'second'});
 const backup=await exportData();await restore(JSON.parse(JSON.stringify(backup)));
 const settings=await db.settings.get('settings');expect(settings?.dashboardLayout).toEqual(moved);expect(settings?.trainingPlans).toEqual([p,{...p,id:'second',name:'Other'}]);expect(settings?.activeTrainingPlan).toBe('second');
});
it('starts a planned workout using the existing service and preserves its association in backups',async()=>{
 const template:Workout={...completed(),id:'template',status:'template'};
 const w=await startWorkout(template,{slot:'a',date:'2026-11-23'});expect(w.templateId).toBe('template');expect(w.scheduledSlot).toBe('a');
 const active=await startWorkout(template,{slot:'b',date:'2026-11-23'});expect(active.id).toBe(w.id);expect(active.scheduledSlot).toBe('a');
 await db.workouts.update(w.id,{status:'completed'});const backup=await exportData();await restore(backup);expect((await db.workouts.get(w.id))?.scheduledSlot).toBe('a');
});
it('accepts old backups without new optional fields',async()=>{const backup=await exportData();expect(backup.settings.dashboardLayout).toBeUndefined();await restore(backup);expect(await db.settings.get('settings')).toBeTruthy();});
