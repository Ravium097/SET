import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data";
import { muscleData } from "./muscleData";
import { bodyOutline, head, frontRegions, backRegions, neutralDetails } from "./bodyGeometry";
export function MuscleMap() {
  const ws = useLiveQuery(()=>db.workouts.toArray()) ?? [];
  const ex = useLiveQuery(()=>db.exercises.toArray()) ?? [];
  const [days,setDays] = useState(7), [side,setSide] = useState("front"), [selected,select] = useState("");
  const rows = muscleData(ws,ex,days);
  const totals = new Map<string,number>();
  rows.forEach(r=>totals.set(r.muscle,(totals.get(r.muscle)??0)+r.sets));
  const max = Math.max(1,...totals.values());
  return <article className="muscle-map"><h2>Muscle Map</h2><p>Abgeschlossene Arbeitssätze nach primärer Muskelgruppe. Stärker hervorgehobene Flächen bedeuten mehr Sätze.</p>
    <div className="two"><label>Zeitraum<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 Tage</option><option value={30}>30 Tage</option></select></label><label>Körperansicht<select value={side} onChange={e=>setSide(e.target.value)}><option value="front">Vorderseite</option><option value="back">Rückseite</option></select></label></div>
    <svg viewBox="0 0 240 455" aria-label={side === "front" ? "Muskelgruppen Vorderseite" : "Muskelgruppen Rückseite"} className="body-map">
      <g fill="var(--surface-alt)" stroke="var(--border)" strokeWidth="1.2"><path d={head}/><path d={bodyOutline}/></g>
      {[false,true].map(mirror => <g key={String(mirror)} transform={mirror ? "translate(240 0) scale(-1 1)" : undefined}>
        {neutralDetails.map((d,i)=><path key={i} d={d} fill="var(--muted)" opacity=".18" stroke="var(--surface)" strokeWidth="1"/>)}
      </g>)}
      {(side === "front" ? frontRegions : backRegions).map(([muscle,paths])=><g key={muscle} role="button" tabIndex={0} aria-label={`${muscle}: ${totals.get(muscle)??0} Arbeitssätze`} aria-pressed={selected === muscle}
        className="muscle-region"
        fill="var(--ink)" fillOpacity={totals.has(muscle) ? .25+.65*(totals.get(muscle)!/max) : .08}
        stroke={selected === muscle ? "var(--ink)" : "var(--border)"} strokeWidth={selected === muscle ? 2:1}
        onClick={()=>select(muscle)} onKeyDown={e=>{if(e.key==="Enter" || e.key===" "){e.preventDefault();select(muscle);}}}>
        <title>{muscle}</title>
        {[false,true].map(mirror=><g key={String(mirror)} transform={mirror ? "translate(240 0) scale(-1 1)" : undefined}>{paths.map((d,i)=><path key={i} d={d}/>)}</g>)}
      </g>)}
    </svg>
    <p className="anatomy-note">Die Zeichnung zeigt anatomische Teilflächen. Die Auswertung bleibt auf Ebene deiner gespeicherten Muskelgruppen; Teilflächen erhalten keine geschätzten Trainingswerte.</p>
    <div className="muscle-buttons">{[...new Set([...(side === "front" ? frontRegions : backRegions).map(x=>x[0]),...totals.keys()])].map(m=><button key={m} aria-pressed={selected===m} onClick={()=>select(m)}>{m} · {totals.get(m)??0}</button>)}</div>
    <div aria-live="polite">{selected ? <><h3>{selected}</h3>{rows.filter(r=>r.muscle===selected).map(r=><p key={r.workoutId+r.itemId}><Link to={`/workout/${r.workoutId}`}>{r.date} · {r.name}<br/>{r.sets} Arbeitssätze · {r.volume.toLocaleString("de-DE")} kg →</Link></p>)}{!totals.has(selected) && <p>Keine abgeschlossenen Arbeitssätze in diesem Zeitraum.</p>}</> : <p>Tippe auf eine Muskelgruppe für die Trainingsdetails.</p>}</div>
  </article>;
}
