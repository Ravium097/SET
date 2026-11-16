import { db, id, type Workout } from "../data";
export const exampleId = "set-example-fullbody-v1";
/** Only an editable template. No weights, completed sets or training history. */
export async function addExampleRoutine() {
  await db.transaction("rw", db.exercises, db.workouts, async () => {
    if (await db.workouts.get(exampleId)) return;
    const definitions = [
      ["Beinpresse", "Beine"],
      ["Brustpresse", "Brust"],
      ["Rudern", "Rücken"],
    ];
    const existing = await db.exercises.toArray();
    const exercises = [];
    for (const [name, muscle] of definitions) {
      let definition = existing.find(
        (e) => e.name === name && e.equipment === "Maschine",
      );
      if (!definition) {
        definition = {
          id: id(),
          name,
          muscle,
          equipment: "Maschine",
          favorite: false,
          notes: "",
        };
        await db.exercises.add(definition);
      }
      exercises.push({
        id: id(),
        exerciseId: definition.id,
        name: definition.name,
        sets: Array.from({ length: 2 }, () => ({
          id: id(),
          weight: null,
          reps: null,
          completed: false,
        })),
      });
    }
    const workout: Workout = {
      id: exampleId,
      name: "Beispiel: Ganzkörper",
      date: new Date().toISOString().slice(0, 10),
      status: "template",
      started: null,
      duration: null,
      exercises,
    };
    await db.workouts.add(workout);
  });
  return exampleId;
}
