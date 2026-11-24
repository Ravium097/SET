import { db, type Food, type NutritionEntry } from "../../data";
export const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export async function searchFoods(query: string): Promise<Food[]> {
  const cached = (await db.foods.toArray()).filter(
    (f) => f.name.toLowerCase().includes(query.toLowerCase()) || f.id === query,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const barcode = /^\d{8,14}$/.test(query);
    const url = barcode
      ? `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(query)}.json`
      : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw Error("Suche fehlgeschlagen");
    const data = await response.json();
    const foods: Food[] = (
      barcode ? (data.product ? [data.product] : []) : (data.products ?? [])
    )
      .filter((p: any) => p.product_name && p.code)
      .map((p: any) => ({
        id: String(p.code),
        name: p.product_name,
        kind: "cache",
        notes: "Open Food Facts · pro 100 g/ml",
        ...(Number.isFinite(p.nutriments?.["energy-kcal_100g"])
          ? { kcal: p.nutriments["energy-kcal_100g"] }
          : {}),
      }));
    await db.foods.bulkPut(foods);
    return [...new Map([...cached, ...foods].map((f) => [f.id, f])).values()];
  } catch {
    if (cached.length) return cached;
    throw Error(
      "Keine Ergebnisse verfügbar. Offline kannst du Lebensmittel manuell erfassen.",
    );
  } finally { clearTimeout(timeout); }
}
// Explicit extension boundaries; no AI, background transmission or external execution.
export interface DiaryImportAdapter {
  name: string;
  parse(input: unknown): Promise<NutritionEntry[]>;
}
export interface ShortcutsAdapter {
  createEntry(entry: NutritionEntry): Promise<void>;
}
export interface LocalAIAdapter {
  summarize(entries: ReadonlyArray<NutritionEntry>): Promise<string>;
}
