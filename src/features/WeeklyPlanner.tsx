import { useState } from 'react';
import { db, id, type Settings, type TrainingPlan, type Workout, type ScheduleSlot } from '../data';
import { BottomSheet } from '../components/ui/BottomSheet';
import { dayKey, weekdays, weekSchedule } from './planner';
export function WeeklyPlanner({settings,workouts,onClose}:{settings:Settings;workouts:Workout[];onClose:()=>void}) {
 const plans=settings.trainingPlans??[];
 const plan=plans.find(p=>p.id===settings.activeTrainingPlan)??plans[0];
 const [scope,S]=useState('weekly'),[date,D]=useState(dayKey(new Date())),[custom,C]=useState(''),[message,M]=useState('');
 async function save(next:TrainingPlan[],active=settings.activeTrainingPlan){try{await db.settings.update('settings',{trainingPlans:next,activeTrainingPlan:active});M('');}catch{M('Plan konnte nicht gespeichert werden.');}}
 function update(next:TrainingPlan){void save(plans.map(p=>p.id===next.id?next:p));}
 function create(copy=false){const name=window.prompt('Name des Trainingsplans',copy?`${plan?.name} Kopie`:'Mein Trainingsplan')?.trim();if(!name)return;const next:TrainingPlan=copy&&plan?{...structuredClone(plan),id:id(),name}:{id:id(),name,days:Array.from({length:7},()=>[]),overrides:{}};void save([...plans,next],next.id);}
 function slots(day:number):ScheduleSlot[]{return !plan?[]:scope==='weekly'?plan.days[day]:(plan.overrides[date]??plan.days[(new Date(date+'T12:00:00').getDay()+6)%7]);}
 function setSlots(day:number,value:ScheduleSlot[]){if(!plan)return;update(scope==='weekly'?{...plan,days:plan.days.map((v,i)=>i===day?value:v)}:{...plan,overrides:{...plan.overrides,[date]:value}});}
 function add(day:number,value:string){const template=workouts.find(w=>w.id===value);const name=template?.name??custom.trim();if(!name)return;setSlots(day,[...slots(day),{id:id(),name,templateId:template?.id}]);C('');}
 return <BottomSheet title="Wochenplan" onClose={onClose}>
 <p>Dein Rhythmus. Freie Tage sind bewusste Erholung – zusätzliche Pausen sind jederzeit möglich.</p>
 <label>Aktiver Plan<select value={plan?.id??''} onChange={e=>void save(plans,e.target.value)}>{!plans.length&&<option value="">Noch kein Plan</option>}{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <div className="planner-actions"><button onClick={()=>create()}>Neuer Plan</button>{plan&&<><button onClick={()=>create(true)}>Duplizieren</button><button onClick={()=>{const name=window.prompt('Plan umbenennen',plan.name)?.trim();if(name)update({...plan,name});}}>Umbenennen</button></>}</div>
 {plan&&<><label>Bearbeiten<select value={scope} onChange={e=>S(e.target.value)}><option value="weekly">Wöchentlich wiederholen</option><option value="date">Nur an einem Datum</option></select></label>
 {scope==='date'&&<><label>Datum<input type="date" value={date} onChange={e=>{if(e.target.value)D(e.target.value);}}/></label><button onClick={()=>{const overrides={...plan.overrides};delete overrides[date];update({...plan,overrides});}}>Wöchentlichen Plan wiederherstellen</button></>}
 <label>Eigenes Training<input value={custom} onChange={e=>C(e.target.value)} placeholder="Trainingsname"/></label>
 {(scope==='weekly'?weekdays:[weekdays[(new Date(date+'T12:00:00').getDay()+6)%7]]).map((name,index)=>{const day=scope==='weekly'?index:(new Date(date+'T12:00:00').getDay()+6)%7;return <section className="planner-day" key={name}><h3>{name}</h3>{!slots(day).length&&<p>Ruhetag · Erholung</p>}{slots(day).map((slot,i)=><div key={slot.id} className="planner-slot"><span>{slot.name}</span><button aria-label={`${slot.name} entfernen`} onClick={()=>setSlots(day,slots(day).filter(s=>s.id!==slot.id))}>Entfernen</button>{scope==='weekly'&&<select aria-label={`${slot.name} verschieben`} value={day} onChange={e=>{const target=Number(e.target.value);const days=plan.days.map(v=>[...v]);days[day].splice(i,1);days[target].push(slot);update({...plan,days});}}>{weekdays.map((d,j)=><option key={d} value={j}>{d}</option>)}</select>}</div>)}
 <select aria-label={`Vorlage für ${name}`} value="" onChange={e=>add(day,e.target.value)}><option value="" disabled>Vorlage hinzufügen</option>{workouts.filter(w=>w.status==='template').map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</select><div className="planner-actions"><button disabled={!custom.trim()} onClick={()=>add(day,'')}>Eigenes Training hinzufügen</button><button onClick={()=>setSlots(day,[])}>Als Ruhetag planen</button></div></section>;})}
 <h3>Diese Woche</h3>{weekSchedule(plan,new Date(),workouts).map(d=><p key={d.date}>{d.name}: {d.slots.length?d.slots.map(s=>`${s.completed?'✓ ':''}${s.name}`).join(' · '):'Erholung'}</p>)}</>}
 {message&&<p role="alert">{message}</p>}
 </BottomSheet>;
}
