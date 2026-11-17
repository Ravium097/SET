import { emptySet, id, type Exercise, type Item, type Workout } from "../data";
export const movements = ["Horizontal drücken","Vertikal drücken","Horizontal ziehen","Vertikal ziehen","Kniebeuge","Hüftstreckung","Kniebeugung","Kniestreckung","Armbeugung","Armstreckung","Abduktion","Wadenheben","Rumpf"];
const known: Record<string,string> = {"Brustpresse":"Horizontal drücken","Bankdrücken":"Horizontal drücken","Schulterdrücken":"Vertikal drücken","Seitheben":"Abduktion","Latzug":"Vertikal ziehen","Rudern":"Horizontal ziehen","Bizepscurls":"Armbeugung","Trizepsdrücken":"Armstreckung","Beinpresse":"Kniebeuge","Kniebeugen":"Kniebeuge","Beinbeuger":"Kniebeugung","Beinstrecker":"Kniestreckung","Wadenheben":"Wadenheben"};
export const movementOf = (e: {name:string;movement?:string}) => e.movement ?? known[e.name] ?? "";
export function alternatives(source: Item, library: Exercise[]) {
  const original = library.find(e => e.id === source.exerciseId);
  const muscle = source.muscle ?? original?.muscle;
  const movement = source.movement ?? (original ? movementOf(original) : movementOf(source));
  const equipment = source.equipment ?? original?.equipment;
  return library.filter(e => e.id !== source.exerciseId && muscle && e.muscle === muscle).map(e => ({
    exercise:e, score:(movement && movementOf(e) === movement ? 4:0)+(e.equipment === equipment ? 2:0),
    reason:[movement && movementOf(e) === movement ? "gleiches Bewegungsmuster" : "gleiche Muskelgruppe",e.equipment === equipment ? "gleiches Equipment" : e.equipment].join(" · ")
  })).sort((a,b) => b.score-a.score || a.exercise.name.localeCompare(b.exercise.name));
}
export function swapExercise(w:Workout, itemId:string, target:Exercise):Workout {
  const source = w.exercises.find(e => e.id === itemId);
  if (!source || source.exerciseId === target.id) return w;
  const completed = source.sets.filter(s => s.completed);
  const pending = source.sets.filter(s => !s.completed);
  const replacement:Item = {id:id(),exerciseId:target.id,name:target.name,muscle:target.muscle,equipment:target.equipment,movement:movementOf(target),replacedFrom:source.exerciseId,
    sets:pending.length ? pending.map(s => ({...emptySet(),type:s.type})) : [emptySet()]};
  return {...w,exercises:w.exercises.flatMap(e => e.id !== itemId ? [e] : [...(completed.length ? [{...e,sets:completed}] : []),replacement])};
}
