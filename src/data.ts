import Dexie, { type EntityTable } from "dexie";
import { z } from "zod";
export const id = () => crypto.randomUUID();
const num = z.number().finite().nonnegative().nullable();
export const setSchema = z.object({
  id: z.string(),
  weight: num,
  reps: z.number().int().nonnegative().nullable(),
  completed: z.boolean(),
  type: z.enum(["work", "warmup"]).optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
});
export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  muscle: z.string(),
  equipment: z.string(),
  movement: z.string().optional(),
  favorite: z.boolean(),
  notes: z.string(),
  rest: z.number().nonnegative().optional(),
});
export const itemSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  name: z.string().min(1),
  sets: z.array(setSchema),
  muscle: z.string().optional(),
  movement: z.string().optional(),
  equipment: z.string().optional(),
  replacedFrom: z.string().optional(),
});
export const workoutSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  date: z.string().min(10),
  started: z.number().nullable(),
  duration: z.number().nonnegative().nullable(),
  status: z.enum(["active", "completed", "template"]),
  exercises: z.array(itemSchema),
});
const nutrientFields = {
  kcal: z.number().nonnegative().finite().optional(),
  protein: z.number().nonnegative().finite().optional(),
  carbs: z.number().nonnegative().finite().optional(),
  fat: z.number().nonnegative().finite().optional(),
};
const source = z.enum(["database", "comparable", "manual", "recipe"]);
export const ingredientSchema = z.object({
  foodId: z.string().optional(), name: z.string().trim().min(1),
  amount: z.number().positive().finite(), unit: z.enum(["g", "ml"]),
  source: source.optional(), ...nutrientFields,
});
const provenanceFields = {
  source: source.optional(), sourceName: z.string().optional(),
  barcode: z.string().regex(/^\d{8,14}$/).optional(),
  nutrientBasis: z.enum(["100", "portion"]).optional(),
};
export const nutritionSchema = z.object({
  ...provenanceFields,
  foodId: z.string().optional(),
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().min(1),
  meal: z.string().trim().min(1).max(60),
  amount: z.number().positive().finite(),
  unit: z.enum(["g", "ml", "Portion"]),
  notes: z.string(),
  photo: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .optional(),
  kcal: z.number().nonnegative().finite().optional(),
  protein: z.number().nonnegative().finite().optional(),
  carbs: z.number().nonnegative().finite().optional(),
  fat: z.number().nonnegative().finite().optional(),
});
export const foodSchema = z.object({
  ...provenanceFields,
  brand: z.string().optional(),
  imageUrl: z.string().url().regex(/^https:\/\//).optional(),
  aliases: z.array(z.string()).optional(),
  favorite: z.boolean().optional(),
  lastUsed: z.number().finite().nonnegative().optional(),
  cachedAt: z.number().finite().nonnegative().optional(),
  ingredients: z.array(ingredientSchema).max(100).optional(),
  portions: z.number().positive().finite().optional(),
  id: z.string(),
  name: z.string().min(1),
  kind: z.enum(["food", "recipe", "drink", "cache"]),
  notes: z.string(),
  kcal: z.number().nonnegative().finite().optional(),
  protein: z.number().nonnegative().finite().optional(),
  carbs: z.number().nonnegative().finite().optional(),
  fat: z.number().nonnegative().finite().optional(),
});
export type NutritionEntry = z.infer<typeof nutritionSchema>;
export type Food = z.infer<typeof foodSchema>;
export const nutritionPreferencesSchema = z.object({
  showNutrients: z.boolean(),
  categories: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(60)
        .refine((v) => v !== "Getränke", "Getränke separat konfigurieren"),
    )
    .min(1)
    .max(12)
    .refine(
      (v) => new Set(v.map((x) => x.toLocaleLowerCase())).size === v.length,
      "Kategorien müssen eindeutig sein",
    ),
  reminders: z.boolean(),
  reminderTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(12),
  drinkAmount: z.number().int().min(1).max(5000),
  drinkName: z.string().trim().min(1).max(60),
  showDrinkTotal: z.boolean(),
});
export type NutritionPreferences = z.infer<typeof nutritionPreferencesSchema>;
export const nutritionDefaults: NutritionPreferences = {
  showNutrients: true,
  categories: ["Frühstück", "Mittagessen", "Abendessen", "Snacks"],
  reminders: false,
  reminderTimes: ["08:00", "12:00", "18:00"],
  drinkAmount: 250,
  drinkName: "Wasser",
  showDrinkTotal: true,
};
export const settingsSchema = z.object({
  id: z.literal("settings"),
  nutrition: z.boolean().optional(),
  hydration: z.boolean().optional(),
  nutritionPreferences: nutritionPreferencesSchema.optional(),
  rest: z.number().int().min(1).max(3600),
  auto: z.boolean(),
  theme: z
    .enum(["swiss", "midnight", "stone", "forest", "glass", "system"])
    .optional(),
  timerEnd: z.number().nullable(),
  paused: z.number().nullable(),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type Item = z.infer<typeof itemSchema>;
export type SetRow = z.infer<typeof setSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export const db = new Dexie("SET") as Dexie & {
  nutrition: EntityTable<NutritionEntry, "id">;
  foods: EntityTable<Food, "id">;
  dayNotes: EntityTable<{ id: string; notes: string }, "id">;
  exercises: EntityTable<Exercise, "id">;
  workouts: EntityTable<Workout, "id">;
  settings: EntityTable<Settings, "id">;
};
db.version(1).stores({
  exercises: "id,name,muscle,equipment",
  workouts: "id,status,date",
  settings: "id",
});
// Additive upgrade: no records or IDs are removed. Legacy set types stay implicit work.
db.version(2)
  .stores({
    exercises: "id,name,muscle,equipment",
    workouts: "id,status,date",
    settings: "id",
  })
  .upgrade(async (tx) => {
    const library = (await tx.table("exercises").toArray()) as Exercise[];
    await tx
      .table("workouts")
      .toCollection()
      .modify((w: Workout) => {
        w.exercises = snapshotItems(w.exercises, library);
      });
  });
db.version(3).stores({
  nutrition: "id,date,meal",
  foods: "id,name,kind",
  dayNotes: "id",
});
export function snapshotItems(items: Item[], library: Exercise[]): Item[] {
  return items.map((item) => {
    const exercise = library.find((e) => e.id === item.exerciseId);
    return exercise
      ? {
          ...item,
          muscle: item.muscle ?? exercise.muscle,
          equipment: item.equipment ?? exercise.equipment,
          ...(item.movement || exercise.movement
            ? { movement: item.movement ?? exercise.movement }
            : {}),
        }
      : item;
  });
}
export const defaults: Settings = {
  id: "settings",
  rest: 90,
  auto: true,
  timerEnd: null,
  paused: null,
};
export const muscles = [
  "Brust",
  "Rücken",
  "Schultern",
  "Bizeps",
  "Trizeps",
  "Beine",
  "Waden",
  "Bauch",
  "Ganzkörper",
  "Sonstige",
];
export const equipment = [
  "Maschine",
  "Kurzhantel",
  "Langhantel",
  "Kabelzug",
  "Körpergewicht",
  "Multipresse",
  "SZ-Stange",
  "Trap Bar",
  "Kettlebell",
  "Widerstandsband",
  "Landmine",
  "Schlingentrainer",
  "Ab-Roller",
  "Sonstige",
];
export async function init() {
  await db.transaction("rw", db.exercises, db.settings, async () => {
    if (!(await db.settings.get("settings"))) {
      await db.settings.put(defaults);
      await db.exercises.bulkPut(
        [
          "Brustpresse",
          "Bankdrücken",
          "Schulterdrücken",
          "Seitheben",
          "Latzug",
          "Rudern",
          "Bizepscurls",
          "Trizepsdrücken",
          "Beinpresse",
          "Kniebeugen",
          "Beinbeuger",
          "Beinstrecker",
          "Wadenheben",
        ].map((name, i) => ({
          id: id(),
          name,
          muscle: muscles[[0, 0, 2, 2, 1, 1, 3, 4, 5, 5, 5, 5, 6][i]],
          equipment: i === 1 || i === 9 ? "Langhantel" : "Maschine",
          favorite: false,
          notes: "",
        })),
      );
    }
  });
}
export const emptySet = (): SetRow => ({
  id: id(),
  weight: null,
  reps: null,
  completed: false,
});
export const isWork = (s: SetRow) => s.type !== "warmup";
export const isCompletedWork = (s: SetRow) => s.completed && isWork(s);
export const volume = (w: Workout) =>
  w.exercises
    .flatMap((e) => e.sets)
    .reduce(
      (a, s) => a + (isCompletedWork(s) ? (s.weight ?? 0) * (s.reps ?? 0) : 0),
      0,
    );
export const count = (w: Workout) =>
  w.exercises.flatMap((e) => e.sets).filter(isCompletedWork).length;
export const backupSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  appVersion: z.string(),
  exportedAt: z.string(),
  nutrition: z.array(nutritionSchema).optional(),
  foods: z.array(foodSchema).optional(),
  dayNotes: z.array(z.object({ id: z.string(), notes: z.string() })).optional(),
  exercises: z.array(exerciseSchema),
  workouts: z.array(workoutSchema),
  settings: settingsSchema,
});
export async function exportData() {
  return db.transaction(
    "r",
    [
      db.exercises,
      db.workouts,
      db.settings,
      db.nutrition,
      db.foods,
      db.dayNotes,
    ],
    async () => ({
      schemaVersion: 2 as const,
      appVersion: "3.0.0",
      nutrition: await db.nutrition.toArray(),
      foods: await db.foods.toArray(),
      dayNotes: await db.dayNotes.toArray(),
      exportedAt: new Date().toISOString(),
      exercises: await db.exercises.toArray(),
      workouts: await db.workouts.toArray(),
      settings: (await db.settings.get("settings"))!,
    }),
  );
}
export async function restore(raw: unknown) {
  const b = backupSchema.parse(raw);
  if (b.schemaVersion === 2 && (!b.nutrition || !b.foods || !b.dayNotes))
    throw Error("Unvollständiges Backup");
  for (const rows of [
    b.exercises,
    b.workouts,
    b.nutrition ?? [],
    b.foods ?? [],
    b.dayNotes ?? [],
  ])
    if (new Set(rows.map((x) => x.id)).size !== rows.length)
      throw Error("Doppelte IDs");
  if (b.workouts.filter((w) => w.status === "active").length > 1)
    throw Error("Mehrere aktive Workouts");
  await db.transaction(
    "rw",
    [
      db.exercises,
      db.workouts,
      db.settings,
      db.nutrition,
      db.foods,
      db.dayNotes,
    ],
    async () => {
      if (b.schemaVersion === 2) {
        await db.nutrition.clear();
        await db.foods.clear();
        await db.dayNotes.clear();
        await db.nutrition.bulkPut(b.nutrition ?? []);
        await db.foods.bulkPut(b.foods ?? []);
        await db.dayNotes.bulkPut(b.dayNotes ?? []);
      }
      await db.exercises.clear();
      await db.workouts.clear();
      await db.settings.clear();
      await db.exercises.bulkPut(b.exercises);
      await db.workouts.bulkPut(
        b.workouts.map((w) => ({
          ...w,
          exercises: snapshotItems(w.exercises, b.exercises),
        })),
      );
      await db.settings.put({ ...b.settings, timerEnd: null, paused: null });
    },
  );
}
