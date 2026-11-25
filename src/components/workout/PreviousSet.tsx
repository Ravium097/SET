import { getLocale } from "../../i18n/runtime";
import { tr } from "../../i18n/runtime";
import type { SetRow } from "../../data";
export function PreviousSet({ previous, date, completed, onApply, }: {
    previous: SetRow | undefined;
    date: string;
    completed: boolean;
    onApply: (values: {
        weight: number | null;
        reps: number | null;
    }) => void;
}) {
    if (!previous?.completed || previous.reps === null)
        return null;
    const weight = previous.weight === null
        ? tr("ohne Gewichtsangabe")
        : `${previous.weight.toLocaleString(getLocale())} kg`;
    return (<div className="previous-set">
      <small>{tr("Zuletzt (")}{new Date(date+"T12:00:00").toLocaleDateString(getLocale())}{"): "}{weight}{" \u00D7"}{" "}
        {previous.reps}
      </small>
      <button disabled={completed} aria-label={tr("Letzte Satzwerte \u00FCbernehmen")} onClick={() => onApply({ weight: previous.weight, reps: previous.reps })}>{tr("\u00DCbernehmen")}</button>
    </div>);
}
