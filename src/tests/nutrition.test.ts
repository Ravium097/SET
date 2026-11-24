import "fake-indexeddb/auto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { db, init, exportData, restore, type NutritionEntry } from "../data";
import { searchFoods } from "../features/nutrition/service";
beforeEach(async () => {
  for (const table of db.tables) await table.clear();
  await init();
});
afterEach(() => vi.restoreAllMocks());
const entry: NutritionEntry = {
  id: "meal",
  date: "2026-11-24",
  time: "08:00",
  name: "Haferflocken",
  meal: "Frühstück",
  amount: 50,
  unit: "g",
  notes: "Test",
  photo: "data:image/png;base64,aGVsbG8=",
};
it("defaults modules off and retains entries through toggles", async () => {
  expect((await db.settings.get("settings"))?.nutrition).toBeFalsy();
  await db.nutrition.put(entry);
  for (const nutrition of [true, false, true])
    await db.settings.update("settings", { nutrition });
  expect(await db.nutrition.get(entry.id)).toEqual(entry);
});
it("roundtrips photos, library, notes and switches atomically", async () => {
  await db.nutrition.put(entry);
  await db.foods.put({
    id: "food",
    name: "Rezept",
    kind: "recipe",
    notes: "Zutaten",
  });
  await db.dayNotes.put({ id: entry.date, notes: "Erholt" });
  await db.settings.update("settings", { nutrition: true, hydration: true });
  const backup = await exportData();
  await db.nutrition.clear();
  await restore(JSON.parse(JSON.stringify(backup)));
  expect(await db.nutrition.get(entry.id)).toEqual(entry);
  expect(await db.dayNotes.count()).toBe(1);
  expect(await db.foods.count()).toBe(1);
  expect((await db.settings.get("settings"))?.hydration).toBe(true);
  await expect(
    restore({ ...backup, nutrition: [entry, entry] }),
  ).rejects.toThrow();
  expect(await db.nutrition.count()).toBe(1);
});
it("accepts old backups and preserves nutrition data", async () => {
  await db.nutrition.put(entry);
  const { nutrition, foods, dayNotes, ...old } = await exportData();
  await restore({ ...old, schemaVersion: 1 });
  expect(await db.nutrition.get(entry.id)).toEqual(entry);
});
it("rejects malformed nutrition before replacing any data", async () => {
  await db.nutrition.put(entry);
  await expect(
    restore({ ...(await exportData()), nutrition: [{ ...entry, amount: -1 }] }),
  ).rejects.toThrow();
  expect(await db.nutrition.get(entry.id)).toEqual(entry);
});
it("caches API results and searches them offline", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [
            {
              code: "12345678",
              product_name: "Hafer",
              nutriments: { "energy-kcal_100g": 360 },
            },
          ],
        }),
      }),
  );
  expect((await searchFoods("Hafer"))[0].kcal).toBe(360);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("offline")));
  expect((await searchFoods("Hafer"))[0].name).toBe("Hafer");
  await expect(searchFoods("missing")).rejects.toThrow("Offline");
  vi.unstubAllGlobals();
});
it('roundtrips optional macronutrients without inventing values for older entries',async()=>{
 await db.nutrition.put({...entry,protein:12,carbs:40,fat:6});
 const backup=await exportData(); await restore(JSON.parse(JSON.stringify(backup)));
 expect(await db.nutrition.get(entry.id)).toMatchObject({protein:12,carbs:40,fat:6});
 await db.nutrition.put({...entry,id:'legacy'});
 expect((await db.nutrition.get('legacy'))?.protein).toBeUndefined();
});
