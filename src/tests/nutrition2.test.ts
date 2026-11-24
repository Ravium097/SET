import "fake-indexeddb/auto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { db, init, exportData, restore, type Food, type NutritionEntry } from "../data";
import { findFoods, matchFood, nutrientTotal, recipeNutrients, saveFood, saveDiaryEntry, foodToEntry } from "../features/nutrition/service";
let clock=Date.now();
beforeEach(async()=>{
  clock+=400000;
  vi.spyOn(Date,"now").mockReturnValue(clock);
  for(const table of db.tables) await table.clear();await init();
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const food:Food={id:"12345678",barcode:"12345678",name:"Haferflocken",aliases:["Rolled oats"],kind:"cache",source:"database",notes:"",kcal:370};
const entry:NutritionEntry={id:"meal",date:"2026-11-24",time:"08:00",name:"Toast",meal:"Frühstück",amount:100,unit:"g",notes:""};
it("finds German/English names and typos locally without matching an unrelated barcode",()=>{
  expect(matchFood(food,"rolled oats")).toBe("exact");
  expect(matchFood(food,"Haferfloken")).toBe("similar");
  expect(matchFood(food,"12345679")).toBeNull();
});
it("deduplicates OFF responses and preserves favorites and manual corrections",async()=>{
  await db.foods.put({...food,favorite:true});
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({products:[{code:food.id,product_name_en:"Rolled oats",product_name_de:"Haferflocken",nutriments:{"energy-kcal_100g":360,"proteins_100g":-1}},{code:food.id,product_name:"Haferflocken",nutriments:{"energy-kcal_100g":360}}]})}));
  const r=await findFoods("oats");expect(r.foods).toHaveLength(1);
  expect((await db.foods.get(food.id))?.favorite).toBe(true);
  expect((await db.foods.get(food.id))?.protein).toBeUndefined();
  await saveFood({...food,kcal:390,source:"manual"});
  const fetch=vi.fn().mockRejectedValue(Error("offline"));vi.stubGlobal("fetch",fetch);
  expect((await findFoods(food.barcode!)).foods[0].kcal).toBe(390);expect(fetch).not.toHaveBeenCalled();
});
it("maps an unknown barcode locally and scans it offline without a second product",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({status:0})}));
  expect((await findFoods("98765432")).missingBarcode).toBe(true);
  await saveDiaryEntry({...entry,barcode:"98765432",source:"manual",kcal:200});
  const fetch=vi.fn().mockRejectedValue(Error("offline"));vi.stubGlobal("fetch",fetch);
  const found=(await findFoods("98765432")).foods[0];
  expect(found).toMatchObject({barcode:"98765432",source:"manual",kcal:200});
  expect(fetch).not.toHaveBeenCalled();
  await saveFood({...found,id:"another",name:"Toast korrigiert"});expect(await db.foods.count()).toBe(1);
});
it("backs off on HTTP 429 and retains local results without retrying",async()=>{
  await db.foods.put(food);
  const fetch=vi.fn().mockResolvedValue({ok:false,status:429,headers:new Headers({"Retry-After":"120"})});vi.stubGlobal("fetch",fetch);
  expect((await findFoods("Haferfloken")).limited).toBe(true);
  expect((await findFoods("Haferflocke")).foods).toHaveLength(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("does not cache aborted requests or report them as offline results",async()=>{
  const controller=new AbortController();
  vi.stubGlobal("fetch",vi.fn().mockImplementation(async()=>{controller.abort();return {ok:true,json:async()=>({products:[{code:"99999999",product_name:"Toast"}]})};}));
  await expect(findFoods("Toast",controller.signal)).rejects.toThrow();expect(await db.foods.count()).toBe(0);
});
it("calculates recipe portions only from known ingredient values",()=>{
  const totals=recipeNutrients([{name:"Hafer",amount:50,unit:"g",kcal:400,protein:10},{name:"Milch",amount:200,unit:"ml",kcal:50}],2);
  expect(totals.kcal).toBe(150);expect(totals.protein).toBeUndefined();
  expect(nutrientTotal({...entry,amount:2,unit:"Portion",nutrientBasis:"portion",kcal:150},"kcal")).toBe(300);
  expect(nutrientTotal({...entry,unit:"Portion",kcal:150},"kcal")).toBeUndefined();
  expect(nutrientTotal({...entry,kcal:0},"kcal")).toBe(0);
});
it("roundtrips recipes, provenance, favorites and barcode metadata without affecting workouts",async()=>{
  await db.workouts.put({id:"active",name:"Training",status:"active",date:entry.date,started:0,duration:null,exercises:[]});
  const recipe=await saveFood({id:"recipe",kind:"recipe",source:"recipe",name:"Porridge",notes:"",favorite:true,portions:2,nutrientBasis:"portion",ingredients:[{name:"Hafer",amount:50,unit:"g",kcal:400}],kcal:100});
  await saveDiaryEntry(foodToEntry(recipe,entry));
  const backup=await exportData();await restore(JSON.parse(JSON.stringify(backup)));
  expect(await db.foods.get(recipe.id)).toMatchObject({favorite:true,portions:2,ingredients:recipe.ingredients});
  expect(await db.nutrition.get(entry.id)).toMatchObject({foodId:recipe.id,source:"recipe",nutrientBasis:"portion",kcal:100});
  expect((await db.workouts.get("active"))?.status).toBe("active");
  expect((await db.foods.get(recipe.id))?.lastUsed).toBe(clock);
});
it("flags explicit comparable selection and does not copy its barcode as a confirmed identity",()=>{
  const selected=foodToEntry(food,entry,true);
  expect(selected.source).toBe("comparable");expect(selected.barcode).toBeUndefined();expect(selected.protein).toBeUndefined();
});
it("keeps removed recipe nutrient values unknown when editing an existing recipe",async()=>{
  await saveFood({id:"recipe",name:"Recipe",kind:"recipe",notes:"",kcal:200,protein:10,portions:1});
  await saveFood({id:"recipe",name:"Recipe",kind:"recipe",notes:"",portions:1});
  expect((await db.foods.get("recipe"))?.protein).toBeUndefined();
  expect((await db.foods.get("recipe"))?.kcal).toBeUndefined();
});
