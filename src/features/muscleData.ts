import { format, subDays } from "date-fns";
import { isCompletedWork, type Exercise, type Workout } from "../data";
export function muscleData(workouts:Workout[], library:Exercise[], days:number, now=new Date()) {
  const from = format(subDays(now,days-1),"yyyy-MM-dd"), to = format(now,"yyyy-MM-dd");
  return workouts.filter(w=>w.status === "completed" && w.date >= from && w.date <= to).flatMap(w=>w.exercises.flatMap(e=>{
    const sets = e.sets.filter(isCompletedWork);
    if (!sets.length) return [];
    return [{workoutId:w.id,itemId:e.id,date:w.date,name:e.name,muscle:e.muscle ?? library.find(x=>x.id === e.exerciseId)?.muscle ?? "Nicht zugeordnet",sets:sets.length,volume:sets.reduce((n,s)=>n+(s.weight??0)*(s.reps??0),0)}];
  }));
}
