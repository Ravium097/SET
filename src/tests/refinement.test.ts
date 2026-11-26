// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { finishWorkout } from '../services/finishWorkout';
import { beforeEach,it,expect } from 'vitest';
import { db,init,emptySet,exportData,restore,type Workout } from '../data';
import { saveWorkoutEdit } from '../services/workoutEdits';
import { postponeWorkout,scheduledDay } from '../features/planner';
beforeEach(async()=>{for(const table of db.tables)await table.clear();await init();});
const workout=():Workout=>({id:'active',name:'Push Day',date:'2026-11-26',status:'active',started:1,duration:null,exercises:[{id:'bench',exerciseId:'exercise',name:'Bench Press',sets:[{...emptySet(),id:'set'}]}]});
it('preserves different edits made against the same rendered workout snapshot',async()=>{
 const before=workout();await db.workouts.put(before);
 const weight=structuredClone(before),reps=structuredClone(before);weight.exercises[0].sets[0].weight=25;reps.exercises[0].sets[0].reps=10;
 await Promise.all([saveWorkoutEdit(before,weight),saveWorkoutEdit(before,reps)]);
 expect((await db.workouts.get(before.id))?.exercises[0].sets[0]).toMatchObject({weight:25,reps:10});
});
it('does not resurrect removed sets, deleted workouts or completed sessions',async()=>{
 const before=workout();await db.workouts.put(before);const edit=structuredClone(before);edit.exercises[0].sets[0].reps=12;
 await db.workouts.update(before.id,{status:'completed',duration:123});await saveWorkoutEdit(before,edit);
 expect(await db.workouts.get(before.id)).toMatchObject({status:'completed',duration:123});
 await db.workouts.update(before.id,{exercises:[]});await saveWorkoutEdit(before,edit);expect((await db.workouts.get(before.id))?.exercises).toEqual([]);
 await db.workouts.delete(before.id);await expect(saveWorkoutEdit(before,edit)).rejects.toThrow();expect(await db.workouts.count()).toBe(0);
});
it('rejects duplicate nested backup identities atomically',async()=>{
 const original=workout();await db.workouts.put(original);const backup=await exportData();backup.workouts[0].exercises[0].sets.push({...backup.workouts[0].exercises[0].sets[0]});
 await expect(restore(backup)).rejects.toThrow('Doppelte IDs');expect(await db.workouts.get(original.id)).toEqual(original);
});
it('postpones one occurrence into date exceptions without editing recurring days',()=>{
 const plan={id:'p',name:'Split',days:Array.from({length:7},(_,i)=>i===3?[{id:'push',name:'Push Day'}]:[]),overrides:{}};
 const next=postponeWorkout(plan,'2026-11-26','push','2026-11-27');
 expect(next.days).toEqual(plan.days);expect(scheduledDay(next,new Date('2026-11-26T12:00:00'),[])).toEqual([]);
 expect(scheduledDay(next,new Date('2026-11-27T12:00:00'),[])[0].name).toBe('Push Day');
 expect(scheduledDay(next,new Date('2026-12-03T12:00:00'),[])[0].name).toBe('Push Day');
});

it('finishes from the latest saved values, including edits queued just before completion',async()=>{
 const before=workout();await db.workouts.put(before);const edited=structuredClone(before);edited.exercises[0].sets[0].weight=40;
 await Promise.all([saveWorkoutEdit(before,edited),finishWorkout(before.id,2001)]);
 const completed=await db.workouts.get(before.id);expect(completed).toMatchObject({status:'completed',duration:2});expect(completed?.exercises[0].sets[0].weight).toBe(40);
});
