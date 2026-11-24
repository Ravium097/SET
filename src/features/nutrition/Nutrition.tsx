import { nutritionDefaults } from "../../data";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, Navigate } from "react-router-dom";
import {
  db,
  id,
  nutritionSchema,
  type NutritionEntry,
  type Food,
  type Settings,
} from "../../data";
import { localDay, searchFoods } from "./service";
export function Modules({ settings }: { settings: Settings }) {
  return (
    <article>
      <h2>Modules</h2>
      <p>
        Optional. Deine gespeicherten Daten bleiben beim Deaktivieren erhalten.
      </p>
      {(["nutrition", "hydration"] as const).map((key) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={!!settings[key]}
            onChange={(e) =>
              db.settings
                .update("settings", key === "nutrition" ? {nutrition:e.target.checked} : {hydration:e.target.checked})
                .catch(() =>
                  alert("Einstellung konnte nicht gespeichert werden."),
                )
            }
          />
          {key === "nutrition" ? " Ernährungstagebuch" : " Trinktagebuch"}
        </label>
      ))}
    </article>
  );
}
export function DailyOverview({ date = localDay() }: { date?: string }) {
  const settings = useLiveQuery(() => db.settings.get("settings"));
  const entries =
    useLiveQuery(
      () => db.nutrition.where("date").equals(date).toArray(),
      [date],
    ) ?? [];
  const workouts =
    useLiveQuery(
      () => db.workouts.where("date").equals(date).toArray(),
      [date],
    ) ?? [];
  const note = useLiveQuery(() => db.dayNotes.get(date), [date]);
  if (!settings?.nutrition && !settings?.hydration) return null;
  const timeline = [
    ...entries
      .filter((e) =>
        e.meal === "Getränke" ? settings.hydration : settings.nutrition,
      )
      .map((e) => ({ id: e.id, time: e.time, name: e.name, kind: e.meal })),
    ...workouts
      .filter((w) => w.status !== "template")
      .map((w) => ({
        id: w.id,
        time: w.started
          ? new Date(w.started).toTimeString().slice(0, 5)
          : "00:00",
        name: w.name,
        kind: "Training",
      })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <article>
      <div className="row">
        <h2>Dein Tag</h2>
        <Link to="/nutrition">Tagebuch →</Link>
      </div>
      {timeline.map((e) => (
        <p key={e.id}>
          <small>
            {e.time} · {e.kind}
          </small>
          <br />
          {e.name}
        </p>
      ))}
      {!timeline.length && <p>Noch keine Einträge.</p>}
      <label>
        Energie & Regeneration
        <textarea
          key={date + String(note?.notes)}
          defaultValue={note?.notes ?? ""}
          placeholder="Optionale Tagesnotiz"
          onBlur={(e) =>
            db.dayNotes
              .put({ id: date, notes: e.target.value })
              .catch(() => alert("Notiz konnte nicht gespeichert werden."))
          }
        />
      </label>
    </article>
  );
}
function Scanner({
  onCode,
  onClose,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    import("@zxing/browser")
      .then(async ({ BrowserMultiFormatReader }) => {
        const controls =
          await new BrowserMultiFormatReader().decodeFromConstraints(
            { video: { facingMode: "environment" }, audio: false },
            video.current!,
            (result) => {
              if (result && !disposed) {
                disposed = true;
                stop?.();
                onCode(result.getText());
              }
            },
          );
        stop = () => controls.stop();
        if (disposed) stop();
      })
      .catch(() =>
        setError("Kamera nicht verfügbar. Barcode bitte manuell eingeben."),
      );
    return () => {
      disposed = true;
      stop?.();
    };
  }, []);
  return (
    <article>
      <video ref={video} autoPlay muted playsInline style={{ width: "100%" }} />
      <p role="status">{error || "Barcode in die Kamera halten"}</p>
      <button onClick={onClose}>Scanner schließen</button>
    </article>
  );
}
export function Nutrition() {
  const settings = useLiveQuery(() => db.settings.get("settings"));
  const preferences = settings?.nutritionPreferences ?? nutritionDefaults;
  const [date, setDate] = useState(localDay());
  const [view, setView] = useState("Tag");
  const editor = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [message, setMessage] = useState("");
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const all = useLiveQuery(() => db.nutrition.toArray()) ?? [];
  const foods = useLiveQuery(() => db.foods.toArray()) ?? [];
  const fresh = (): NutritionEntry => ({
    id: id(),
    date,
    time: new Date().toTimeString().slice(0, 5),
    name: settings?.nutrition ? "" : preferences.drinkName,
    meal: settings?.nutrition ? preferences.categories[0] : "Getränke",
    amount: settings?.nutrition ? 100 : preferences.drinkAmount,
    unit: settings?.nutrition ? "g" : "ml",
    notes: "",
  });
  const [draft, setDraft] = useState<NutritionEntry | null>(null);
  useEffect(() => {
    if (draft) {
      editor.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      editor.current?.focus({ preventScroll: true });
    }
  }, [draft?.id]);
  const allowed = (e: NutritionEntry) =>
    e.meal === "Getränke" ? settings?.hydration : settings?.nutrition;
  async function search(q: string) {
    setBusy(true);
    setMessage("");
    try {
      setResults(await searchFoods(q));
    } catch (e) {
      setMessage(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    try {
      if (!draft) return;
      await db.nutrition.put(nutritionSchema.parse(draft));
      setDraft(null);
      setMessage("Gespeichert.");
    } catch {
      setMessage(
        "Bitte Name und eine gültige positive Menge angeben. Speichern fehlgeschlagen.",
      );
    }
  }
  async function photo(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      setMessage("Foto bitte kleiner als 8 MB wählen.");
      return;
    }
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      setDraft((d) => (d ? { ...d, photo: url } : d));
    } catch {
      setMessage("Foto konnte nicht geladen werden.");
    }
  }
  if (!settings) return <p>Laden …</p>;
  if (!settings.nutrition && !settings.hydration)
    return <Navigate to="/settings" replace />;
  const daily = all.filter((e) => e.date === date && allowed(e));
  const history = all
    .filter(
      (e) => allowed(e) && e.name.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const frequencies = new Map<string, number>();
  for (const e of history)
    frequencies.set(e.name, (frequencies.get(e.name) ?? 0) + 1);
  const frequent = [...new Map(history.map((e) => [e.name, e])).values()]
    .sort(
      (a, b) => (frequencies.get(b.name) ?? 0) - (frequencies.get(a.name) ?? 0),
    )
    .slice(0, 8);
  return (
    <>
      <p className="eyebrow">SET / DAILY</p>
      <h1>Dein Tagebuch.</h1>
      <Link className="diary-settings-link" to="/settings">
        Ernährungseinstellungen →
      </Link>
      <label>
        Tag
        <input
          type="date"
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </label>
      <div className="diary-switch" role="group" aria-label="Tagebuchansicht">
        {["Tag", "Sammlung", "Historie"].map((tab) => (
          <button
            key={tab}
            aria-pressed={view === tab}
            onClick={() => {
              setView(tab);
              setScan(false);
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <button className="primary" onClick={() => setDraft(fresh())}>
        Eintrag hinzufügen
      </button>
      <p role="status">{message}</p>
      {draft && (
        <article ref={editor} tabIndex={-1} className="diary-editor">
          <h2>
            {all.some((e) => e.id === draft.id)
              ? "Eintrag bearbeiten"
              : "Neuer Eintrag"}
          </h2>
          <label>
            Uhrzeit
            <input
              type="time"
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            />
          </label>
          <label>
            Mahlzeit
            <select
              value={draft.meal}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  meal: e.target.value as NutritionEntry["meal"],
                })
              }
            >
              {[
                ...new Set([
                  ...preferences.categories,
                  ...(draft ? [draft.meal] : []),
                  "Getränke",
                ]),
              ]
                .filter((m) =>
                  m === "Getränke" ? settings.hydration : settings.nutrition,
                )
                .map((m) => (
                  <option key={m}>{m}</option>
                ))}
            </select>
          </label>
          <label>
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Menge
            <input
              type="number"
              min="0.1"
              step="any"
              value={draft.amount}
              onChange={(e) =>
                setDraft({ ...draft, amount: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Einheit
            <select
              value={draft.unit}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  unit: e.target.value as NutritionEntry["unit"],
                })
              }
            >
              {["g", "ml", "Portion"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label>
            Notizen / Rezeptzutaten
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          <label>
            Mahlzeitenfoto
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) void photo(e.target.files[0]);
              }}
            />
          </label>
          {draft.photo && (
            <>
              <img className="meal-photo" src={draft.photo} alt="Mahlzeit" />
              <button onClick={() => setDraft({ ...draft, photo: undefined })}>
                Foto entfernen
              </button>
            </>
          )}
          <button className="primary" onClick={save}>
            Speichern
          </button>
          <button onClick={() => setDraft(null)}>Abbrechen</button>
          {(["food", "recipe", "drink"] as const)
            .filter((k) =>
              draft.meal === "Getränke" ? k === "drink" : k !== "drink",
            )
            .map((kind) => (
              <button
                key={kind}
                onClick={async () => {
                  if (!draft.name.trim()) return;
                  try {
                    await db.foods.put({
                      id: id(),
                      name: draft.name,
                      kind,
                      notes: draft.notes,
                    });
                    setMessage("In deiner Sammlung gespeichert.");
                  } catch {
                    setMessage("Speichern fehlgeschlagen.");
                  }
                }}
              >
                {kind === "recipe"
                  ? "Als Rezept speichern"
                  : kind === "drink"
                    ? "Getränk merken"
                    : "Lebensmittel merken"}
              </button>
            ))}
        </article>
      )}
      {view === "Tag" && (
        <section aria-label="Mahlzeiten">
          {[
            ...new Set([
              ...preferences.categories,
              ...daily.map((e) => e.meal),
              "Getränke",
            ]),
          ]
            .filter((m) =>
              m === "Getränke" ? settings.hydration : settings.nutrition,
            )
            .map((meal) => (
              <article key={meal} className="diary-meal">
                <div className="row">
                  <h2>{meal}</h2>
                  <button
                    aria-label={`${meal} hinzufügen`}
                    onClick={() =>
                      setDraft({
                        ...fresh(),
                        meal: meal as NutritionEntry["meal"],
                        unit: meal === "Getränke" ? "ml" : "g",
                        amount:
                          meal === "Getränke" ? preferences.drinkAmount : 100,
                        name: meal === "Getränke" ? preferences.drinkName : "",
                      })
                    }
                  >
                    +
                  </button>
                </div>
                {!daily.some((e) => e.meal === meal) && (
                  <p className="diary-empty">Noch kein Eintrag</p>
                )}
                {meal === "Getränke" && preferences.showDrinkTotal && (
                  <p>
                    {daily
                      .filter((e) => e.meal === meal && e.unit === "ml")
                      .reduce((s, e) => s + e.amount, 0)}{" "}
                    ml erfasst
                  </p>
                )}
                {daily
                  .filter((e) => e.meal === meal)
                  .map((e) => (
                    <div className="diary-entry" key={e.id}>
                      <strong>
                        {e.time} · {e.name}
                      </strong>
                      <p>
                        {e.amount} {e.unit}
                        {preferences.showNutrients &&
                        e.kcal !== undefined &&
                        e.unit !== "Portion"
                          ? ` · ${Math.round((e.kcal * e.amount) / 100)} kcal`
                          : ""}
                      </p>
                      {e.notes && <p>{e.notes}</p>}
                      {e.photo && (
                        <img
                          className="meal-photo"
                          src={e.photo}
                          alt={e.name}
                        />
                      )}
                      <button onClick={() => setDraft(e)}>Bearbeiten</button>
                      <button
                        onClick={async () => {
                          if (confirm("Eintrag löschen?"))
                            try {
                              await db.nutrition.delete(e.id);
                            } catch {
                              setMessage("Löschen fehlgeschlagen.");
                            }
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
              </article>
            ))}
          <details className="diary-details">
            <summary>Tagesverlauf & Regeneration</summary>
            <DailyOverview date={date} />
          </details>
        </section>
      )}
      {view === "Sammlung" && (
        <section aria-label="Sammlung">
          <article>
            <h2>Lebensmittel suchen</h2>
            <label>
              Name oder Barcode
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button
              disabled={busy || !query.trim()}
              onClick={() => search(query)}
            >
              {busy ? "Suche …" : "Open Food Facts durchsuchen"}
            </button>
            <button onClick={() => setScan(true)}>Barcode scannen</button>
            <p>
              Suche sendet den Suchbegriff an Open Food Facts. Ergebnisse
              bleiben offline verfügbar. Angaben können unvollständig sein.
            </p>
            {scan && (
              <Scanner
                onClose={() => setScan(false)}
                onCode={(code) => {
                  setScan(false);
                  setQuery(code);
                  void search(code);
                }}
              />
            )}
            {results.map((f) => (
              <button
                key={f.id}
                onClick={() =>
                  setDraft({
                    ...fresh(),
                    name: f.name,
                    kcal: f.kcal,
                    notes: f.notes,
                  })
                }
              >
                {f.name}
              </button>
            ))}
          </article>
          <article>
            <h2>Eigene Lebensmittel & Rezepte</h2>
            {foods
              .filter(
                (f) =>
                  f.kind !== "cache" &&
                  (f.kind === "drink"
                    ? settings.hydration
                    : settings.nutrition) &&
                  f.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    setDraft({
                      ...fresh(),
                      name: f.name,
                      notes: f.notes,
                      meal: f.kind === "drink" ? "Getränke" : fresh().meal,
                      unit: f.kind === "drink" ? "ml" : "Portion",
                      amount: f.kind === "drink" ? preferences.drinkAmount : 1,
                    })
                  }
                >
                  {f.name} ·{" "}
                  {f.kind === "recipe"
                    ? "Rezept"
                    : f.kind === "drink"
                      ? "Getränk"
                      : "Lebensmittel"}
                </button>
              ))}
          </article>
          <article>
            <h2>Häufig verwendet</h2>
            {frequent.map((e) => (
              <button
                key={e.id}
                onClick={() =>
                  setDraft({
                    ...e,
                    id: id(),
                    date,
                    time: new Date().toTimeString().slice(0, 5),
                  })
                }
              >
                {e.name} erneut hinzufügen
              </button>
            ))}
          </article>
        </section>
      )}
      {view === "Historie" && (
        <article>
          <h2>Mahlzeitenhistorie</h2>
          <label>
            Historie durchsuchen
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {!history.length && <p>Noch keine passenden Einträge.</p>}
          {history.slice(0, 100).map((e) => (
            <p key={e.id}>
              {e.date} · {e.time} · {e.name}
            </p>
          ))}
        </article>
      )}
    </>
  );
}
