import { tr } from "../../i18n/runtime";
import { useRef, useState } from "react";
import { exerciseCatalog } from "../../catalog/exercises";
import { addExerciseCatalog } from "../../services/exerciseCatalog";
export function ExpandLibrary() {
    const lock = useRef(false);
    const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
    return (<details>
      <summary>{tr("Mehr \u00DCbungen & Ger\u00E4te")}</summary>
      <p>
        {exerciseCatalog.length}{tr(" g\u00E4ngige Kraft\u00FCbungen und Varianten. Fehlende Eintr\u00E4ge erg\u00E4nzen; eigene \u00DCbungen und Favoriten bleiben erhalten.")}</p>
      <button disabled={busy} onClick={async () => {
            if (lock.current)
                return;
            lock.current = true;
            setBusy(true);
            try {
                const count = await addExerciseCatalog();
                setMessage(count
                    ? `${count} Übungen ergänzt. Jetzt auch offline verfügbar.`
                    : "Alle Katalogübungen sind bereits vorhanden.");
            }
            catch {
                setMessage("Die Bibliothek konnte nicht gespeichert werden. Bitte erneut versuchen.");
            }
            finally {
                lock.current = false;
                setBusy(false);
            }
        }}>
        {busy ? tr("Wird gespeichert \u2026") : tr("\u00DCbungsbibliothek erweitern")}
      </button>
      <p role="status">{tr(message)}</p>
    </details>);
}
