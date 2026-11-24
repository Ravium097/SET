import { db, id, foodSchema, nutritionSchema, type Food, type NutritionEntry, type ingredientSchema } from "../../data";
import type { z } from "zod";
export const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const nutrients = ["kcal", "protein", "carbs", "fat"] as const;
export type Ingredient = z.infer<typeof ingredientSchema>;
export const normalize = (s: string) => s.toLowerCase().replace(/ß/g,"ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g," ").trim();
export const isBarcode = (s: string) => /^\d{8,14}$/.test(s);
function distance(a: string, b: string) {
  let row = Array.from({length:b.length+1},(_,i)=>i);
  for (let i=1;i<=a.length;i++) {
    const next=[i];
    for(let j=1;j<=b.length;j++) next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));
    row=next;
  }
  return row[b.length];
}
export function matchFood(food: Food, query: string): "exact"|"similar"|null {
  const q=normalize(query);
  if(!q) return "exact";
  if(isBarcode(query)) return food.barcode===query || food.id===query ? "exact" : null;
  const names=[food.name,food.brand??"",...(food.aliases??[])].map(normalize);
  if(names.some(n=>n.includes(q))) return "exact";
  const words=names.join(" ").split(" ");
  return q.split(" ").every(token=>words.some(w=>w===token || (token.length>=4 && Math.abs(w.length-token.length)<=2 && distance(w,token)<=(token.length>=6?2:1)))) ? "similar" : null;
}
export const sourceLabel = (f: Pick<Food,"source"|"kind"> | NutritionEntry) => {
  if(f.source==="comparable") return "Vergleichbares Produkt";
  if(f.source==="database" || ("kind" in f && f.kind==="cache" && !f.source)) return "Open Food Facts";
  if(f.source==="recipe") return "Eigenes Rezept";
  if(f.source==="manual") return "Manuelle Angaben";
  return "Gespeicherte Angaben";
};
export function nutrientTotal(e: Pick<NutritionEntry,"unit"|"amount"|"nutrientBasis"> & Partial<Record<typeof nutrients[number],number>>, key: typeof nutrients[number]) {
  const value=e[key];
  if(value===undefined) return undefined;
  if(e.unit==="Portion") return e.nutrientBasis==="portion" ? value*e.amount : undefined;
  return e.nutrientBasis!=="portion" ? value*e.amount/100 : undefined;
}
export function recipeNutrients(ingredients: Ingredient[], portions: number): Partial<Record<typeof nutrients[number], number>> {
  if(!Number.isFinite(portions) || portions<=0 || !ingredients.length) return {};
  return Object.fromEntries(nutrients.filter(k=>ingredients.every(i=>i[k]!==undefined)).map(k=>[k,ingredients.reduce((n,i)=>n+i[k]!*i.amount/100,0)/portions]));
}
// One request per 6.5 seconds for text search (below OFF's 10 requests/minute).
// Persist the deadline across page reloads; never queue stale input or retry a 429 automatically.
let nextTextAt=0, nextBarcodeAt=0, retryAt=0;
const searches=new Map<string,number>();
function deadline() { try{return Math.max(nextTextAt,Number(sessionStorage.getItem("base-off-next"))||0);}catch{return nextTextAt;} }
export const searchDelay = () => Math.max(0,deadline()-Date.now(),retryAt-Date.now());
export type FoodResults = { foods: Food[]; offline: boolean; limited: boolean; missingBarcode: boolean };
export async function findFoods(raw: string, signal?: AbortSignal): Promise<FoodResults> {
  const query=raw.trim().slice(0,120), barcode=isBarcode(query);
  const all=await db.foods.toArray();
  const local=all.filter(f=>matchFood(f,query));
  const result=(foods=local, offline=false, limited=false, missingBarcode=false):FoodResults=>({foods,offline,limited,missingBarcode});
  if(!query || (!barcode && query.length<3)) return result();
  const exact=local.find(f=>f.id===query || f.barcode===query);
  if(barcode && exact) return result([exact]);
  if((searches.get(normalize(query))??0)>Date.now()-300000 && local.length) return result();
  if((!barcode && searchDelay()>0) || (barcode && Math.max(retryAt,nextBarcodeAt)>Date.now())) return result(local,false,true);
  if(typeof navigator!=="undefined" && navigator.onLine===false) return result(local,true);
  if(barcode) nextBarcodeAt=Date.now()+1000;
  if(!barcode) {
    nextTextAt=Date.now()+6500;
    try {sessionStorage.setItem("base-off-next",String(nextTextAt));}catch { /* in-memory deadline remains */ }
  }
  const controller=new AbortController();
  const abort=()=>controller.abort();
  signal?.addEventListener("abort",abort,{once:true});
  if(signal?.aborted) abort();
  const timeout=setTimeout(abort,12000);
  try {
    const fields="code,product_name,product_name_de,product_name_en,brands,image_front_small_url,nutriments";
    const url=barcode
      ? `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(query)}.json?fields=${fields}`
      : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=${fields}`;
    const response=await fetch(url,{signal:controller.signal});
    if(response.status===429) {
      const header=response.headers?.get("Retry-After");
      const seconds=Number(header);
      retryAt=Date.now()+Math.max(60000,Number.isFinite(seconds)?seconds*1000:(Date.parse(header??"")-Date.now())||60000);
      return result(local,false,true);
    }
    if(!response.ok) throw Error("Open Food Facts nicht erreichbar");
    const data=await response.json();
    const products: Record<string,any>[]=barcode ? (data.status!==0 && data.product ? [{...data.product,code:data.product.code??query}] : []) : (Array.isArray(data.products)?data.products:[]);
    const foods:Food[]=products.flatMap(p=>{
      const name=[p.product_name_de,p.product_name,p.product_name_en].find(x=>typeof x==="string"&&x.trim());
      if(!name || !p.code) return [];
      const ns=p.nutriments??{};
      const values=Object.fromEntries([["kcal","energy-kcal_100g"],["protein","proteins_100g"],["carbs","carbohydrates_100g"],["fat","fat_100g"]].filter(([,k])=>typeof ns[k]==="number" && Number.isFinite(ns[k]) && ns[k]>=0).map(([k,v])=>[k,ns[v]]));
      const food:Food={id:String(p.code),name:name.trim(),kind:"cache",source:"database",nutrientBasis:"100",notes:"Open Food Facts · pro 100 g/ml",cachedAt:Date.now(),...values,
        ...(isBarcode(String(p.code))?{barcode:String(p.code)}:{}),
        ...(typeof p.brands==="string"?{brand:p.brands}:{}),
        aliases:[...new Set([p.product_name_de,p.product_name_en,p.product_name].filter((n):n is string=>typeof n==="string"&&!!n.trim()))],
        ...(typeof p.image_front_small_url==="string" && p.image_front_small_url.startsWith("https://")?{imageUrl:p.image_front_small_url}:{}),
      };
      return [foodSchema.parse(food)];
    });
    if(signal?.aborted) throw new DOMException("Aborted","AbortError");
    const merged:Food[]=[];
    await db.transaction("rw",db.foods,async()=>{
      for(const f of foods) {
        const existing=await db.foods.get(f.id) ?? all.find(x=>x.barcode===f.barcode && !!f.barcode);
        // A scan must never overwrite a user's corrections or favorite state.
        const saved=existing?.source==="manual" || (existing && existing.kind!=="cache") ? existing : {...f,id:existing?.id??f.id,favorite:existing?.favorite,lastUsed:existing?.lastUsed};
        await db.foods.put(saved); merged.push(saved);
      }
    });
    searches.set(normalize(query),Date.now());
    return result([...new Map([...local,...merged].map(f=>[f.id,f])).values()],false,false,barcode&&!foods.length);
  } catch(e) {
    if(signal?.aborted) throw e;
    return result(local,true);
  } finally {clearTimeout(timeout);signal?.removeEventListener("abort",abort);}
}
// Compatibility for existing callers and offline tests.
export async function searchFoods(query:string):Promise<Food[]> {
  const r=await findFoods(query);
  if((r.offline || r.limited) && !r.foods.length) throw Error("Keine Ergebnisse verfügbar. Offline kannst du Lebensmittel manuell erfassen.");
  return r.foods;
}
export async function saveFood(input: Food): Promise<Food> {
  const food=foodSchema.parse({...input,name:input.name.trim()});
  return db.transaction("rw",db.foods,async()=>{
    const all=await db.foods.toArray();
    const existing=all.find(f=>f.id===food.id) ?? all.find(f=>!!food.barcode&&(f.barcode===food.barcode||f.id===food.barcode)) ?? all.find(f=>f.kind===food.kind&&normalize(f.name)===normalize(food.name)&&normalize(f.brand??"")===normalize(food.brand??""));
    const saved={...existing,...food,...Object.fromEntries(nutrients.map(k=>[k,food[k]])),id:existing?.id??food.id};
    await db.foods.put(saved);return saved;
  });
}
export async function saveDiaryEntry(input:NutritionEntry) {
  const entry=nutritionSchema.parse({...input,name:input.name.trim()});
  return db.transaction("rw",db.nutrition,db.foods,async()=>{
    let food=entry.foodId ? await db.foods.get(entry.foodId) : undefined;
    if(food && entry.barcode && entry.source==="manual") {
      food=await saveFood({...food,name:entry.name,kind:entry.unit==="ml"?"drink":"food",notes:entry.notes,source:"manual",nutrientBasis:entry.nutrientBasis,...Object.fromEntries(nutrients.map(k=>[k,entry[k]]))});
    }
    if(!food && entry.barcode) {
      food=await saveFood({id:entry.barcode,barcode:entry.barcode,name:entry.name,kind:entry.unit==="ml"?"drink":"food",notes:entry.notes,source:"manual",nutrientBasis:entry.nutrientBasis,...Object.fromEntries(nutrients.map(k=>[k,entry[k]]))});
    }
    if(food) {await db.foods.update(food.id,{lastUsed:Date.now()});entry.foodId=food.id;}
    await db.nutrition.put(entry);
  });
}
export function foodToEntry(food:Food, base:NutritionEntry, comparable=false):NutritionEntry {
  return {...base,name:food.name,notes:food.notes,foodId:food.id,barcode:comparable?undefined:food.barcode,
    source:comparable?"comparable":food.source??(food.kind==="cache"?"database":"manual"),sourceName:food.name,
    nutrientBasis:food.nutrientBasis??"100",...Object.fromEntries(nutrients.map(k=>[k,food[k]])),
    unit:food.nutrientBasis==="portion"?"Portion":food.kind==="drink"?"ml":"g",amount:food.nutrientBasis==="portion"?1:100};
}
// Explicit extension boundaries; no AI, background transmission or external execution.
export interface DiaryImportAdapter { name:string; parse(input:unknown):Promise<NutritionEntry[]>; }
export interface ShortcutsAdapter { createEntry(entry:NutritionEntry):Promise<void>; }
export interface LocalAIAdapter { summarize(entries:ReadonlyArray<NutritionEntry>):Promise<string>; }
