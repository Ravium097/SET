import { addDays, format, startOfWeek } from 'date-fns';
import { type TrainingPlan, type Workout, type WidgetLayout, dashboardWidgetIds } from '../data';
export const dayKey=(date:Date)=>format(date,'yyyy-MM-dd');
export const weekdays=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
export const defaultLayout=(enabled:readonly string[]=dashboardWidgetIds):WidgetLayout=>enabled.map(kind=>({id:kind,kind:kind as WidgetLayout[number]['kind'],size:['training','body'].includes(kind)?'small':'medium',hidden:false}));
export function scheduledDay(plan:TrainingPlan|undefined,date:Date,history:Workout[]) {
 const key=dayKey(date), slots=plan?(plan.overrides[key]??plan.days[(date.getDay()+6)%7]):[];
 const used=new Set<string>();
 return slots.map(slot=>{
  const match=history.find(w=>w.status==='completed'&&w.date===key&&!used.has(w.id)&&(w.scheduledSlot ? w.scheduledSlot===slot.id&&w.scheduledDate===key : slot.templateId ? w.templateId===slot.templateId||(!w.templateId&&w.name===slot.name) : w.name===slot.name));
  if(match)used.add(match.id);
  return {...slot,completed:!!match};
 });
}
export function nextScheduled(plan:TrainingPlan|undefined,now:Date,history:Workout[]) {
 if(!plan)return undefined;
 const candidates=new Set<string>();
 for(let i=0;i<=7;i++)candidates.add(dayKey(addDays(now,i)));
 // Include the week after each exception, so long recovery blocks have no cutoff.
 for(const key of Object.keys(plan.overrides)){
  if(key<dayKey(now))continue;
  const base=new Date(key+'T12:00:00');if(!Number.isFinite(base.getTime()))continue;
  for(let i=0;i<=7;i++)candidates.add(dayKey(addDays(base,i)));
 }
 for(const key of [...candidates].sort()){
  const slot=scheduledDay(plan,new Date(key+'T12:00:00'),history).find(s=>!s.completed);
  if(slot)return {...slot,date:key};
 }
 return undefined;
}
export function weekSchedule(plan:TrainingPlan|undefined,now:Date,history:Workout[]) {
 const monday=startOfWeek(now,{weekStartsOn:1});return weekdays.map((name,i)=>{const date=addDays(monday,i);return {name,date:dayKey(date),slots:scheduledDay(plan,date,history)};});
}
export function reorder(layout:WidgetLayout,from:string,to:string) {const result=[...layout],a=result.findIndex(w=>w.id===from),b=result.findIndex(w=>w.id===to);if(a<0||b<0)return result;result.splice(b,0,result.splice(a,1)[0]);return result;}
