import { useEffect, useRef, useState } from "react";
import { germanError } from "../../i18n/de";
export function RestDuration({
  value,
  onSave,
}: {
  value: number;
  onSave: (seconds: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const focused = useRef(false),
    dirty = useRef(false),
    saving = useRef(false);
  useEffect(() => {
    if (!focused.current && !dirty.current) setDraft(String(value));
  }, [value]);
  async function save() {
    if (!dirty.current || saving.current) return;
    const seconds = Number(draft);
    if (
      !/^\d+$/.test(draft) ||
      !Number.isInteger(seconds) ||
      seconds < 1 ||
      seconds > 3600
    ) {
      setMessage("Bitte eine ganze Zahl von 1 bis 3600 Sekunden eingeben.");
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      await onSave(seconds);
      dirty.current = false;
      setDraft(String(seconds));
      setMessage(`Pausenzeit gespeichert: ${seconds} Sekunden.`);
    } catch (e) {
      setMessage(germanError(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      <label>
        Standardpause · Sekunden
        <input
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          pattern="[0-9]*"
          value={draft}
          disabled={busy}
          aria-describedby="rest-duration-status"
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) {
              dirty.current = true;
              setDraft(e.target.value);
              setMessage("");
            }
          }}
          onBlur={() => {
            focused.current = false;
            void save();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      </label>
      <button disabled={busy} onClick={() => void save()}>
        {busy ? "Wird gespeichert …" : "Pausenzeit speichern"}
      </button>
      <small id="rest-duration-status" role="status">
        {message ||
          "1 bis 3600 Sekunden. Wird beim Verlassen des Feldes gespeichert."}
      </small>
    </div>
  );
}
