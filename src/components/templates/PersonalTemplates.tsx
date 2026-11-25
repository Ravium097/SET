import { tr } from "../../i18n/runtime";
import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data";
import { addPersonalTemplates, personalPlans, planId, } from "../../services/personalTemplates";
export function PersonalTemplates() {
    const existing = useLiveQuery(() => db.workouts.bulkGet(personalPlans.map((p) => planId(p.key))));
    const lock = useRef(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const complete = existing?.every(Boolean);
    return (<details className="personal-templates">
      <summary>{tr("Dr\u00FCck- und Zugtraining")}</summary>
      <p>{tr("Die Werte aus deinen Screenshots. Als bearbeitbare Vorlagen \u00FCbernehmen.")}</p>
      {personalPlans.map((plan) => (<details key={plan.key}>
          <summary>
            {tr(plan.name)}{" \u00B7 "}{plan.exercises.length}{tr(" \u00DCbungen \u00B7")}{" "}
            {plan.exercises.reduce((n, e) => n + e.sets.length, 0)}{tr(" S\u00E4tze")}</summary>
          <ol>
            {plan.exercises.map((e) => (<li key={tr(e.name)}>
                <strong>{tr(e.name)}</strong>
                <p>
                  {e.sets
                    .map(([w, r]) => `${w === null ? tr("Körpergewicht") : `${w} kg`} × ${r}`)
                    .join(" / ")}
                </p>
                {e.rest !== undefined && <p>{tr("Pause: ")}{e.rest}{tr(" Sekunden")}</p>}
                {e.notes && <p>{tr(e.notes)}</p>}
              </li>))}
          </ol>
        </details>))}
      <p>
        <small>{tr("BASE. unterst\u00FCtzt derzeit eine Pause pro \u00DCbung. Die abweichenden Satzpausen bei Tricep Pushdown und Bicep Curl bleiben in den \u00DCbungsnotizen erhalten. Bei fehlenden Pausen gilt deine Standardpause.")}</small>
      </p>
      <button disabled={busy || !existing || complete} onClick={async () => {
            if (lock.current)
                return;
            lock.current = true;
            setBusy(true);
            try {
                const n = await addPersonalTemplates();
                setMessage(n ? `${n} Vorlagen gespeichert.` : "Vorlagen bereits vorhanden.");
            }
            catch {
                setMessage("Speichern fehlgeschlagen. Bitte erneut versuchen.");
            }
            finally {
                lock.current = false;
                setBusy(false);
            }
        }}>
        {busy
            ? tr("Wird gespeichert \u2026") : complete
            ? tr("Vorlagen \u00FCbernommen") : tr("Dr\u00FCck- und Zugtraining speichern")}
      </button>
      <p role="status">{tr(message)}</p>
    </details>);
}
