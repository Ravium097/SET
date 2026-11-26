import { useReducedMotion } from "../hooks/useReducedMotion";
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChartNoAxesCombined } from 'lucide-react';
import { format,startOfWeek,startOfMonth } from 'date-fns';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { db,volume,isCompletedWork } from '../data';
import { tr,getLocale } from '../i18n/runtime';
import { CartesianGrid, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, } from "recharts";
const day=(d=new Date())=>format(d,'yyyy-MM-dd');
const fmt=(n:number)=>n.toLocaleString(getLocale(),{maximumFractionDigits:1});
export function Statistics() {
    const reducedMotion=useReducedMotion();
    const ws = useLiveQuery(() => db.workouts.where("status").equals("completed").toArray()) ?? [];
    const [range, R] = useState("90"), [exercise, E] = useState(""), [bucket, B] = useState("week");
    const filtered = useMemo(()=>ws
        .filter((w) => range === "all" ||
        new Date(w.date).getTime() >= Date.now() - Number(range) * 86400000)
        .sort((a, b) => a.date.localeCompare(b.date)),[ws,range]);
    const groups = useMemo(()=>{const groups = new Map<string, {
        date: string;
        volume: number;
        workouts: number;
    }>();
    filtered.forEach((w) => {
        const d = new Date(w.date + "T12:00:00");
        const key = day(bucket === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d));
        const g = groups.get(key) ?? { date: key, volume: 0, workouts: 0 };
        g.volume += volume(w);
        g.workouts++;
        groups.set(key, g);
    });
    return groups;},[filtered,bucket]);
    const names = useMemo(()=>[...new Set(ws.flatMap((w) => w.exercises.map((e) => e.name)))],[ws]);
    const selected = exercise || names[0];
    const sets = useMemo(()=>filtered.flatMap((w) => w.exercises
        .filter((e) => e.name === selected)
        .flatMap((e) => e.sets.filter(isCompletedWork))),[filtered,selected]);
    const strength = useMemo(()=>filtered.flatMap((w) => {
        const weights = w.exercises
            .filter((e) => e.name === selected)
            .flatMap((e) => e.sets
            .filter((s) => isCompletedWork(s) && s.weight !== null)
            .map((s) => s.weight!));
        return weights.length
            ? [{ date: w.date, weight: weights.reduce((max,value)=>Math.max(max,value),0) }]
            : [];
    }),[filtered,selected]);
    if (!filtered.length)
        return <><PeriodFilter value={range} onChange={R}/><div className="metrics"><article><b>{"0"}</b><small>{tr("Workouts")}</small></article><article><b>{"0"}</b><small>{tr("Volumen \u00B7 kg")}</small></article></div><article className="empty"><ChartNoAxesCombined size={32}/><h2>{tr("Noch keine Trainingsdaten")}</h2><p>{tr("Volumen, H\u00E4ufigkeit, Kraftentwicklung und Rekorde erscheinen nach deinem ersten abgeschlossenen Workout im gew\u00E4hlten Zeitraum.")}</p><Link className="button primary" to="/training">{tr("Zum Training")}</Link></article></>;
    return (<>

      <PeriodFilter value={range} onChange={R}/>
      <div className="metrics">
        <article>
          <b>{filtered.length}</b>
          <small>{tr("Trainings")}</small>
        </article>
        <article>
          <b>{fmt(filtered.reduce((s, w) => s + volume(w), 0))}</b>
          <small>{tr("Volumen \u00B7 kg")}</small>
        </article>
      </div>
      <select value={bucket} onChange={(e) => B(e.target.value)}>
        <option value="week">{tr("Pro Woche")}</option>
        <option value="month">{tr("Pro Monat")}</option>
      </select>
      {(["volume", "workouts"] as const).map((key) => (<article key={key}>
          <h2>
            {key === "volume" ? tr("Trainingsvolumen") : tr("Trainingsh\u00E4ufigkeit")}
          </h2>
          {groups.size ? (<ResponsiveContainer width="100%" height={220} debounce={80}>
              <BarChart data={[...groups.values()]}>
                <CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="date" tickFormatter={d => new Date(d + "T12:00:00").toLocaleDateString(getLocale(),{day:"2-digit",month:"2-digit"})} tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis width={52} allowDecimals={key !== "workouts"} tickFormatter={fmt} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}/>
                <Bar isAnimationActive={!reducedMotion&&groups.size<100} name={tr(key === "volume" ? "Trainingsvolumen (kg)" : "Trainings")} dataKey={key} fill="var(--ink)" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>) : (<p>{tr("Deine Diagramme entstehen mit deinem ersten Training.")}</p>)}
        </article>))}
      <article>
        <h2>{tr("Kraftentwicklung")}</h2>
        <select value={selected ?? ""} onChange={(e) => E(e.target.value)}>
          {names.map((n) => (<option key={n}>{n}</option>))}
        </select>
        {strength.length ? (<ResponsiveContainer width="100%" height={220} debounce={80}>
            <LineChart data={strength}>
              <CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="date" tickFormatter={d => new Date(d + "T12:00:00").toLocaleDateString(getLocale(),{day:"2-digit",month:"2-digit"})} tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
              <YAxis />
              <Tooltip contentStyle={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}/>
              <Line isAnimationActive={!reducedMotion&&strength.length<100} dot={strength.length<100} type="linear" name={tr("Gewicht (kg)")} dataKey="weight" stroke="var(--ink)"/>
            </LineChart>
          </ResponsiveContainer>) : (<p>{tr("Noch keine abgeschlossenen gewichteten S\u00E4tze.")}</p>)}
        <h3>{tr("Pers\u00F6nliche Rekorde \u00B7 gew\u00E4hlter Zeitraum")}</h3>
        {sets.length ? (<p>
            {fmt(sets.reduce((max,s)=>Math.max(max,s.weight??0),0))}{tr(" kg \u00B7")}{" "}
            {sets.reduce((max,s)=>Math.max(max,s.reps??0),0)}{tr(" Wdh. \u00B7")}{" "}
            {fmt(sets.reduce((max,s)=>Math.max(max,(s.weight??0)*(s.reps??0)),0))}{" "}{tr("kg Satzvolumen")}</p>) : (<p>{tr("Noch keine Rekorde.")}</p>)}
      </article>
    </>);
}
