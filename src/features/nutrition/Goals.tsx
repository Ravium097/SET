import { useState } from "react";
import { Link } from "react-router-dom";
import { type NutritionEntry, type NutritionGoals } from "../../data";
import { nutrientTotal, nutrients } from "./service";
const labels={kcal:"Kalorien",protein:"Eiweiß",carbs:"Kohlenhydrate",fat:"Fett"};
export function estimateNeeds(profile: NutritionGoals["profile"]): number|undefined {
  if(!profile) return;
  const {age,weight,height,coefficient,activity}=profile;
  if(age===undefined||weight===undefined||height===undefined||!coefficient||activity===undefined) return;
  if(!Number.isInteger(age)||age<18||age>120||!Number.isFinite(weight)||weight<=0||!Number.isFinite(height)||height<=0||!Number.isFinite(activity)||activity<1.2||activity>2.4) return;
  const basal=10*weight+6.25*height-5*age+(coefficient==="male"?5:-161);
  const result=Math.round(basal*activity);
  return result>0?result:undefined;
}
export function GoalsEditor({value,onChange}:{value?:NutritionGoals;onChange:(value:NutritionGoals)=>void}) {
  const goals=value??{enabled:false};
  const [message,M]=useState("");
  const profile=goals.profile??{};
  const estimate=estimateNeeds(profile);
  const setProfile=(patch:Partial<NonNullable<NutritionGoals["profile"]>>)=>{M("");onChange({...goals,profile:{...profile,...patch}});};
  return <section id="nutrition-goals" className="nutrition-goals"><h3>Kalorien- und Makroziele</h3>
    <label><input type="checkbox" checked={goals.enabled} onChange={e=>onChange({...goals,enabled:e.target.checked})}/> Persönliche Ziele im Tagebuch anzeigen</label>
    <p>Frei wählbare Tageswerte. Leere Felder bedeuten kein Ziel. Deine Angaben bleiben lokal und sind im Backup enthalten.</p>
    <div className="nutrient-fields">{nutrients.map(k=><label key={k}>{labels[k]} pro Tag ({k==="kcal"?"kcal":"g"})<input type="number" inputMode="decimal" min={k==="kcal"?1:0} step="any" placeholder="Kein Ziel" value={goals[k]??""} onChange={e=>onChange({...goals,[k]:e.target.value===""?undefined:Number(e.target.value)})}/></label>)}</div>
    <details><summary>Kalorienbedarf schätzen · optional</summary><p>Schätzt den täglichen Energiebedarf zum Gewichtserhalt nach Mifflin–St Jeor × Aktivitätsfaktor. Ein Näherungswert, kein gemessener Bedarf. Makroziele legst du selbst fest.</p>
      <div className="nutrient-fields">{([["age","Alter (Jahre)"],["weight","Gewicht (kg)"],["height","Größe (cm)"]] as const).map(([key,label])=><label key={key}>{label}<input type="number" min={key==="age"?18:1} max={key==="age"?120:undefined} step={key==="age"?1:"any"} value={profile[key]??""} onChange={e=>setProfile({[key]:e.target.value===""?undefined:Number(e.target.value)})}/></label>)}
      <label>Formelparameter<select value={profile.coefficient??""} onChange={e=>setProfile({coefficient:e.target.value?e.target.value as "female"|"male":undefined})}><option value="">Auswählen</option><option value="female">Weiblich (−161)</option><option value="male">Männlich (+5)</option></select></label></div>
      <label>Aktivitätsfaktor<select value={profile.activity??""} onChange={e=>setProfile({activity:e.target.value?Number(e.target.value):undefined})}><option value="">Auswählen</option>{[[1.2,"Überwiegend sitzend"],[1.4,"Leicht aktiv"],[1.6,"Moderat aktiv"],[1.8,"Sehr aktiv"],[2,"Hohe tägliche Belastung"],[2.2,"Sehr hohe tägliche Belastung"]].map(([v,label])=><option key={v} value={v}>{label} · {v}</option>)}</select></label>
      <p aria-live="polite">{estimate===undefined?"Für die Schätzung alle Angaben ausfüllen (Alter 18–120 Jahre).":`Geschätzter Tagesbedarf: ca. ${estimate.toLocaleString("de-DE")} kcal.`}</p>
      <button disabled={estimate===undefined} onClick={()=>{if(estimate!==undefined){onChange({...goals,kcal:estimate,enabled:true});M("Schätzwert übernommen. Ernährungseinstellungen speichern, um ihn zu behalten.");}}}>Als Kalorienziel übernehmen</button><p aria-live="polite">{message}</p>
    </details><p>Makroziele werden unabhängig gespeichert. Sie müssen nicht automatisch dem Kalorienziel entsprechen.</p>
  </section>;
}
export function dailyNutrients(entries:NutritionEntry[],key:typeof nutrients[number]) {
  const values=entries.map(e=>nutrientTotal(e,key));
  return {total:values.reduce<number>((sum,n)=>sum+(n??0),0),complete:values.every(n=>n!==undefined),known:values.filter(n=>n!==undefined).length};
}
export function GoalsSummary({goals,entries}:{goals?:NutritionGoals;entries:NutritionEntry[]}) {
  if(!goals?.enabled) return <Link className="tile" to="/settings#nutrition-goals">Kalorien- und Makroziele einstellen</Link>;
  return <article className="goals-summary"><div className="row"><h2>Deine Tageswerte</h2><Link to="/settings#nutrition-goals">Ziele ändern</Link></div><div className="goal-grid">{nutrients.map(k=>{
    const {total,complete,known}=dailyNutrients(entries,k),target=goals[k],unit=k==="kcal"?"kcal":"g";
    return <div key={k}><small>{labels[k]}</small><strong>{known||complete?total.toLocaleString("de-DE",{maximumFractionDigits:1}):"–"} <small>{unit} erfasst</small></strong><span>{target===undefined?"Kein Ziel":`${target.toLocaleString("de-DE")} ${unit} Tagesziel`}</span>{!complete&&<small>Angaben unvollständig</small>}</div>;
  })}</div><p>Nur bekannte Nährwerte werden addiert. Unbekannte Angaben bleiben offen.</p></article>;
}
