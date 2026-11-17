import { count, isWork, volume, type Workout } from "../data";
export function workoutSummary(w: Workout, now: number) {
  const planned = w.exercises.flatMap(e => e.sets).filter(isWork).length;
  const completed = count(w);
  return {planned, completed, volume: volume(w), progress: planned ? Math.round(completed / planned * 100) : 0,
    seconds: w.status === "active" && w.started !== null ? Math.max(0, Math.floor((now-w.started)/1000)) : w.duration ?? 0};
}
