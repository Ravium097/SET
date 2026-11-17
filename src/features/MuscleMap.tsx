import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data";
import { muscleData } from "./muscleData";
const front = [
  ["Brust","M66 65 Q90 54 114 65 L109 91 L71 91 Z"],
  ["Schultern","M63 62 L48 68 L40 93 L59 97 L68 77 Z M117 62 L132 68 L140 93 L121 97 L112 77 Z"],
  ["Bizeps","M41 96 L58 100 L51 132 L34 128 Z M139 96 L122 100 L129 132 L146 128 Z"],
  ["Bauch","M72 95 L108 95 L108 143 L72 143 Z"],
  ["Beine","M66 150 L87 153 L86 218 L62 216 Z M93 153 L114 150 L118 216 L94 218 Z"],
  ["Waden","M63 222 L85 224 L80 275 L66 275 Z M95 224 L117 222 L114 275 L100 275 Z"],
];
const back = [
  ["Rücken","M66 65 Q90 54 114 65 L110 141 L70 141 Z"],
  ["Schultern",front[1][1]], ["Trizeps",front[2][1]],
  ["Beine","M66 147 L88 150 L86 218 L62 216 Z M92 150 L114 147 L118 216 L94 218 Z"],
  ["Waden",front[5][1]],
];
export function MuscleMap() {
  const ws = useLiveQuery(()=>db.workouts.toArray()) ?? [];
  const ex = useLiveQuery(()=>db.exercises.toArray()) ?? [];
  const [days,setDays] = useState(7), [side,setSide] = useState("front"), [selected,select] = useState("");
  const rows = muscleData(ws,ex,days);
  const totals = new Map<string,number>();
  rows.forEach(r=>totals.set(r.muscle,(totals.get(r.muscle)??0)+r.sets));
  const max = Math.max(1,...totals.values());
  return <article className="muscle-map"><h2>Muscle Map</h2><p>Abgeschlossene Arbeitssätze nach primärer Muskelgruppe. Dunklere Flächen bedeuten mehr Sätze.</p>
    <div className="two"><label>Zeitraum<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 Tage</option><option value={30}>30 Tage</option></select></label><label>Körperansicht<select value={side} onChange={e=>setSide(e.target.value)}><option value="front">Vorderseite</option><option value="back">Rückseite</option></select></label></div>
    <svg viewBox="0 0 180 300" aria-label={side === "front" ? "Muskelgruppen Vorderseite" : "Muskelgruppen Rückseite"} className="body-map">
      <g fill="var(--surface-alt)" stroke="var(--border)" strokeWidth="2"><ellipse cx="90" cy="29" rx="20" ry="23"/><path d="M78 50 L102 50 L106 60 L132 67 L145 103 L155 150 L142 156 L124 111 L119 147 L123 220 L116 282 L98 282 L90 211 L82 282 L64 282 L57 220 L61 147 L56 111 L38 156 L25 150 L35 103 L48 67 L74 60 Z"/></g>
      {(side === "front" ? front : back).map(([muscle,path])=><path key={muscle} d={path} role="button" tabIndex={0} aria-label={`${muscle}: ${totals.get(muscle)??0} Arbeitssätze`} aria-pressed={selected === muscle}
        fill="var(--ink)" fillOpacity={totals.has(muscle) ? .25+.65*(totals.get(muscle)!/max) : .06}
        stroke={selected === muscle ? "var(--ink)" : "var(--border)"} strokeWidth={selected === muscle ? 3:1}
        onClick={()=>select(muscle)} onKeyDown={e=>{if(e.key==="Enter" || e.key===" "){e.preventDefault();select(muscle);}}}><title>{muscle}</title></path>)}
    </svg>
    <div className="muscle-buttons">{[...new Set([...(side === "front" ? front : back).map(x=>x[0]),...totals.keys()])].map(m=><button key={m} aria-pressed={selected===m} onClick={()=>select(m)}>{m} · {totals.get(m)??0}</button>)}</div>
    <div aria-live="polite">{selected ? <><h3>{selected}</h3>{rows.filter(r=>r.muscle===selected).map(r=><p key={r.workoutId+r.itemId}><Link to={`/workout/${r.workoutId}`}>{r.date} · {r.name}<br/>{r.sets} Arbeitssätze · {r.volume.toLocaleString("de-DE")} kg →</Link></p>)}{!totals.has(selected) && <p>Keine abgeschlossenen Arbeitssätze in diesem Zeitraum.</p>}</> : <p>Tippe auf eine Muskelgruppe für die Trainingsdetails.</p>}</div>
  </article>;
}
