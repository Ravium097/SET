import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, Dumbbell, Info, Play, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { db, id, type Workout } from '../data';
import { startWorkout } from '../services/carryForward';
import { germanError } from '../i18n/de';
import { ActionMenu } from '../components/ui/ActionMenu';
import { PersonalTemplates } from '../components/templates/PersonalTemplates';
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
      id: id(), name: 'Neue Vorlage', date: format(new Date(), 'yyyy-MM-dd'),
      status: 'template', started: null, duration: null, exercises: [],
    };
    await db.workouts.add(workout);
    navigate(`/workout/${workout.id}`);
  }
  return <div className="training-screen">
    <h1>Training</h1>
    <button className="primary action training-free" onClick={() => void start().catch(report)}>
      <Plus aria-hidden="true"/><span>Freies Training starten</span>
    </button>
    <div className="training-shortcuts">
      <button className="widget" disabled={!settings} onClick={() => setPlanner(true)}>
        <CalendarDays size={22} aria-hidden="true"/>
        <span><h2>Trainingsplan</h2><small>Wochenübersicht</small></span>
      </button>
      <Link className="widget" to="/library">
        <Dumbbell size={22} aria-hidden="true"/>
        <span><h2>Übungsbibliothek</h2><small>{libraryCount} Übungen</small></span>
      </Link>
    </div>
    {!workouts.length && <Onboarding allowDismiss={false}/>}
    <div className="training-section-heading">
      <h2>Deine Vorlagen</h2>
      <details className="training-info">
        <summary aria-label="Information zu vorherigen Satzwerten"><Info size={18}/></summary>
        <p role="tooltip">Letzte Satzwerte werden beim Start übernommen.</p>
      </details>
      <button className="icon-button" aria-label="Vorlage erstellen" onClick={() => void createTemplate().catch(report)}><Plus size={20}/></button>
    </div>
    <PersonalTemplates/>
    <div className="training-template-list">
      {workouts.filter(workout => workout.status === 'template').map(workout => <article key={workout.id} className="template-card">
        <div className="training-template-copy"><h3>{workout.name}</h3><p>{workout.exercises.length} Übungen</p></div>
        <button className="primary icon-button" aria-label={`${workout.name} starten`} onClick={() => void start(workout).catch(report)}><Play size={18}/></button>
        <ActionMenu label={`Optionen für ${workout.name}`}>
          <Link className="button" to={`/workout/${workout.id}`}>Bearbeiten</Link>
          <button onClick={() => void db.workouts.add({...structuredClone(workout), id: id(), name: workout.name + ' Kopie'}).catch(report)}>Duplizieren</button>
          <button onClick={() => {if (confirm(`Vorlage „${workout.name}“ löschen?`)) void db.workouts.delete(workout.id).catch(report);}}>Löschen</button>
        </ActionMenu>
      </article>)}
    </div>
    {planner && settings && <WeeklyPlanner settings={settings} workouts={workouts} onClose={() => setPlanner(false)}/>}
  </div>;
}
