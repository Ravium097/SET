import { tr } from "../i18n/runtime";
import { db, exerciseSchema, type Exercise } from "../data";
import {
  exerciseCatalog,
  catalogId,
  normalizeExerciseName,
} from "../catalog/exercises";
const namesOf = (entry: (typeof exerciseCatalog)[number]) =>
  [entry.name, ...entry.aliases].map(normalizeExerciseName);
const catalogById=new Map(exerciseCatalog.map(entry=>[catalogId(entry.key),entry]));
const catalogByName=new Map<string,(typeof exerciseCatalog)[number]>();
for(const entry of exerciseCatalog)for(const name of namesOf(entry)){
  const key=entry.equipment+'\0'+name;if(!catalogByName.has(key))catalogByName.set(key,entry);
}
export function catalogMatch(exercise: Exercise) {
 return catalogById.get(exercise.id)??catalogByName.get(exercise.equipment+'\0'+normalizeExerciseName(exercise.name));
}
export function matchesExercise(exercise: Exercise, query: string) {
  const entry = catalogMatch(exercise);
  const text = normalizeExerciseName(
    [
      exercise.name,
      entry?.name ?? "",
      exercise.muscle,
      exercise.equipment,
      tr(exercise.muscle),
      tr(exercise.equipment),
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
