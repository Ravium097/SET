import { tr } from "../i18n/runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, Dumbbell, Info, Play, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { db, id, type Workout } from '../data';
import { startWorkout } from '../services/carryForward';
import { germanError } from '../i18n/de';
import { ActionMenu } from '../components/ui/ActionMenu';
import { Onboarding } from '../components/onboarding/Onboarding';
import { WeeklyPlanner } from './WeeklyPlanner';
import './training.css';
export function Training() {
    const libraryCount = useLiveQuery(() => db.exercises.count()) ?? 0;
    const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
    const settings = useLiveQuery(() => db.settings.get('settings'));
    const [planner, setPlanner] = useState(false);
    const navigate = useNavigate();
    const report = (error: unknown) => alert(germanError(error));
    async function start(template?: Workout) {
        const workout = await startWorkout(template);
        navigate(`/workout/${workout.id}`);
    }
    async function createTemplate() {
        const workout: Workout = {
            id: id(), name: tr('Neue Vorlage'), date: format(new Date(), 'yyyy-MM-dd'),
            status: 'template', started: null, duration: null, exercises: [],
        };
        await db.workouts.add(workout);
        navigate(`/workout/${workout.id}`);
    }
    return <div className="training-screen">
    <h1>{tr("Training")}</h1>
    <button className="primary action training-free" onClick={() => void start().catch(report)}>
      <Plus aria-hidden="true"/><span>{tr("Freies Training starten")}</span>
    </button>
    <div className="training-shortcuts">
      <button className="widget" disabled={!settings} onClick={() => setPlanner(true)}>
        <CalendarDays size={22} aria-hidden="true"/>
        <span><h2>{tr("Trainingsplan")}</h2><small>{tr("Wochen\u00FCbersicht")}</small></span>
      </button>
      <Link className="widget" to="/library">
        <Dumbbell size={22} aria-hidden="true"/>
        <span><h2>{tr("\u00DCbungsbibliothek")}</h2><small>{libraryCount}{tr(" \u00DCbungen")}</small></span>
      </Link>
    </div>
    {!workouts.length && <Onboarding allowDismiss={false}/>}
    <div className="training-section-heading">
      <h2>{tr("Deine Vorlagen")}</h2>
      <details className="training-info">
        <summary aria-label={tr("Information zu vorherigen Satzwerten")}><Info size={18}/></summary>
        <p role="tooltip">{tr("Letzte Satzwerte werden beim Start \u00FCbernommen.")}</p>
      </details>
      <button className="icon-button" aria-label={tr("Vorlage erstellen")} onClick={() => void createTemplate().catch(report)}><Plus size={20}/></button>
    </div>
    <div className="training-template-list">
      {workouts.filter(workout => workout.status === 'template').map(workout => <article key={workout.id} className="template-card">
        <div className="training-template-copy"><h3>{workout.name}</h3><p>{workout.exercises.length}{tr(" \u00DCbungen")}</p></div>
        <button className="primary icon-button" aria-label={tr("{0} starten", [workout.name])} onClick={() => void start(workout).catch(report)}><Play size={18}/></button>
        <ActionMenu label={tr("Optionen f\u00FCr {0}", [workout.name])}>
          <Link className="button" to={`/workout/${workout.id}`}>{tr("Bearbeiten")}</Link>
          <button onClick={() => void db.workouts.add({ ...structuredClone(workout), id: id(), name: tr('{0} Kopie',[workout.name]) }).catch(report)}>{tr("Duplizieren")}</button>
          <button onClick={() => { if (confirm(tr("Vorlage \u201E{0}\u201C l\u00F6schen?", [workout.name])))
            void db.workouts.delete(workout.id).catch(report); }}>{tr("L\u00F6schen")}</button>
        </ActionMenu>
      </article>)}
    </div>
    {planner && settings && <WeeklyPlanner settings={settings} workouts={workouts} onClose={() => setPlanner(false)}/>}
  </div>;
}
