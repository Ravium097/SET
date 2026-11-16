import "fake-indexeddb/auto";
import { beforeEach, it, expect } from "vitest";
import { db, init, exportData, type Workout } from "../data";
import { addExampleRoutine, exampleId } from "../services/onboarding";
import { setFocus } from "../services/setFocus";
beforeEach(async () => {
  await db.workouts.clear();
  await db.exercises.clear();
  await db.settings.clear();
  await init();
});
it("creates one example template only on explicit request without invented values", async () => {
  const before = await exportData();
  expect(before.workouts).toHaveLength(0);
  await Promise.all([addExampleRoutine(), addExampleRoutine()]);
  const w = (await db.workouts.get(exampleId))!;
  expect(await db.workouts.count()).toBe(1);
  expect(w.status).toBe("template");
  expect(w.started).toBeNull();
  expect(w.exercises).toHaveLength(3);
  expect(w.exercises.flatMap((e) => e.sets)).toHaveLength(6);
  for (const s of w.exercises.flatMap((e) => e.sets))
    expect([s.weight, s.reps, s.completed]).toEqual([null, null, false]);
  expect(await db.exercises.toArray()).toEqual(before.exercises);
  await db.workouts.update(exampleId, { name: "Meine Vorlage" });
  await addExampleRoutine();
  expect((await db.workouts.get(exampleId))?.name).toBe("Meine Vorlage");
});
it("rolls back missing exercise creation when template save fails", async () => {
  await db.exercises.clear();
  const fail = () => {
    throw Error("disk full");
  };
  db.workouts.hook("creating", fail);
  try {
    await expect(addExampleRoutine()).rejects.toThrow();
  } finally {
    db.workouts.hook("creating").unsubscribe(fail);
  }
  expect(await db.exercises.count()).toBe(0);
  expect(await db.workouts.count()).toBe(0);
});
it("selects only one current and next unfinished set across exercises without mutating data", async () => {
  await addExampleRoutine();
  const w = (await db.workouts.get(exampleId))!;
  expect(setFocus(w)).toEqual({ current: undefined, next: undefined });
  const active: Workout = { ...w, status: "active" };
  const sets = active.exercises.flatMap((e) => e.sets);
  expect(setFocus(active)).toEqual({ current: sets[0].id, next: sets[1].id });
  sets[0].completed = true;
  sets[1].completed = true;
  expect(setFocus(active)).toEqual({ current: sets[2].id, next: sets[3].id });
  sets.forEach((s) => (s.completed = true));
  expect(setFocus(active)).toEqual({ current: undefined, next: undefined });
  expect(
    (await db.workouts.get(exampleId))?.exercises[0].sets[0].completed,
  ).toBe(false);
});
