export function DateField({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 const label=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'Datum wählen';
 return <span className="date-field"><input type="date" lang="de-DE" value={value} onChange={e=>onChange(e.target.value)}/><span aria-hidden="true">{label}</span></span>;
}
