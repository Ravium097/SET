import { formatDay } from "../../i18n/runtime";
import { getLocale } from "../../i18n/runtime";
import { tr } from "../../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Star, Search, ScanBarcode, Plus, Pencil, X } from "lucide-react";
import { db, id, foodSchema, ingredientSchema, type Food, type NutritionEntry } from "../../data";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { findFoods, isBarcode, matchFood, nutrients, recipeNutrients, saveFood, searchDelay, sourceLabel, type Ingredient } from "./service";
const labels = { kcal: "Energie (kcal)", protein: "Eiweiß (g)", carbs: "Kohlenhydrate (g)", fat: "Fett (g)" };
export function NutrientFields({ value, onChange }: {
    value: Partial<Record<typeof nutrients[number], number>>;
    onChange: (key: typeof nutrients[number], value: number | undefined) => void;
}) {
    return <div className="nutrient-fields">{nutrients.map(key => <label key={key}>{tr(labels[key])}<input type="number" min="0" step="any" value={value[key] ?? ""} placeholder={tr("Unbekannt")} onChange={e => onChange(key, e.target.value === "" ? undefined : Number(e.target.value))}/></label>)}</div>;
}
function FoodRow({ food, onPick, comparable = false, actions = true, showNutrients = true }: {
    food: Food;
    onPick: (food: Food, comparable: boolean) => void;
    comparable?: boolean;
    actions?: boolean;
    showNutrients?: boolean;
}) {
    const [error, setError] = useState("");
    return <div className="food-row"><button className="food-select" onClick={() => onPick(food, comparable)}>
    {food.imageUrl && <img src={food.imageUrl} alt={""} loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.hidden = true; }}/>}
    <span><strong>{food.name}</strong>{food.brand && <small>{food.brand}</small>}<small>{comparable ? tr("Vergleichbares Produkt \u00B7 manuell pr\u00FCfen") : tr(sourceLabel(food))}</small>{showNutrients && <small>{nutrients.map(k => `${food[k] === undefined ? "–" : food[k]!.toLocaleString(getLocale(), { maximumFractionDigits: 1 })} ${k === "kcal" ? "kcal" : k === "protein" ? tr("g Eiweiß") : k === "carbs" ? tr("g KH") : tr("g Fett")}`).join(" · ")}{" / "}{food.nutrientBasis === "portion" ? tr("Portion") : tr("100 g/ml")}</small>}</span>
  </button>{actions && <button className="food-star" aria-label={tr("{0} {1}", [food.name, tr(food.favorite ? "aus Favoriten entfernen" : "favorisieren")])} aria-pressed={!!food.favorite} onClick={() => { void db.foods.update(food.id, { favorite: !food.favorite }).catch(() => setError("Favorit konnte nicht gespeichert werden.")); }}><Star size={19} fill={food.favorite ? "currentColor" : "none"}/></button>}{error && <p role="status">{tr(error)}</p>}</div>;
}
export function FoodSearch({ onPick, onUnknown, showNutrients = true }: {
    onPick: (f: Food, comparable: boolean) => void;
    onUnknown?: (q: string) => void;
    showNutrients?: boolean;
}) {
    const [query, Q] = useState("");
    const [remote, R] = useState<Food[]>([]), [status, S] = useState("");
    const all = useLiveQuery(() => db.foods.toArray()) ?? [];
    const request = useRef(0);
    useEffect(() => {
        const serial = ++request.current, controller = new AbortController();
        R([]);
        S("");
        if (query.trim().length < 3 || (/^\d+$/.test(query.trim()) && !isBarcode(query.trim())))
            return () => controller.abort();
        const delay = Math.max(550, searchDelay());
        if (delay > 550)
            S("Lokale Treffer · Datenbanksuche folgt in wenigen Sekunden.");
        const timer = setTimeout(() => {
            S("Open Food Facts wird durchsucht …");
            void findFoods(query, controller.signal).then(r => {
                if (serial !== request.current || controller.signal.aborted)
                    return;
                R(r.foods);
                S(r.limited ? "Datenbanksuche pausiert kurz. Lokale Produkte und manuelle Eingabe sind verfügbar." : r.offline ? "Offline oder Datenbank nicht erreichbar · gespeicherte Produkte sind verfügbar." : r.missingBarcode ? "Barcode nicht gefunden. Du kannst das Produkt mit dieser Zuordnung manuell anlegen." : !r.foods.length ? "Kein eindeutiger Treffer. Suchbegriff kürzen oder manuell erfassen." : "Datenbankangaben können unvollständig sein. – bedeutet unbekannt.");
            }).catch(() => { if (!controller.signal.aborted)
                S("Suche nicht verfügbar. Bitte erneut versuchen oder manuell erfassen."); });
        }, delay);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query]);
    const q = query.trim();
    const local = all.filter(f => q && matchFood(f, q));
    const currentRemote = remote.map(f => all.find(saved => saved.id === f.id) ?? f);
    const results = [...new Map([...local, ...currentRemote].map(f => [f.id, f])).values()];
    const exact = results.filter(f => matchFood(f, q) === "exact"), similar = results.filter(f => matchFood(f, q) !== "exact");
    return <div className="food-search"><label className="food-search-label"><Search size={18}/><span className="sr-only">{tr("Lebensmittel oder Barcode suchen")}</span><input type="search" maxLength={120} value={query} placeholder={tr("Lebensmittel oder Barcode")} onChange={e => Q(e.target.value)}/></label>
    <p className="food-hint">{tr("Vorschl\u00E4ge aus deiner Sammlung und Open Food Facts. Suchbegriffe werden an Open Food Facts gesendet.")}</p>
    <p role="status" aria-live="polite">{tr(status)}</p>
    {exact.slice(0, 25).map(f => <FoodRow key={f.id} food={f} onPick={onPick} showNutrients={showNutrients}/>)}
    {!!similar.length && <><h3>{tr("Vergleichbare Lebensmittel")}</h3><p className="food-hint">{tr("\u00C4hnliche Namen sind keine best\u00E4tigte Produkt\u00FCbereinstimmung. W\u00E4hle selbst einen passenden Eintrag.")}</p>{similar.slice(0, 12).map(f => <FoodRow key={f.id} food={f} onPick={onPick} showNutrients={showNutrients} comparable/>)}</>}
    {onUnknown && q && <button onClick={() => onUnknown(q)}><Plus size={17}/>{" "}{isBarcode(q) ? tr("Produkt mit diesem Barcode anlegen") : tr("Manuell erfassen")}</button>}
  </div>;
}
function RecipeEditor({ initial, onDone, onCancel, showNutrients = true }: {
    initial?: Food;
    onDone: (f: Food) => void;
    onCancel: () => void;
    showNutrients?: boolean;
}) {
    const [name, N] = useState(initial?.name ?? ""), [notes, Notes] = useState(initial?.notes ?? "");
    const [ingredients, I] = useState<Ingredient[]>(initial?.ingredients ?? []), [portions, P] = useState(initial?.portions ?? 1), [error, E] = useState("");
    const totals = recipeNutrients(ingredients, portions);
    const change = (index: number, patch: Partial<Ingredient>) => I(rows => rows.map((r, i) => i === index ? { ...r, ...patch } : r));
    return <section className="recipe-editor"><div className="row"><h3>{initial ? tr("Rezept bearbeiten") : tr("Eigenes Rezept")}</h3><button aria-label={tr("Rezepteditor schlie\u00DFen")} onClick={onCancel}><X size={18}/></button></div>
    <label>{tr("Rezeptname")}<input value={name} onChange={e => N(e.target.value)}/></label><label>{tr("Ergibt Portionen")}<input type="number" min="0.1" step="any" value={portions} onChange={e => P(Number(e.target.value))}/></label>
    <details><summary>{tr("Zutat suchen")}</summary><FoodSearch showNutrients={showNutrients} onPick={(f, comparable) => {
            if (f.nutrientBasis === "portion") {
                E("Für Rezeptzutaten werden Angaben je 100 g/ml benötigt. Du kannst sie manuell erfassen.");
                return;
            }
            I(rows => [...rows, { foodId: f.id, name: f.name, amount: 100, unit: f.kind === "drink" ? "ml" : "g", source: comparable ? "comparable" : f.source ?? (f.kind === "cache" ? "database" : "manual"), ...Object.fromEntries(nutrients.map(k => [k, f[k]])) }]);
            E("");
        }}/></details>
    {ingredients.map((ing, index) => <article key={index} className="recipe-ingredient"><div className="row"><strong>{tr("Zutat ")}{index + 1}</strong><button aria-label={tr("Zutat {0} entfernen", [index + 1])} onClick={() => I(rows => rows.filter((_, i) => i !== index))}><X size={17}/></button></div>
      <label>{tr("Zutatenname")}<input value={ing.name} onChange={e => change(index, { name: e.target.value, source: "manual" })}/></label>
      <div className="food-columns"><label>{tr("Menge")}<input type="number" min="0.1" step="any" value={ing.amount} onChange={e => change(index, { amount: Number(e.target.value) })}/></label><label>{tr("Einheit")}<select value={ing.unit} onChange={e => change(index, { unit: e.target.value as "g" | "ml", source: "manual" })}><option>{tr("g")}</option><option>{tr("ml")}</option></select></label></div>
      <small>{tr(sourceLabel(ing as NutritionEntry))}{tr(" \u00B7 N\u00E4hrwerte je 100 ")}{ing.unit}</small>{showNutrients && <details><summary>{tr("N\u00E4hrwerte der Zutat")}</summary><NutrientFields value={ing} onChange={(key, value) => change(index, { [key]: value, source: "manual" })}/></details>}
    </article>)}
    <button onClick={() => I(rows => [...rows, { name: "", amount: 100, unit: "g", source: "manual" }])}><Plus size={17}/>{tr(" Zutat manuell hinzuf\u00FCgen")}</button>
    <label>{tr("Rezeptnotizen")}<textarea value={notes} onChange={e => Notes(e.target.value)}/></label>
    {showNutrients && <p className="food-hint">{tr("Je Portion: ")}{nutrients.map(k => `${totals[k] === undefined ? "–" : totals[k]!.toLocaleString(getLocale(), { maximumFractionDigits: 1 })} ${k === "kcal" ? "kcal" : k === "protein" ? tr("g Eiweiß") : k === "carbs" ? tr("g KH") : tr("g Fett")}`).join(" · ")}{tr(". Ein Wert bleibt unbekannt, sobald er bei einer Zutat fehlt.")}</p>}<p role="status">{tr(error)}</p>
    <button className="primary" onClick={async () => {
            try {
                const rows = ingredients.map(i => ingredientSchema.parse(i));
                if (!rows.length || !name.trim())
                    throw Error();
                const food = foodSchema.parse({ ...initial, id: initial?.id ?? id(), name: name.trim(), kind: "recipe", source: "recipe", notes, ingredients: rows, portions, nutrientBasis: "portion", ...recipeNutrients(rows, portions) });
                // Clear old totals when a formerly known ingredient value becomes unknown.
                for (const k of nutrients)
                    if (totals[k] === undefined)
                        delete food[k];
                onDone(await saveFood(food));
            }
            catch {
                E("Bitte Rezeptname, mindestens eine Zutat, gültige Mengen und Portionen angeben. Speichern fehlgeschlagen.");
            }
        }}>{tr("Rezept speichern")}</button>
  </section>;
}
export function FoodPicker({ onPick, onManual, onScan, onRecent, hydrationOnly = false, showNutrients = true }: {
    onPick: (f: Food, comparable: boolean) => void;
    onManual: (q?: string) => void;
    onScan: () => void;
    onRecent: (e: NutritionEntry) => void;
    hydrationOnly?: boolean;
    showNutrients?: boolean;
}) {
    const [tab, T] = useState("Suche"), [recipe, R] = useState<Food | null | undefined>(undefined), [message, M] = useState("");
    const foods = useLiveQuery(() => db.foods.toArray()) ?? [];
    const history = useLiveQuery(() => db.nutrition.toArray()) ?? [];
    const available = foods.filter(f => !hydrationOnly || f.kind === "drink");
    const recent = [...history].filter(e => !hydrationOnly || e.meal === "Getränke").sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const unique = [...new Map(recent.map(e => [e.foodId ?? e.name, e])).keys()].map(key => recent.find(e => (e.foodId ?? e.name) === key)!).slice(0, 20);
    if (recipe !== undefined)
        return <RecipeEditor showNutrients={showNutrients} initial={recipe ?? undefined} onCancel={() => R(undefined)} onDone={f => { R(undefined); onPick(f, false); }}/>;
    const list = available.filter(f => tab === "Favoriten" ? f.favorite : tab === "Eigene Rezepte" ? f.kind === "recipe" : f.kind === "food" || f.kind === "drink" || f.source === "manual");
    return <section className="food-picker"><div className="food-tools"><button onClick={onScan}><ScanBarcode size={18}/>{tr(" Barcode")}</button><button onClick={() => onManual()}><Pencil size={17}/>{tr(" Manuell")}</button></div>
    <div className="food-tabs" role="group" aria-label={tr("Lebensmittelsammlung")}>{["Suche", "Favoriten", "Zuletzt verwendet", "Eigene Lebensmittel", ...(!hydrationOnly ? ["Eigene Rezepte"] : [])].map(t => <button key={t} aria-pressed={t === tab} onClick={() => T(t)}>{tr(t)}</button>)}</div>
    {tab === "Suche" ? <FoodSearch showNutrients={showNutrients} onPick={onPick} onUnknown={onManual}/> : tab === "Zuletzt verwendet" ? <div>{unique.map(e => <button className="food-recent" key={e.id} onClick={() => onRecent(e)}><strong>{e.name}</strong><small>{e.amount}{" "}{tr(e.unit)}{" \u00B7 "}{formatDay(e.date)}{" \u00B7 "}{tr(sourceLabel(e))}</small></button>)}{!unique.length && <p>{tr("Noch keine verwendeten Lebensmittel.")}</p>}</div> : <>
      <h3>{tr(tab)}</h3>{tab === "Eigene Rezepte" && <button onClick={() => R(null)}><Plus size={17}/>{tr(" Rezept erstellen")}</button>}
      {!list.length && <p>{tr("Hier sind noch keine Eintr\u00E4ge.")}</p>}{list.map(f => <div key={f.id}><FoodRow food={f} onPick={onPick} showNutrients={showNutrients}/>{f.kind !== "cache" && <ActionMenu label={tr("Sammlungsoptionen f\u00FCr {0}", [f.name])}>{f.kind === "recipe" ? <button onClick={() => R(f)}>{tr("Rezept bearbeiten")}</button> : <button onClick={() => onPick(f, false)}>{tr("Bearbeiten und verwenden")}</button>}<button onClick={() => { if (confirm(tr("\u201E{0}\u201C aus der Sammlung l\u00F6schen? Tagebucheintr\u00E4ge bleiben erhalten.", [f.name])))
            void db.foods.delete(f.id).catch(() => M("Löschen fehlgeschlagen.")); }}>{tr("Aus Sammlung l\u00F6schen")}</button></ActionMenu>}</div>)}
    </>}
    <p role="status">{tr(message)}</p>
  </section>;
}
