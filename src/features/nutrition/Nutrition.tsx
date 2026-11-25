import { formatDay } from "../../i18n/runtime";
import { tr } from "../../i18n/runtime";
import { GoalsSummary } from "./Goals";
import "./nutrition.css";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { FoodPicker, NutrientFields } from "./FoodPicker";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { DateField } from "../../components/ui/DateField";
import { nutritionDefaults } from "../../data";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, Navigate } from "react-router-dom";
import { db, id, type NutritionEntry, type Food, type Settings, } from "../../data";
import { localDay, findFoods, isBarcode, foodToEntry, nutrientTotal, nutrients, saveDiaryEntry, saveFood, sourceLabel } from "./service";
export function Modules({ settings }: {
    settings: Settings;
}) {
    return (<article>
      <h2>{tr("Modules")}</h2>
      <p>{tr("Optional. Deine gespeicherten Daten bleiben beim Deaktivieren erhalten.")}</p>
      {(["nutrition", "hydration"] as const).map((key) => (<label key={key}>
          <input type="checkbox" checked={!!settings[key]} onChange={(e) => db.settings
                .update("settings", key === "nutrition" ? { nutrition: e.target.checked } : { hydration: e.target.checked })
                .catch(() => alert(tr("Einstellung konnte nicht gespeichert werden.")))}/>
          {key === "nutrition" ? tr(" Ern\u00E4hrungstagebuch") : tr(" Trinktagebuch")}
        </label>))}
    </article>);
}
export function DailyOverview({ date = localDay() }: {
    date?: string;
}) {
    const settings = useLiveQuery(() => db.settings.get("settings"));
    const entries = useLiveQuery(() => db.nutrition.where("date").equals(date).toArray(), [date]) ?? [];
    const workouts = useLiveQuery(() => db.workouts.where("date").equals(date).toArray(), [date]) ?? [];
    const note = useLiveQuery(() => db.dayNotes.get(date), [date]);
    if (!settings?.nutrition && !settings?.hydration)
        return null;
    const timeline = [
        ...entries
            .filter((e) => e.meal === "Getränke" ? settings.hydration : settings.nutrition)
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
    return (<article>
      <div className="row">
        <h2>{tr("Dein Tag")}</h2>
        <Link to="/nutrition">{tr("Tagebuch \u2192")}</Link>
      </div>
      {timeline.map((e) => (<p key={e.id}>
          <small>
            {e.time}{" \u00B7 "}{tr(e.kind)}
          </small>
          <br />
          {e.name}
        </p>))}
      {!timeline.length && <p>{tr("Noch keine Eintr\u00E4ge.")}</p>}
      <label>{tr("Energie & Regeneration")}<textarea key={date + String(note?.notes)} defaultValue={note?.notes ?? ""} placeholder={tr("Optionale Tagesnotiz")} onBlur={(e) => db.dayNotes
            .put({ id: date, notes: e.target.value })
            .catch(() => alert(tr("Notiz konnte nicht gespeichert werden.")))}/>
      </label>
    </article>);
}
export function Scanner({ onCode, onClose, }: {
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
            const controls = await new BrowserMultiFormatReader().decodeFromConstraints({ video: { facingMode: "environment" }, audio: false }, video.current!, (result) => {
                if (result && !disposed) {
                    disposed = true;
                    stop?.();
                    onCode(result.getText());
                }
            });
            stop = () => controls.stop();
            if (disposed)
                stop();
        })
            .catch(() => setError("Kamera nicht verfügbar. Barcode bitte manuell eingeben."));
        return () => {
            disposed = true;
            stop?.();
        };
    }, []);
    return (<article>
      <video ref={video} autoPlay muted playsInline style={{ width: "100%" }}/>
      <p role="status">{tr(error) || tr("Barcode in die Kamera halten")}</p>
      <button onClick={onClose}>{tr("Scanner schlie\u00DFen")}</button>
    </article>);
}
export function Nutrition() {
    const settings = useLiveQuery(() => db.settings.get("settings"));
    const preferences = settings?.nutritionPreferences ?? nutritionDefaults;
    const [date, setDate] = useState(localDay());
    const [view, setView] = useState("Tag");
    const [inputMode, setInputMode] = useState(false);
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState("");
    const [scan, setScan] = useState(false);
    const [busy, setBusy] = useState(false);
    const scanRequest = useRef(0);
    useEffect(() => () => { scanRequest.current++; }, []);
    const closeEditor = () => { scanRequest.current++; setDraft(null); setScan(false); setBusy(false); };
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
    const allowed = (e: NutritionEntry) => e.meal === "Getränke" ? settings?.hydration : settings?.nutrition;
    const choose = (food: Food, comparable = false) => {
        setDraft(foodToEntry(food, draft ?? fresh(), comparable));
        setInputMode(true);
        setScan(false);
    };
    const manual = (q = "") => {
        const base = draft ?? fresh();
        setDraft({ ...fresh(), date: base.date, meal: base.meal, name: isBarcode(q) ? "" : q, source: "manual", barcode: isBarcode(q) ? q : undefined });
        setInputMode(true);
        setScan(false);
    };
    async function scanned(code: string) {
        const request = ++scanRequest.current;
        setScan(false);
        setBusy(true);
        setMessage("");
        try {
            const result = await findFoods(code);
            if (request !== scanRequest.current)
                return;
            const found = result.foods.find(f => f.id === code || f.barcode === code);
            if (found)
                choose(found);
            else {
                manual(code);
                setMessage(result.limited ? "Die Datenbank pausiert kurz. Du kannst das Produkt mit dem Barcode manuell speichern." : result.offline ? "Offline nicht gespeichert. Produkt manuell mit diesem Barcode anlegen." : "Barcode nicht gefunden. Produkt manuell anlegen; die Zuordnung bleibt lokal gespeichert.");
            }
        }
        catch {
            setMessage("Barcode konnte nicht nachgeschlagen werden. Bitte erneut versuchen.");
        }
        finally {
            if (request === scanRequest.current)
                setBusy(false);
        }
    }
    async function save() {
        try {
            if (!draft)
                return;
            await saveDiaryEntry(draft);
            setDraft(null);
            setMessage("Gespeichert.");
        }
        catch {
            setMessage("Bitte Name und eine gültige positive Menge angeben. Speichern fehlgeschlagen.");
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
        }
        catch {
            setMessage("Foto konnte nicht geladen werden.");
        }
    }
    if (!settings)
        return <p>{tr("Laden \u2026")}</p>;
    if (!settings.nutrition && !settings.hydration)
        return <Navigate to="/settings" replace/>;
    const daily = all.filter((e) => e.date === date && allowed(e));
    const history = all
        .filter((e) => allowed(e) && e.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.date.localeCompare(a.date));
    return (<>
      <p className="eyebrow">{tr("BASE. / DAILY")}</p>
      <h1>{tr("Dein Tagebuch.")}</h1>
      <Link className="diary-settings-link" to="/settings">{tr("Ern\u00E4hrungseinstellungen \u2192")}</Link>
      <label>{tr("Tag")}<DateField value={date} onChange={value => { if (value)
        setDate(value); }}/>
      </label>
      <div className="diary-switch" role="group" aria-label={tr("Tagebuchansicht")}>
        {["Tag", "Sammlung", "Historie"].map((tab) => (<button key={tr(tab)} aria-pressed={view === tab} onClick={() => {
                setView(tab);
                setScan(false);
            }}>
            {tr(tab)}
          </button>))}
      </div>
      <p role="status">{tr(message)}</p>
      {draft && (<BottomSheet title={all.some(e => e.id === draft.id) ? tr("Eintrag bearbeiten") : tr("Lebensmittel hinzuf\u00FCgen")} onClose={() => { closeEditor(); setMessage(""); }}>
          <p role="status">{tr(message)}</p>
          {busy && <p role="status">{tr("Barcode wird nachgeschlagen \u2026")}</p>}
          {scan ? <Scanner onClose={() => setScan(false)} onCode={code => { void scanned(code); }}/> : !inputMode ? <FoodPicker showNutrients={preferences.showNutrients} hydrationOnly={!settings.nutrition} onPick={choose} onManual={manual} onScan={() => setScan(true)} onRecent={e => { setDraft({ ...e, id: id(), date, time: new Date().toTimeString().slice(0, 5) }); setInputMode(true); }}/> : <div className="diary-editor">
          <button onClick={() => setInputMode(false)}>{tr("Lebensmittel ausw\u00E4hlen")}</button>
          <p className="food-hint">{tr(sourceLabel(draft))}{draft.sourceName ? tr(" \u00B7 {0}", [draft.sourceName]) : ""}{draft.source === "comparable" ? tr(" \u00B7 Vergleichseintrag, Produktangaben bitte pr\u00FCfen.") : ""}</p>
          {draft.barcode && <p className="food-hint">{tr("Barcode: ")}{draft.barcode}{tr(" \u00B7 Zuordnung wird lokal gespeichert.")}</p>}
          <label>{tr("Uhrzeit")}<input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })}/>
          </label>
          <label>{tr("Mahlzeit")}<select value={draft.meal} onChange={(e) => setDraft({
                    ...draft,
                    meal: e.target.value as NutritionEntry["meal"],
                })}>
              {[
                    ...new Set([
                        ...preferences.categories,
                        ...(draft ? [draft.meal] : []),
                        "Getränke",
                    ]),
                ]
                    .filter((m) => m === "Getränke" ? settings.hydration : settings.nutrition)
                    .map((m) => (<option key={m} value={m}>{tr(m)}</option>))}
            </select>
          </label>
          <label>{tr("Name")}<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, source: "manual" })}/>
          </label>
          <label>{tr("Menge")}<input type="number" min="0.1" step="any" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}/>
          </label>
          <label>{tr("Einheit")}<select value={draft.unit} onChange={(e) => setDraft({
                    ...draft,
                    unit: e.target.value as NutritionEntry["unit"],
                })}>
              {["g", "ml", "Portion"].map((u) => (<option key={u} value={u}>{tr(u)}</option>))}
            </select>
          </label>
          {preferences.showNutrients && <details><summary>{tr("N\u00E4hrwerte \u00B7 optional")}</summary>
          <label>{tr("N\u00E4hrwertbezug")}<select value={draft.nutrientBasis ?? "100"} onChange={e => setDraft({ ...draft, nutrientBasis: e.target.value as "100" | "portion", source: "manual" })}><option value="100">{tr("Je 100 g/ml")}</option><option value="portion">{tr("Je Portion")}</option></select></label>
          <p>{tr("Leere Felder bleiben unbekannt. Manuelle Korrekturen werden als solche gekennzeichnet.")}</p><NutrientFields value={draft} onChange={(key, value) => setDraft({ ...draft, [key]: value, source: "manual" })}/></details>}

          <label>{tr("Notizen / Rezeptzutaten")}<textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}/>
          </label>
          <label>{tr("Mahlzeitenfoto")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                    if (e.target.files?.[0])
                        void photo(e.target.files[0]);
                }}/>
          </label>
          {draft.photo && (<>
              <img className="meal-photo" src={draft.photo} alt={tr("Mahlzeit")}/>
              <button onClick={() => setDraft({ ...draft, photo: undefined })}>{tr("Foto entfernen")}</button>
            </>)}
          <button className="primary" onClick={save}>{tr("Speichern")}</button>
          <button onClick={closeEditor}>{tr("Abbrechen")}</button>
          <button onClick={async () => {
                    try {
                        const saved = await saveFood({ id: foods.find(f => f.id === draft.foodId)?.kind === "recipe" ? id() : draft.foodId ?? id(), name: draft.name.trim(), kind: draft.meal === "Getränke" ? "drink" : "food", notes: draft.notes, barcode: draft.barcode, source: draft.source === "comparable" ? "comparable" : "manual", sourceName: draft.sourceName, nutrientBasis: draft.nutrientBasis, ...Object.fromEntries(nutrients.map(k => [k, draft[k]])) });
                        setDraft({ ...draft, foodId: saved.id });
                        setMessage("In deiner Sammlung gespeichert.");
                    }
                    catch {
                        setMessage("Bitte einen Namen und gültige Nährwerte angeben. Speichern fehlgeschlagen.");
                    }
                }}>{tr("Als eigenes Lebensmittel speichern")}</button>
          </div>}
        </BottomSheet>)}

      {view === "Tag" && (<section aria-label={tr("Mahlzeiten")}>
          {settings.nutrition && preferences.showNutrients && <GoalsSummary goals={preferences.goals} entries={daily}/>}
          {[
                ...new Set([
                    ...preferences.categories,
                    ...daily.map((e) => e.meal),
                    "Getränke",
                ]),
            ]
                .filter((m) => m === "Getränke" ? settings.hydration : settings.nutrition)
                .map((meal) => (<article key={meal} className="diary-meal">
                <div className="row">
                  <h2>{tr(meal)}</h2>
                  <button aria-label={tr("{0} hinzuf\u00FCgen", [tr(meal)])} onClick={() => {
                    setInputMode(false);
                    setMessage("");
                    setDraft({
                        ...fresh(),
                        meal: meal as NutritionEntry["meal"],
                        unit: meal === "Getränke" ? "ml" : "g",
                        amount: meal === "Getränke" ? preferences.drinkAmount : 100,
                        name: meal === "Getränke" ? preferences.drinkName : "",
                    });
                }}>{"+"}</button>
                </div>
                {!daily.some((e) => e.meal === meal) && (<p className="diary-empty">{tr("Noch kein Eintrag")}</p>)}
                {preferences.showNutrients && daily.some(e => e.meal === meal) && <p className="meal-nutrients">{([['kcal', 'kcal'], ['protein', 'g Eiweiß'], ['carbs', 'g Kohlenhydrate'], ['fat', 'g Fett']] as const).map(([key, label]) => { const rows = daily.filter(e => e.meal === meal); const complete = rows.every(e => nutrientTotal(e, key) !== undefined); return `${complete ? Math.round(rows.reduce((sum, e) => sum + nutrientTotal(e, key)!, 0)) : '–'} ${label}`; }).join(' · ')}<small>{tr("\u2013 = Angaben fehlen oder Portionsgr\u00F6\u00DFe unbekannt")}</small></p>}
                {meal === "Getränke" && preferences.showDrinkTotal && (<p>
                    {daily
                        .filter((e) => e.meal === meal && e.unit === "ml")
                        .reduce((s, e) => s + e.amount, 0)}{" "}{tr("ml erfasst")}</p>)}
                {daily
                    .filter((e) => e.meal === meal)
                    .map((e) => (<div className="diary-entry" key={e.id}>
                      <strong>
                        {e.time}{" \u00B7 "}{e.name}
                      </strong>
                      <p>
                        {e.amount}{" "}{e.unit === "Portion" && e.amount !== 1 ? tr("Portionen") : tr(e.unit)}
                        {preferences.showNutrients &&
                        nutrientTotal(e, "kcal") !== undefined
                        ? tr(" \u00B7 {0} kcal", [Math.round(nutrientTotal(e, "kcal")!)]) : ""}
                      </p>
                      <small>{tr(sourceLabel(e))}</small>
                      {e.notes && <p>{e.notes}</p>}
                      {e.photo && (<img className="meal-photo" src={e.photo} alt={e.name}/>)}
                      <ActionMenu label={tr("Optionen f\u00FCr {0}", [e.name])}><button onClick={() => { setDraft(e); setInputMode(true); setMessage(""); }}>{tr("Bearbeiten")}</button>
                      <button onClick={async () => {
                        if (confirm(tr("Eintrag l\u00F6schen?")))
                            try {
                                await db.nutrition.delete(e.id);
                            }
                            catch {
                                setMessage("Löschen fehlgeschlagen.");
                            }
                    }}>{tr("L\u00F6schen")}</button></ActionMenu>
                    </div>))}
              </article>))}
          <details className="diary-details">
            <summary>{tr("Tagesverlauf & Regeneration")}</summary>
            <DailyOverview date={date}/>
          </details>
        </section>)}
      {view === "Sammlung" && <section aria-label={tr("Sammlung")}><article><h2>{tr("Deine Lebensmittelsammlung")}</h2><p>{foods.filter(f => f.favorite).length}{tr(" Favoriten \u00B7 ")}{foods.filter(f => f.kind === "recipe").length}{tr(" Rezepte")}</p><button className="primary" onClick={() => { setDraft(fresh()); setInputMode(false); setMessage(""); }}>{tr("Lebensmittel suchen & Sammlung \u00F6ffnen")}</button><p>{tr("Favoriten, zuletzt verwendete Lebensmittel, eigene Lebensmittel und Rezepte sind lokal verf\u00FCgbar.")}</p></article></section>}
      {view === "Historie" && (<article>
          <h2>{tr("Mahlzeitenhistorie")}</h2>
          <label>{tr("Historie durchsuchen")}<input value={query} onChange={(e) => setQuery(e.target.value)}/>
          </label>
          {!history.length && <p>{tr("Noch keine passenden Eintr\u00E4ge.")}</p>}
          {history.slice(0, 100).map((e) => (<p key={e.id}>
              {formatDay(e.date)}{" \u00B7 "}{e.time}{" \u00B7 "}{e.name}
            </p>))}
        </article>)}
    </>);
}
