import { alternatives, swapExercise } from "./swap";
import type { Exercise, Item, Workout } from "../data";
export function ExerciseSwap({w,item,library,save}:{w:Workout;item:Item;library:Exercise[];save:(w:Workout)=>void}) {
  const options = alternatives(item,library);
  return <details className="exercise-swap"><summary>Übung ersetzen</summary><p>Abgeschlossene Sätze bleiben bei {item.name}. Die Ersatzübung startet ohne Gewichte, Wiederholungen oder Belastungswerte.</p>
    {options.length ? options.map(({exercise,reason}) => <button className="swap-option" key={exercise.id} onClick={()=>save(swapExercise(w,item.id,exercise))}><strong>{exercise.name}</strong><small>{reason}</small></button>) : <p>Keine Alternativen mit derselben Muskelgruppe. Ergänze die Zuordnung in der Übungsbibliothek.</p>}
  </details>;
}
