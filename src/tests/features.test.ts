import { expect, it } from "vitest";
import { count, volume, isCompletedWork, setSchema, type Workout } from "../data";
const oldSet = {id:"s", weight:100, reps:5, completed:true};
const workout = (sets: Workout["exercises"][number]["sets"]): Workout => ({id:"w",name:"Test",date:"2026-11-17",started:0,duration:null,status:"active",exercises:[{id:"i",exerciseId:"e",name:"Test",sets}]});
it("treats legacy sets as work and excludes warmups and unfinished sets", () => {
  const sets = [oldSet, {...oldSet,id:"warm",type:"warmup" as const}, {...oldSet,id:"open",completed:false}];
  expect(count(workout(sets))).toBe(1);
  expect(volume(workout(sets))).toBe(500);
  expect(sets.filter(isCompletedWork)).toEqual([oldSet]);
  expect(setSchema.parse(oldSet)).toEqual(oldSet);
});
it("changing a set type immediately changes totals without changing values", () => {
  expect(volume(workout([{...oldSet,type:"warmup"}]))).toBe(0);
  expect(volume(workout([{...oldSet,type:"work"}]))).toBe(500);
});
it("validates optional effort values without inventing defaults", () => {
  expect(setSchema.parse(oldSet).rpe).toBeUndefined();
  expect(setSchema.parse({...oldSet,rpe:9.5,rir:0}).rir).toBe(0);
  for (const patch of [{rpe:0},{rpe:11},{rir:-1},{rir:11},{rir:1.5}])
    expect(setSchema.safeParse({...oldSet,...patch}).success).toBe(false);
});
import { workoutSummary } from "../features/summary";
it("calculates live work progress and elapsed time including empty workouts", () => {
  const w = workout([oldSet,{...oldSet,id:"next",completed:false},{...oldSet,id:"warm",type:"warmup"}]);
  expect(workoutSummary(w,65000)).toEqual({planned:2,completed:1,volume:500,progress:50,seconds:65});
  expect(workoutSummary(workout([]),1000).progress).toBe(0);
});
import { alternatives, swapExercise } from "../features/swap";
import type { Exercise } from "../data";
const target:Exercise = {id:"replacement",name:"Bankdrücken",muscle:"Brust",equipment:"Langhantel",favorite:false,notes:""};
it("preserves completed warmup and work sets under original exercise, clears replacement loads", () => {
  const w = workout([oldSet,{...oldSet,id:"warm",type:"warmup"},{...oldSet,id:"pending",completed:false,rpe:8,rir:2}]);
  const swapped = swapExercise(w,"i",target);
  expect(swapped.exercises[0].sets).toEqual(w.exercises[0].sets.slice(0,2));
  expect(swapped.exercises[0].exerciseId).toBe("e");
  expect(swapped.exercises[1].sets[0]).toMatchObject({weight:null,reps:null,completed:false});
  expect(swapped.exercises[1].sets[0].rpe).toBeUndefined();
  expect(volume(swapped)).toBe(volume(w));
  expect(w.exercises[0].sets).toHaveLength(3);
});
it("ranks matching movement and equipment and excludes unrelated muscles", () => {
  const source = {...workout([]).exercises[0], muscle:"Brust",movement:"Horizontal drücken",equipment:"Langhantel"};
  expect(alternatives(source,[{...target,id:"other",movement:"Vertikal drücken"},target,{...target,id:"leg",muscle:"Beine"}]).map(x=>x.exercise.id)).toEqual(["replacement","other"]);
});
import { muscleData } from "../features/muscleData";
it("maps only completed work inside local date boundaries and preserves unknown muscles",()=>{
  const w = {...workout([oldSet,{...oldSet,type:"warmup"}]),status:"completed" as const};
  const rows = muscleData([w,{...w,id:"active",status:"active"},{...w,id:"old",date:"2026-11-10"}],[],7,new Date(2026,10,17));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({muscle:"Nicht zugeordnet",sets:1,volume:500});
});
