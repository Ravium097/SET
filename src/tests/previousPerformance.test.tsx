// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Workout, SetRow } from "../data";
import { previousPerformance } from "../services/previousPerformance";
import { PreviousSet } from "../components/workout/PreviousSet";
afterEach(cleanup);
const set = (
  weight: number | null,
  reps: number | null,
  completed = true,
): SetRow => ({ id: "set", weight, reps, completed });
const workout = (
  id: string,
  date: string,
  status: Workout["status"] = "completed",
  started: number | null = 1,
): Workout => ({
  id,
  date,
  status,
  started,
  duration: null,
  name: id,
  exercises: [
    {
      id: "item",
      exerciseId: "bench",
      name: "Bankdrücken",
      sets: [set(50, 8)],
    },
  ],
});
const current = () => workout("current", "2026-11-16", "active", 200);
it("uses latest completed exercise before current session, never template/future/self", () => {
  const active = current();
  const recent = workout("recent", "2026-11-16", "completed", 100);
  expect(
    previousPerformance(active, 0, [
      active,
      workout("older", "2026-11-15"),
      workout("future", "2026-11-17"),
      workout("template", "2026-11-16", "template", 150),
      workout("later", "2026-11-16", "completed", 300),
      recent,
    ])?.date,
  ).toBe(recent.date);
  expect(previousPerformance(active, 0, [])).toBeNull();
});
it("does not equate names or shift incomplete set positions", () => {
  const prior = workout("prior", "2026-11-15");
  prior.exercises[0].name = "Umbenannt";
  prior.exercises[0].sets = [set(20, 4, false), set(55, 6)];
  expect(previousPerformance(current(), 0, [prior])?.sets[1].weight).toBe(55);
  prior.exercises[0].exerciseId = "different-machine";
  expect(previousPerformance(current(), 0, [prior])).toBeNull();
});
it("uses matching occurrence and reflects edits or deletion", () => {
  const active = current();
  active.exercises.push({ ...active.exercises[0], id: "second" });
  const prior = workout("prior", "2026-11-15");
  prior.exercises.push({
    ...prior.exercises[0],
    id: "second",
    sets: [set(60, 5)],
  });
  expect(previousPerformance(active, 1, [prior])?.sets[0].weight).toBe(60);
  prior.exercises[1].sets[0].weight = 62.5;
  expect(previousPerformance(active, 1, [prior])?.sets[0].weight).toBe(62.5);
  expect(previousPerformance(active, 1, [])).toBeNull();
});
it("keeps missing weight null and does not guess same-day chronology", () => {
  const prior = workout("import", "2026-11-16", "completed", null);
  expect(previousPerformance(current(), 0, [prior])).toBeNull();
  prior.date = "2026-11-15";
  prior.exercises[0].sets = [set(null, 12)];
  expect(previousPerformance(current(), 0, [prior])?.sets[0].weight).toBeNull();
});
it("copies only weight and reps explicitly, never completion", () => {
  const apply = vi.fn();
  render(
    <PreviousSet
      previous={set(52.5, 8)}
      date="2026-11-15"
      completed={false}
      onApply={apply}
    />,
  );
  expect(screen.getByText(/52,5 kg × 8/)).toBeTruthy();
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button"));
  expect(apply).toHaveBeenCalledWith({ weight: 52.5, reps: 8 });
});
it("disables copying into completed sets and hides uncompleted history", () => {
  const apply = vi.fn();
  const view = render(
    <PreviousSet
      previous={set(null, 12)}
      date="2026-11-15"
      completed
      onApply={apply}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByText(/ohne Gewichtsangabe/)).toBeTruthy();
  view.rerender(
    <PreviousSet
      previous={set(50, 8, false)}
      date="2026-11-15"
      completed={false}
      onApply={apply}
    />,
  );
  expect(screen.queryByRole("button")).toBeNull();
});
