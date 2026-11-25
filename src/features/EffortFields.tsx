import { tr } from "../i18n/runtime";
import type { SetRow } from "../data";
export function EffortFields({ set, update }: {
    set: SetRow;
    update: (patch: Partial<SetRow>) => void;
}) {
    if (set.type === "warmup")
        return null;
    return <details className="effort"><summary>{tr("Belastung \u00B7 optional")}{set.rpe != null ? tr(" \u00B7 RPE {0}", [set.rpe]) : ""}{set.rir != null ? tr(" \u00B7 RIR {0}", [set.rir]) : ""}</summary>
    <div className="two">{(["rpe", "rir"] as const).map(key => <label key={key}>{key.toUpperCase()}{" \u00B7 "}{key === "rpe" ? tr("Anstrengung (1\u201310)") : tr("Wdh. \u00FCbrig (0\u201310)")}<select value={set[key] ?? ""} onChange={e => update({ [key]: e.target.value === "" ? null : Number(e.target.value) })}><option value="">{tr("Nicht erfasst")}</option>{Array.from({ length: key === "rpe" ? 19 : 11 }, (_, i) => key === "rpe" ? 1 + i / 2 : i).map(n => <option key={n} value={n}>{n}</option>)}</select></label>)}</div>
  </details>;
}
