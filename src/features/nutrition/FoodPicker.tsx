import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Star, Search, ScanBarcode, Plus, Pencil, X } from "lucide-react";
import { db, id, foodSchema, ingredientSchema, type Food, type NutritionEntry } from "../../data";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { findFoods, isBarcode, matchFood, nutrients, recipeNutrients, saveFood, searchDelay, sourceLabel, type Ingredient } from "./service";
const labels={kcal:"Energie (kcal)",protein:"Eiweiß (g)",carbs:"Kohlenhydrate (g)",fat:"Fett (g)"};
export function NutrientFields({value,onChange}:{value:Partial<Record<typeof nutrients[number],number>>;onChange:(key:typeof nutrients[number],value:number|undefined)=>void}) {
  return <div className="nutrient-fields">{nutrients.map(key=><label key={key}>{labels[key]}<input type="number" min="0" step="any" value={value[key]??""} placeholder="Unbekannt" onChange={e=>onChange(key,e.target.value===""?undefined:Number(e.target.value))}/></label>)}</div>;
}
function FoodRow({food,onPick,comparable=false,actions=true,showNutrients=true}:{food:Food;onPick:(food:Food,comparable:boolean)=>void;comparable?:boolean;actions?:boolean;showNutrients?:boolean}) {
  const [error,setError]=useState("");
  return <div className="food-row"><button className="food-select" onClick={()=>onPick(food,comparable)}>
    {food.imageUrl && <img src={food.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>}
    <span><strong>{food.name}</strong>{food.brand && <small>{food.brand}</small>}<small>{comparable ? "Vergleichbares Produkt · manuell prüfen" : sourceLabel(food)}</small>{showNutrients && <small>{nutrients.map(k=>`${food[k]===undefined?"–":food[k]!.toLocaleString("de-DE",{maximumFractionDigits:1})} ${k==="kcal"?"kcal":k==="protein"?"g Eiweiß":k==="carbs"?"g KH":"g Fett"}`).join(" · ")} / {food.nutrientBasis==="portion"?"Portion":"100 g/ml"}</small>}</span>
  </button>{actions && <button className="food-star" aria-label={`${food.name} ${food.favorite?"aus Favoriten entfernen":"favorisieren"}`} aria-pressed={!!food.favorite} onClick={()=>{void db.foods.update(food.id,{favorite:!food.favorite}).catch(()=>setError("Favorit konnte nicht gespeichert werden."));}}><Star size={19} fill={food.favorite?"currentColor":"none"}/></button>}{error && <p role="status">{error}</p>}</div>;
}
export function FoodSearch({onPick,onUnknown,showNutrients=true}:{onPick:(f:Food,comparable:boolean)=>void;onUnknown?:(q:string)=>void;showNutrients?:boolean}) {
  const [query,Q]=useState("");
  const [remote,R]=useState<Food[]>([]),[status,S]=useState("");
  const all=useLiveQuery(()=>db.foods.toArray())??[];
  const request=useRef(0);
  useEffect(()=>{
    const serial=++request.current,controller=new AbortController();
    R([]); S("");
    if(query.trim().length<3 || (/^\d+$/.test(query.trim())&&!isBarcode(query.trim()))) return ()=>controller.abort();
    const delay=Math.max(550,searchDelay());
    if(delay>550) S("Lokale Treffer · Datenbanksuche folgt in wenigen Sekunden.");
    const timer=setTimeout(()=>{
      S("Open Food Facts wird durchsucht …");
      void findFoods(query,controller.signal).then(r=>{
        if(serial!==request.current || controller.signal.aborted) return;
        R(r.foods);
        S(r.limited ? "Datenbanksuche pausiert kurz. Lokale Produkte und manuelle Eingabe sind verfügbar." : r.offline ? "Offline oder Datenbank nicht erreichbar · gespeicherte Produkte sind verfügbar." : r.missingBarcode ? "Barcode nicht gefunden. Du kannst das Produkt mit dieser Zuordnung manuell anlegen." : !r.foods.length ? "Kein eindeutiger Treffer. Suchbegriff kürzen oder manuell erfassen." : "Datenbankangaben können unvollständig sein. – bedeutet unbekannt.");
      }).catch(()=>{if(!controller.signal.aborted) S("Suche nicht verfügbar. Bitte erneut versuchen oder manuell erfassen.");});
    },delay);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[query]);
  const q=query.trim();
  const local=all.filter(f=>q && matchFood(f,q));
  const currentRemote=remote.map(f=>all.find(saved=>saved.id===f.id)??f);
  const results=[...new Map([...local,...currentRemote].map(f=>[f.id,f])).values()];
  const exact=results.filter(f=>matchFood(f,q)==="exact"),similar=results.filter(f=>matchFood(f,q)!=="exact");
  return <div className="food-search"><label className="food-search-label"><Search size={18}/><span className="sr-only">Lebensmittel oder Barcode suchen</span><input type="search" maxLength={120} value={query} placeholder="Lebensmittel oder Barcode" onChange={e=>Q(e.target.value)}/></label>
    <p className="food-hint">Vorschläge aus deiner Sammlung und Open Food Facts. Suchbegriffe werden an Open Food Facts gesendet.</p>
    <p role="status" aria-live="polite">{status}</p>
    {exact.slice(0,25).map(f=><FoodRow key={f.id} food={f} onPick={onPick} showNutrients={showNutrients}/>)}
    {!!similar.length && <><h3>Vergleichbare Lebensmittel</h3><p className="food-hint">Ähnliche Namen sind keine bestätigte Produktübereinstimmung. Wähle selbst einen passenden Eintrag.</p>{similar.slice(0,12).map(f=><FoodRow key={f.id} food={f} onPick={onPick} showNutrients={showNutrients} comparable/>)}</>}
    {onUnknown && q && <button onClick={()=>onUnknown(q)}><Plus size={17}/> {isBarcode(q)?"Produkt mit diesem Barcode anlegen":"Manuell erfassen"}</button>}
  </div>;
}
function RecipeEditor({initial,onDone,onCancel,showNutrients=true}:{initial?:Food;onDone:(f:Food)=>void;onCancel:()=>void;showNutrients?:boolean}) {
  const [name,N]=useState(initial?.name??""),[notes,Notes]=useState(initial?.notes??"");
  const [ingredients,I]=useState<Ingredient[]>(initial?.ingredients??[]),[portions,P]=useState(initial?.portions??1),[error,E]=useState("");
  const totals=recipeNutrients(ingredients,portions);
  const change=(index:number,patch:Partial<Ingredient>)=>I(rows=>rows.map((r,i)=>i===index?{...r,...patch}:r));
  return <section className="recipe-editor"><div className="row"><h3>{initial?"Rezept bearbeiten":"Eigenes Rezept"}</h3><button aria-label="Rezepteditor schließen" onClick={onCancel}><X size={18}/></button></div>
    <label>Rezeptname<input value={name} onChange={e=>N(e.target.value)}/></label><label>Ergibt Portionen<input type="number" min="0.1" step="any" value={portions} onChange={e=>P(Number(e.target.value))}/></label>
    <details><summary>Zutat suchen</summary><FoodSearch showNutrients={showNutrients} onPick={(f,comparable)=>{
      if(f.nutrientBasis==="portion") {E("Für Rezeptzutaten werden Angaben je 100 g/ml benötigt. Du kannst sie manuell erfassen.");return;}
      I(rows=>[...rows,{foodId:f.id,name:f.name,amount:100,unit:f.kind==="drink"?"ml":"g",source:comparable?"comparable":f.source??(f.kind==="cache"?"database":"manual"),...Object.fromEntries(nutrients.map(k=>[k,f[k]]))}]); E("");
    }}/></details>
    {ingredients.map((ing,index)=><article key={index} className="recipe-ingredient"><div className="row"><strong>Zutat {index+1}</strong><button aria-label={`Zutat ${index+1} entfernen`} onClick={()=>I(rows=>rows.filter((_,i)=>i!==index))}><X size={17}/></button></div>
      <label>Zutatenname<input value={ing.name} onChange={e=>change(index,{name:e.target.value,source:"manual"})}/></label>
      <div className="food-columns"><label>Menge<input type="number" min="0.1" step="any" value={ing.amount} onChange={e=>change(index,{amount:Number(e.target.value)})}/></label><label>Einheit<select value={ing.unit} onChange={e=>change(index,{unit:e.target.value as "g"|"ml",source:"manual"})}><option>g</option><option>ml</option></select></label></div>
      <small>{sourceLabel(ing as NutritionEntry)} · Nährwerte je 100 {ing.unit}</small>{showNutrients && <details><summary>Nährwerte der Zutat</summary><NutrientFields value={ing} onChange={(key,value)=>change(index,{[key]:value,source:"manual"})}/></details>}
    </article>)}
    <button onClick={()=>I(rows=>[...rows,{name:"",amount:100,unit:"g",source:"manual"}])}><Plus size={17}/> Zutat manuell hinzufügen</button>
    <label>Rezeptnotizen<textarea value={notes} onChange={e=>Notes(e.target.value)}/></label>
    {showNutrients && <p className="food-hint">Je Portion: {nutrients.map(k=>`${totals[k]===undefined?"–":totals[k]!.toLocaleString("de-DE",{maximumFractionDigits:1})} ${k==="kcal"?"kcal":k==="protein"?"g Eiweiß":k==="carbs"?"g KH":"g Fett"}`).join(" · ")}. Ein Wert bleibt unbekannt, sobald er bei einer Zutat fehlt.</p>}<p role="status">{error}</p>
    <button className="primary" onClick={async()=>{try{
      const rows=ingredients.map(i=>ingredientSchema.parse(i));
      if(!rows.length || !name.trim()) throw Error();
      const food=foodSchema.parse({...initial,id:initial?.id??id(),name:name.trim(),kind:"recipe",source:"recipe",notes,ingredients:rows,portions,nutrientBasis:"portion",...recipeNutrients(rows,portions)});
      // Clear old totals when a formerly known ingredient value becomes unknown.
      for(const k of nutrients) if(totals[k]===undefined) delete food[k];
      onDone(await saveFood(food));
    }catch{E("Bitte Rezeptname, mindestens eine Zutat, gültige Mengen und Portionen angeben. Speichern fehlgeschlagen.");}}}>Rezept speichern</button>
  </section>;
}
export function FoodPicker({onPick,onManual,onScan,onRecent,hydrationOnly=false,showNutrients=true}:{onPick:(f:Food,comparable:boolean)=>void;onManual:(q?:string)=>void;onScan:()=>void;onRecent:(e:NutritionEntry)=>void;hydrationOnly?:boolean;showNutrients?:boolean}) {
  const [tab,T]=useState("Suche"),[recipe,R]=useState<Food|null|undefined>(undefined),[message,M]=useState("");
  const foods=useLiveQuery(()=>db.foods.toArray())??[];
  const history=useLiveQuery(()=>db.nutrition.toArray())??[];
  const available=foods.filter(f=>!hydrationOnly||f.kind==="drink");
  const recent=[...history].filter(e=>!hydrationOnly||e.meal==="Getränke").sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const unique=[...new Map(recent.map(e=>[e.foodId??e.name,e])).keys()].map(key=>recent.find(e=>(e.foodId??e.name)===key)!).slice(0,20);
  if(recipe!==undefined) return <RecipeEditor showNutrients={showNutrients} initial={recipe??undefined} onCancel={()=>R(undefined)} onDone={f=>{R(undefined);onPick(f,false);}}/>;
  const list=available.filter(f=>tab==="Favoriten"?f.favorite:tab==="Eigene Rezepte"?f.kind==="recipe":f.kind==="food"||f.kind==="drink"||f.source==="manual");
  return <section className="food-picker"><div className="food-tools"><button onClick={onScan}><ScanBarcode size={18}/> Barcode</button><button onClick={()=>onManual()}><Pencil size={17}/> Manuell</button></div>
    <div className="food-tabs" role="group" aria-label="Lebensmittelsammlung">{["Suche","Favoriten","Zuletzt verwendet","Eigene Lebensmittel",...(!hydrationOnly?["Eigene Rezepte"]:[])].map(t=><button key={t} aria-pressed={t===tab} onClick={()=>T(t)}>{t}</button>)}</div>
    {tab==="Suche"?<FoodSearch showNutrients={showNutrients} onPick={onPick} onUnknown={onManual}/>:tab==="Zuletzt verwendet"?<div>{unique.map(e=><button className="food-recent" key={e.id} onClick={()=>onRecent(e)}><strong>{e.name}</strong><small>{e.amount} {e.unit} · {e.date} · {sourceLabel(e)}</small></button>)}{!unique.length && <p>Noch keine verwendeten Lebensmittel.</p>}</div>:<>
      <h3>{tab}</h3>{tab==="Eigene Rezepte"&&<button onClick={()=>R(null)}><Plus size={17}/> Rezept erstellen</button>}
      {!list.length&&<p>Hier sind noch keine Einträge.</p>}{list.map(f=><div key={f.id}><FoodRow food={f} onPick={onPick} showNutrients={showNutrients}/>{f.kind!=="cache"&&<ActionMenu label={`Sammlungsoptionen für ${f.name}`}>{f.kind==="recipe"?<button onClick={()=>R(f)}>Rezept bearbeiten</button>:<button onClick={()=>onPick(f,false)}>Bearbeiten und verwenden</button>}<button onClick={()=>{if(confirm(`„${f.name}“ aus der Sammlung löschen? Tagebucheinträge bleiben erhalten.`))void db.foods.delete(f.id).catch(()=>M("Löschen fehlgeschlagen."));}}>Aus Sammlung löschen</button></ActionMenu>}</div>)}
    </>}
    <p role="status">{message}</p>
  </section>;
}
