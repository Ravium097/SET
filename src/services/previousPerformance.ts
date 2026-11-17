import { isCompletedWork } from "../data";
import type { Item, SetRow, Workout } from "../data";
/** Exact exercise identity + occurrence: never equate similarly named machines. */
export function previousPerformance(
  current: Workout,
  itemIndex: number,
  history: Workout[],
): { date: string; sets: SetRow[] } | null {
  const item = current.exercises[itemIndex];
  if (!item) return null;
  const occurrence = current.exercises
    .slice(0, itemIndex)
    .filter((e) => e.exerciseId === item.exerciseId).length;
  const candidates = history
    .filter(
      (w) =>
        w.id !== current.id &&
        w.status === "completed" &&
        (w.date < current.date ||
          (w.date === current.date &&
            w.started !== null &&
            current.started !== null &&
            w.started < current.started)),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.started ?? 0) - (a.started ?? 0) ||
        a.id.localeCompare(b.id),
    );
  for (const w of candidates) {
    const previous: Item | undefined = w.exercises.filter(
      (e) => e.exerciseId === item.exerciseId,
    )[occurrence];
    if (previous?.sets.some((s) => isCompletedWork(s) && s.reps !== null))
      return { date: w.date, sets: previous.sets.filter(s => s.type !== "warmup") };
  }
  return null;
}
