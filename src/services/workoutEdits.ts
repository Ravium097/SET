import { db, type Workout } from '../data';
/** Apply only the edit made against a rendered snapshot, preserving concurrent saves. */
function mergeEdit(before:unknown,after:unknown,current:unknown):unknown {
 if(Object.is(before,after))return current;
 if(Array.isArray(before)&&Array.isArray(after)&&Array.isArray(current)){
  const identified=(rows:unknown[])=>rows.every(row=>row!==null&&typeof row==='object'&&typeof (row as {id?:unknown}).id==='string');
  if(identified(before)&&identified(after)&&identified(current)){
   const byId=(rows:unknown[])=>new Map((rows as {id:string}[]).map(row=>[row.id,row]));
   const old=byId(before),latest=byId(current),next=byId(after);
   return [...(after as {id:string}[]).filter(row=>latest.has(row.id)||!old.has(row.id)).map(row=>mergeEdit(old.get(row.id),row,latest.get(row.id)??row)),...(current as {id:string}[]).filter(row=>!old.has(row.id)&&!next.has(row.id))];
  }
  return after;
 }
 if(before&&after&&current&&typeof before==='object'&&typeof after==='object'&&typeof current==='object'){
  const previous=before as Record<string,unknown>,next=after as Record<string,unknown>,result={...current} as Record<string,unknown>;
  for(const key of new Set([...Object.keys(previous),...Object.keys(next)])){
   if(!(key in next)){delete result[key];continue;}
   result[key]=mergeEdit(previous[key],next[key],result[key]);
  }
  return result;
 }
 return after;
}
export async function saveWorkoutEdit(before:Workout,after:Workout):Promise<void> {
 if(before.id!==after.id)throw new Error('Workout identity changed');
 await db.transaction('rw',db.workouts,async()=>{
  const current=await db.workouts.get(before.id);
  if(!current)throw new Error('Workout no longer exists');
  const next=mergeEdit(before,after,current) as Workout;
  // A queued field edit must never turn a finished session back into an active one.
  next.status=current.status;
  next.duration=current.duration;
  await db.workouts.put(next);
 });
}
