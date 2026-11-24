import {DateField} from "./components/ui/DateField";
import { NutritionPreferencesForm, MealReminders } from "./features/nutrition/Preferences";
import { Nutrition, Modules, DailyOverview } from "./features/nutrition/Nutrition";
import { StartupBoundary } from "./components/pwa/StartupBoundary";
import React, { useState, useEffect, useId } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
  Link,
} from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Home,
  Dumbbell,
  CalendarDays,
  Utensils,
  ChartNoAxesCombined,
  Settings as Gear,
  Plus,
  ArrowRight,
  StickyNote,
} from "lucide-react";
import {
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  isSameDay,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import {
  db,
  init,
  id,
  defaults,
  emptySet,
  isCompletedWork,
  volume,
  count,
  exportData,
  restore,
  backupSchema,
  muscles,
  equipment,
  type Workout,
  type Item,
  type Exercise,
} from "./data";
import { ThemeStudio, useTheme } from "./features/ThemeStudio";
import { MuscleMap } from "./features/MuscleMap";
import { ExerciseSwap } from "./features/ExerciseSwap";
import { movements, movementOf } from "./features/swap";
import { LiveSummary } from "./features/LiveSummary";
import { EffortFields } from "./features/EffortFields";
import "./style.css";
import { t, germanError } from "./i18n/de";
import { RestDuration } from "./components/settings/RestDuration";
import { Onboarding } from "./components/onboarding/Onboarding";
import { setFocus } from "./services/setFocus";

import { ExpandLibrary } from "./components/exercises/ExpandLibrary";
import { matchesExercise } from "./services/exerciseCatalog";
import { startWorkout, carryForward, appendSet } from "./services/carryForward";
import { previousPerformance } from "./services/previousPerformance";
import { PreviousSet } from "./components/workout/PreviousSet";
import { PersonalTemplates } from "./components/templates/PersonalTemplates";
import { UpdateControl } from "./components/pwa/UpdateControl";
const day = (d = new Date()) => format(d, "yyyy-MM-dd");
const fmt = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
const error = (e: unknown) => alert(germanError(e));
function App() {
  const { pathname } = useLocation();
  useEffect(() => { document.querySelector("main")?.scrollTo(0, 0); }, [pathname]);
  const settings = useLiveQuery(() => db.settings.get("settings")) ?? defaults;
  useTheme(settings.theme);
  const [now, tick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => tick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining =
    settings.paused ??
    (settings.timerEnd
      ? Math.max(0, Math.ceil((settings.timerEnd - Date.now()) / 1000))
      : null);
  return (
    <>
      <main className={["/", "/training", "/history", "/stats"].includes(pathname) ? "overview" : ""}>
        <header>
          <Link to="/" className="logo">
            BASE.
          </Link>
          <Link aria-label="Einstellungen" to="/settings">
            <Gear />
          </Link>
        </header>
        <div className={pathname === "/settings" ? "update-panel" : "update-panel compact-update"}><UpdateControl compact={pathname !== "/settings"} /></div>
        <MealReminders/>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/training" element={<Training />} />
          <Route path="/workout/:wid" element={<Editor />} />
          <Route path="/library" element={<Library />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import" element={<Navigate to="/training" replace />} />
        </Routes>
      </main>
      <footer className="app-dock">
      {remaining !== null && (
        <aside className="timer">
          <strong>
            {remaining === 0
              ? "Pause beendet"
              : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
          </strong>
          <button
            onClick={() =>
              db.settings.update(
                "settings",
                settings.paused !== null
                  ? { paused: null, timerEnd: Date.now() + remaining * 1000 }
                  : { paused: remaining, timerEnd: null },
              )
            }
          >
            {settings.paused !== null ? "Weiter" : "Pause"}
          </button>
          <button
            onClick={() =>
              db.settings.update(
                "settings",
                settings.paused !== null
                  ? { paused: remaining + 30 }
                  : { timerEnd: Date.now() + (remaining + 30) * 1000 },
              )
            }
          >
            +30 s
          </button>
          <button
            aria-label="Pause beenden"
            onClick={() =>
              db.settings.update("settings", { paused: null, timerEnd: null })
            }
          >
            ×
          </button>
        </aside>
      )}
      <nav aria-label="Hauptnavigation">
        {[
          [Home, "/", "Start"],
          [Dumbbell, "/training", "Training"],
          [CalendarDays, "/history", "Verlauf"],
          [ChartNoAxesCombined, "/stats", "Statistik"],
          ...(settings.nutrition || settings.hydration ? [[Utensils, "/nutrition", "Tagebuch"]] : []),
        ].map(([Icon, to, label]) => {
          const C = Icon as typeof Home;
          return (
            <NavLink key={String(to)} to={String(to)}>
              <C size={21} />
              <span>{String(label)}</span>
            </NavLink>
          );
        })}
      </nav>
      </footer>
    </>
  );
}
function Dashboard() {
  const all = useLiveQuery(() => db.workouts.toArray());
  const [selected, select] = useState(day());
  const [range, setRange] = useState("30");
  const [exercise, setExercise] = useState("");
  const done = (all ?? []).filter(w => w.status === "completed").sort((a,b) => b.date.localeCompare(a.date));
  const active = all?.find(w => w.status === "active");
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + i); return d;
  });
  const week = done.filter(w => w.date >= day(monday) && w.date <= day());
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - Number(range) + 1);
  const filtered = done.filter(w => (range === "all" || w.date >= day(cutoff)) && w.date <= day());
  const names = [...new Set(done.flatMap(w => w.exercises.map(e => e.name)))].sort();
  const points = [...filtered].reverse().filter(w => !exercise || w.exercises.some(e => e.name === exercise)).map(w => ({
    date: w.date,
    value: volume({...w, exercises: w.exercises.filter(e => !exercise || e.name === exercise)}),
  }));
  const chart = Array.from(points.reduce((map, p) => map.set(p.date, (map.get(p.date) ?? 0) + p.value), new Map<string, number>()), ([date, value]) => ({date, value}));
  if (!all) return <p role="status">Dashboard wird geladen …</p>;
  return <div className="dashboard">
    <p className="eyebrow">{format(today, "EEEE, d. MMMM", {locale: de})}</p>
    <h1>{active ? active.name : "Training heute"}</h1>
    {!all.length && <Onboarding/>}
    <article className="dashboard-start">
      <h2>{active ? "Aktives Training" : "Kein aktives Training"}</h2>
      <p>{active ? `${active.exercises.length} Übungen` : "Vorlage oder freies Training wählen."}</p>
      <Link className="primary action" to={active ? `/workout/${active.id}` : "/training"}><Dumbbell/>{active ? "Training fortsetzen" : "Training auswählen"}<ArrowRight/></Link>
    </article>
    <section aria-labelledby="week-heading">
      <div className="row"><h2 id="week-heading">Deine Woche</h2><Link to="/history">Verlauf →</Link></div>
      <p>{week.length} abgeschlossene {week.length === 1 ? "Einheit" : "Einheiten"} · {week.reduce((n,w) => n + count(w), 0)} Sätze</p>
      <div className="dashboard-week">{days.map(d => {
        const key = day(d), n = done.filter(w => w.date === key).length;
        return <button key={key} aria-pressed={selected === key} aria-label={`${format(d, "EEEE, d. MMMM", {locale: de})}: ${n} Workouts`} onClick={() => select(key)}><small>{format(d, "EEEEEE", {locale: de})}</small><strong>{d.getDate()}</strong><span>{n ? "●" : "–"}</span></button>;
      })}</div>
      <div aria-live="polite"><p>{format(new Date(selected + "T12:00:00"), "EEEE, d. MMMM", {locale: de})}</p>
      {done.filter(w => w.date === selected).map(w => <WorkoutCard key={w.id} w={w}/>)}
      {!done.some(w => w.date === selected) && <p className="dashboard-note">Kein Training.</p>}</div>
    </section>
    <section aria-labelledby="progress-heading">
      <div className="row"><h2 id="progress-heading">Dein Fortschritt</h2><Link to="/stats">Details →</Link></div>
      <div className="dashboard-filters">
        <div><span>Zeitraum</span><div className="segmented" role="group" aria-label="Zeitraum">{[["7","7T"],["30","30T"],["90","90T"],["all","Alle"]].map(([value,label])=><button key={value} aria-pressed={range===value} onClick={()=>setRange(value)}>{label}</button>)}</div></div>
        <label>Übung<select value={exercise} onChange={e => setExercise(e.target.value)}><option value="">Alle Übungen</option>{names.map(n => <option key={n}>{n}</option>)}</select></label>
      </div>
      <article>
        <small>TRAININGSVOLUMEN · GEWICHT × WIEDERHOLUNGEN</small>
        <h2>{fmt(chart.reduce((n,p) => n + p.value, 0))} kg</h2>
        {chart.length ? <><div style={{height: 220}}><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} accessibilityLayer><XAxis dataKey="date" tickFormatter={d => format(new Date(d + "T12:00:00"), "dd.MM.")}/><YAxis width={50}/><Tooltip formatter={v => [`${fmt(Number(v))} kg`, "Volumen"]}/><Bar dataKey="value" fill="var(--ink)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><details><summary>Werte als Liste anzeigen</summary>{chart.map(p => <p key={p.date}>{format(new Date(p.date + "T12:00:00"), "dd.MM.yyyy")}: {fmt(p.value)} kg</p>)}</details></> : <p>Noch keine abgeschlossenen Workouts für diese Auswahl.</p>}
        <small>Nur abgeschlossene Sätze zählen. Körpergewichtsübungen mit 0 kg ergeben kein Gewichtsvolumen.</small>
      </article>
    </section>
    <section aria-labelledby="recent-heading"><div className="row"><h2 id="recent-heading">Letzte Workouts</h2><Link to="/history">Alle →</Link></div>
      {done.slice(0,3).map(w => <details key={w.id}><summary><strong>{w.name}</strong><br/><small>{format(new Date(w.date + "T12:00:00"), "dd.MM.yyyy")} · {count(w)} Sätze{w.duration !== null ? ` · ${Math.round(w.duration / 60)} min` : ""}</small></summary>
      {w.exercises.map(e => <p key={e.id}>{e.name} · {e.sets.filter(isCompletedWork).length} Sätze</p>)}<Link className="action" to={`/workout/${w.id}`}>Workout öffnen <ArrowRight size={16}/></Link></details>)}
      {!done.length && <article className="empty"><Dumbbell size={36}/><h3>Keine Trainings</h3><p>Abgeschlossene Trainings erscheinen hier.</p></article>}
    </section>
    <DailyOverview/>
  </div>;
}
function WorkoutCard({ w }: { w: Workout }) {
  return (
    <Link to={`/workout/${w.id}`} aria-label={`${w.name} · ${w.date}`}>
      <article>
        <small>{w.date}</small>
        <h3>{w.name}</h3>
        <p>
          {w.exercises.length} Übungen · {count(w)} Sätze · {fmt(volume(w))} kg
          {w.duration !== null ? ` · ${Math.round(w.duration / 60)} min` : ""}
        </p>
      </article>
    </Link>
  );
}
function Training() {
  const libraryCount = useLiveQuery(() => db.exercises.count()) ?? 0;
  const ws = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const navigate = useNavigate();
  async function start(template?: Workout) {
    const w = await startWorkout(template);
    navigate(`/workout/${w.id}`);
  }
  return (
    <>
      <h1>Training</h1>
      <button className="primary action" onClick={() => start().catch(error)}>
        <Plus />
        Freies Training starten
      </button>
      <Link className="tile" to="/library">
        <span>Übungsbibliothek<small>{libraryCount} Übungen</small></span> <Dumbbell />
      </Link>
      {!ws.length && <Onboarding allowDismiss={false} />}
      <h2>Deine Vorlagen</h2>
      <p>Letzte Satzwerte werden beim Start übernommen.</p>
      <PersonalTemplates />
      {ws
        .filter((w) => w.status === "template")
        .map((w) => (
          <article key={w.id}>
            <h3>{w.name}</h3>
            <p>{w.exercises.length} Übungen</p>
            <button className="primary" onClick={() => start(w).catch(error)}>
              Starten
            </button>{" "}
            <Link className="button" to={`/workout/${w.id}`}>
              Bearbeiten
            </Link>
            <button
              onClick={() =>
                db.workouts
                  .add({
                    ...structuredClone(w),
                    id: id(),
                    name: w.name + " Kopie",
                  })
                  .catch(error)
              }
            >
              Duplizieren
            </button>
          </article>
        ))}
      <button
        onClick={async () => {
          const w: Workout = {
            id: id(),
            name: "Neue Vorlage",
            date: day(),
            status: "template",
            started: null,
            duration: null,
            exercises: [],
          };
          await db.workouts.add(w);
          navigate(`/workout/${w.id}`);
        }}
      >
        ＋ Vorlage erstellen
      </button>
    </>
  );
}
export function Numeric({value,onChange,step,label}:{value:number|null;onChange:(v:number|null)=>void;step:number;label:string}) {
 const [draft,setDraft]=useState(value===null?'':String(value));
 const [focused,setFocused]=useState(false);
 useEffect(()=>{if(!focused)setDraft(value===null?'':String(value))},[value,focused]);
 function change(n:number){setDraft(String(n));onChange(n)}
 return <div className="numeric"><button aria-label={`${label} verringern`} onClick={()=>change(Math.max(0,(value??0)-step))}>−</button><input aria-label={label} inputMode={step===1?'numeric':'decimal'} value={draft} placeholder="–" onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onChange={e=>{const text=e.target.value;const normalized=text.replace(',','.');if(normalized===''||(step===1?/^\d+$/:/^\d+(\.\d*)?$/).test(normalized)){setDraft(text);onChange(normalized===''?null:Number(normalized))}}}/><button aria-label={`${label} erhöhen`} onClick={()=>change((value??0)+step)}>+</button></div>
}
function WorkoutExerciseHeading({
  item,
  exercise,
}: {
  item: Item;
  exercise: Exercise | undefined;
}) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ text: string; saved: boolean } | null>(null);
  const savedNotes = exercise?.notes;
  useEffect(() => {
    if (draft?.saved && draft.text === savedNotes) setDraft(null);
  }, [draft, savedNotes]);

  return (
    <>
      <summary className="workout-exercise-heading">
        <span>{item.name}</span>
        <small>
          {item.sets.filter((set) => set.completed).length}/{item.sets.length} Sätze
        </small>
        {exercise && (
          <button
            type="button"
            className="exercise-note-toggle"
            aria-label={`Notiz zu ${item.name}`}
            aria-expanded={open}
            aria-controls={fieldId}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen((current) => !current);
              const card = event.currentTarget.closest("details");
              if (!open && card) card.open = true;
            }}
          >
            <StickyNote size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </summary>
      {exercise && (
        <textarea
          id={fieldId}
          className="exercise-note"
          hidden={!open}
          aria-label={`Notiz zu ${item.name}`}
          placeholder="Notiz …"
          rows={3}
          value={draft?.text ?? exercise.notes}
          onChange={(event) => {
            const edit = { text: event.target.value, saved: false };
            setDraft(edit);
            db.exercises
              .update(exercise.id, { notes: edit.text })
              .then(() => {
                setDraft((current) => current === edit ? { ...edit, saved: true } : current);
              })
              .catch((e: unknown) => {
    const status = document.getElementById("startup-status");
    if (status) status.textContent = "Start fehlgeschlagen (" + (e instanceof Error ? e.name : "unbekannt") + "). Deine Trainings bleiben gespeichert. Öffne die Starthilfe.";
  });
          }}
        />
      )}
    </>
  );
}

