import { formatDay } from "../i18n/runtime";
import { getLocale } from "../i18n/runtime";
import { tr } from "../i18n/runtime";
import { PeriodFilter } from "../components/ui/PeriodFilter";
import { Info } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data";
import { muscleData } from "./muscleData";
import { bodyOutline, head, frontRegions, backRegions, neutralDetails } from "./bodyGeometry";
export function MuscleMap() {
    const ws = useLiveQuery(() => db.workouts.toArray()) ?? [];
    const ex = useLiveQuery(() => db.exercises.toArray()) ?? [];
    const [period, setPeriod] = useState("7"), [side, setSide] = useState("front"), [selected, select] = useState("");
    const days = period === "all" ? Math.max(1, ...ws.filter(w => w.status === "completed").map(w => differenceInCalendarDays(new Date(), new Date(w.date + "T12:00:00")) + 1)) : Number(period);
    const rows = muscleData(ws, ex, days);
    const totals = new Map<string, number>();
    rows.forEach(r => totals.set(r.muscle, (totals.get(r.muscle) ?? 0) + r.sets));
    const max = Math.max(1, ...totals.values());
    return <article className="muscle-map"><h2>{tr("Muskelkarte")}</h2><p>{tr("Abgeschlossene Arbeitss\u00E4tze pro Muskelgruppe.")}</p>
    <PeriodFilter value={period} onChange={setPeriod}/>
    <div className="segmented" role="group" aria-label={tr("K\u00F6rperansicht")}>{[["front", "Vorne"], ["back", "Hinten"]].map(([value, label]) => <button key={value} aria-pressed={side === value} onClick={() => setSide(value)}>{tr(label)}</button>)}</div>
    <svg viewBox="0 0 240 430" aria-label={side === "front" ? tr("Muskelgruppen Vorderseite") : tr("Muskelgruppen R\u00FCckseite")} className="body-map">
      <g fill="var(--surface-alt)" stroke="var(--border)" strokeWidth="1.2"><path d={head}/><path d={bodyOutline}/></g>
      {[false, true].map(mirror => <g key={String(mirror)} transform={mirror ? "translate(240 0) scale(-1 1)" : undefined}>
        {neutralDetails.map((d, i) => <path key={i} d={d} fill="var(--muted)" opacity=".18" stroke="var(--surface)" strokeWidth="1"/>)}
      </g>)}
      {(side === "front" ? frontRegions : backRegions).map(([muscle, paths]) => <g key={muscle} role="button" tabIndex={0} aria-label={tr("{0}: {1} Arbeitss\u00E4tze", [tr(muscle), totals.get(muscle) ?? 0])} aria-pressed={selected === muscle} className="muscle-region" fill="var(--ink)" fillOpacity={totals.has(muscle) ? .25 + .65 * (totals.get(muscle)! / max) : .08} stroke={selected === muscle ? "var(--ink)" : "var(--border)"} strokeWidth={selected === muscle ? 2 : 1} onClick={() => select(muscle)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            select(muscle);
        } }}>
        <title>{tr(muscle)}</title>
        {[false, true].map(mirror => <g key={String(mirror)} transform={mirror ? "translate(240 0) scale(-1 1)" : undefined}>{paths.map((d, i) => <path key={i} d={d}/>)}</g>)}
      </g>)}
    </svg>
    <details className="map-info"><summary><Info size={18}/>{tr(" Info zur Muskelkarte")}</summary><p className="anatomy-note">{tr("Die Zeichnung zeigt anatomische Teilfl\u00E4chen. Die Auswertung bleibt auf Ebene deiner gespeicherten Muskelgruppen; Teilfl\u00E4chen erhalten keine gesch\u00E4tzten Trainingswerte.")}</p></details>
    <div className="muscle-buttons">{[...new Set([...(side === "front" ? frontRegions : backRegions).map(x => x[0]), ...totals.keys()])].map(m => <button key={m} aria-pressed={selected === m} onClick={() => select(m)}>{tr(m)}{" \u00B7 "}{totals.get(m) ?? 0}</button>)}</div>
    <div aria-live="polite">{selected ? <><h3>{tr(selected)}</h3>{rows.filter(r => r.muscle === selected).map(r => <p key={r.workoutId + r.itemId}><Link to={`/workout/${r.workoutId}`}>{formatDay(r.date)}{" \u00B7 "}{r.name}<br />{r.sets}{tr(" Arbeitss\u00E4tze \u00B7 ")}{r.volume.toLocaleString(getLocale())}{tr(" kg \u2192")}</Link></p>)}{!totals.has(selected) && <p>{tr("Keine abgeschlossenen Arbeitss\u00E4tze in diesem Zeitraum.")}</p>}</> : <p>{tr("Tippe auf eine Muskelgruppe f\u00FCr die Trainingsdetails.")}</p>}</div>
  </article>;
}
