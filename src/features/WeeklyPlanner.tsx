import { tr } from "../i18n/runtime";
import { useState } from 'react';
import { db, id, type Settings, type TrainingPlan, type Workout, type ScheduleSlot } from '../data';
import { BottomSheet } from '../components/ui/BottomSheet';
import { dayKey, weekdays, weekSchedule } from './planner';
export function WeeklyPlanner({ settings, workouts, onClose }: {
    settings: Settings;
    workouts: Workout[];
    onClose: () => void;
}) {
    const plans = settings.trainingPlans ?? [];
    const plan = plans.find(p => p.id === settings.activeTrainingPlan) ?? plans[0];
    const [scope, S] = useState('weekly'), [date, D] = useState(dayKey(new Date())), [custom, C] = useState(''), [message, M] = useState('');
    async function save(next: TrainingPlan[], active = settings.activeTrainingPlan) { try {
        await db.settings.update('settings', { trainingPlans: next, activeTrainingPlan: active });
        M('');
    }
    catch {
        M('Plan konnte nicht gespeichert werden.');
    } }
    function update(next: TrainingPlan) { void save(plans.map(p => p.id === next.id ? next : p)); }
    function create(copy = false) { const name = window.prompt(tr("Name des Trainingsplans"), copy ? tr('{0} Kopie',[plan?.name]) : tr('Mein Trainingsplan'))?.trim(); if (!name)
        return; const next: TrainingPlan = copy && plan ? { ...structuredClone(plan), id: id(), name } : { id: id(), name, days: Array.from({ length: 7 }, () => []), overrides: {} }; void save([...plans, next], next.id); }
    function slots(day: number): ScheduleSlot[] { return !plan ? [] : scope === 'weekly' ? plan.days[day] : (plan.overrides[date] ?? plan.days[(new Date(date + 'T12:00:00').getDay() + 6) % 7]); }
    function setSlots(day: number, value: ScheduleSlot[]) { if (!plan)
        return; update(scope === 'weekly' ? { ...plan, days: plan.days.map((v, i) => i === day ? value : v) } : { ...plan, overrides: { ...plan.overrides, [date]: value } }); }
    function add(day: number, value: string) { const template = workouts.find(w => w.id === value); const name = template?.name ?? custom.trim(); if (!name)
        return; setSlots(day, [...slots(day), { id: id(), name, templateId: template?.id }]); C(''); }
    return <BottomSheet title={tr("Wochenplan")} onClose={onClose}>
 <p>{tr("Dein Rhythmus. Freie Tage sind bewusste Erholung \u2013 zus\u00E4tzliche Pausen sind jederzeit m\u00F6glich.")}</p>
 <label>{tr("Aktiver Plan")}<select value={plan?.id ?? ''} onChange={e => void save(plans, e.target.value)}>{!plans.length && <option value="">{tr("Noch kein Plan")}</option>}{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <div className="planner-actions"><button onClick={() => create()}>{tr("Neuer Plan")}</button>{plan && <><button onClick={() => create(true)}>{tr("Duplizieren")}</button><button onClick={() => { const name = window.prompt(tr("Plan umbenennen"), plan.name)?.trim(); if (name)
        update({ ...plan, name }); }}>{tr("Umbenennen")}</button></>}</div>
 {plan && <><label>{tr("Bearbeiten")}<select value={scope} onChange={e => S(e.target.value)}><option value="weekly">{tr("W\u00F6chentlich wiederholen")}</option><option value="date">{tr("Nur an einem Datum")}</option></select></label>
 {scope === 'date' && <><label>{tr("Datum")}<input type="date" value={date} onChange={e => { if (e.target.value)
            D(e.target.value); }}/></label><button onClick={() => { const overrides = { ...plan.overrides }; delete overrides[date]; update({ ...plan, overrides }); }}>{tr("W\u00F6chentlichen Plan wiederherstellen")}</button></>}
 <label>{tr("Eigenes Training")}<input value={custom} onChange={e => C(e.target.value)} placeholder={tr("Trainingsname")}/></label>
 {(scope === 'weekly' ? weekdays : [weekdays[(new Date(date + 'T12:00:00').getDay() + 6) % 7]]).map((name, index) => {
                const day = scope === 'weekly' ? index : (new Date(date + 'T12:00:00').getDay() + 6) % 7;
                return <section className="planner-day" key={name}><h3>{tr(name)}</h3>{!slots(day).length && <p>{tr("Ruhetag \u00B7 Erholung")}</p>}{slots(day).map((slot, i) => <div key={slot.id} className="planner-slot"><span>{slot.name}</span><button aria-label={tr("{0} entfernen", [slot.name])} onClick={() => setSlots(day, slots(day).filter(s => s.id !== slot.id))}>{tr("Entfernen")}</button>{scope === 'weekly' && <select aria-label={tr("{0} verschieben", [slot.name])} value={day} onChange={e => { const target = Number(e.target.value); const days = plan.days.map(v => [...v]); days[day].splice(i, 1); days[target].push(slot); update({ ...plan, days }); }}>{weekdays.map((d, j) => <option key={d} value={j}>{tr(d)}</option>)}</select>}</div>)}
 <select aria-label={tr("Vorlage f\u00FCr {0}", [tr(name)])} value="" onChange={e => add(day, e.target.value)}><option value="" disabled>{tr("Vorlage hinzuf\u00FCgen")}</option>{workouts.filter(w => w.status === 'template').map(w => <option value={w.id} key={w.id}>{w.name}</option>)}</select><div className="planner-actions"><button disabled={!custom.trim()} onClick={() => add(day, '')}>{tr("Eigenes Training hinzuf\u00FCgen")}</button><button onClick={() => setSlots(day, [])}>{tr("Als Ruhetag planen")}</button></div></section>;
            })}
 <h3>{tr("Diese Woche")}</h3>{weekSchedule(plan, new Date(), workouts).map(d => <p key={d.date}>{tr(d.name)}{": "}{d.slots.length ? d.slots.map(s => `${s.completed ? '✓ ' : ''}${s.name}`).join(' · ') : tr("Erholung")}</p>)}</>}
 {message && <p role="alert">{tr(message)}</p>}
 </BottomSheet>;
}