function WorkoutFields({
  w,
  save,
  focus = false,
}: {
  w: Workout;
  save: (w: Workout) => void;
  focus?: boolean;
}) {
  const ex = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const [query, setQuery] = useState("");
  const current = w.exercises.flatMap(e => e.sets.map(s => ({item:e.id, set:s}))).find(x => !x.set.completed);
  useEffect(() => { if (focus) document.querySelectorAll<HTMLDetailsElement>(".workout-fields > details").forEach(d => {d.open = true;}); }, [focus]);
  const savedHistory = useLiveQuery<Workout[]>(() => w.status === "active" ? db.workouts.where("status").equals("completed").toArray() : Promise.resolve([]), [w.status]);
  const history = savedHistory ?? [];
  const rowFocus = setFocus(w);
  const nextExercise = w.exercises.find(e => e.sets.some(s => s.id === rowFocus.next));
  useEffect(() => {
    if (!rowFocus.current) return;
    const row = document.querySelector('.set[aria-current="step"]');
    row?.closest('details')?.setAttribute('open', '');
    row?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [rowFocus.current]);
  const modify = (idx: number, e: Item) =>
    save({ ...w, exercises: w.exercises.map((x, i) => (i === idx ? e : x)) });
  return (
    <div className="workout-fields">
      {focus && !current && <p className="focus-finished">Alle Sätze abgeschlossen. Zurück zur Übersicht, um das Workout zu beenden.</p>}
      <label>
        Name
        <input
          value={w.name}
          onChange={(e) => save({ ...w, name: e.target.value })}
        />
      </label>
      <label>
        Trainingsdatum
        <DateField value={w.date} onChange={date=>{if(date)save({...w,date})}}/>
      </label>
      {w.exercises.map((e, i) => {
        const previous = w.status === "active" ? previousPerformance(w, i, history) : null;
        return (
        <details key={e.id} data-current={current?.item === e.id} open={focus || w.status !== "active" || e.sets.some(set => set.id === rowFocus.current)}>
          <WorkoutExerciseHeading
            item={e}
            exercise={ex.find((entry) => entry.id === e.exerciseId)}
          />
          <input
            aria-label="Übungsname"
            value={e.name}
            onChange={(ev) => modify(i, { ...e, name: ev.target.value })}
          />
          <ExerciseSwap w={w} item={e} library={ex} save={save}/>
          {w.status === "active" && !previous && <small>Noch keine vorherigen Satzwerte für diese Übung.</small>}
          <div className="setheading">
            <span>Satz</span>
            <span>Gewicht · kg</span>
            <span>Wdh.</span>
            <span>✓</span>
          </div>
          {e.sets.map((s, j) => {
            const update = (patch: Partial<typeof s>) =>
              modify(i, {
                ...e,
                sets: e.sets.map((x) =>
                  x.id === s.id ? { ...x, ...patch } : x,
                ),
              });
            return (
              <React.Fragment key={s.id}>
              {rowFocus.current === s.id && <p className="set-state">{t('currentSet')} · {j + 1}</p>}
              {rowFocus.next === s.id && <p className="set-state next">{t('nextSet')} · {j + 1}</p>}
              <div data-current={current?.set.id === s.id} aria-current={rowFocus.current === s.id ? "step" : undefined} className={`set ${s.completed ? "done" : ""} ${rowFocus.current === s.id ? "current" : ""} ${rowFocus.next === s.id ? "next" : ""}`}>
                <button
                  aria-label="Satz löschen"
                  disabled={focus}
                  onClick={() =>
                    modify(i, {
                      ...e,
                      sets: e.sets.filter((x) => x.id !== s.id),
                    })
                  }
                >
                  <span className="focus-set-label">Satz&nbsp;</span>{s.type === "warmup" ? "W" : j + 1}

                </button>
                <Numeric
                  label="Gewicht"
                  step={2.5}
                  value={s.weight}
                  onChange={(weight) => update({ weight })}
                />
                <Numeric
                  label="Wiederholungen"
                  step={1}
                  value={s.reps}
                  onChange={(reps) => update({ reps })}
                />
                <input
                  aria-label="Satz abgeschlossen"
                  type="checkbox"
                  checked={s.completed}
                  onChange={async (ev) => {
                    const completed = ev.target.checked;
                    update({ completed });
                    const cfg = await db.settings.get("settings");
                    if (completed && w.status === "active" && cfg?.auto)
                      await db.settings.update("settings", {
                        timerEnd:
                          Date.now() +
                          (ex.find((x) => x.id === e.exerciseId)?.rest ??
                            cfg.rest) *
                            1000,
                        paused: null,
                      });
                  }}
                />
                {focus && <button className="focus-complete primary" onClick={async () => {
                    const completed = !s.completed;
                    update({ completed });
                    const cfg = await db.settings.get("settings");
                    if (completed && w.status === "active" && cfg?.auto)
                      await db.settings.update("settings", {
                        timerEnd:
                          Date.now() +
                          (ex.find((x) => x.id === e.exerciseId)?.rest ??
                            cfg.rest) *
                            1000,
                        paused: null,
                      });
                }}>Satz abschließen ✓</button>}
              </div>
              <label className="set-options">Satztyp<select aria-label={`Satztyp Satz ${j + 1}`} value={s.type ?? "work"} onChange={ev => update({type: ev.target.value as "work" | "warmup"})}><option value="work">Arbeitssatz</option><option value="warmup">W · Aufwärmsatz</option></select></label>
              <EffortFields set={s} update={update}/>
              {rowFocus.current === s.id && nextExercise && <small className="next-preview">Nächster Satz: {nextExercise.name} · Satz {nextExercise.sets.findIndex(s => s.id === rowFocus.next) + 1}</small>}
              {previous && <PreviousSet previous={s.type === "warmup" ? undefined : previous.sets[e.sets.slice(0,j).filter(x => x.type !== "warmup").length]} date={previous.date} completed={s.completed} onApply={update} />}
              </React.Fragment>
            );
          })}
          <button
            disabled={w.status === "active" && !savedHistory}
            onClick={() => save(appendSet(w,i,history))}
          >
            ＋ Satz
          </button>
          <button
            disabled={i === 0}
            onClick={() => {
              const es = [...w.exercises];
              [es[i - 1], es[i]] = [es[i], es[i - 1]];
              save({ ...w, exercises: es });
            }}
          >
            ↑
          </button>
          <button
            onClick={() =>
              save({
                ...w,
                exercises: w.exercises.filter((x) => x.id !== e.id),
              })
            }
          >
            Übung entfernen
          </button>
        </details>
      );})}
      <article>
        <label>
          Übung hinzufügen
          <input
            placeholder="Bibliothek durchsuchen …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Übung auswählen"
          disabled={w.status === "active" && !savedHistory}
          value=""
          onChange={(ev) => {
            const e = ex.find((x) => x.id === ev.target.value)!;
            const next: Workout = {
              ...w,
              exercises: [
                ...w.exercises,
                {
                  id: id(),
                  exerciseId: e.id,
                  name: e.name,
                  muscle: e.muscle, equipment: e.equipment, movement: movementOf(e),
                  sets: [emptySet()],
                },
              ],
            };
            save(carryForward(next,history,new Set(next.exercises[next.exercises.length-1].sets.map(s => s.id))));
          }}
        >
          <option value="">Übung auswählen</option>
          {ex
            .filter((e) => matchesExercise(e, query))
            .sort((a,b) => a.name.localeCompare(b.name, "de"))
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
        </select>
        <Link to="/library">Bibliothek verwalten →</Link>
      </article>
    </div>
  );
}
function Editor() {
  const { wid } = useParams();
  const w = useLiveQuery(() => db.workouts.get(wid!), [wid]);
  const nav = useNavigate();
  const [msg, setMsg] = useState("");
  const [focus, setFocus] = useState(false);
  useEffect(() => {document.body.classList.toggle("focus-mode", focus); return () => document.body.classList.remove("focus-mode");}, [focus]);
  if (!w) return <p>Workout wird geladen …</p>;
  const save = (next: Workout) => {
    db.workouts
      .put(next)
      .then(() => setMsg("Gespeichert"))
      .catch((e) => setMsg(germanError(e)));
  };
  return (
    <div className={focus ? "editor focus-workout" : "editor"}>
      {w.status === "active" && <button className="focus-toggle" aria-pressed={focus} onClick={() => setFocus(!focus)}>{focus ? "← Normale Ansicht" : "Fokusmodus"}</button>}
      <h1>
        {w.status === "template"
          ? "Vorlage"
          : w.status === "active"
            ? "Im Training"
            : "Training"}
      </h1>
      <p>
        {count(w)} abgeschlossene Sätze · {fmt(volume(w))} kg ·{" "}
        {w.started && w.status === "active"
          ? Math.floor((Date.now() - w.started) / 60000)
          : Math.round((w.duration ?? 0) / 60)}{" "}
        min
      </p>
      {w.status === "active" && <LiveSummary w={w}/>}
      <small role="status">{msg}</small>
      <WorkoutFields key={w.id} w={w} save={save} focus={focus} />
      {w.status === "active" && (
        <button
          className="primary action"
          onClick={async () => {
            if (!w.name.trim() || !w.date)
              return error(Error("Name und Datum fehlen"));
            if (
              confirm(
                `Training abschließen? ${w.exercises.length} Übungen, ${count(w)} Sätze, ${fmt(volume(w))} kg.`,
              )
            ) {
              await db.transaction("rw", db.workouts, db.settings, async () => {
                await db.workouts.put({
                  ...w,
                  status: "completed",
                  duration: w.started
                    ? Math.floor((Date.now() - w.started) / 1000)
                    : null,
                });
                await db.settings.update("settings", {
                  timerEnd: null,
                  paused: null,
                });
              });
              nav("/history");
            }
          }}
        >
          Training abschließen
        </button>
      )}
      <button
        onClick={async () => {
          if (confirm("Dieses Training endgültig löschen?")) {
            await db.workouts.delete(w.id);
            nav("/training");
          }
        }}
      >
        Training löschen
      </button>
    </div>
  );
}
function Library() {
  const es = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const [q, Q] = useState(""),
    [m, M] = useState(""),
    [eq, E] = useState(""),
    [fav, F] = useState(false);
  const [edit, Edit] = useState<Exercise | null>(null);
  return (
    <>
      <h1>Übungen</h1>
      <ExpandLibrary />
      <input
        placeholder="Übung suchen"
        value={q}
        onChange={(e) => Q(e.target.value)}
      />
      <div className="two">
        <select aria-label="Muskelgruppe filtern" value={m} onChange={(e) => M(e.target.value)}>
          <option value="">Alle Muskelgruppen</option>
          {muscles.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select aria-label="Gerät filtern" value={eq} onChange={(e) => E(e.target.value)}>
          <option value="">Alle Geräte</option>
          {equipment.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <button onClick={() => F(!fav)}>
        {fav ? "★ Favoriten" : "☆ Alle Übungen"}
      </button>
      <button
        onClick={() =>
          Edit({
            id: id(),
            name: "",
            muscle: "Sonstige",
            equipment: "Sonstige",
            favorite: false,
            notes: "",
          })
        }
      >
        ＋ Eigene Übung
      </button>
      {edit && (
        <article>
          <h2>Übung bearbeiten</h2>
          <input
            aria-label="Name"
            value={edit.name}
            onChange={(e) => Edit({ ...edit, name: e.target.value })}
          />
          <select
            value={edit.muscle}
            onChange={(e) => Edit({ ...edit, muscle: e.target.value })}
          >
            {muscles.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            value={edit.equipment}
            onChange={(e) => Edit({ ...edit, equipment: e.target.value })}
          >
            {equipment.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <label>Bewegungsmuster<select value={movementOf(edit)} onChange={e => Edit({...edit,movement:e.target.value})}><option value="">Nicht zugeordnet</option>{movements.map(m => <option key={m}>{m}</option>)}</select></label>
          <input
            placeholder="Notizen"
            value={edit.notes}
            onChange={(e) => Edit({ ...edit, notes: e.target.value })}
          />
          <label>
            Individuelle Pause (Sekunden)
            <input
              type="number"
              min="1"
              value={edit.rest ?? ""}
              onChange={(e) =>
                Edit({
                  ...edit,
                  rest: e.target.value
                    ? Math.max(1, Number(e.target.value))
                    : undefined,
                })
              }
            />
          </label>
          <button
            className="primary"
            disabled={!edit.name.trim()}
            onClick={() =>
              db.exercises
                .put(edit)
                .then(() => Edit(null))
                .catch(error)
            }
          >
            Speichern
          </button>
          <button onClick={() => Edit(null)}>Abbrechen</button>
        </article>
      )}
      {es
        .filter(
          (e) =>
            matchesExercise(e, q) &&
            (!m || e.muscle === m) &&
            (!eq || e.equipment === eq) &&
            (!fav || e.favorite),
        )
        .sort((a,b) => a.name.localeCompare(b.name, "de"))
        .map((e) => (
          <article key={e.id}>
            <h3>{e.name}</h3>
            <small>
              {e.muscle} · {e.equipment}
            </small>
            <div>
              <button
                onClick={() =>
                  db.exercises.update(e.id, { favorite: !e.favorite })
                }
              >
                {e.favorite ? "★" : "☆"}
              </button>
              <button onClick={() => Edit(e)}>Bearbeiten</button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Übung löschen? Historische Trainings bleiben erhalten.",
                    )
                  )
                    db.exercises.delete(e.id);
                }}
              >
                Löschen
              </button>
            </div>
          </article>
        ))}
    </>
  );
}
function History() {
  const [month, Month] = useState(new Date()),
    [selected, Select] = useState(day());
  const ws =
    useLiveQuery(() =>
      db.workouts.where("status").equals("completed").toArray(),
    ) ?? [];
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfMonth(month),
  });
  return (
    <>
      <h1>Verlauf</h1>
      <article>
        <div className="row">
          <button onClick={() => Month(addMonths(month, -1))}>←</button>
          <h3>{format(month, "MMMM yyyy", { locale: de })}</h3>
          <button onClick={() => Month(addMonths(month, 1))}>→</button>
        </div>
        <div className="calendar">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((x) => (
            <small key={x}>{x}</small>
          ))}
          {days.map((d) => (
            <button
              className={`${d.getMonth() !== month.getMonth() ? "outside-month" : ""} ${selected === day(d) ? "selected" : ""} ${isSameDay(d, new Date()) ? "today" : ""}`}
              key={day(d)}
              onClick={() => Select(day(d))}
            >
              {format(d, "d")}
              <small>{ws.some((w) => w.date === day(d)) ? "●" : " "}</small>
            </button>
          ))}
        </div>
      </article>
      <h2>
        {format(new Date(selected + "T12:00:00"), "d. MMMM yyyy", {
          locale: de,
        })}
      </h2>
      {ws
        .filter((w) => w.date === selected)
        .map((w) => (
          <WorkoutCard key={w.id} w={w} />
        ))}
      {!ws.some((w) => w.date === selected) && (
        <p>Kein Training.</p>
      )}
    </>
  );
}
function Stats() {
  const ws =
    useLiveQuery(() =>
      db.workouts.where("status").equals("completed").toArray(),
    ) ?? [];
  const [range, R] = useState("90"),
    [exercise, E] = useState(""),
    [bucket, B] = useState("week");
  const filtered = ws
    .filter(
      (w) =>
        range === "all" ||
        new Date(w.date).getTime() >= Date.now() - Number(range) * 86400000,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<
    string,
    { date: string; volume: number; workouts: number }
  >();
  filtered.forEach((w) => {
    const d = new Date(w.date + "T12:00:00");
    const key = day(
      bucket === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d),
    );
    const g = groups.get(key) ?? { date: key, volume: 0, workouts: 0 };
    g.volume += volume(w);
    g.workouts++;
    groups.set(key, g);
  });
  const names = [...new Set(ws.flatMap((w) => w.exercises.map((e) => e.name)))];
  const selected = exercise || names[0];
  const sets = filtered.flatMap((w) =>
    w.exercises
      .filter((e) => e.name === selected)
      .flatMap((e) => e.sets.filter(isCompletedWork)),
  );
  const strength = filtered.flatMap((w) => {
    const weights = w.exercises
      .filter((e) => e.name === selected)
      .flatMap((e) =>
        e.sets
          .filter((s) => isCompletedWork(s) && s.weight !== null)
          .map((s) => s.weight!),
      );
    return weights.length
      ? [{ date: w.date, weight: Math.max(...weights) }]
      : [];
  });
  if (!filtered.length) return <><h1>Dein Fortschritt</h1><MuscleMap/><select aria-label="Zeitraum" value={range} onChange={e=>R(e.target.value)}><option value="30">30 Tage</option><option value="90">90 Tage</option><option value="365">1 Jahr</option><option value="all">Gesamt</option></select><div className="metrics"><article><b>0</b><small>Workouts</small></article><article><b>0</b><small>Volumen · kg</small></article></div><article className="empty"><ChartNoAxesCombined size={32}/><h2>Noch keine Trainingsdaten</h2><p>Volumen, Häufigkeit, Kraftentwicklung und Rekorde erscheinen nach deinem ersten abgeschlossenen Workout im gewählten Zeitraum.</p><Link className="button primary" to="/training">Zum Training</Link></article></>;
  return (
    <>
      <h1>Dein Fortschritt</h1><MuscleMap/>
      <select value={range} onChange={(e) => R(e.target.value)}>
        <option value="30">30 Tage</option>
        <option value="90">90 Tage</option>
        <option value="365">1 Jahr</option>
        <option value="all">Gesamt</option>
      </select>
      <div className="metrics">
        <article>
          <b>{filtered.length}</b>
          <small>Trainings</small>
        </article>
        <article>
          <b>{fmt(filtered.reduce((s, w) => s + volume(w), 0))}</b>
          <small>Volumen · kg</small>
        </article>
      </div>
      <select value={bucket} onChange={(e) => B(e.target.value)}>
        <option value="week">Pro Woche</option>
        <option value="month">Pro Monat</option>
      </select>
      {(["volume", "workouts"] as const).map((key) => (
        <article key={key}>
          <h2>
            {key === "volume" ? "Trainingsvolumen" : "Trainingshäufigkeit"}
          </h2>
          {groups.size ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[...groups.values()]}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis width={45} />
                <Tooltip contentStyle={{background:"var(--surface)",borderColor:"var(--line)",color:"var(--ink)"}} />
                <Bar name={key === "volume" ? "Trainingsvolumen (kg)" : "Trainings"} dataKey={key} fill="var(--ink)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>Deine Diagramme entstehen mit deinem ersten Training.</p>
          )}
        </article>
      ))}
      <article>
        <h2>Kraftentwicklung</h2>
        <select value={selected ?? ""} onChange={(e) => E(e.target.value)}>
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        {strength.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={strength}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip contentStyle={{background:"var(--surface)",borderColor:"var(--line)",color:"var(--ink)"}} />
              <Line name="Gewicht (kg)" dataKey="weight" stroke="var(--ink)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>Noch keine abgeschlossenen gewichteten Sätze.</p>
        )}
        <h3>Persönliche Rekorde · gewählter Zeitraum</h3>
        {sets.length ? (
          <p>
            {fmt(Math.max(...sets.map((s) => s.weight ?? 0)))} kg ·{" "}
            {Math.max(...sets.map((s) => s.reps ?? 0))} Wdh. ·{" "}
            {fmt(Math.max(...sets.map((s) => (s.weight ?? 0) * (s.reps ?? 0))))}{" "}
            kg Satzvolumen
          </p>
        ) : (
          <p>Noch keine Rekorde.</p>
        )}
      </article>
    </>
  );
}
function Settings() {
  const s = useLiveQuery(() => db.settings.get("settings"));
  if (!s) return <p>Einstellungen werden geladen …</p>;
  return (
    <>
      <h1>Einstellungen</h1>
      <Modules settings={s}/>
      <NutritionPreferencesForm settings={s}/>
      <ThemeStudio settings={s}/>
      <article>
        <h2>Pausentimer</h2>
        <RestDuration value={s.rest} onSave={async seconds => {
          const updated = await db.settings.update("settings", { rest: seconds });
          if (!updated) throw new Error("Settings missing");
        }} />
        <label>
          <input
            type="checkbox"
            checked={s.auto}
            onChange={(e) =>
              db.settings.update("settings", { auto: e.target.checked })
            }
          />{" "}
          Automatisch nach Satzabschluss starten
        </label>
        <p>
          Gewichtseinheit: kg. Körpergewicht ohne Zusatzgewicht als 0 kg
          erfassen.
        </p>
      </article>
      <article>
        <h2>Daten & Backup</h2>
        <button
          className="primary"
          onClick={async () => {
            const blob = new Blob(
              [JSON.stringify(await exportData(), null, 2)],
              { type: "application/json" },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `BASE-backup-${day()}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }}
        >
          JSON-Backup exportieren
        </button>
        <label className="button">
          JSON-Backup importieren
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              try {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 200 * 1024 * 1024)
                  throw Error("Backup ist zu groß");
                const b = backupSchema.parse(JSON.parse(await f.text()));
                if (
                  confirm(
                    `${b.workouts.length} Trainings und ${b.exercises.length} Übungen wiederherstellen? ${b.schemaVersion === 1 ? "Trainings und Einstellungen werden ersetzt; Nutrition-Daten bleiben erhalten." : "Alle vorhandenen Daten einschließlich Nutrition werden ersetzt."}`,
                  )
                ) {
                  await restore(b);
                  alert("Backup wiederhergestellt.");
                }
              } catch (err) {
                error(err);
              } finally {
                e.target.value = "";
              }
            }}
          />
        </label>
        <p>
          Deine Daten bleiben auf diesem Gerät. Gelöschte Browserdaten können
          nicht wiederhergestellt werden. Exportiere regelmäßig ein Backup.
        </p>
        <button
          onClick={async () => {
            if (
              confirm(
                "Alle Trainingsdaten, Übungen, Ernährungseinträge, Fotos und Einstellungen unwiderruflich löschen?",
              )
            ) {
              await db.transaction(
                "rw",
                [db.workouts, db.exercises, db.settings, db.nutrition, db.foods, db.dayNotes],
                async () => {
                  await db.workouts.clear();
                  await db.exercises.clear();
                  await db.settings.clear();
                  await db.nutrition.clear(); await db.foods.clear(); await db.dayNotes.clear();
                },
              );
              await init();
            }
          }}
        >
          Alle Daten löschen
        </button>
      </article>
      <p>
        BASE. · Ansicht
        <br />
        Auf dem iPhone: Safari → Teilen → Zum Home-Bildschirm.
      </p>
    </>
  );
}
init()
  .then(() =>
    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <StartupBoundary><BrowserRouter>
          <App />
        </BrowserRouter></StartupBoundary>
      </React.StrictMode>,
    ),
  )
  .catch((e: unknown) => {
    const status = document.getElementById("startup-status");
    if (status) status.textContent = "Start fehlgeschlagen (" + (e instanceof Error ? e.name : "unbekannt") + "). Deine Trainings bleiben gespeichert. Öffne die Starthilfe.";
  });
