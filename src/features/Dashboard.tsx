import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Play, SlidersHorizontal, Dumbbell, Utensils } from "lucide-react";
import { db, dashboardWidgetIds, count, volume, type Workout } from "../data";
import { Onboarding } from "../components/onboarding/Onboarding";
import { dailyNutrients } from "./nutrition/Goals";
import { localDay } from "./nutrition/service";
import "./dashboard.css";
const dateKey=(d:Date)=>format(d,"yyyy-MM-dd");
const number=(n:number)=>n.toLocaleString("de-DE",{maximumFractionDigits:1});
type WidgetId=typeof dashboardWidgetIds[number];
const names:Record<WidgetId,string>={training:"Training",body:"Körpergewicht",activity:"Trainingsaktivität",volume:"Trainingsvolumen",weekly:"Wochenübersicht",nutrition:"Tagebuch"};
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
  const [customizing,C]=useState(false),[message,M]=useState("");
  useEffect(()=>{if(customizing)document.getElementById("dashboard-widget-options")?.scrollIntoView?.({block:"start",behavior:"smooth"});},[customizing]);
  const now=new Date(),data=dashboardData(workouts??[],now);
  const enabled=settings?.dashboardWidgets??[...dashboardWidgetIds];
  const diaryEnabled=!!(settings?.nutrition||settings?.hydration);
  const weight=settings?.nutritionPreferences?.goals?.profile?.weight;
  const training=data.active??data.today[0];
  const planned=data.active?.exercises.flatMap(e=>e.sets).filter(s=>s.type!=="warmup").length??0;
  const ring=data.active?count(data.active):data.today.length;
  const daily=entries.filter(e=>e.meal==="Getränke"?settings?.hydration:settings?.nutrition);
  const calories=dailyNutrients(daily,"kcal");
  const showCalories=settings?.nutrition&&settings.nutritionPreferences?.showNutrients!==false;
  async function toggle(key:WidgetId) {
    try {await db.transaction("rw",db.settings,async()=>{
      const current=(await db.settings.get("settings"))?.dashboardWidgets??[...dashboardWidgetIds];
      await db.settings.update("settings",{dashboardWidgets:current.includes(key)?current.filter(k=>k!==key):[...current,key]});
    });M("");}
    catch {M("Widget-Auswahl konnte nicht gespeichert werden.");}
  }
  if(!workouts||!settings) return <p role="status">Tagesübersicht wird geladen …</p>;
  const widgets:Record<WidgetId,ReactNode>={
    training:<Link className="widget widget-training" to={training?`/workout/${training.id}`:"/training"}><div className="widget-top"><CountRing value={data.active?<Play size={20}/>:ring} label={data.active?`${ring} von ${planned} Arbeitssätzen abgeschlossen`:`${ring} Trainings heute abgeschlossen`} progress={data.active?(planned?ring/planned:0):ring?1:0}/><Dumbbell size={18}/></div><div><h2>{training?.name??"Dein Training"}</h2><small>{data.active?"Training fortsetzen":data.today.length?`${count(data.today[0])} Sätze · heute abgeschlossen`:"Vorlage wählen oder frei starten"}</small></div></Link>,
    body:<Link className="widget widget-body" to="/settings#nutrition-goals"><div className="widget-top"><strong className="widget-number">{weight===undefined?"–":number(weight)}<small>kg</small></strong><SlidersHorizontal size={16}/></div><div><h2>Körpergewicht</h2><small>{weight===undefined?"Gewicht hinterlegen":"Aus deinen gespeicherten Angaben"}</small></div></Link>,
    activity:<Link className="widget widget-activity widget-wide" to="/history"><ActivityDots workouts={data.completed} now={now}/><div className="activity-caption"><CountRing value={data.week.length} label={`${data.week.length} Trainings diese Woche`} progress={data.week.length?1:0}/><div><h2>{data.completed[0]?.name??"Deine Trainingsaktivität"}</h2><small>{data.completed[0]?`${data.week.length} Trainings diese Woche · zuletzt ${format(new Date(data.completed[0].date+"T12:00:00"),"d. MMMM",{locale:de})}`:"Dein Kalender füllt sich mit deinen Trainings"}</small></div><SlidersHorizontal size={16}/></div></Link>,
    volume:<Link className="widget widget-volume widget-wide" to="/progress"><span><h2>Trainingsvolumen</h2><small>Letzte 7 Tage</small></span><strong>{number(data.lastSeven.reduce((sum,w)=>sum+volume(w),0))}<small>kg</small></strong></Link>,
    weekly:<Link className="widget widget-weekly widget-wide" to="/progress"><h2>Diese Woche</h2><div>{[[data.week.length,"Trainings"],[data.week.reduce((sum,w)=>sum+count(w),0),"Sätze"],[data.week.reduce((sum,w)=>sum+w.exercises.length,0),"Übungen"]].map(([n,label])=><span key={label}><strong>{number(Number(n))}</strong><small>{label}</small></span>)}</div></Link>,
    nutrition:<Link className="widget widget-diary widget-wide" to="/nutrition"><div className="widget-top"><Utensils size={20}/><Plus size={19}/></div><div className="widget-diary-values"><span><h2>Tagebuch</h2><small>{daily.length} Einträge heute</small></span>{showCalories&&<span><strong>{calories.known||calories.complete?number(calories.total):"–"}<small>kcal</small></strong><small>{calories.complete?"Heute erfasst":"Angaben unvollständig"}</small></span>}</div></Link>,
  };
  return <div className="widget-dashboard"><div className="dashboard-heading"><div><p className="eyebrow">{format(now,"EEEE, d. MMMM",{locale:de})}</p><h1>Übersicht</h1></div><div className="dashboard-controls"><button aria-label="Dashboard anpassen" aria-expanded={customizing} onClick={()=>C(!customizing)}><SlidersHorizontal size={20}/></button><Link className="button" aria-label="Neues Training" to="/training"><Plus size={24}/></Link></div></div>
    {customizing&&<section id="dashboard-widget-options" className="widget-customize" aria-label="Dashboard anpassen"><h2>Deine Widgets</h2><p>Wähle, was auf deiner Startseite erscheint.</p>{dashboardWidgetIds.filter(key=>key!=="nutrition"||diaryEnabled).map(key=><label key={key}><input type="checkbox" checked={enabled.includes(key)} onChange={()=>{void toggle(key);}}/>{names[key]}</label>)}<button onClick={()=>C(false)}>Fertig</button></section>}
    {message&&<p role="status">{message}</p>}
    {!workouts.length&&<Onboarding/>}
    <div className="dashboard-widget-grid">{enabled.filter(key=>key!=="nutrition"||diaryEnabled).map(key=><div key={key} className={["activity","volume","weekly","nutrition"].includes(key)?"widget-cell wide":"widget-cell"}>{widgets[key]}</div>)}<button className="widget widget-add" onClick={()=>C(true)} aria-label="Widget hinzufügen"><Plus size={38}/><small>Widgets anpassen</small></button></div>
  </div>;
}
