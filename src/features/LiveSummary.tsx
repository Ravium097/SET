import { getLocale } from "../i18n/runtime";
import { tr } from "../i18n/runtime";
import { useEffect, useState } from "react";
import type { Workout } from "../data";
import { workoutSummary } from "./summary";
export function LiveSummary({ w }: {
    w: Workout;
}) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
    const s = workoutSummary(w, now);
    return <details className="live-summary" open><summary>{tr("Live-\u00DCbersicht \u00B7 ")}{s.progress}{"%"}</summary><div className="summary-values">
    <div><strong>{Math.floor(s.seconds / 60)}{":"}{String(s.seconds % 60).padStart(2, "0")}</strong><small>{tr("Dauer")}</small></div>
    <div><strong>{s.completed}{" / "}{s.planned}</strong><small>{tr("Arbeitss\u00E4tze")}</small></div>
    <div><strong>{s.volume.toLocaleString(getLocale())}{tr(" kg")}</strong><small>{tr("Volumen")}</small></div>
    </div><progress aria-label={tr("Abgeschlossene Arbeitss\u00E4tze")} max={Math.max(1, s.planned)} value={s.completed}/></details>;
}
