import { getLocale } from "../../i18n/runtime";
import { tr } from "../../i18n/runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { type NutritionEntry, type NutritionGoals } from "../../data";
import { nutrientTotal, nutrients } from "./service";
const labels = { kcal: "Kalorien", protein: "Eiweiß", carbs: "Kohlenhydrate", fat: "Fett" };
export function estimateNeeds(profile: NutritionGoals["profile"]): number | undefined {
    if (!profile)
        return;
    const { age, weight, height, coefficient, activity } = profile;
    if (age === undefined || weight === undefined || height === undefined || !coefficient || activity === undefined)
        return;
    if (!Number.isInteger(age) || age < 18 || age > 120 || !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(height) || height <= 0 || !Number.isFinite(activity) || activity < 1.2 || activity > 2.4)
        return;
    const basal = 10 * weight + 6.25 * height - 5 * age + (coefficient === "male" ? 5 : -161);
    const result = Math.round(basal * activity);
    return result > 0 ? result : undefined;
}
export function GoalsEditor({ value, onChange }: {
    value?: NutritionGoals;
    onChange: (value: NutritionGoals) => void;
}) {
    const goals = value ?? { enabled: false };
    const [message, M] = useState("");
    const profile = goals.profile ?? {};
    const estimate = estimateNeeds(profile);
    const setProfile = (patch: Partial<NonNullable<NutritionGoals["profile"]>>) => { M(""); onChange({ ...goals, profile: { ...profile, ...patch } }); };
    return <section id="nutrition-goals" className="nutrition-goals"><h3>{tr("Kalorien- und Makroziele")}</h3>
    <label><input type="checkbox" checked={goals.enabled} onChange={e => onChange({ ...goals, enabled: e.target.checked })}/>{tr(" Pers\u00F6nliche Ziele im Tagebuch anzeigen")}</label>
    <p>{tr("Frei w\u00E4hlbare Tageswerte. Leere Felder bedeuten kein Ziel. Deine Angaben bleiben lokal und sind im Backup enthalten.")}</p>
    <div className="nutrient-fields">{nutrients.map(k => <label key={k}>{tr(labels[k])}{tr(" pro Tag (")}{k === "kcal" ? tr("kcal") : tr("g")}{")"}<input type="number" inputMode="decimal" min={k === "kcal" ? 1 : 0} step="any" placeholder={tr("Kein Ziel")} value={goals[k] ?? ""} onChange={e => onChange({ ...goals, [k]: e.target.value === "" ? undefined : Number(e.target.value) })}/></label>)}</div>
    <details><summary>{tr("Kalorienbedarf sch\u00E4tzen \u00B7 optional")}</summary><p>{tr("Sch\u00E4tzt den t\u00E4glichen Energiebedarf zum Gewichtserhalt nach Mifflin\u2013St Jeor \u00D7 Aktivit\u00E4tsfaktor. Ein N\u00E4herungswert, kein gemessener Bedarf. Makroziele legst du selbst fest.")}</p>
      <div className="nutrient-fields">{([["age", "Alter (Jahre)"], ["weight", "Gewicht (kg)"], ["height", "Größe (cm)"]] as const).map(([key, label]) => <label key={key}>{tr(label)}<input type="number" min={key === "age" ? 18 : 1} max={key === "age" ? 120 : undefined} step={key === "age" ? 1 : "any"} value={profile[key] ?? ""} onChange={e => setProfile({ [key]: e.target.value === "" ? undefined : Number(e.target.value) })}/></label>)}
      <label>{tr("Formelparameter")}<select value={profile.coefficient ?? ""} onChange={e => setProfile({ coefficient: e.target.value ? e.target.value as "female" | "male" : undefined })}><option value="">{tr("Ausw\u00E4hlen")}</option><option value="female">{tr("Weiblich (\u2212161)")}</option><option value="male">{tr("M\u00E4nnlich (+5)")}</option></select></label></div>
      <label>{tr("Aktivit\u00E4tsfaktor")}<select value={profile.activity ?? ""} onChange={e => setProfile({ activity: e.target.value ? Number(e.target.value) : undefined })}><option value="">{tr("Ausw\u00E4hlen")}</option>{[[1.2, "Überwiegend sitzend"], [1.4, "Leicht aktiv"], [1.6, "Moderat aktiv"], [1.8, "Sehr aktiv"], [2, "Hohe tägliche Belastung"], [2.2, "Sehr hohe tägliche Belastung"]].map(([v, label]) => <option key={v} value={v}>{tr(label)}{" \u00B7 "}{v}</option>)}</select></label>
      <p aria-live="polite">{estimate === undefined ? tr("F\u00FCr die Sch\u00E4tzung alle Angaben ausf\u00FCllen (Alter 18\u2013120 Jahre).") : tr("Gesch\u00E4tzter Tagesbedarf: ca. {0} kcal.", [estimate.toLocaleString(getLocale())])}</p>
      <button disabled={estimate === undefined} onClick={() => { if (estimate !== undefined) {
        onChange({ ...goals, kcal: estimate, enabled: true });
        M("Schätzwert übernommen. Ernährungseinstellungen speichern, um ihn zu behalten.");
    } }}>{tr("Als Kalorienziel \u00FCbernehmen")}</button><p aria-live="polite">{tr(message)}</p>
    </details><p>{tr("Makroziele werden unabh\u00E4ngig gespeichert. Sie m\u00FCssen nicht automatisch dem Kalorienziel entsprechen.")}</p>
  </section>;
}
export function dailyNutrients(entries: NutritionEntry[], key: typeof nutrients[number]) {
    const values = entries.map(e => nutrientTotal(e, key));
    return { total: values.reduce<number>((sum, n) => sum + (n ?? 0), 0), complete: values.every(n => n !== undefined), known: values.filter(n => n !== undefined).length };
}
export function GoalsSummary({ goals, entries }: {
    goals?: NutritionGoals;
    entries: NutritionEntry[];
}) {
    if (!goals?.enabled)
        return <Link className="tile" to="/settings#nutrition-goals">{tr("Kalorien- und Makroziele einstellen")}</Link>;
    return <article className="goals-summary"><div className="row"><h2>{tr("Deine Tageswerte")}</h2><Link to="/settings#nutrition-goals">{tr("Ziele \u00E4ndern")}</Link></div><div className="goal-grid">{nutrients.map(k => {
            const { total, complete, known } = dailyNutrients(entries, k), target = goals[k], unit = k === "kcal" ? "kcal" : "g";
            return <div key={k}><small>{tr(labels[k])}</small><strong>{known || complete ? total.toLocaleString(getLocale(), { maximumFractionDigits: 1 }) : "\u2013"}{" "}<small>{unit}{tr(" erfasst")}</small></strong><span>{target === undefined ? tr("Kein Ziel") : tr("{0} {1} Tagesziel", [target.toLocaleString(getLocale()), unit])}</span>{!complete && <small>{tr("Angaben unvollst\u00E4ndig")}</small>}</div>;
        })}</div><p>{tr("Nur bekannte N\u00E4hrwerte werden addiert. Unbekannte Angaben bleiben offen.")}</p></article>;
}
