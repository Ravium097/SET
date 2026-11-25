import { tr } from "../../i18n/runtime";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { t, germanError } from "../../i18n/de";
import { addExampleRoutine } from "../../services/onboarding";
export function Onboarding({ allowDismiss = true, }: {
    allowDismiss?: boolean;
}) {
    const [dismissed, setDismissed] = useState(() => {
        try {
            return localStorage.getItem("set-onboarding-seen") === "1";
        }
        catch {
            return false;
        }
    });
    const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
    const lock = useRef(false);
    const navigate = useNavigate();
    if (dismissed && allowDismiss)
        return null;
    return (<article className="onboarding">
      <h2>{t("onboardingTitle")}</h2>
      <p>{t("onboardingText")}</p>
      <button disabled={busy} className="primary" onClick={async () => {
            if (lock.current)
                return;
            lock.current = true;
            setBusy(true);
            try {
                const id = await addExampleRoutine();
                navigate(`/workout/${id}`);
            }
            catch (e) {
                setMessage(germanError(e));
            }
            finally {
                lock.current = false;
                setBusy(false);
            }
        }}>
        {busy ? tr("Vorlage wird geladen \u2026") : t("loadExample")}
      </button>
      {allowDismiss && (<button onClick={() => {
                setDismissed(true);
                try {
                    localStorage.setItem("set-onboarding-seen", "1");
                }
                catch {
                    /* Introduction can safely reappear next visit. */
                }
            }}>
          {t("dismiss")}
        </button>)}
      <small>{tr("3 \u00DCbungen \u00B7 je 2 leere S\u00E4tze \u00B7 Gewichte und Wiederholungen selbst festlegen")}</small>
      {message && <p role="status">{tr(message)}</p>}
    </article>);
}
