import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { db, emptySet, type Workout } from "../data";
import { carryForward, appendSet, startWorkout } from "../services/carryForward";
const set=(weight:number|null,reps:number|null,completed=true)=>({...emptySet(),weight,reps,completed});
const workout=(id:string,status:Workout["status"],date="2026-11-18"):Workout=>({id,name:"Push",date,status,started:1,duration:120,exercises:[{id:"item",exerciseId:"bench",name:"Bench",sets:[set(10,10,false),set(20,8,false)]}]});
beforeEach(async()=>{await db.workouts.clear();});
it("copies last matching work sets over template loads but not effort, warmups or completion",()=>{
 const previous=workout("past","completed");
 previous.exercises[0].sets=[{...set(5,20),type:"warmup"}, {...set(60,10),rpe:9,rir:1},set(65,8)];
 const fresh=workout("new","active","2026-11-19");
 fresh.exercises[0].sets.unshift({...set(15,12,false),type:"warmup"});
 const result=carryForward(fresh,[previous]);
 expect(result.exercises[0].sets.map(s=>s.weight)).toEqual([15,60,65]);
 expect(result.exercises[0].sets[1]).toMatchObject({completed:false,rpe:null,rir:null});
 expect(fresh.exercises[0].sets[1].weight).toBe(10);
});
it("preserves set positions, unmatched extra sets and 0 kg; never uses incomplete historical sets",()=>{
 const past=workout("past","completed");past.exercises[0].sets=[set(100,3,false),set(0,12)];
 const fresh=workout("new","active","2026-11-19");fresh.exercises[0].sets.push(set(30,6,false));
 expect(carryForward(fresh,[past]).exercises[0].sets.map(s=>s.weight)).toEqual([10,0,30]);
});
it("does not cross exercise identity, replacements or completed/current sets",()=>{
 const past=workout("past","completed");past.exercises[0].sets=[set(70,8),set(75,6)];
 const fresh=workout("new","active","2026-11-19");fresh.exercises[0].replacedFrom="other";
 expect(carryForward(fresh,[past])).toEqual(fresh);
 delete fresh.exercises[0].replacedFrom;fresh.exercises[0].exerciseId="other";
 expect(carryForward(fresh,[past])).toEqual(fresh);
 fresh.exercises[0].exerciseId="bench";fresh.exercises[0].sets[0].completed=true;
 expect(carryForward(fresh,[past]).exercises[0].sets[0].weight).toBe(10);
});
it("fills only an appended set without overwriting existing edits",()=>{
 const past=workout("past","completed");past.exercises[0].sets=[set(70,8),set(75,6)];
 const fresh=workout("new","active","2026-11-19");fresh.exercises[0].sets=[set(42,7,false)];
 const result=appendSet(fresh,0,[past]);
 expect(result.exercises[0].sets.map(s=>s.weight)).toEqual([42,75]);
});
it("persists new values once; resume and concurrent starts do not overwrite or duplicate",async()=>{
 const past=workout("past","completed","2020-01-01");past.exercises[0].sets=[set(60,10),set(65,8)];
 await db.workouts.put(past);
 const template=workout("template","template");await db.workouts.put(template);
 const [a,b]=await Promise.all([startWorkout(template),startWorkout(template)]);
 expect(a.id).toBe(b.id);expect(await db.workouts.where("status").equals("active").count()).toBe(1);
 expect(a.exercises[0].sets[0].weight).toBe(60);
 a.exercises[0].sets[0].weight=99;await db.workouts.put(a);
 expect((await startWorkout(template)).exercises[0].sets[0].weight).toBe(99);
 expect(await db.workouts.get(template.id)).toEqual(template);
});
