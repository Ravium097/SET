export function PeriodFilter({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  return <label>Zeitraum<select aria-label="Zeitraum" value={value} onChange={e=>onChange(e.target.value)}>{[["7","7 Tage"],["30","30 Tage"],["90","90 Tage"],["365","1 Jahr"],["all","Gesamt"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>;
}
