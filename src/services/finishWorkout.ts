import { db,type Workout } from '../data';
/** Read the latest saved session in the same transaction that completes it. */
export async function finishWorkout(workoutId:string,now=Date.now()):Promise<Workout>{
 return db.transaction('rw',db.workouts,db.settings,async()=>{
  const current=await db.workouts.get(workoutId);
  if(!current||current.status==='template')throw new Error('Workout unavailable');
  if(current.status==='completed')return current;
  if(!current.name.trim()||!current.date)throw new Error('Name und Datum fehlen');
  const completed:Workout={...current,status:'completed',duration:current.started!==null?Math.max(0,Math.floor((now-current.started)/1000)):null};
  await db.workouts.put(completed);await db.settings.update('settings',{timerEnd:null,paused:null});return completed;
 });
}
