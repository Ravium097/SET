import { useRef, useState } from "react";
import { exerciseCatalog } from "../../catalog/exercises";
import { addExerciseCatalog } from "../../services/exerciseCatalog";
export function ExpandLibrary() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <details>
      <summary>Mehr Übungen & Geräte</summary>
      <p>
        {exerciseCatalog.length} gängige Kraftübungen und Varianten. Fehlende
        Einträge ergänzen; eigene Übungen und Favoriten bleiben erhalten.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          try {
            const count = await addExerciseCatalog();
            setMessage(
              count
                ? `${count} Übungen ergänzt. Jetzt auch offline verfügbar.`
                : "Alle Katalogübungen sind bereits vorhanden.",
            );
          } catch {
            setMessage(
              "Die Bibliothek konnte nicht gespeichert werden. Bitte erneut versuchen.",
            );
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {busy ? "Wird gespeichert …" : "Übungsbibliothek erweitern"}
      </button>
      <p role="status">{message}</p>
    </details>
  );
}
