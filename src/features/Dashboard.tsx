import { formatDay } from "../i18n/runtime";
import { getLocale, getDateLocale } from "../i18n/runtime";
import { tr } from "../i18n/runtime";
import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";

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
const dateKey = (d: Date) => format(d, "yyyy-MM-dd");
const number = (n: number) => n.toLocaleString(getLocale(), { maximumFractionDigits: 1 });
type WidgetId = typeof widgetKinds[number];
const names: Record<WidgetId, string> = { training: "Training", body: "Körpergewicht", activity: "Trainingsaktivität", volume: "Trainingsvolumen", weekly: "Wochenübersicht", nutrition: "Tagebuch", next: "Nächstes Training", today: "Heutiges Training", split: "Trainingssplit", completion: "Wochenabschluss", records: "Persönliche Rekorde", recent: "Letzte Trainings", progress: "Trainingsfortschritt", rest: "Ruhetag", quick: "Schnellstart", notes: "Trainingsnotizen" };
export function dashboardData(workouts: Workout[], now: Date) {
    const today = dateKey(now), monday = dateKey(startOfWeek(now, { weekStartsOn: 1 }));
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 6);
    const completed = workouts.filter(w => w.status === "completed" && w.date <= today).sort((a, b) => b.date.localeCompare(a.date));
    return { completed, active: workouts.find(w => w.status === "active"), today: completed.filter(w => w.date === today), week: completed.filter(w => w.date >= monday), lastSeven: completed.filter(w => w.date >= dateKey(cutoff)) };
}
function CountRing({ value, label, progress = 1 }: {
    value: ReactNode;
    label: string;
    progress?: number;
}) {
    return <span className="count-ring" role="img" aria-label={label}><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27"/><circle className="count-ring-value" cx="32" cy="32" r="27" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(1, progress)) * 100} 100`}/></svg><span aria-hidden="true">{value}</span></span>;
}
export function ActivityDots({ workouts, now }: {
    workouts: Workout[];
    now: Date;
}) {
    const dates = new Set(workouts.map(w => w.date)), today = dateKey(now);
    return <div className="activity-months">{[-2, -1, 0].map(offset => {
            const month = startOfMonth(addMonths(now, offset)), days = eachDayOfInterval({ start: month, end: endOfMonth(month) });
            const padding = (month.getDay() + 6) % 7;
            const total = days.filter(d => dates.has(dateKey(d))).length;
            return <div key={dateKey(month)} className="activity-month" role="img" aria-label={tr("{0}: {1} Trainingstage", [format(month, "MMMM yyyy", { locale: getDateLocale() }), total])}><small aria-hidden="true">{format(month, "MMM", { locale: getDateLocale() })}</small><div className="activity-dots" aria-hidden="true">{Array.from({ length: padding }, (_, i) => <i key={`empty${i}`} className="dot-spacer"/>)}{days.map(d => <i key={dateKey(d)} className={`${dates.has(dateKey(d)) ? "trained" : ""} ${dateKey(d) > today ? "future" : ""}`} title={tr("{0}{1}", [format(d, "dd.MM.yyyy"), dates.has(dateKey(d)) ? " · Training" : ""])}/>)}</div></div>;
        })}</div>;
}
export function Dashboard() {
    const workouts = useLiveQuery(() => db.workouts.toArray());
    const settings = useLiveQuery(() => db.settings.get("settings"));
    const entries = useLiveQuery(() => db.nutrition.where("date").equals(localDay()).toArray()) ?? [];
    const navigate = useNavigate();
    const [sessions, Sessions] = useState(false), [noteEditor, NoteEditor] = useState(false);
    const [planner, P] = useState(false), [gallery, G] = useState(false), [replace, R] = useState<string | null>(null);
    const [drag, Drag] = useState<string | null>(null);
    const [previewSize,PreviewSize]=useState<WidgetLayout[number]['size']>('medium');
    const moving=useRef<{id:string;x:number;y:number;started:boolean}|null>(null);
    useEffect(()=>{
      if(!drag)return;
      let frame=0;
      const scroll=()=>{const move=moving.current,main=document.querySelector('main');if(!move?.started||!main)return;const bounds=main.getBoundingClientRect(),edge=60;const delta=move.y<bounds.top+edge?-10:move.y>bounds.bottom-edge?10:0;if(delta)main.scrollTop+=delta;frame=requestAnimationFrame(scroll);};
      frame=requestAnimationFrame(scroll);return()=>cancelAnimationFrame(frame);
    },[drag]);
    const press = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const notes = useLiveQuery(() => db.dayNotes.get('training-notes'));
    const [customizing, C] = useState(false), [message, M] = useState("");
    useEffect(() => { if (customizing)
        document.getElementById("dashboard-widget-options")?.scrollIntoView?.({ block: "start", behavior: "smooth" }); }, [customizing]);
    const [now, Now] = useState(() => new Date());
    useEffect(() => { const refresh = () => Now(new Date()); const timer = setInterval(refresh, 30000); document.addEventListener('visibilitychange', refresh); return () => { clearInterval(timer); clearTimeout(press.current); document.removeEventListener('visibilitychange', refresh); }; }, []);
    const currentDay=dateKey(now);
    const data = useMemo(()=>dashboardData(workouts ?? [], now),[workouts,currentDay]);
    const layout = settings?.dashboardLayout ?? defaultLayout(settings?.dashboardWidgets);
    const enabled = layout.filter(w => !w.hidden).map(w => w.kind);
    const plan = settings?.trainingPlans?.find(p => p.id === settings.activeTrainingPlan) ?? settings?.trainingPlans?.[0];
    const {next,today,week}=useMemo(()=>({next:nextScheduled(plan,now,workouts??[]),today:scheduledDay(plan,now,workouts??[]),week:weekSchedule(plan,now,workouts??[])}),[plan,workouts,currentDay]);
    async function saveLayout(next: WidgetLayout) { if (next.length > 50) {
        M("Maximal 50 Widgets möglich.");
        return;
    } try {
        await db.settings.update('settings', { dashboardLayout: next, dashboardWidgets: next.filter(w => !w.hidden && dashboardWidgetIds.includes(w.kind as typeof dashboardWidgetIds[number])).map(w => w.kind as typeof dashboardWidgetIds[number]).filter((v, i, a) => a.indexOf(v) === i) });
        M('');
    }
    catch {
        M('Dashboard konnte nicht gespeichert werden.');
    } }
    function change(widgetId: string, patch: Partial<WidgetLayout[number]>) { void saveLayout(layout.map(w => w.id === widgetId ? { ...w, ...patch } : w)); }
    async function launch(slot?: {
        id: string;
        name: string;
        templateId?: string;
        date?: string;
    }) { try {
        const template = workouts?.find(w => w.id === slot?.templateId);
        if (slot?.templateId && !template) {
            M('Diese Vorlage wurde gelöscht. Bitte den Wochenplan bearbeiten.');
            return;
        }
        const w = await startWorkout(template ?? (slot ? { id: '', name: slot.name, date: dayKey(now), started: null, duration: null, status: 'template', exercises: [] } : undefined), slot ? { slot: slot.id, date: slot.date ?? dayKey(now) } : undefined);
        navigate(`/workout/${w.id}`);
    }
    catch {
        M('Training konnte nicht gestartet werden.');
    } }
    const diaryEnabled = !!(settings?.nutrition || settings?.hydration);
    const weight = settings?.nutritionPreferences?.goals?.profile?.weight;
    const training = data.active ?? data.today[0];
    const planned = data.active?.exercises.flatMap(e => e.sets).filter(s => s.type !== "warmup").length ?? 0;
    const ring = data.active ? count(data.active) : data.today.length;
    const daily = entries.filter(e => e.meal === "Getränke" ? settings?.hydration : settings?.nutrition);
    const calories = dailyNutrients(daily, "kcal");
    const showCalories = settings?.nutrition && settings.nutritionPreferences?.showNutrients !== false;
    async function toggle(key: WidgetId) {
        const existing = layout.find(w => w.kind === key);
        if (existing)
            await saveLayout(layout.map(w => w.kind === key ? { ...w, hidden: enabled.includes(key) } : w));
        else
            await saveLayout([...layout, { id: id(), kind: key, size: 'medium', hidden: false }]);
    }
    const records=useMemo(()=>{const records = new Map<string, number>();
    data.completed.forEach(w => w.exercises.forEach(e => e.sets.filter(s => s.completed && s.type !== 'warmup' && s.weight !== null).forEach(s => records.set(e.name, Math.max(records.get(e.name) ?? 0, s.weight!)))));
    return records;},[data.completed]);
    if (!workouts || !settings)
        return <p role="status">{tr("Tages\u00FCbersicht wird geladen \u2026")}</p>;
    const summary = (title: string, content: ReactNode, action: () => void, className = "") => <button className={`widget widget-summary widget-tap ${className}`} aria-label={title} onClick={action}><h2>{title}</h2>{content}</button>;
    const workoutButton = (slot: typeof today[number], date = dayKey(now)) => <button key={slot.id} disabled={slot.completed} onClick={() => void launch({ ...slot, date })}>{slot.completed ? "\u2713 " : ""}{slot.name}{!slot.completed ? tr(" starten") : ""}</button>;
    const widgets: Record<WidgetId, ReactNode> = {
        next: summary(tr("N\u00E4chstes Training"), <div className="widget-next-details">{next ? <><strong>{next.name}</strong><small>{format(new Date(next.date + 'T12:00:00'), 'EEEE, d. MMMM', { locale: getDateLocale() })}</small></> : <p>{plan ? tr("Zeit f\u00FCr Erholung") : tr("Noch kein Wochenplan")}</p>}</div>, () => P(true), 'widget-next'),
        today: summary(tr("Heutiges Training"), today.length ? <><strong>{today.filter(s => s.completed).length}{" / "}{today.length}</strong><small>{today.map(s => s.name).join(' · ')}</small></> : <p>{tr("Ruhetag \u00B7 Erholung")}</p>, () => Sessions(true)),
        split: summary(plan?.name ?? tr("Trainingssplit"), <>{week.map(d => <p key={d.date}><small>{tr(d.name)}</small>{d.slots.length ? d.slots.map(s => <span key={s.id}>{s.completed ? "\u2713 " : ""}{s.name}{" "}</span>) : tr("Erholung")}</p>)}</>, () => P(true)),
        completion: summary(tr("Diese Woche"), <><strong>{week.flatMap(d => d.slots).filter(s => s.completed).length}{" / "}{week.flatMap(d => d.slots).length}</strong><small>{tr("Geplante Trainings abgeschlossen")}</small></>, () => P(true)),
        records: summary(tr("Pers\u00F6nliche Rekorde"), records.size ? <>{[...records].slice(0, 8).map(([name, value]) => <p key={name}>{name}<small>{number(value)}{tr(" kg")}</small></p>)}</> : <p>{tr("Noch keine Rekorde")}</p>, () => navigate('/progress')),
        recent: summary(tr("Letzte Trainings"), data.completed.length ? data.completed.slice(0, 5).map(w => <p key={w.id}>{w.name}<small>{formatDay(w.date)}{" \u00B7 "}{count(w)}{tr(" S\u00E4tze")}</small></p>) : <p>{tr("Noch keine Trainings")}</p>, () => navigate('/history')),
        progress: summary(tr("Trainingsfortschritt"), <><strong>{data.lastSeven.length}{tr(" Trainings")}</strong><small>{data.lastSeven.reduce((n, w) => n + count(w), 0)}{tr(" S\u00E4tze \u00B7 letzte 7 Tage")}</small></>, () => navigate('/progress')),
        rest: summary(tr("Erholung"), <p>{today.length ? tr("Dein Rhythmus. Deine Pause.") : tr("Heute ist Raum f\u00FCr Erholung.")}</p>, () => P(true)),
        quick: summary(tr("Schnellstart"), <><Play size={24}/><small>{tr("Vorlage w\u00E4hlen oder frei starten")}</small></>, () => navigate('/training')),
        notes: summary(tr("Trainingsnotizen"), <p>{notes?.notes || tr("Was m\u00F6chtest du festhalten?")}</p>, () => NoteEditor(true)),
        training: <Link className="widget widget-training" to={training ? `/workout/${training.id}` : "/training"}><div className="widget-top"><CountRing value={data.active ? <Play size={20}/> : ring} label={data.active ? tr("{0} von {1} Arbeitss\u00E4tzen abgeschlossen", [ring, planned]) : tr("{0} Trainings heute abgeschlossen", [ring])} progress={data.active ? (planned ? ring / planned : 0) : ring ? 1 : 0}/><Dumbbell size={18}/></div><div><h2>{training?.name ?? tr("Dein Training")}</h2><small>{data.active ? tr("Training fortsetzen") : data.today.length ? tr("{0} S\u00E4tze \u00B7 heute abgeschlossen", [count(data.today[0])]) : tr("Vorlage w\u00E4hlen oder frei starten")}</small></div></Link>,
        body: <Link className="widget widget-body" to="/settings#nutrition-goals"><div className="widget-top"><strong className="widget-number">{weight === undefined ? "\u2013" : number(weight)}<small>{tr("kg")}</small></strong><SlidersHorizontal size={16}/></div><div><h2>{tr("K\u00F6rpergewicht")}</h2><small>{weight === undefined ? tr("Gewicht hinterlegen") : tr("Aus deinen gespeicherten Angaben")}</small></div></Link>,
        activity: <Link className="widget widget-activity widget-wide" to="/history"><ActivityDots workouts={data.completed} now={now}/><div className="activity-caption"><CountRing value={data.week.length} label={tr("{0} Trainings diese Woche", [data.week.length])} progress={data.week.length ? 1 : 0}/><div><h2>{data.completed[0]?.name ?? tr("Deine Trainingsaktivit\u00E4t")}</h2><small>{data.completed[0] ? tr("{0} Trainings diese Woche \u00B7 zuletzt {1}", [data.week.length, format(new Date(data.completed[0].date + "T12:00:00"), "d. MMMM", { locale: getDateLocale() })]) : tr("Dein Kalender f\u00FCllt sich mit deinen Trainings")}</small></div><SlidersHorizontal size={16}/></div></Link>,
        volume: <Link className="widget widget-volume widget-wide" to="/progress"><span><h2>{tr("Trainingsvolumen")}</h2><small>{tr("Letzte 7 Tage")}</small></span><strong>{number(data.lastSeven.reduce((sum, w) => sum + volume(w), 0))}<small>{tr("kg")}</small></strong></Link>,
        weekly: <Link className="widget widget-weekly widget-wide" to="/progress"><h2>{tr("Diese Woche")}</h2><div>{[[data.week.length, "Trainings"], [data.week.reduce((sum, w) => sum + count(w), 0), "Sätze"], [data.week.reduce((sum, w) => sum + w.exercises.length, 0), "Übungen"]].map(([n, label]) => <span key={label}><strong>{number(Number(n))}</strong><small>{tr(label)}</small></span>)}</div></Link>,
        nutrition: <Link className="widget widget-diary widget-wide" to="/nutrition"><div className="widget-top"><Utensils size={20}/><Plus size={19}/></div><div className="widget-diary-values"><span><h2>{tr("Tagebuch")}</h2><small>{daily.length}{tr(" Eintr\u00E4ge heute")}</small></span>{showCalories && <span><strong>{calories.known || calories.complete ? number(calories.total) : "\u2013"}<small>{tr("kcal")}</small></strong><small>{calories.complete ? tr("Heute erfasst") : tr("Angaben unvollst\u00E4ndig")}</small></span>}</div></Link>,
    };
    return <div className="widget-dashboard"><div className="dashboard-heading"><div><p className="eyebrow">{format(now, "EEEE, d. MMMM", { locale: getDateLocale() })}</p><h1>{tr("\u00DCbersicht")}</h1></div><div className="dashboard-controls"><button aria-label={tr("Dashboard anpassen")} aria-expanded={customizing} onClick={() => C(!customizing)}><SlidersHorizontal size={20}/></button><Link className="button" aria-label={tr("Neues Training")} to="/training"><Plus size={24}/></Link></div></div>
    {customizing && <section id="dashboard-widget-options" className="widget-customize" aria-label={tr("Dashboard anpassen")}><h2>{tr("Deine Widgets")}</h2><p>{tr("W\u00E4hle Widgets und Gr\u00F6\u00DFen. Zum Verschieben den Griff ziehen.")}</p>{widgetKinds.filter(key => key !== "nutrition" || diaryEnabled).map(key => <label key={key}><input type="checkbox" checked={enabled.includes(key)} onChange={() => { void toggle(key); }}/>{tr(names[key])}</label>)}<div className="planner-actions"><button aria-label={tr("Wochenplan \u00F6ffnen")} onClick={() => P(true)}>{tr("Wochenplan")}</button><button onClick={() => G(true)}>{tr("Widget-Galerie")}</button><button onClick={() => void saveLayout(defaultLayout())}>{tr("Standard wiederherstellen")}</button><button onClick={() => C(false)}>{tr("Fertig")}</button></div></section>}
    {message && <p role="status">{tr(message)}</p>}
    {!workouts.length && <Onboarding />}
    {sessions && <BottomSheet title={tr("Heutiges Training")} onClose={() => Sessions(false)}>{today.length ? today.map(s => workoutButton(s)) : <p>{tr("Heute ist Erholung geplant.")}</p>}<button onClick={() => { Sessions(false); P(true); }}>{tr("Wochenplan")}</button></BottomSheet>}
    {noteEditor && <BottomSheet title={tr("Trainingsnotizen")} onClose={() => NoteEditor(false)}><textarea aria-label={tr("Trainingsnotizen bearbeiten")} defaultValue={notes?.notes ?? ''} onChange={e => { void db.dayNotes.put({ id: 'training-notes', notes: e.target.value }).catch(() => M('Notiz konnte nicht gespeichert werden.')); }} placeholder={tr("Was m\u00F6chtest du festhalten?")}/></BottomSheet>}
    {planner && <WeeklyPlanner settings={settings} workouts={workouts} onClose={() => P(false)}/>}
    {gallery && <BottomSheet title={tr("Widget-Galerie")} onClose={() => { G(false); R(null); }}><label>{tr("{0} Größe",[tr("Widget-Galerie")])}<select value={previewSize} onChange={e=>PreviewSize(e.target.value as WidgetLayout[number]['size'])}><option value="small">{tr("Klein · 1×1")}</option><option value="medium">{tr("Mittel · 2×1")}</option><option value="large">{tr("Groß · 2×2")}</option></select></label><div className="widget-gallery">{widgetKinds.filter(k => k !== 'nutrition' || diaryEnabled).map(kind => <section key={kind}><h3>{tr(names[kind])}</h3><div className={`gallery-preview widget-cell size-${previewSize}`} inert><div className="widget-content">{widgets[kind]}</div></div><button onClick={() => { if (replace)
        change(replace, { kind, size:previewSize });
    else
        void saveLayout([...layout, { id: id(), kind, size: previewSize, hidden: false }]); G(false); R(null); }}>{replace ? tr("Ersetzen") : tr("Hinzuf\u00FCgen")}</button></section>)}</div></BottomSheet>}
    <div className="dashboard-widget-grid">{layout.filter(w => (!w.hidden || customizing) && (w.kind !== 'nutrition' || diaryEnabled)).map(w => <div key={w.id} data-widget-id={w.id} className={`widget-cell ${w.size !== 'small' ? 'wide' : ''} size-${w.size} ${customizing ? 'editing' : ''} ${w.hidden ? 'is-hidden' : ''} ${drag === w.id ? 'dragging' : ''}`} onPointerDown={e => { if (!customizing && (e.target as HTMLElement).closest('button,input,textarea,select'))
            return; if (!customizing)
            press.current = setTimeout(() => C(true), 650); }} onPointerUp={() => clearTimeout(press.current)} onPointerMove={() => clearTimeout(press.current)} onPointerCancel={() => clearTimeout(press.current)} onClickCapture={e => { if (!customizing && press.current) {
            clearTimeout(press.current);
        } }} onContextMenu={e => { e.preventDefault(); C(true); }}>
    {customizing && <div className="widget-edit-controls"><button className="widget-drag" aria-label={tr("{0} verschieben", [tr(names[w.kind])])} onPointerDown={e => { if(e.button!==0&&e.button!==undefined)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);moving.current={id:w.id,x:e.clientX,y:e.clientY,started:false}; }} onPointerMove={e => {
        const move=moving.current;if(move?.id!==w.id)return;
        if(!move.started&&Math.hypot(e.clientX-move.x,e.clientY-move.y)<8)return;
        move.started=true;move.y=e.clientY;Drag(w.id);
    }} onPointerUp={e=>{
        const move=moving.current;
        if(move?.id===w.id&&move.started){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-widget-id]')?.dataset.widgetId;if(target)void saveLayout(reorder(layout,w.id,target));}
        moving.current=null;Drag(null);
    }} onPointerCancel={()=>{moving.current=null;Drag(null);}}>{"\u283F"}</button><select aria-label={tr("{0} Gr\u00F6\u00DFe", [tr(names[w.kind])])} value={w.size} onChange={e => change(w.id, { size: e.target.value as WidgetLayout[number]['size'] })}><option value="small">{tr("Klein \u00B7 1\u00D71")}</option><option value="medium">{tr("Mittel \u00B7 2\u00D71")}</option><option value="large">{tr("Gro\u00DF \u00B7 2\u00D72")}</option></select><button aria-label={tr("{0} nach oben", [tr(names[w.kind])])} disabled={layout.findIndex(v => v.id === w.id) === 0} onClick={() => void saveLayout(reorder(layout, w.id, layout[layout.findIndex(v => v.id === w.id) - 1].id))}>{"\u2191"}</button><button aria-label={tr("{0} nach unten", [tr(names[w.kind])])} disabled={layout.findIndex(v => v.id === w.id) === layout.length - 1} onClick={() => void saveLayout(reorder(layout, w.id, layout[layout.findIndex(v => v.id === w.id) + 1].id))}>{"\u2193"}</button><button onClick={() => change(w.id, { hidden: !w.hidden })}>{w.hidden ? tr("Einblenden") : tr("Ausblenden")}</button><button onClick={() => { R(w.id);PreviewSize(w.size); G(true); }}>{tr("Ersetzen")}</button><button onClick={() => void saveLayout(layout.filter(v => v.id !== w.id))}>{tr("Entfernen")}</button></div>}
    <div className="widget-content" inert={customizing}>{w.hidden ? <div className="widget"><h2>{tr(names[w.kind])}</h2><small>{tr("Ausgeblendet")}</small></div> : widgets[w.kind]}</div></div>)}<button className="widget widget-add" onClick={() => { C(true); G(true); }} aria-label={tr("Widget hinzuf\u00FCgen")}><Plus size={38}/><small>{tr("Widgets anpassen")}</small></button></div>
  </div>;
}
