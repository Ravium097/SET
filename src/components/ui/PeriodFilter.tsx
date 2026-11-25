import { tr } from "../../i18n/runtime";
export function PeriodFilter({ value, onChange }: {
    value: string;
    onChange: (value: string) => void;
}) {
    return <label>{tr("Zeitraum")}<select aria-label={tr("Zeitraum")} value={value} onChange={e => onChange(e.target.value)}>{[["7", "7 Tage"], ["30", "30 Tage"], ["90", "90 Tage"], ["365", "1 Jahr"], ["all", "Gesamt"]].map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}</select></label>;
}
