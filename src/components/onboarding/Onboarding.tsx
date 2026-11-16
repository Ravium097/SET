import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { t, germanError } from "../../i18n/de";
import { addExampleRoutine } from "../../services/onboarding";
export function Onboarding({
  allowDismiss = true,
}: {
  allowDismiss?: boolean;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("set-onboarding-seen") === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  const navigate = useNavigate();
  if (dismissed && allowDismiss) return null;
  return (
    <article className="onboarding">
      <h2>{t("onboardingTitle")}</h2>
      <p>{t("onboardingText")}</p>
      <button
        disabled={busy}
        className="primary"
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          try {
            const id = await addExampleRoutine();
            navigate(`/workout/${id}`);
          } catch (e) {
            setMessage(germanError(e));
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {busy ? "Vorlage wird geladen …" : t("loadExample")}
      </button>
      {allowDismiss && (
        <button
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem("set-onboarding-seen", "1");
            } catch {
              /* Introduction can safely reappear next visit. */
            }
          }}
        >
          {t("dismiss")}
        </button>
      )}
      <small>
        3 Übungen · je 2 leere Sätze · Gewichte und Wiederholungen selbst
        festlegen
      </small>
      {message && <p role="status">{message}</p>}
    </article>
  );
}
