import "./nutrition.css";
import { tr } from "../../i18n/runtime";
import { GoalsEditor } from "./Goals";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db, nutritionDefaults, nutritionPreferencesSchema, type Settings, type NutritionPreferences, } from "../../data";
import { localDay } from "./service";
export function NutritionPreferencesForm({ settings }: {
    settings: Settings;
}) {
    useEffect(() => { if (window.location.hash === "#nutrition-goals")
        document.getElementById("nutrition-goals")?.scrollIntoView({ block: "start" }); }, []);
    const [value, setValue] = useState<NutritionPreferences>(settings.nutritionPreferences ?? nutritionDefaults);
    const [categories, setCategories] = useState(value.categories.join("\n"));
    const [times, setTimes] = useState(value.reminderTimes.join(", "));
    const [message, setMessage] = useState("");
    useEffect(() => { const next = settings.nutritionPreferences ?? nutritionDefaults; setValue(next); setCategories(next.categories.join("\n")); setTimes(next.reminderTimes.join(", ")); }, [settings.nutritionPreferences]);
    async function save() {
        try {
            const parsed = nutritionPreferencesSchema.parse({
                ...value,
                categories: categories
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                reminderTimes: times
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
            });
            await db.settings.update("settings", { nutritionPreferences: parsed });
            setValue(parsed);
            setMessage("Ernährungseinstellungen gespeichert.");
        }
        catch {
            setMessage("Bitte Ziele und Körperangaben prüfen: Kalorien positiv, Makros nicht negativ, Alter 18–120 Jahre. Außerdem 1–12 eindeutige Kategorien (ohne „Getränke“), Uhrzeiten im Format HH:MM und eine Trinkmenge von 1–5000 ml angeben. Speichern fehlgeschlagen.");
        }
    }
    return (<article className="nutrition-preferences">
      <h2>{tr("Ern\u00E4hrungseinstellungen")}</h2>
      <p>{tr("Deine Auswahl bleibt auf diesem Ger\u00E4t und ist im JSON-Backup enthalten.")}</p>
      <label>
        <input type="checkbox" checked={value.showNutrients} onChange={(e) => setValue({ ...value, showNutrients: e.target.checked })}/>{" "}{tr("N\u00E4hrwertinformationen anzeigen")}</label>
      <p>{tr("Blendet vorhandene N\u00E4hrwertangaben und deine pers\u00F6nlichen Tageswerte ein oder aus.")}</p>
      <GoalsEditor value={value.goals} onChange={goals => setValue({ ...value, goals })}/>
      <details>
        <summary>{tr("Mahlzeitenkategorien")}</summary>
        <label>{tr("Kategorien \u2013 eine pro Zeile")}<textarea rows={5} value={categories.split("\n").map(category=>nutritionDefaults.categories.includes(category)?tr(category):category).join("\n")} onChange={(e) => setCategories(e.target.value.split("\n").map(category=>nutritionDefaults.categories.find(key=>tr(key)===category)??category).join("\n"))}/>
        </label>
        <p>{tr("Die Reihenfolge entspricht dem Tagebuch. Eintr\u00E4ge in entfernten oder umbenannten Kategorien bleiben unter ihrer bisherigen Kategorie sichtbar.")}</p>
      </details>
      <details>
        <summary>{tr("Erinnerungen")}</summary>
        <label>
          <input type="checkbox" checked={value.reminders} onChange={(e) => setValue({ ...value, reminders: e.target.checked })}/>{" "}{tr("An regelm\u00E4\u00DFige Mahlzeiten erinnern")}</label>
        <label>{tr("Uhrzeiten, durch Komma getrennt")}<input placeholder={"08:00, 12:00, 18:00"} value={times} onChange={(e) => setTimes(e.target.value)}/>
        </label>
        <p>{tr("Freiwillige Hinweise, nur bei ge\u00F6ffneter und sichtbarer App und aktiviertem Ern\u00E4hrungsmodul. Keine Hintergrundbenachrichtigungen bei geschlossener App.")}</p>
      </details>
      <details>
        <summary>{tr("Trinktagebuch")}</summary>
        <p>{tr("Das Trinkmodul l\u00E4sst sich unter Modules unabh\u00E4ngig aktivieren.")}</p>
        <label>{tr("Standardgetr\u00E4nk")}<input maxLength={60} value={value.drinkName} onChange={(e) => setValue({ ...value, drinkName: e.target.value })}/>
        </label>
        <label>{tr("Standardmenge in ml")}<input type="number" min={1} max={5000} value={value.drinkAmount} onChange={(e) => setValue({ ...value, drinkAmount: Number(e.target.value) })}/>
        </label>
        <label>
          <input type="checkbox" checked={value.showDrinkTotal} onChange={(e) => setValue({ ...value, showDrinkTotal: e.target.checked })}/>{" "}{tr("T\u00E4gliche Trinkmenge anzeigen")}</label>
      </details>
      <button className="primary" onClick={save}>{tr("Ern\u00E4hrungseinstellungen speichern")}</button>
      <p role="status">{tr(message)}</p>
    </article>);
}
export function MealReminders() {
    const settings = useLiveQuery(() => db.settings.get("settings"));
    const [notice, setNotice] = useState("");
    const enabled = !!settings?.nutrition && !!settings?.nutritionPreferences?.reminders;
    const times = settings?.nutritionPreferences?.reminderTimes.join(",") ?? "";
    useEffect(() => {
        setNotice("");
        if (!enabled)
            return;
        const check = () => {
            if (document.visibilityState !== "visible")
                return;
            const now = new Date();
            const time = now.toTimeString().slice(0, 5);
            if (!times.split(",").includes(time))
                return;
            const key = `SET-meal-reminder-${localDay()}-${time}`;
            try {
                if (localStorage.getItem(key))
                    return;
                localStorage.setItem(key, "1");
            }
            catch {
                return;
            }
            setNotice(time);
        };
        check();
        const timer = setInterval(check, 15000);
        document.addEventListener("visibilitychange", check);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", check);
        };
    }, [enabled, times]);
    if (!enabled || !notice)
        return null;
    return (<aside className="meal-reminder" role="status">
      <strong>{tr(notice)}{tr(" \u00B7 Deine Mahlzeitenerinnerung")}</strong>
      <p>{tr("Wenn es f\u00FCr dich passt, nimm dir Zeit f\u00FCr eine Mahlzeit.")}</p>
      <Link to="/nutrition" onClick={() => setNotice("")}>{tr("Zum Tagebuch")}</Link>
      <button onClick={() => setNotice("")}>{tr("Schlie\u00DFen")}</button>
    </aside>);
}
