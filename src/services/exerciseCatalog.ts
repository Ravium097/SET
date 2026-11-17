import { db, exerciseSchema, type Exercise } from "../data";
import {
  exerciseCatalog,
  catalogId,
  normalizeExerciseName,
} from "../catalog/exercises";
const namesOf = (entry: (typeof exerciseCatalog)[number]) =>
  [entry.name, ...entry.aliases].map(normalizeExerciseName);
export function catalogMatch(exercise: Exercise) {
  return (
    exerciseCatalog.find((entry) => catalogId(entry.key) === exercise.id) ??
    exerciseCatalog.find(
      (entry) =>
        entry.equipment === exercise.equipment &&
        namesOf(entry).includes(normalizeExerciseName(exercise.name)),
    )
  );
}
export function matchesExercise(exercise: Exercise, query: string) {
  const entry = catalogMatch(exercise);
  const text = normalizeExerciseName(
    [
      exercise.name,
      entry?.name ?? "",
      exercise.muscle,
      exercise.equipment,
      ...(entry?.aliases ?? []),
    ].join(" "),
  );
  return normalizeExerciseName(query)
    .split(" ")
    .every((word) => text.includes(word));
}
export async function addExerciseCatalog() {
  return db.transaction("rw", db.exercises, async () => {
    const existing = await db.exercises.toArray();
    const additions = exerciseCatalog
      .filter(
        (entry) =>
          !existing.some(
            (e) =>
              e.id === catalogId(entry.key) ||
              (e.equipment === entry.equipment &&
                namesOf(entry).includes(normalizeExerciseName(e.name))),
          ),
      )
      .map((entry) =>
        exerciseSchema.parse({
          id: catalogId(entry.key),
          name: entry.name,
          muscle: entry.muscle,
          equipment: entry.equipment,
          favorite: false,
          notes: "",
        }),
      );
    await db.exercises.bulkAdd(additions);
    return additions.length;
  });
}
