import type { SetRow } from "../data";
export function EffortFields({set, update}: {set:SetRow; update:(patch:Partial<SetRow>)=>void}) {
  if (set.type === "warmup") return null;
  return <details className="effort"><summary>Belastung · optional{set.rpe != null ? ` · RPE ${set.rpe}` : ""}{set.rir != null ? ` · RIR ${set.rir}` : ""}</summary>
    <div className="two">{(["rpe","rir"] as const).map(key => <label key={key}>{key.toUpperCase()} · {key === "rpe" ? "Anstrengung (1–10)" : "Wdh. übrig (0–10)"}<select value={set[key] ?? ""} onChange={e => update({[key]:e.target.value === "" ? null : Number(e.target.value)})}><option value="">Nicht erfasst</option>{Array.from({length:key === "rpe" ? 19 : 11},(_,i) => key === "rpe" ? 1+i/2 : i).map(n => <option key={n} value={n}>{n}</option>)}</select></label>)}</div>
  </details>;
}
