import { tr } from "../i18n/runtime";
import { alternatives, swapExercise } from "./swap";
import type { Exercise, Item, Workout } from "../data";
export function ExerciseSwap({ w, item, library, save }: {
    w: Workout;
    item: Item;
    library: Exercise[];
    save: (w: Workout) => void;
}) {
    const options = alternatives(item, library);
    return <details className="exercise-swap"><summary>{tr("\u00DCbung ersetzen")}</summary><p>{tr("Abgeschlossene S\u00E4tze bleiben bei ")}{item.name}{tr(". Die Ersatz\u00FCbung startet ohne Gewichte, Wiederholungen oder Belastungswerte.")}</p>
    {options.length ? options.map(({ exercise, reason }) => <button className="swap-option" key={exercise.id} onClick={() => save(swapExercise(w, item.id, exercise))}><strong>{exercise.name}</strong><small>{reason.split(" · ").map(part=>tr(part)).join(" · ")}</small></button>) : <p>{tr("Keine Alternativen mit derselben Muskelgruppe. Erg\u00E4nze die Zuordnung in der \u00DCbungsbibliothek.")}</p>}
  </details>;
}
