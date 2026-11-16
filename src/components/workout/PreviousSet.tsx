import type { SetRow } from "../../data";
export function PreviousSet({
  previous,
  date,
  completed,
  onApply,
}: {
  previous: SetRow | undefined;
  date: string;
  completed: boolean;
  onApply: (values: { weight: number | null; reps: number | null }) => void;
}) {
  if (!previous?.completed || previous.reps === null) return null;
  const weight =
    previous.weight === null
      ? "ohne Gewichtsangabe"
      : `${previous.weight.toLocaleString("de-DE")} kg`;
  return (
    <div className="previous-set">
      <small>
        Zuletzt ({date.split("-").reverse().join(".")}): {weight} ×{" "}
        {previous.reps}
      </small>
      <button
        disabled={completed}
        aria-label="Letzte Satzwerte übernehmen"
        onClick={() =>
          onApply({ weight: previous.weight, reps: previous.reps })
        }
      >
        Übernehmen
      </button>
    </div>
  );
}
