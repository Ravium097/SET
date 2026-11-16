import type { Workout } from "../data";
export function setFocus(workout: Workout) {
  const open =
    workout.status === "active"
      ? workout.exercises.flatMap((e) => e.sets).filter((s) => !s.completed)
      : [];
  return { current: open[0]?.id, next: open[1]?.id };
}
