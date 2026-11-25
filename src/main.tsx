import { restoreThemeView } from "./services/themeSync";
import { formatDay } from "./i18n/runtime";
import { LanguagePicker } from "./components/settings/LanguagePicker";
import { useLanguage, activateLanguage } from "./i18n/runtime";
import { getLocale, getDateLocale } from "./i18n/runtime";
import { tr } from "./i18n/runtime";
import { Dashboard } from "./features/Dashboard";
import { ActionMenu } from "./components/ui/ActionMenu";
import { PeriodFilter } from "./components/ui/PeriodFilter";
import { DateField } from "./components/ui/DateField";
import { NutritionPreferencesForm, MealReminders } from "./features/nutrition/Preferences";
import { Nutrition, Modules, DailyOverview } from "./features/nutrition/Nutrition";
import { StartupBoundary } from "./components/pwa/StartupBoundary";
import React, { useState, useEffect, useId } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useParams, useLocation, Link, } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Home, Play, Dumbbell, CalendarDays, Utensils, ChartNoAxesCombined, Settings as Gear, Plus, ArrowRight, StickyNote, } from "lucide-react";
import { format, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay, } from "date-fns";

import { CartesianGrid, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, } from "recharts";
import { db, init, id, defaults, emptySet, isCompletedWork, volume, count, exportData, restore, backupSchema, muscles, equipment, type Workout, type Item, type Exercise, } from "./data";
import { ThemeStudio, useTheme } from "./features/ThemeStudio";
import { MuscleMap } from "./features/MuscleMap";
import { ExerciseSwap } from "./features/ExerciseSwap";
import { movements, movementOf } from "./features/swap";
import { LiveSummary } from "./features/LiveSummary";
import { EffortFields } from "./features/EffortFields";
import "./style.css";
import "./styles/performance.css";
import { t, germanError } from "./i18n/de";
import { RestDuration } from "./components/settings/RestDuration";
import { Onboarding } from "./components/onboarding/Onboarding";
import { setFocus } from "./services/setFocus";
import { ExpandLibrary } from "./components/exercises/ExpandLibrary";
import { matchesExercise } from "./services/exerciseCatalog";
import { startWorkout, carryForward, appendSet } from "./services/carryForward";
import { previousPerformance } from "./services/previousPerformance";
import { PreviousSet } from "./components/workout/PreviousSet";
import { Training } from "./features/Training";
import { UpdateControl } from "./components/pwa/UpdateControl";
const day = (d = new Date()) => format(d, "yyyy-MM-dd");
const fmt = (n: number) => n.toLocaleString(getLocale(), { maximumFractionDigits: 1 });
const error = (e: unknown) => alert(germanError(e));
function App() {
    useLanguage();
    const { pathname, hash } = useLocation();
    useEffect(() => {
        if (restoreThemeView())return;
        if (!hash)
            document.querySelector("main")?.scrollTo(0, 0);
    }, [pathname, hash]);
    useEffect(() => {
        const viewport = window.visualViewport;
        const resize = () => {
            const editing = document.activeElement?.matches('input, textarea, select');
            document.documentElement.style.setProperty("--app-height", `${editing && viewport ? viewport.height : window.innerHeight}px`);
            if (editing)
                document.activeElement?.scrollIntoView({ block: "nearest" });
        };
        viewport?.addEventListener("resize", resize);
        window.addEventListener("focusout", resize);
        resize();
        return () => { viewport?.removeEventListener("resize", resize); window.removeEventListener("focusout", resize); };
    }, []);
    const savedSettings = useLiveQuery(() => db.settings.get("settings"));
    const settings = savedSettings ?? defaults;
    useTheme(savedSettings?.theme,!!savedSettings,pathname);
    useEffect(() => {if(savedSettings)activateLanguage(savedSettings.language ?? "de");}, [savedSettings?.language, !!savedSettings]);
    const [now, tick] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => tick(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const remaining = settings.paused ??
        (settings.timerEnd
            ? Math.max(0, Math.ceil((settings.timerEnd - Date.now()) / 1000))
            : null);
    return (<>
      <main className={["/", "/training", "/history", "/stats", "/progress"].includes(pathname) ? "overview" : ""}>
        <header>
          <Link to="/" className="logo">{tr("BASE.")}</Link>
          <Link aria-label={tr("Einstellungen")} to="/settings">
            <Gear />
          </Link>
        </header>
        <div className={pathname === "/settings" ? "update-panel" : "update-panel compact-update"}><UpdateControl compact={pathname !== "/settings"}/></div>
        <MealReminders />
        <Routes>
          <Route path="/" element={<Dashboard />}/>
          <Route path="/training" element={<Training />}/>
          <Route path="/workout/:wid" element={<Editor />}/>
          <Route path="/library" element={<Library />}/>
          <Route path="/history" element={<Progress section="history"/>}/>
          <Route path="/progress" element={<Progress />}/>
          <Route path="/progress/muscles" element={<Progress section="muscles"/>}/>
          <Route path="/stats" element={<Progress />}/>
          <Route path="/nutrition" element={<Nutrition />}/>
          <Route path="/settings" element={<Settings />}/>
          <Route path="/import" element={<Navigate to="/training" replace/>}/>
        </Routes>
      </main>
      <footer className="app-dock">
      {remaining !== null && (<aside className="timer">
          <strong>
            {remaining === 0
                ? tr("Pause beendet") : tr("{0}:{1}", [Math.floor(remaining / 60), String(remaining % 60).padStart(2, "0")])}
          </strong>
          <button onClick={() => db.settings.update("settings", settings.paused !== null
                ? { paused: null, timerEnd: Date.now() + remaining * 1000 }
                : { paused: remaining, timerEnd: null })}>
            {settings.paused !== null ? tr("Weiter") : tr("Pause")}
          </button>
          <button onClick={() => db.settings.update("settings", settings.paused !== null
                ? { paused: remaining + 30 }
                : { timerEnd: Date.now() + (remaining + 30) * 1000 })}>{tr("+30 s")}</button>
          <button aria-label={tr("Pause beenden")} onClick={() => db.settings.update("settings", { paused: null, timerEnd: null })}>{"\u00D7"}</button>
        </aside>)}
      <nav aria-label={tr("Hauptnavigation")}>
        {[
            [Home, "/", "Start"],
            [Dumbbell, "/training", "Training"],
            [ChartNoAxesCombined, "/progress", "Fortschritt"],
            ...(settings.nutrition || settings.hydration ? [[Utensils, "/nutrition", "Tagebuch"]] : []),
        ].map(([Icon, to, label]) => {
            const C = Icon as typeof Home;
            return (<NavLink key={String(to)} to={String(to)} className={String(to) === "/progress" && ["/history", "/stats"].includes(pathname) ? "active" : undefined}>
              <C size={21}/>
              <span>{tr(String(label))}</span>
            </NavLink>);
        })}
      </nav>
      </footer>
    </>);
}
function Progress({ section = "overview" }: {
    section?: "overview" | "history" | "muscles";
}) {
    return <><h1>{tr("Fortschritt")}</h1><nav className="progress-tabs" aria-label={tr("Fortschrittsbereiche")}>{[["overview", "/progress", "Übersicht"], ["history", "/history", "Verlauf"], ["muscles", "/progress/muscles", "Muskeln"]].map(([key, url, label]) => <Link key={key} to={url} aria-current={section === key ? "page" : undefined}>{tr(label)}</Link>)}</nav>{section === "history" ? <History /> : section === "muscles" ? <MuscleMap /> : <Stats />}</>;
}
function WorkoutCard({ w }: {
    w: Workout;
}) {
    return (<Link to={`/workout/${w.id}`} aria-label={tr("{0} \u00B7 {1}", [w.name, w.date])}>
      <article>

        <h3>{w.name}</h3>
        <p>
          {w.exercises.length}{tr(" \u00DCbungen \u00B7 ")}{count(w)}{tr(" S\u00E4tze \u00B7 ")}{fmt(volume(w))}{tr(" kg")}{w.duration !== null ? tr(" \u00B7 {0} min", [Math.round(w.duration / 60)]) : ""}
        </p>
      </article>
    </Link>);
}
export function Numeric({ value, onChange, step, label }: {
    value: number | null;
    onChange: (v: number | null) => void;
    step: number;
    label: string;
}) {
    const [draft, setDraft] = useState(value === null ? '' : String(value));
    const [focused, setFocused] = useState(false);
    useEffect(() => { if (!focused)
        setDraft(value === null ? '' : String(value)); }, [value, focused]);
    function change(n: number) { setDraft(String(n)); onChange(n); }
    return <div className="numeric"><span className="numeric-label">{tr(label)}{step !== 1 ? tr(" \u00B7 kg") : ""}</span><button aria-label={tr("{0} verringern", [label])} onClick={() => change(Math.max(0, (value ?? 0) - step))}>{"\u2212"}</button><input aria-label={label} inputMode={step === 1 ? 'numeric' : 'decimal'} value={draft} placeholder={"\u2013"} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={e => { const text = e.target.value; const normalized = text.replace(',', '.'); if (normalized === '' || (step === 1 ? /^\d+$/ : /^\d+(\.\d*)?$/).test(normalized)) {
        setDraft(text);
        onChange(normalized === '' ? null : Number(normalized));
    } }}/><button aria-label={tr("{0} erh\u00F6hen", [label])} onClick={() => change((value ?? 0) + step)}>{"+"}</button></div>;
}
function WorkoutExerciseHeading({ item, exercise, }: {
    item: Item;
    exercise: Exercise | undefined;
}) {
    const fieldId = useId();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<{
        text: string;
        saved: boolean;
    } | null>(null);
    const savedNotes = exercise?.notes;
    useEffect(() => {
        if (draft?.saved && draft.text === savedNotes)
            setDraft(null);
    }, [draft, savedNotes]);
    return (<>
      <summary className="workout-exercise-heading">
        <span>{item.name}</span>
        <small>
          {item.sets.filter((set) => set.completed).length}{"/"}{item.sets.length}{tr(" S\u00E4tze")}</small>
        {exercise && (<button type="button" className="exercise-note-toggle" aria-label={tr("Notiz zu {0}", [item.name])} aria-expanded={open} aria-controls={fieldId} onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen((current) => !current);
                const card = event.currentTarget.closest("details");
                if (!open && card)
                    card.open = true;
            }}>
            <StickyNote size={16} strokeWidth={1.5} aria-hidden="true"/>
          </button>)}
      </summary>
      {exercise && (<textarea id={fieldId} className="exercise-note" hidden={!open} aria-label={tr("Notiz zu {0}", [item.name])} placeholder={tr("Notiz \u2026")} rows={3} value={draft?.text ?? exercise.notes} onChange={(event) => {
                const edit = { text: event.target.value, saved: false };
                setDraft(edit);
                db.exercises
                    .update(exercise.id, { notes: edit.text })
                    .then(() => {
                    setDraft((current) => current === edit ? { ...edit, saved: true } : current);
                })
                    .catch((e: unknown) => {
                    const status = document.getElementById("startup-status");
                    if (status)
                        status.textContent=tr("Start fehlgeschlagen ({0}). Deine Trainings bleiben gespeichert. Öffne die Starthilfe.",[e instanceof Error?e.name:tr("Unbekannt")]);
                });
            }}/>)}
    </>);
}
function WorkoutFields({ w, save, focus = false, }: {
    w: Workout;
    save: (w: Workout) => void;
    focus?: boolean;
}) {
    const ex = useLiveQuery(() => db.exercises.toArray()) ?? [];
    const [query, setQuery] = useState("");
    const current = w.exercises.flatMap(e => e.sets.map(s => ({ item: e.id, set: s }))).find(x => !x.set.completed);
    useEffect(() => { if (focus)
        document.querySelectorAll<HTMLDetailsElement>(".workout-fields > details").forEach(d => { d.open = true; }); }, [focus]);
    const savedHistory = useLiveQuery<Workout[]>(() => w.status === "active" ? db.workouts.where("status").equals("completed").toArray() : Promise.resolve([]), [w.status]);
    const history = savedHistory ?? [];
    const rowFocus = setFocus(w);
    const nextExercise = w.exercises.find(e => e.sets.some(s => s.id === rowFocus.next));
    useEffect(() => {
        if (!rowFocus.current)
            return;
        const row = document.querySelector('.set[aria-current="step"]');
        row?.closest('details')?.setAttribute('open', '');
        row?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }, [rowFocus.current]);
    const modify = (idx: number, e: Item) => save({ ...w, exercises: w.exercises.map((x, i) => (i === idx ? e : x)) });
    return (<div className="workout-fields">
      {focus && !current && <p className="focus-finished">{tr("Alle S\u00E4tze abgeschlossen. Zur\u00FCck zur \u00DCbersicht, um das Workout zu beenden.")}</p>}
      <label>{tr("Name")}<input value={w.name} onChange={(e) => save({ ...w, name: e.target.value })}/>
      </label>
      <label>{tr("Trainingsdatum")}<DateField value={formatDay(w.date)} onChange={date => { if (date)
        save({ ...w, date }); }}/>
      </label>
      {w.exercises.map((e, i) => {
            const previous = w.status === "active" ? previousPerformance(w, i, history) : null;
            return (<details key={e.id} data-current={current?.item === e.id} open={focus || w.status !== "active" || e.sets.some(set => set.id === rowFocus.current)}>
          <WorkoutExerciseHeading item={e} exercise={ex.find((entry) => entry.id === e.exerciseId)}/>
          <input aria-label={tr("\u00DCbungsname")} value={e.name} onChange={(ev) => modify(i, { ...e, name: ev.target.value })}/>
          <ExerciseSwap w={w} item={e} library={ex} save={save}/>
          {w.status === "active" && !previous && <small>{tr("Noch keine vorherigen Satzwerte f\u00FCr diese \u00DCbung.")}</small>}
          <div className="setheading">
            <span>{tr("Satz")}</span>
            <span>{tr("Gewicht \u00B7 kg")}</span>
            <span>{tr("Wdh.")}</span>
            <span>{"\u2713"}</span>
          </div>
          {e.sets.map((s, j) => {
                    const update = (patch: Partial<typeof s>) => modify(i, {
                        ...e,
                        sets: e.sets.map((x) => x.id === s.id ? { ...x, ...patch } : x),
                    });
                    return (<React.Fragment key={s.id}>
              {rowFocus.current === s.id && <p className="set-state">{t('currentSet')}{" \u00B7 "}{j + 1}</p>}
              {rowFocus.next === s.id && <p className="set-state next">{t('nextSet')}{" \u00B7 "}{j + 1}</p>}
              <div data-current={current?.set.id === s.id} aria-current={rowFocus.current === s.id ? "step" : undefined} className={`set ${s.completed ? "done" : ""} ${rowFocus.current === s.id ? "current" : ""} ${rowFocus.next === s.id ? "next" : ""}`}>
                <button aria-label={tr("Satz l\u00F6schen")} disabled={focus} onClick={() => modify(i, {
                            ...e,
                            sets: e.sets.filter((x) => x.id !== s.id),
                        })}>
                  <span className="focus-set-label">{tr("Satz\u00A0")}</span>{s.type === "warmup" ? tr("W") : j + 1}

                </button>
                <Numeric label={tr("Gewicht")} step={2.5} value={s.weight} onChange={(weight) => update({ weight })}/>
                <Numeric label={tr("Wiederholungen")} step={1} value={s.reps} onChange={(reps) => update({ reps })}/>
                <input aria-label={tr("Satz abgeschlossen")} type="checkbox" checked={s.completed} onChange={async (ev) => {
                            const completed = ev.target.checked;
                            update({ completed });
                            const cfg = await db.settings.get("settings");
                            if (completed && w.status === "active" && cfg?.auto)
                                await db.settings.update("settings", {
                                    timerEnd: Date.now() +
                                        (ex.find((x) => x.id === e.exerciseId)?.rest ??
                                            cfg.rest) *
                                            1000,
                                    paused: null,
                                });
                        }}/>
                {focus && <button className="focus-complete primary" onClick={async () => {
                                const completed = !s.completed;
                                update({ completed });
                                const cfg = await db.settings.get("settings");
                                if (completed && w.status === "active" && cfg?.auto)
                                    await db.settings.update("settings", {
                                        timerEnd: Date.now() +
                                            (ex.find((x) => x.id === e.exerciseId)?.rest ??
                                                cfg.rest) *
                                                1000,
                                        paused: null,
                                    });
                            }}>{tr("Satz abschlie\u00DFen \u2713")}</button>}
              </div>
              <label className="set-options">{tr("Satztyp")}<select aria-label={tr("Satztyp Satz {0}", [j + 1])} value={s.type ?? "work"} onChange={ev => update({ type: ev.target.value as "work" | "warmup" })}><option value="work">{tr("Arbeitssatz")}</option><option value="warmup">{tr("W \u00B7 Aufw\u00E4rmsatz")}</option></select></label>
              <EffortFields set={s} update={update}/>
              {rowFocus.current === s.id && nextExercise && <small className="next-preview">{tr("N\u00E4chster Satz: ")}{nextExercise.name}{tr(" \u00B7 Satz ")}{nextExercise.sets.findIndex(s => s.id === rowFocus.next) + 1}</small>}
              {previous && <PreviousSet previous={s.type === "warmup" ? undefined : previous.sets[e.sets.slice(0, j).filter(x => x.type !== "warmup").length]} date={previous.date} completed={s.completed} onApply={update}/>}
              </React.Fragment>);
                })}
          <button disabled={w.status === "active" && !savedHistory} onClick={() => save(appendSet(w, i, history))}>{tr("\uFF0B Satz")}</button>
          <button disabled={i === 0} onClick={() => {
                    const es = [...w.exercises];
                    [es[i - 1], es[i]] = [es[i], es[i - 1]];
                    save({ ...w, exercises: es });
                }}>{"\u2191"}</button>
          <button onClick={() => save({
                    ...w,
                    exercises: w.exercises.filter((x) => x.id !== e.id),
                })}>{tr("\u00DCbung entfernen")}</button>
        </details>);
        })}
      <article>
        <label>{tr("\u00DCbung hinzuf\u00FCgen")}<input placeholder={tr("Bibliothek durchsuchen \u2026")} value={query} onChange={(e) => setQuery(e.target.value)}/>
        </label>
        <select aria-label={tr("\u00DCbung ausw\u00E4hlen")} disabled={w.status === "active" && !savedHistory} value="" onChange={(ev) => {
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
            save(carryForward(next, history, new Set(next.exercises[next.exercises.length - 1].sets.map(s => s.id))));
        }}>
          <option value="">{tr("\u00DCbung ausw\u00E4hlen")}</option>
          {ex
            .filter((e) => matchesExercise(e, query))
            .sort((a, b) => a.name.localeCompare(b.name, "de"))
            .map((e) => (<option key={e.id} value={e.id}>
                {e.name}
              </option>))}
        </select>
        <Link to="/library">{tr("Bibliothek verwalten \u2192")}</Link>
      </article>
    </div>);
}
function Editor() {
    const { wid } = useParams();
    const w = useLiveQuery(() => db.workouts.get(wid!), [wid]);
    const nav = useNavigate();
    const [msg, setMsg] = useState("");
    const [focus, setFocus] = useState(false);
    useEffect(() => { document.body.classList.toggle("focus-mode", focus); return () => document.body.classList.remove("focus-mode"); }, [focus]);
    if (!w)
        return <p>{tr("Workout wird geladen \u2026")}</p>;
    const save = (next: Workout) => {
        db.workouts
            .put(next)
            .then(() => setMsg("Gespeichert"))
            .catch((e) => setMsg(germanError(e)));
    };
    return (<div className={focus ? "editor focus-workout" : "editor"}>
      {w.status === "active" && <button className="focus-toggle" aria-pressed={focus} onClick={() => setFocus(!focus)}>{focus ? tr("\u2190 Normale Ansicht") : tr("Fokusmodus")}</button>}
      <h1>
        {w.status === "template"
            ? tr("Vorlage") : w.status === "active"
            ? tr("Im Training") : tr("Training")}
      </h1>
      <p>
        {count(w)}{tr(" abgeschlossene S\u00E4tze \u00B7 ")}{fmt(volume(w))}{tr(" kg \u00B7")}{" "}
        {w.started && w.status === "active"
            ? Math.floor((Date.now() - w.started) / 60000)
            : Math.round((w.duration ?? 0) / 60)}{" "}{tr("min")}</p>
      {w.status === "active" && <LiveSummary w={w}/>}
      <small role="status">{tr(msg)}</small>
      <WorkoutFields key={w.id} w={w} save={save} focus={focus}/>
      {w.status === "active" && (<button className="primary action" onClick={async () => {
                if (!w.name.trim() || !w.date)
                    return error(Error("Name und Datum fehlen"));
                if (confirm(tr("Training abschlie\u00DFen? {0} \u00DCbungen, {1} S\u00E4tze, {2} kg.", [w.exercises.length, count(w), fmt(volume(w))]))) {
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
            }}>{tr("Training abschlie\u00DFen")}</button>)}
      <button onClick={async () => {
            if (confirm(tr("Dieses Training endg\u00FCltig l\u00F6schen?"))) {
                await db.workouts.delete(w.id);
                nav("/training");
            }
        }}>{tr("Training l\u00F6schen")}</button>
    </div>);
}
function Library() {
    const es = useLiveQuery(() => db.exercises.toArray()) ?? [];
    const [q, Q] = useState(""), [m, M] = useState(""), [eq, E] = useState(""), [fav, F] = useState(false);
    const [edit, Edit] = useState<Exercise | null>(null);
    return (<>
      <h1>{tr("\u00DCbungen")}</h1>
      <ExpandLibrary />
      <input placeholder={tr("\u00DCbung suchen")} value={q} onChange={(e) => Q(e.target.value)}/>
      <div className="two">
        <select aria-label={tr("Muskelgruppe filtern")} value={m} onChange={(e) => M(e.target.value)}>
          <option value="">{tr("Alle Muskelgruppen")}</option>
          {muscles.map((x) => (<option key={x} value={x}>{tr(x)}</option>))}
        </select>
        <select aria-label={tr("Ger\u00E4t filtern")} value={eq} onChange={(e) => E(e.target.value)}>
          <option value="">{tr("Alle Ger\u00E4te")}</option>
          {equipment.map((x) => (<option key={x} value={x}>{tr(x)}</option>))}
        </select>
      </div>
      <button onClick={() => F(!fav)}>
        {fav ? tr("\u2605 Favoriten") : tr("\u2606 Alle \u00DCbungen")}
      </button>
      <button onClick={() => Edit({
            id: id(),
            name: "",
            muscle: "Sonstige",
            equipment: "Sonstige",
            favorite: false,
            notes: "",
        })}>{tr("\uFF0B Eigene \u00DCbung")}</button>
      {edit && (<article>
          <h2>{tr("\u00DCbung bearbeiten")}</h2>
          <input aria-label={tr("Name")} value={edit.name} onChange={(e) => Edit({ ...edit, name: e.target.value })}/>
          <select value={edit.muscle} onChange={(e) => Edit({ ...edit, muscle: e.target.value })}>
            {muscles.map((x) => (<option key={x} value={x}>{tr(x)}</option>))}
          </select>
          <select value={edit.equipment} onChange={(e) => Edit({ ...edit, equipment: e.target.value })}>
            {equipment.map((x) => (<option key={x} value={x}>{tr(x)}</option>))}
          </select>
          <label>{tr("Bewegungsmuster")}<select value={movementOf(edit)} onChange={e => Edit({ ...edit, movement: e.target.value })}><option value="">{tr("Nicht zugeordnet")}</option>{movements.map(m => <option key={m} value={m}>{tr(m)}</option>)}</select></label>
          <input placeholder={tr("Notizen")} value={edit.notes} onChange={(e) => Edit({ ...edit, notes: e.target.value })}/>
          <label>{tr("Individuelle Pause (Sekunden)")}<input type="number" min="1" value={edit.rest ?? ""} onChange={(e) => Edit({
                ...edit,
                rest: e.target.value
                    ? Math.max(1, Number(e.target.value))
                    : undefined,
            })}/>
          </label>
          <button className="primary" disabled={!edit.name.trim()} onClick={() => db.exercises
                .put(edit)
                .then(() => Edit(null))
                .catch(error)}>{tr("Speichern")}</button>
          <button onClick={() => Edit(null)}>{tr("Abbrechen")}</button>
        </article>)}
      {es
            .filter((e) => matchesExercise(e, q) &&
            (!m || e.muscle === m) &&
            (!eq || e.equipment === eq) &&
            (!fav || e.favorite))
            .sort((a, b) => a.name.localeCompare(b.name, "de"))
            .map((e) => (<article key={e.id}>
            <h3>{e.name}</h3>
            <small>
              {tr(e.muscle)}{" \u00B7 "}{tr(e.equipment)}
            </small>
            <div>
              <button onClick={() => db.exercises.update(e.id, { favorite: !e.favorite })}>
                {e.favorite ? "\u2605" : "\u2606"}
              </button>
              <button onClick={() => Edit(e)}>{tr("Bearbeiten")}</button>
              <button onClick={() => {
                if (confirm(tr("\u00DCbung l\u00F6schen? Historische Trainings bleiben erhalten.")))
                    db.exercises.delete(e.id);
            }}>{tr("L\u00F6schen")}</button>
            </div>
          </article>))}
    </>);
}
function History() {
    const [month, Month] = useState(new Date()), [selected, Select] = useState(day());
    const ws = useLiveQuery(() => db.workouts.where("status").equals("completed").toArray()) ?? [];
    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfMonth(month),
    });
    return (<>

      <article>
        <div className="row">
          <button onClick={() => Month(addMonths(month, -1))}>{"\u2190"}</button>
          <h3>{format(month, "MMMM yyyy", { locale: getDateLocale() })}</h3>
          <button onClick={() => Month(addMonths(month, 1))}>{"\u2192"}</button>
        </div>
        <div className="calendar">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((x) => (<small key={x}>{tr(x)}</small>))}
          {days.map((d) => (<button className={`${d.getMonth() !== month.getMonth() ? "outside-month" : ""} ${selected === day(d) ? "selected" : ""} ${isSameDay(d, new Date()) ? "today" : ""}`} key={day(d)} onClick={() => Select(day(d))}>
              {format(d, "d")}
              <small>{ws.some((w) => w.date === day(d)) ? "\u25CF" : " "}</small>
            </button>))}
        </div>
      </article>
      <h2>
        {format(new Date(selected + "T12:00:00"), "d. MMMM yyyy", {
            locale: getDateLocale(),
        })}
      </h2>
      {ws
            .filter((w) => w.date === selected)
            .map((w) => (<WorkoutCard key={w.id} w={w}/>))}
      {!ws.some((w) => w.date === selected) && (<p>{tr("Kein Training.")}</p>)}
    </>);
}
function Stats() {
    const ws = useLiveQuery(() => db.workouts.where("status").equals("completed").toArray()) ?? [];
    const [range, R] = useState("90"), [exercise, E] = useState(""), [bucket, B] = useState("week");
    const filtered = ws
        .filter((w) => range === "all" ||
        new Date(w.date).getTime() >= Date.now() - Number(range) * 86400000)
        .sort((a, b) => a.date.localeCompare(b.date));
    const groups = new Map<string, {
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
    const names = [...new Set(ws.flatMap((w) => w.exercises.map((e) => e.name)))];
    const selected = exercise || names[0];
    const sets = filtered.flatMap((w) => w.exercises
        .filter((e) => e.name === selected)
        .flatMap((e) => e.sets.filter(isCompletedWork)));
    const strength = filtered.flatMap((w) => {
        const weights = w.exercises
            .filter((e) => e.name === selected)
            .flatMap((e) => e.sets
            .filter((s) => isCompletedWork(s) && s.weight !== null)
            .map((s) => s.weight!));
        return weights.length
            ? [{ date: w.date, weight: Math.max(...weights) }]
            : [];
    });
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
          {groups.size ? (<ResponsiveContainer width="100%" height={220}>
              <BarChart data={[...groups.values()]}>
                <CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="date" tickFormatter={d => new Date(d + "T12:00:00").toLocaleDateString(getLocale(),{day:"2-digit",month:"2-digit"})} tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis width={52} allowDecimals={key !== "workouts"} tickFormatter={fmt} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}/>
                <Bar name={tr(key === "volume" ? "Trainingsvolumen (kg)" : "Trainings")} dataKey={key} fill="var(--ink)" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>) : (<p>{tr("Deine Diagramme entstehen mit deinem ersten Training.")}</p>)}
        </article>))}
      <article>
        <h2>{tr("Kraftentwicklung")}</h2>
        <select value={selected ?? ""} onChange={(e) => E(e.target.value)}>
          {names.map((n) => (<option key={n}>{n}</option>))}
        </select>
        {strength.length ? (<ResponsiveContainer width="100%" height={220}>
            <LineChart data={strength}>
              <CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="date" tickFormatter={d => new Date(d + "T12:00:00").toLocaleDateString(getLocale(),{day:"2-digit",month:"2-digit"})} tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
              <YAxis />
              <Tooltip contentStyle={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}/>
              <Line type="linear" name={tr("Gewicht (kg)")} dataKey="weight" stroke="var(--ink)"/>
            </LineChart>
          </ResponsiveContainer>) : (<p>{tr("Noch keine abgeschlossenen gewichteten S\u00E4tze.")}</p>)}
        <h3>{tr("Pers\u00F6nliche Rekorde \u00B7 gew\u00E4hlter Zeitraum")}</h3>
        {sets.length ? (<p>
            {fmt(Math.max(...sets.map((s) => s.weight ?? 0)))}{tr(" kg \u00B7")}{" "}
            {Math.max(...sets.map((s) => s.reps ?? 0))}{tr(" Wdh. \u00B7")}{" "}
            {fmt(Math.max(...sets.map((s) => (s.weight ?? 0) * (s.reps ?? 0))))}{" "}{tr("kg Satzvolumen")}</p>) : (<p>{tr("Noch keine Rekorde.")}</p>)}
      </article>
    </>);
}
function Settings() {
    const s = useLiveQuery(() => db.settings.get("settings"));
    if (!s)
        return <p>{tr("Einstellungen werden geladen \u2026")}</p>;
    return (<>
      <h1>{tr("Einstellungen")}</h1>
      <LanguagePicker/><Modules settings={s}/>
      {(s.nutrition || s.hydration) && <NutritionPreferencesForm settings={s}/>}
      <ThemeStudio settings={s}/>
      <article>
        <h2>{tr("Pausentimer")}</h2>
        <RestDuration value={s.rest} onSave={async (seconds) => {
            const updated = await db.settings.update("settings", { rest: seconds });
            if (!updated)
                throw new Error("Settings missing");
        }}/>
        <label>
          <input type="checkbox" checked={s.auto} onChange={(e) => db.settings.update("settings", { auto: e.target.checked })}/>{" "}{tr("Automatisch nach Satzabschluss starten")}</label>
        <p>{tr("Gewichtseinheit: kg. K\u00F6rpergewicht ohne Zusatzgewicht als 0 kg erfassen.")}</p>
      </article>
      <article>
        <h2>{tr("Daten & Backup")}</h2>
        <button className="primary" onClick={async () => {
            const blob = new Blob([JSON.stringify(await exportData(), null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `BASE-backup-${day()}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }}>{tr("JSON-Backup exportieren")}</button>
        <label className="button">{tr("JSON-Backup importieren")}<input type="file" accept="application/json,.json" onChange={async (e) => {
            try {
                const f = e.target.files?.[0];
                if (!f)
                    return;
                if (f.size > 200 * 1024 * 1024)
                    throw Error("Backup ist zu groß");
                const b = backupSchema.parse(JSON.parse(await f.text()));
                if (confirm(tr("{0} Trainings und {1} \u00DCbungen wiederherstellen? {2}", [b.workouts.length, b.exercises.length, b.schemaVersion === 1 ? "Trainings und Einstellungen werden ersetzt; Nutrition-Daten bleiben erhalten." : "Alle vorhandenen Daten einschließlich Nutrition werden ersetzt."]))) {
                    await restore(b);
                    alert(tr("Backup wiederhergestellt."));
                }
            }
            catch (err) {
                error(err);
            }
            finally {
                e.target.value = "";
            }
        }}/>
        </label>
        <p>{tr("Deine Daten bleiben auf diesem Ger\u00E4t. Gel\u00F6schte Browserdaten k\u00F6nnen nicht wiederhergestellt werden. Exportiere regelm\u00E4\u00DFig ein Backup.")}</p>
        <button onClick={async () => {
            if (confirm(tr("Alle Trainingsdaten, \u00DCbungen, Ern\u00E4hrungseintr\u00E4ge, Fotos und Einstellungen unwiderruflich l\u00F6schen?"))) {
                await db.transaction("rw", [db.workouts, db.exercises, db.settings, db.nutrition, db.foods, db.dayNotes], async () => {
                    await db.workouts.clear();
                    await db.exercises.clear();
                    await db.settings.clear();
                    await db.nutrition.clear();
                    await db.foods.clear();
                    await db.dayNotes.clear();
                });
                await init();
            }
        }}>{tr("Alle Daten l\u00F6schen")}</button>
      </article>
      <p>{tr("BASE. \u00B7 Minimal Performance")}<br />{tr("Auf dem iPhone: Safari \u2192 Teilen \u2192 Zum Home-Bildschirm.")}</p>
    </>);
}
init()
    .then(() => createRoot(document.getElementById("root")!).render(<React.StrictMode>
        <StartupBoundary><BrowserRouter>
          <App />
        </BrowserRouter></StartupBoundary>
      </React.StrictMode>))
    .catch((e: unknown) => {
    const status = document.getElementById("startup-status");
    if(status) status.textContent=tr("Start fehlgeschlagen ({0}). Deine Trainings bleiben gespeichert. Öffne die Starthilfe.",[e instanceof Error?e.name:tr("Unbekannt")]);
});
