import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import {
  db,
  init,
  exportData,
  restore,
  exerciseSchema,
  equipment,
  muscles,
} from "../data";
import { exerciseCatalog, catalogId } from "../catalog/exercises";
import {
  addExerciseCatalog,
  matchesExercise,
} from "../services/exerciseCatalog";
beforeEach(async () => {
  await db.workouts.clear();
  await db.exercises.clear();
  await db.settings.clear();
  await init();
});
it("has unique stable keys and valid categories for every definition", () => {
  expect(new Set(exerciseCatalog.map((e) => e.key)).size).toBe(
    exerciseCatalog.length,
  );
  expect(
    new Set(exerciseCatalog.map((e) => `${e.name}|${e.equipment}`)).size,
  ).toBe(exerciseCatalog.length);
  for (const entry of exerciseCatalog) {
    expect(muscles).toContain(entry.muscle);
    expect(equipment).toContain(entry.equipment);
    expect(
      exerciseSchema.safeParse({
        ...entry,
        id: catalogId(entry.key),
        favorite: false,
        notes: "",
      }).success,
    ).toBe(true);
  }
});
it("adds missing exercises once, preserving custom fields and history", async () => {
  const original = await db.exercises.toArray();
  await db.exercises.update(original[0].id, {
    favorite: true,
    notes: "Sitz 4",
    rest: 123,
  });
  const before = await exportData();
  await Promise.all([addExerciseCatalog(), addExerciseCatalog()]);
  expect(await db.exercises.count()).toBe(exerciseCatalog.length);
  for (const exercise of before.exercises)
    expect(await db.exercises.get(exercise.id)).toEqual(exercise);
  expect(await db.workouts.count()).toBe(0);
  expect(await db.settings.get("settings")).toEqual(before.settings);
  expect(await addExerciseCatalog()).toBe(0);
  const backup = await exportData();
  await restore(backup);
  expect(await db.exercises.toArray()).toEqual(backup.exercises);
});
it("recognizes exact English aliases only with the same equipment", async () => {
  await db.exercises.add({
    id: "personal",
    name: "Chest Press",
    equipment: "Maschine",
    muscle: "Brust",
    favorite: true,
    notes: "mine",
  });
  await addExerciseCatalog();
  expect(await db.exercises.get(catalogId("chest-press"))).toBeUndefined();
  expect((await db.exercises.get("personal"))?.notes).toBe("mine");
  expect(matchesExercise((await db.exercises.get("personal"))!, "brustpresse")).toBe(true);
  const smith = (await db.exercises.get(catalogId("smith-bench")))!;
  expect(matchesExercise(smith, "smith bench")).toBe(true);
  expect(matchesExercise(smith, "multipresse")).toBe(true);
  expect(matchesExercise(smith, "schrag")).toBe(false);
  const row = (await db.exercises.get(catalogId("barbell-row")))!;
  expect(matchesExercise(row, "rucken")).toBe(true);
});
it("rolls back catalog additions on storage error", async () => {
  const before = await db.exercises.toArray();
  let calls = 0;
  const fail = () => {
    if (++calls === 3) throw Error("disk full");
  };
  db.exercises.hook("creating", fail);
  try {
    await expect(addExerciseCatalog()).rejects.toThrow();
  } finally {
    db.exercises.hook("creating").unsubscribe(fail);
  }
  expect(await db.exercises.toArray()).toEqual(before);
});
it("does not resurrect a deleted exercise on normal init", async () => {
  await addExerciseCatalog();
  await db.exercises.delete(catalogId("smith-bench"));
  await init();
  expect(await db.exercises.get(catalogId("smith-bench"))).toBeUndefined();
});
