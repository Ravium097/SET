import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data";
import { muscleData } from "./muscleData";
import { frontRegions, backRegions } from "./bodyGeometry";
export function MuscleMap() {
  const ws = useLiveQuery(()=>db.workouts.toArray()) ?? [];
  const ex = useLiveQuery(()=>db.exercises.toArray()) ?? [];
  const [days,setDays] = useState(7), [selected,select] = useState("");
  const rows = muscleData(ws,ex,days);
  const totals = new Map<string,number>();
  rows.forEach(r=>totals.set(r.muscle,(totals.get(r.muscle)??0)+r.sets));
  return <article className="muscle-map"><h2>Muskelgruppen</h2><p>Abgeschlossene Arbeitssätze pro Muskelgruppe.</p>
    <div className="segmented" role="group" aria-label="Zeitraum Muskelgruppen">{[7,30,90].map(n=><button key={n} aria-pressed={days===n} onClick={()=>setDays(n)}>{n}T</button>)}</div>
    <div className="muscle-buttons">{[...new Set([...frontRegions.map(x=>x[0]),...backRegions.map(x=>x[0]),...totals.keys()])].map(m=><button key={m} aria-pressed={selected===m} onClick={()=>select(m)}>{m} · {totals.get(m)??0}</button>)}</div>
    <div aria-live="polite">{selected ? <><h3>{selected}</h3>{rows.filter(r=>r.muscle===selected).map(r=><p key={r.workoutId+r.itemId}><Link to={`/workout/${r.workoutId}`}>{r.date} · {r.name}<br/>{r.sets} Arbeitssätze · {r.volume.toLocaleString("de-DE")} kg →</Link></p>)}{!totals.has(selected) && <p>Keine abgeschlossenen Arbeitssätze in diesem Zeitraum.</p>}</> : <p>Tippe auf eine Muskelgruppe für die Trainingsdetails.</p>}</div>
  </article>;
}
