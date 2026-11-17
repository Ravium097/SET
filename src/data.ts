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
export const settingsSchema = z.object({
  id: z.literal("settings"),
  rest: z.number().int().min(1).max(3600),
  auto: z.boolean(),
  theme: z.enum(["swiss", "midnight", "stone", "forest", "system"]).optional(),
  timerEnd: z.number().nullable(),
  paused: z.number().nullable(),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type Item = z.infer<typeof itemSchema>;
export type SetRow = z.infer<typeof setSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export const db = new Dexie("SET") as Dexie & {
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
db.version(2).stores({exercises:"id,name,muscle,equipment",workouts:"id,status,date",settings:"id"}).upgrade(async tx => {
  const library = await tx.table("exercises").toArray() as Exercise[];
  await tx.table("workouts").toCollection().modify((w: Workout) => {
    w.exercises = snapshotItems(w.exercises, library);
  });
});
export function snapshotItems(items: Item[], library: Exercise[]): Item[] {
  return items.map(item => {
    const exercise = library.find(e => e.id === item.exerciseId);
    return exercise ? {...item, muscle:item.muscle ?? exercise.muscle, equipment:item.equipment ?? exercise.equipment,
      ...(item.movement || exercise.movement ? {movement:item.movement ?? exercise.movement} : {})} : item;
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
  schemaVersion: z.literal(1),
  appVersion: z.string(),
  exportedAt: z.string(),
  exercises: z.array(exerciseSchema),
  workouts: z.array(workoutSchema),
  settings: settingsSchema,
});
export async function exportData() {
  return db.transaction(
    "r",
    db.exercises,
    db.workouts,
    db.settings,
    async () => ({
      schemaVersion: 1 as const,
      appVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      exercises: await db.exercises.toArray(),
      workouts: await db.workouts.toArray(),
      settings: (await db.settings.get("settings"))!,
    }),
  );
}
export async function restore(raw: unknown) {
  const b = backupSchema.parse(raw);
  for (const rows of [b.exercises, b.workouts])
    if (new Set(rows.map((x) => x.id)).size !== rows.length)
      throw Error("Doppelte IDs");
  if (b.workouts.filter((w) => w.status === "active").length > 1)
    throw Error("Mehrere aktive Workouts");
  await db.transaction(
    "rw",
    db.exercises,
    db.workouts,
    db.settings,
    async () => {
      await db.exercises.clear();
      await db.workouts.clear();
      await db.settings.clear();
      await db.exercises.bulkPut(b.exercises);
      await db.workouts.bulkPut(b.workouts.map(w => ({...w,exercises:snapshotItems(w.exercises,b.exercises)})));
      await db.settings.put({ ...b.settings, timerEnd: null, paused: null });
    },
  );
}
