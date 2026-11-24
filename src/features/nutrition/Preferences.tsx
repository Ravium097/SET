import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import {
  db,
  nutritionDefaults,
  nutritionPreferencesSchema,
  type Settings,
  type NutritionPreferences,
} from "../../data";
import { localDay } from "./service";
export function NutritionPreferencesForm({ settings }: { settings: Settings }) {
  const [value, setValue] = useState<NutritionPreferences>(
    settings.nutritionPreferences ?? nutritionDefaults,
  );
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
    } catch {
      setMessage(
        "Bitte 1–12 eindeutige Kategorien (ohne „Getränke“), Uhrzeiten im Format HH:MM und eine Trinkmenge von 1–5000 ml angeben. Speichern fehlgeschlagen.",
      );
    }
  }
  return (
    <article className="nutrition-preferences">
      <h2>Ernährungseinstellungen</h2>
      <p>
        Deine Auswahl bleibt auf diesem Gerät und ist im JSON-Backup enthalten.
      </p>
      <label>
        <input
          type="checkbox"
          checked={value.showNutrients}
          onChange={(e) =>
            setValue({ ...value, showNutrients: e.target.checked })
          }
        />{" "}
        Nährwertinformationen anzeigen
      </label>
      <p>
        Blendet vorhandene Nährwertangaben ein oder aus. Es werden keine
        Kalorienziele berechnet.
      </p>
      <details>
        <summary>Mahlzeitenkategorien</summary>
        <label>
          Kategorien – eine pro Zeile
          <textarea
            rows={5}
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
          />
        </label>
        <p>
          Die Reihenfolge entspricht dem Tagebuch. Einträge in entfernten oder
          umbenannten Kategorien bleiben unter ihrer bisherigen Kategorie
          sichtbar.
        </p>
      </details>
      <details>
        <summary>Erinnerungen</summary>
        <label>
          <input
            type="checkbox"
            checked={value.reminders}
            onChange={(e) =>
              setValue({ ...value, reminders: e.target.checked })
            }
          />{" "}
          An regelmäßige Mahlzeiten erinnern
        </label>
        <label>
          Uhrzeiten, durch Komma getrennt
          <input
            placeholder="08:00, 12:00, 18:00"
            value={times}
            onChange={(e) => setTimes(e.target.value)}
          />
        </label>
        <p>
          Freiwillige Hinweise, nur bei geöffneter und sichtbarer App und
          aktiviertem Ernährungsmodul. Keine Hintergrundbenachrichtigungen bei
          geschlossener App.
        </p>
      </details>
      <details>
        <summary>Trinktagebuch</summary>
        <p>Das Trinkmodul lässt sich unter Modules unabhängig aktivieren.</p>
        <label>
          Standardgetränk
          <input
            maxLength={60}
            value={value.drinkName}
            onChange={(e) => setValue({ ...value, drinkName: e.target.value })}
          />
        </label>
        <label>
          Standardmenge in ml
          <input
            type="number"
            min={1}
            max={5000}
            value={value.drinkAmount}
            onChange={(e) =>
              setValue({ ...value, drinkAmount: Number(e.target.value) })
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.showDrinkTotal}
            onChange={(e) =>
              setValue({ ...value, showDrinkTotal: e.target.checked })
            }
          />{" "}
          Tägliche Trinkmenge anzeigen
        </label>
      </details>
      <button className="primary" onClick={save}>
        Ernährungseinstellungen speichern
      </button>
      <p role="status">{message}</p>
    </article>
  );
}
export function MealReminders() {
  const settings = useLiveQuery(() => db.settings.get("settings"));
  const [notice, setNotice] = useState("");
  const enabled =
    !!settings?.nutrition && !!settings?.nutritionPreferences?.reminders;
  const times = settings?.nutritionPreferences?.reminderTimes.join(",") ?? "";
  useEffect(() => {
    setNotice("");
    if (!enabled) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const now = new Date();
      const time = now.toTimeString().slice(0, 5);
      if (!times.split(",").includes(time)) return;
      const key = `SET-meal-reminder-${localDay()}-${time}`;
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
      } catch {
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
  if (!enabled || !notice) return null;
  return (
    <aside className="meal-reminder" role="status">
      <strong>{notice} · Deine Mahlzeitenerinnerung</strong>
      <p>Wenn es für dich passt, nimm dir Zeit für eine Mahlzeit.</p>
      <Link to="/nutrition" onClick={() => setNotice("")}>
        Zum Tagebuch
      </Link>
      <button onClick={() => setNotice("")}>Schließen</button>
    </aside>
  );
}
