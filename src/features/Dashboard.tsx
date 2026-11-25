import { useEffect, useState, useRef, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Play, SlidersHorizontal, Dumbbell, Utensils } from "lucide-react";
import { db, dashboardWidgetIds, count, volume, type Workout, type WidgetLayout, widgetKinds, id } from "../data";
import { Onboarding } from "../components/onboarding/Onboarding";
import { dailyNutrients } from "./nutrition/Goals";
import { localDay } from "./nutrition/service";
import "./dashboard.css";
import { defaultLayout, reorder, nextScheduled, scheduledDay, weekSchedule, dayKey } from './planner';
import { WeeklyPlanner } from './WeeklyPlanner';
import { BottomSheet } from '../components/ui/BottomSheet';
import { startWorkout } from '../services/carryForward';
const dateKey=(d:Date)=>format(d,"yyyy-MM-dd");
const number=(n:number)=>n.toLocaleString("de-DE",{maximumFractionDigits:1});
type WidgetId=typeof widgetKinds[number];
const names:Record<WidgetId,string>={training:"Training",body:"Körpergewicht",activity:"Trainingsaktivität",volume:"Trainingsvolumen",weekly:"Wochenübersicht",nutrition:"Tagebuch",next:"Nächstes Training",today:"Heutiges Training",split:"Trainingssplit",completion:"Wochenabschluss",records:"Persönliche Rekorde",recent:"Letzte Trainings",progress:"Trainingsfortschritt",rest:"Ruhetag",quick:"Schnellstart",notes:"Trainingsnotizen"};
export function dashboardData(workouts:Workout[],now:Date) {
  const today=dateKey(now),monday=dateKey(startOfWeek(now,{weekStartsOn:1}));
  const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-6);
  const completed=workouts.filter(w=>w.status==="completed"&&w.date<=today).sort((a,b)=>b.date.localeCompare(a.date));
  return {completed,active:workouts.find(w=>w.status==="active"),today:completed.filter(w=>w.date===today),week:completed.filter(w=>w.date>=monday),lastSeven:completed.filter(w=>w.date>=dateKey(cutoff))};
}
function CountRing({value,label,progress=1}:{value:ReactNode;label:string;progress?:number}) {
  return <span className="count-ring" role="img" aria-label={label}><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27"/><circle className="count-ring-value" cx="32" cy="32" r="27" pathLength="100" strokeDasharray={`${Math.max(0,Math.min(1,progress))*100} 100`}/></svg><span aria-hidden="true">{value}</span></span>;
}
export function ActivityDots({workouts,now}:{workouts:Workout[];now:Date}) {
  const dates=new Set(workouts.map(w=>w.date)),today=dateKey(now);
  return <div className="activity-months">{[-2,-1,0].map(offset=>{
    const month=startOfMonth(addMonths(now,offset)),days=eachDayOfInterval({start:month,end:endOfMonth(month)});
    const padding=(month.getDay()+6)%7;
    const total=days.filter(d=>dates.has(dateKey(d))).length;
    return <div key={dateKey(month)} className="activity-month" role="img" aria-label={`${format(month,"MMMM yyyy",{locale:de})}: ${total} Trainingstage`}><small aria-hidden="true">{format(month,"MMM",{locale:de})}</small><div className="activity-dots" aria-hidden="true">{Array.from({length:padding},(_,i)=><i key={`empty${i}`} className="dot-spacer"/>)}{days.map(d=><i key={dateKey(d)} className={`${dates.has(dateKey(d))?"trained":""} ${dateKey(d)>today?"future":""}`} title={`${format(d,"dd.MM.yyyy")}${dates.has(dateKey(d))?" · Training":""}`}/>)}</div></div>;
  })}</div>;
}
export function Dashboard() {
  const workouts=useLiveQuery(()=>db.workouts.toArray());
  const settings=useLiveQuery(()=>db.settings.get("settings"));
  const entries=useLiveQuery(()=>db.nutrition.where("date").equals(localDay()).toArray())??[];
  const navigate=useNavigate();
  const [sessions,Sessions]=useState(false),[noteEditor,NoteEditor]=useState(false);
  const [planner,P]=useState(false),[gallery,G]=useState(false),[replace,R]=useState<string|null>(null);
  const [drag,Drag]=useState<string|null>(null);
  const press=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const notes=useLiveQuery(()=>db.dayNotes.get('training-notes'));
  const [customizing,C]=useState(false),[message,M]=useState("");
  useEffect(()=>{if(customizing)document.getElementById("dashboard-widget-options")?.scrollIntoView?.({block:"start",behavior:"smooth"});},[customizing]);
  const [now,Now]=useState(()=>new Date());
  useEffect(()=>{const refresh=()=>Now(new Date());const timer=setInterval(refresh,30000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);clearTimeout(press.current);document.removeEventListener('visibilitychange',refresh);};},[]);
  const data=dashboardData(workouts??[],now);
  const layout=settings?.dashboardLayout??defaultLayout(settings?.dashboardWidgets);
  const enabled=layout.filter(w=>!w.hidden).map(w=>w.kind);
  const plan=settings?.trainingPlans?.find(p=>p.id===settings.activeTrainingPlan)??settings?.trainingPlans?.[0];
  const next=nextScheduled(plan,now,workouts??[]),today=scheduledDay(plan,now,workouts??[]),week=weekSchedule(plan,now,workouts??[]);
  async function saveLayout(next:WidgetLayout){if(next.length>50){M("Maximal 50 Widgets möglich.");return;}try{await db.settings.update('settings',{dashboardLayout:next,dashboardWidgets:next.filter(w=>!w.hidden&&dashboardWidgetIds.includes(w.kind as typeof dashboardWidgetIds[number])).map(w=>w.kind as typeof dashboardWidgetIds[number]).filter((v,i,a)=>a.indexOf(v)===i)});M('');}catch{M('Dashboard konnte nicht gespeichert werden.');}}
  function change(widgetId:string,patch:Partial<WidgetLayout[number]>){void saveLayout(layout.map(w=>w.id===widgetId?{...w,...patch}:w));}
  async function launch(slot?:{id:string;name:string;templateId?:string;date?:string}){try{const template=workouts?.find(w=>w.id===slot?.templateId);if(slot?.templateId&&!template){M('Diese Vorlage wurde gelöscht. Bitte den Wochenplan bearbeiten.');return;}const w=await startWorkout(template??(slot?{id:'',name:slot.name,date:dayKey(now),started:null,duration:null,status:'template',exercises:[]}:undefined),slot?{slot:slot.id,date:slot.date??dayKey(now)}:undefined);navigate(`/workout/${w.id}`);}catch{M('Training konnte nicht gestartet werden.');}}

  const diaryEnabled=!!(settings?.nutrition||settings?.hydration);
  const weight=settings?.nutritionPreferences?.goals?.profile?.weight;
  const training=data.active??data.today[0];
  const planned=data.active?.exercises.flatMap(e=>e.sets).filter(s=>s.type!=="warmup").length??0;
  const ring=data.active?count(data.active):data.today.length;
  const daily=entries.filter(e=>e.meal==="Getränke"?settings?.hydration:settings?.nutrition);
  const calories=dailyNutrients(daily,"kcal");
  const showCalories=settings?.nutrition&&settings.nutritionPreferences?.showNutrients!==false;
  async function toggle(key:WidgetId) {
    const existing=layout.find(w=>w.kind===key);
    if(existing)await saveLayout(layout.map(w=>w.kind===key?{...w,hidden:enabled.includes(key)}:w));
    else await saveLayout([...layout,{id:id(),kind:key,size:'medium',hidden:false}]);
  }
  if(!workouts||!settings) return <p role="status">Tagesübersicht wird geladen …</p>;
  const summary=(title:string,content:ReactNode,action:()=>void,className="")=><button className={`widget widget-summary widget-tap ${className}`} aria-label={title} onClick={action}><h2>{title}</h2>{content}</button>;
  const workoutButton=(slot:typeof today[number],date=dayKey(now))=><button key={slot.id} disabled={slot.completed} onClick={()=>void launch({...slot,date})}>{slot.completed?'✓ ':''}{slot.name}{!slot.completed?' starten':''}</button>;
  const records=new Map<string,number>();data.completed.forEach(w=>w.exercises.forEach(e=>e.sets.filter(s=>s.completed&&s.type!=='warmup'&&s.weight!==null).forEach(s=>records.set(e.name,Math.max(records.get(e.name)??0,s.weight!)))));
  const widgets:Record<WidgetId,ReactNode>={
    next:summary('Nächstes Training',<div className="widget-next-details">{next?<><strong>{next.name}</strong><small>{format(new Date(next.date+'T12:00:00'),'EEEE, d. MMMM',{locale:de})}</small></>:<p>{plan?'Zeit für Erholung':'Noch kein Wochenplan'}</p>}</div>,()=>P(true),'widget-next'),
    today:summary('Heutiges Training',today.length?<><strong>{today.filter(s=>s.completed).length} / {today.length}</strong><small>{today.map(s=>s.name).join(' · ')}</small></>:<p>Ruhetag · Erholung</p>,()=>Sessions(true)),
    split:summary(plan?.name??'Trainingssplit',<>{week.map(d=><p key={d.date}><small>{d.name}</small>{d.slots.length?d.slots.map(s=><span key={s.id}>{s.completed?'✓ ':''}{s.name} </span>):'Erholung'}</p>)}</>,()=>P(true)),
    completion:summary('Diese Woche',<><strong>{week.flatMap(d=>d.slots).filter(s=>s.completed).length} / {week.flatMap(d=>d.slots).length}</strong><small>Geplante Trainings abgeschlossen</small></>,()=>P(true)),
    records:summary('Persönliche Rekorde',records.size?<>{[...records].slice(0,8).map(([name,value])=><p key={name}>{name}<small>{number(value)} kg</small></p>)}</>:<p>Noch keine Rekorde</p>,()=>navigate('/progress')),
    recent:summary('Letzte Trainings',data.completed.length?data.completed.slice(0,5).map(w=><p key={w.id}>{w.name}<small>{w.date} · {count(w)} Sätze</small></p>):<p>Noch keine Trainings</p>,()=>navigate('/history')),
    progress:summary('Trainingsfortschritt',<><strong>{data.lastSeven.length} Trainings</strong><small>{data.lastSeven.reduce((n,w)=>n+count(w),0)} Sätze · letzte 7 Tage</small></>,()=>navigate('/progress')),
    rest:summary('Erholung',<p>{today.length?'Dein Rhythmus. Deine Pause.':'Heute ist Raum für Erholung.'}</p>,()=>P(true)),
    quick:summary('Schnellstart',<><Play size={24}/><small>Vorlage wählen oder frei starten</small></>,()=>navigate('/training')),
    notes:summary('Trainingsnotizen',<p>{notes?.notes||'Was möchtest du festhalten?'}</p>,()=>NoteEditor(true)),
    training:<Link className="widget widget-training" to={training?`/workout/${training.id}`:"/training"}><div className="widget-top"><CountRing value={data.active?<Play size={20}/>:ring} label={data.active?`${ring} von ${planned} Arbeitssätzen abgeschlossen`:`${ring} Trainings heute abgeschlossen`} progress={data.active?(planned?ring/planned:0):ring?1:0}/><Dumbbell size={18}/></div><div><h2>{training?.name??"Dein Training"}</h2><small>{data.active?"Training fortsetzen":data.today.length?`${count(data.today[0])} Sätze · heute abgeschlossen`:"Vorlage wählen oder frei starten"}</small></div></Link>,
    body:<Link className="widget widget-body" to="/settings#nutrition-goals"><div className="widget-top"><strong className="widget-number">{weight===undefined?"–":number(weight)}<small>kg</small></strong><SlidersHorizontal size={16}/></div><div><h2>Körpergewicht</h2><small>{weight===undefined?"Gewicht hinterlegen":"Aus deinen gespeicherten Angaben"}</small></div></Link>,
    activity:<Link className="widget widget-activity widget-wide" to="/history"><ActivityDots workouts={data.completed} now={now}/><div className="activity-caption"><CountRing value={data.week.length} label={`${data.week.length} Trainings diese Woche`} progress={data.week.length?1:0}/><div><h2>{data.completed[0]?.name??"Deine Trainingsaktivität"}</h2><small>{data.completed[0]?`${data.week.length} Trainings diese Woche · zuletzt ${format(new Date(data.completed[0].date+"T12:00:00"),"d. MMMM",{locale:de})}`:"Dein Kalender füllt sich mit deinen Trainings"}</small></div><SlidersHorizontal size={16}/></div></Link>,
    volume:<Link className="widget widget-volume widget-wide" to="/progress"><span><h2>Trainingsvolumen</h2><small>Letzte 7 Tage</small></span><strong>{number(data.lastSeven.reduce((sum,w)=>sum+volume(w),0))}<small>kg</small></strong></Link>,
    weekly:<Link className="widget widget-weekly widget-wide" to="/progress"><h2>Diese Woche</h2><div>{[[data.week.length,"Trainings"],[data.week.reduce((sum,w)=>sum+count(w),0),"Sätze"],[data.week.reduce((sum,w)=>sum+w.exercises.length,0),"Übungen"]].map(([n,label])=><span key={label}><strong>{number(Number(n))}</strong><small>{label}</small></span>)}</div></Link>,
    nutrition:<Link className="widget widget-diary widget-wide" to="/nutrition"><div className="widget-top"><Utensils size={20}/><Plus size={19}/></div><div className="widget-diary-values"><span><h2>Tagebuch</h2><small>{daily.length} Einträge heute</small></span>{showCalories&&<span><strong>{calories.known||calories.complete?number(calories.total):"–"}<small>kcal</small></strong><small>{calories.complete?"Heute erfasst":"Angaben unvollständig"}</small></span>}</div></Link>,
  };
  return <div className="widget-dashboard"><div className="dashboard-heading"><div><p className="eyebrow">{format(now,"EEEE, d. MMMM",{locale:de})}</p><h1>Übersicht</h1></div><div className="dashboard-controls"><button aria-label="Dashboard anpassen" aria-expanded={customizing} onClick={()=>C(!customizing)}><SlidersHorizontal size={20}/></button><Link className="button" aria-label="Neues Training" to="/training"><Plus size={24}/></Link></div></div>
    {customizing&&<section id="dashboard-widget-options" className="widget-customize" aria-label="Dashboard anpassen"><h2>Deine Widgets</h2><p>Wähle Widgets und Größen. Zum Verschieben den Griff ziehen.</p>{widgetKinds.filter(key=>key!=="nutrition"||diaryEnabled).map(key=><label key={key}><input type="checkbox" checked={enabled.includes(key)} onChange={()=>{void toggle(key);}}/>{names[key]}</label>)}<div className="planner-actions"><button aria-label="Wochenplan öffnen" onClick={()=>P(true)}>Wochenplan</button><button onClick={()=>G(true)}>Widget-Galerie</button><button onClick={()=>void saveLayout(defaultLayout())}>Standard wiederherstellen</button><button onClick={()=>C(false)}>Fertig</button></div></section>}
    {message&&<p role="status">{message}</p>}
    {!workouts.length&&<Onboarding/>}
    {sessions&&<BottomSheet title="Heutiges Training" onClose={()=>Sessions(false)}>{today.length?today.map(s=>workoutButton(s)):<p>Heute ist Erholung geplant.</p>}<button onClick={()=>{Sessions(false);P(true);}}>Wochenplan</button></BottomSheet>}
    {noteEditor&&<BottomSheet title="Trainingsnotizen" onClose={()=>NoteEditor(false)}><textarea aria-label="Trainingsnotizen bearbeiten" defaultValue={notes?.notes??''} onChange={e=>{void db.dayNotes.put({id:'training-notes',notes:e.target.value}).catch(()=>M('Notiz konnte nicht gespeichert werden.'));}} placeholder="Was möchtest du festhalten?"/></BottomSheet>}
    {planner&&<WeeklyPlanner settings={settings} workouts={workouts} onClose={()=>P(false)}/>}
    {gallery&&<BottomSheet title="Widget-Galerie" onClose={()=>{G(false);R(null);}}><div className="widget-gallery">{widgetKinds.filter(k=>k!=='nutrition'||diaryEnabled).map(kind=><section key={kind}><h3>{names[kind]}</h3><div className="gallery-preview" inert>{widgets[kind]}</div><button onClick={()=>{if(replace)change(replace,{kind});else void saveLayout([...layout,{id:id(),kind,size:'medium',hidden:false}]);G(false);R(null);}}>{replace?'Ersetzen':'Hinzufügen'}</button></section>)}</div></BottomSheet>}
    <div className="dashboard-widget-grid">{layout.filter(w=>(!w.hidden||customizing)&&(w.kind!=='nutrition'||diaryEnabled)).map(w=><div key={w.id} data-widget-id={w.id} className={`widget-cell ${w.size!=='small'?'wide':''} size-${w.size} ${customizing?'editing':''} ${w.hidden?'is-hidden':''} ${drag===w.id?'dragging':''}`} onPointerDown={e=>{if(!customizing&&(e.target as HTMLElement).closest('button,input,textarea,select'))return;if(!customizing)press.current=setTimeout(()=>C(true),650);}} onPointerUp={()=>clearTimeout(press.current)} onPointerMove={()=>clearTimeout(press.current)} onPointerCancel={()=>clearTimeout(press.current)} onClickCapture={e=>{if(!customizing&&press.current){clearTimeout(press.current);}}} onContextMenu={e=>{e.preventDefault();C(true);}}>
    {customizing&&<div className="widget-edit-controls"><button className="widget-drag" aria-label={`${names[w.kind]} verschieben`} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);Drag(w.id);}} onPointerMove={e=>{if(drag!==w.id)return;const edge=70;if(e.clientY<edge)window.scrollBy(0,-12);else if(e.clientY>window.innerHeight-edge)window.scrollBy(0,12);}} onPointerUp={e=>{const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-widget-id]')?.dataset.widgetId;if(target)void saveLayout(reorder(layout,w.id,target));Drag(null);}} onPointerCancel={()=>Drag(null)}>⠿</button><select aria-label={`${names[w.kind]} Größe`} value={w.size} onChange={e=>change(w.id,{size:e.target.value as WidgetLayout[number]['size']})}><option value="small">Klein · 1×1</option><option value="medium">Mittel · 2×1</option><option value="large">Groß · 2×2</option></select><button aria-label={`${names[w.kind]} nach oben`} disabled={layout.findIndex(v=>v.id===w.id)===0} onClick={()=>void saveLayout(reorder(layout,w.id,layout[layout.findIndex(v=>v.id===w.id)-1].id))}>↑</button><button aria-label={`${names[w.kind]} nach unten`} disabled={layout.findIndex(v=>v.id===w.id)===layout.length-1} onClick={()=>void saveLayout(reorder(layout,w.id,layout[layout.findIndex(v=>v.id===w.id)+1].id))}>↓</button><button onClick={()=>change(w.id,{hidden:!w.hidden})}>{w.hidden?'Einblenden':'Ausblenden'}</button><button onClick={()=>{R(w.id);G(true);}}>Ersetzen</button><button onClick={()=>void saveLayout(layout.filter(v=>v.id!==w.id))}>Entfernen</button></div>}
    <div className="widget-content" inert={customizing}>{w.hidden?<div className="widget"><h2>{names[w.kind]}</h2><small>Ausgeblendet</small></div>:widgets[w.kind]}</div></div>)}<button className="widget widget-add" onClick={()=>{C(true);G(true);}} aria-label="Widget hinzufügen"><Plus size={38}/><small>Widgets anpassen</small></button></div>
  </div>;
}
