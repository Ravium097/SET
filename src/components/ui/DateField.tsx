import { getLocale } from "../../i18n/runtime";
import { tr } from "../../i18n/runtime";
export function DateField({ value, onChange }: {
    value: string;
    onChange: (value: string) => void;
}) {
    const label = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00').toLocaleDateString(getLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Datum wählen';
    return <span className="date-field"><input type="date" lang={getLocale()} value={value} onChange={e => onChange(e.target.value)}/><span aria-hidden="true">{tr(label)}</span></span>;
}
