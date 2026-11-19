import { db, emptySet, id, isCompletedWork, type Workout } from "../data";
import { previousPerformance } from "./previousPerformance";

/** Use only when creating sets. Never run as a reactive effect on an active workout. */
export function carryForward(w: Workout, history: Workout[], onlySetIds?: ReadonlySet<string>): Workout {
  if (w.status !== "active") return w;
  return {...w, exercises:w.exercises.map((item,index)=>{
    if (item.replacedFrom) return item;
    const previous = previousPerformance(w,index,history);
    let workIndex=0;
    return {...item,sets:item.sets.map(set=>{
      if (set.type === "warmup") return set;
      const prior=previous?.sets[workIndex++];
      if (set.completed || (onlySetIds && !onlySetIds.has(set.id)) || !prior || !isCompletedWork(prior) || prior.reps === null) return set;
      return {...set,weight:prior.weight,reps:prior.reps,rpe:null,rir:null};
    })};
  })};
}

export async function startWorkout(template?: Workout): Promise<Workout> {
  return db.transaction("rw",db.workouts,async()=>{
    const active=await db.workouts.where("status").equals("active").first();
    if(active) return active;
    const now=new Date();
    const date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
    const fresh:Workout={id:id(),name:template?.name ?? "Freies Training",date,started:now.getTime(),duration:null,status:"active",
      exercises:template ? structuredClone(template.exercises).map(item=>({
        ...item,id:id(),replacedFrom:undefined,
        sets:item.sets.map(set=>({...set,id:id(),completed:false,rpe:null,rir:null}))
      })) : []};
    const history=await db.workouts.where("status").equals("completed").toArray();
    const result=carryForward(fresh,history);
    await db.workouts.add(result);
    return result;
  });
}
export function appendSet(w:Workout,itemIndex:number,history:Workout[]):Workout {
  const set=emptySet();
  const next={...w,exercises:w.exercises.map((item,index)=> index===itemIndex ? {...item,sets:[...item.sets,set]} : item)};
  return carryForward(next,history,new Set([set.id]));
}
