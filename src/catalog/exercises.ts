// Curated exercise definitions; research sources and scope: docs/EXERCISE-CATALOG.md.
// IDs derive from explicit stable keys, never from editable labels or array position.
export type CatalogExercise = {
  key: string;
  name: string;
  muscle: string;
  equipment: string;
  aliases: string[];
};
const rows = `
chest-press|Brustpresse|Brust|Maschine|Chest Press
bench-press|Bankdrücken|Brust|Langhantel|Barbell Bench Press
incline-bench|Schrägbankdrücken|Brust|Langhantel|Incline Bench Press
decline-bench|Negativbankdrücken|Brust|Langhantel|Decline Bench Press
db-bench|Bankdrücken mit Kurzhanteln|Brust|Kurzhantel|Dumbbell Bench Press
db-incline|Schrägbankdrücken mit Kurzhanteln|Brust|Kurzhantel|Incline Dumbbell Press
db-decline|Negativbankdrücken mit Kurzhanteln|Brust|Kurzhantel|Decline Dumbbell Press
db-fly|Fliegende mit Kurzhanteln|Brust|Kurzhantel|Dumbbell Fly
incline-fly|Fliegende auf der Schrägbank|Brust|Kurzhantel|Incline Dumbbell Fly
pec-deck|Butterfly|Brust|Maschine|Pec Deck;Chest Fly
incline-machine|Schrägbank-Brustpresse|Brust|Maschine|Incline Chest Press
cable-fly|Fliegende am Kabelzug|Brust|Kabelzug|Cable Fly;Cable Crossover
low-cable-fly|Fliegende am Kabelzug von unten|Brust|Kabelzug|Low Cable Fly
high-cable-fly|Fliegende am Kabelzug von oben|Brust|Kabelzug|High Cable Fly
cable-press|Brustdrücken am Kabelzug|Brust|Kabelzug|Cable Chest Press
smith-bench|Bankdrücken an der Multipresse|Brust|Multipresse|Smith Machine Bench Press
smith-incline|Schrägbankdrücken an der Multipresse|Brust|Multipresse|Smith Machine Incline Press
push-up|Liegestütze|Brust|Körpergewicht|Push Up;Pushup
wide-push-up|Breite Liegestütze|Brust|Körpergewicht|Wide Push Up
incline-push-up|Erhöhte Liegestütze|Brust|Körpergewicht|Incline Push Up
decline-push-up|Liegestütze mit erhöhten Füßen|Brust|Körpergewicht|Decline Push Up
chest-dip|Dips mit Brustfokus|Brust|Körpergewicht|Chest Dip
band-chest|Brustdrücken mit Widerstandsband|Brust|Widerstandsband|Band Chest Press
lat-pulldown|Latzug|Rücken|Maschine|Lat Pulldown
cable-lat|Latzug am Kabelzug|Rücken|Kabelzug|Cable Lat Pulldown
close-lat|Latzug mit engem Griff|Rücken|Kabelzug|Close Grip Lat Pulldown
underhand-lat|Latzug im Untergriff|Rücken|Kabelzug|Reverse Grip Lat Pulldown
single-lat|Einarmiger Latzug|Rücken|Kabelzug|Single Arm Lat Pulldown
pull-up|Klimmzüge im Obergriff|Rücken|Körpergewicht|Pull Up;Pullup
chin-up|Klimmzüge im Untergriff|Rücken|Körpergewicht|Chin Up;Chinup
neutral-pull-up|Klimmzüge mit neutralem Griff|Rücken|Körpergewicht|Neutral Grip Pull Up
assisted-pull-up|Klimmzüge mit Unterstützung|Rücken|Maschine|Assisted Pull Up
machine-row|Rudern|Rücken|Maschine|Machine Row;Seated Row
high-row|High Row|Rücken|Maschine|High Row Machine
single-machine-row|Einarmiges Maschinenrudern|Rücken|Maschine|One arm seated cable row;Single Arm Machine Row
cable-row|Sitzendes Rudern am Kabelzug|Rücken|Kabelzug|Seated Cable Row
wide-cable-row|Breites Rudern am Kabelzug|Rücken|Kabelzug|Wide Grip Seated Cable Row
single-cable-row|Einarmiges Rudern am Kabelzug|Rücken|Kabelzug|Single Arm Cable Row
barbell-row|Vorgebeugtes Langhantelrudern|Rücken|Langhantel|Bent Over Row;Barbell Row
pendlay-row|Pendlay-Rudern|Rücken|Langhantel|Pendlay Row
db-row|Einarmiges Kurzhantelrudern|Rücken|Kurzhantel|One Arm Dumbbell Row
chest-supported-row|Brustgestütztes Kurzhantelrudern|Rücken|Kurzhantel|Chest Supported Dumbbell Row
tbar-row|T-Bar-Rudern|Rücken|Landmine|T Bar Row
supported-tbar|Brustgestütztes T-Bar-Rudern|Rücken|Maschine|Chest Supported T Bar Row
inverted-row|Umgekehrtes Rudern|Rücken|Körpergewicht|Inverted Row
suspension-row|Rudern am Schlingentrainer|Rücken|Schlingentrainer|Suspension Row;TRX Row
straight-pulldown|Latzug mit gestreckten Armen|Rücken|Kabelzug|Straight Arm Pulldown
pullover-machine|Überzüge an der Maschine|Rücken|Maschine|Pullover Machine
db-pullover|Überzüge mit Kurzhantel|Rücken|Kurzhantel|Dumbbell Pullover
back-extension|Rückenstrecken|Rücken|Körpergewicht|Back Extension;Hyperextension
machine-back-extension|Rückenstrecken an der Maschine|Rücken|Maschine|Machine Back Extension
band-row|Rudern mit Widerstandsband|Rücken|Widerstandsband|Resistance Band Row
machine-shoulder|Schulterdrücken|Schultern|Maschine|Machine Shoulder Press
overhead-press|Schulterdrücken mit Langhantel|Schultern|Langhantel|Military Press;Overhead Press
seated-db-press|Schulterdrücken mit Kurzhanteln|Schultern|Kurzhantel|Dumbbell Shoulder Press
arnold-press|Arnold-Press|Schultern|Kurzhantel|Arnold Press
smith-shoulder|Schulterdrücken an der Multipresse|Schultern|Multipresse|Smith Machine Shoulder Press
landmine-press|Einarmige Landmine-Press|Schultern|Landmine|Landmine Press
machine-lateral|Seitheben|Schultern|Maschine|Machine Lateral Raise
db-lateral|Seitheben mit Kurzhanteln|Schultern|Kurzhantel|Lateral Raise;Dumbbell Lateral Raise
cable-lateral|Seitheben am Kabelzug|Schultern|Kabelzug|Cable Lateral Raise
front-raise|Frontheben mit Kurzhanteln|Schultern|Kurzhantel|Dumbbell Front Raise
cable-front|Frontheben am Kabelzug|Schultern|Kabelzug|Cable Front Raise
reverse-pec|Reverse Butterfly|Schultern|Maschine|Reverse Fly;Reverse Pec Deck
rear-db|Vorgebeugtes Seitheben|Schultern|Kurzhantel|Rear Delt Fly
rear-cable|Reverse Fly am Kabelzug|Schultern|Kabelzug|Cable Reverse Fly
face-pull|Face Pulls|Schultern|Kabelzug|Face Pull
upright-row|Aufrechtes Rudern|Schultern|SZ-Stange|Upright Row
shrug-db|Schulterheben mit Kurzhanteln|Schultern|Kurzhantel|Dumbbell Shrug
shrug-bb|Schulterheben mit Langhantel|Schultern|Langhantel|Barbell Shrug
band-pull-apart|Band Pull-Aparts|Schultern|Widerstandsband|Band Pull Apart
biceps-machine|Bizepscurls|Bizeps|Maschine|Machine Biceps Curl
barbell-curl|Langhantelcurls|Bizeps|Langhantel|Barbell Curl
ez-curl|SZ-Curls|Bizeps|SZ-Stange|EZ Bar Curl
standing-db-curl|Kurzhantelcurls|Bizeps|Kurzhantel|Dumbbell Curl
hammer-curl|Hammercurls|Bizeps|Kurzhantel|Hammer Curl
incline-curl|Schrägbankcurls|Bizeps|Kurzhantel|Incline Dumbbell Curl
concentration-curl|Konzentrationscurls|Bizeps|Kurzhantel|Concentration Curl
preacher-ez|Scottcurls mit SZ-Stange|Bizeps|SZ-Stange|Preacher Curl
preacher-db|Scottcurls mit Kurzhantel|Bizeps|Kurzhantel|Dumbbell Preacher Curl
cable-curl|Bizepscurls am Kabelzug|Bizeps|Kabelzug|Cable Curl
rope-curl|Hammercurls am Kabelzug|Bizeps|Kabelzug|Rope Hammer Curl
bayesian-curl|Bayesian Curls|Bizeps|Kabelzug|Bayesian Curl
reverse-curl|Reverse Curls|Bizeps|SZ-Stange|Reverse Curl
band-curl|Bizepscurls mit Widerstandsband|Bizeps|Widerstandsband|Band Curl
triceps-machine|Trizepsdrücken|Trizeps|Maschine|Machine Triceps Extension
pushdown|Trizepsdrücken am Kabelzug|Trizeps|Kabelzug|Tricep Pushdown;Triceps Pushdown
rope-pushdown|Trizepsdrücken mit Seil|Trizeps|Kabelzug|Rope Pushdown
overhead-cable|Trizepsstrecken über Kopf am Kabelzug|Trizeps|Kabelzug|Overhead Triceps Extension
overhead-db|Trizepsstrecken über Kopf mit Kurzhantel|Trizeps|Kurzhantel|Dumbbell Overhead Extension
skullcrusher|French Press mit SZ-Stange|Trizeps|SZ-Stange|Skullcrusher;Lying Triceps Extension
close-bench|Enges Bankdrücken|Trizeps|Langhantel|Close Grip Bench Press
dip|Dips|Trizeps|Körpergewicht|Triceps Dip
assisted-dip|Dips mit Unterstützung|Trizeps|Maschine|Assisted Dip
seated-dip|Sitzende Dip-Maschine|Trizeps|Maschine|Seated Dip
kickback|Trizeps-Kickbacks|Trizeps|Kurzhantel|Dumbbell Kickback
cable-kickback|Trizeps-Kickbacks am Kabelzug|Trizeps|Kabelzug|Cable Triceps Kickback
diamond-pushup|Enge Liegestütze|Trizeps|Körpergewicht|Diamond Push Up
leg-press|Beinpresse|Beine|Maschine|Leg Press
leg-press-45|45-Grad-Beinpresse|Beine|Maschine|45 Degree Leg Press
single-leg-press|Einbeinige Beinpresse|Beine|Maschine|Single Leg Press
hack-squat|Hackenschmidt-Kniebeugen|Beine|Maschine|Hack Squat
pendulum-squat|Pendulum Squat|Beine|Maschine|Pendulum Squat
belt-squat|Belt Squat|Beine|Maschine|Belt Squat
squat|Kniebeugen|Beine|Langhantel|Back Squat
front-squat|Frontkniebeugen|Beine|Langhantel|Front Squat
smith-squat|Kniebeugen an der Multipresse|Beine|Multipresse|Smith Machine Squat
goblet-squat|Goblet Squat|Beine|Kettlebell|Goblet Squat
db-goblet|Goblet Squat mit Kurzhantel|Beine|Kurzhantel|Dumbbell Goblet Squat
body-squat|Kniebeugen ohne Gewicht|Beine|Körpergewicht|Bodyweight Squat
bulgarian-split|Bulgarian Split Squat|Beine|Kurzhantel|Bulgarian Split Squat
split-squat|Split Squat|Beine|Körpergewicht|Split Squat
lunge|Ausfallschritte mit Kurzhanteln|Beine|Kurzhantel|Dumbbell Lunge
reverse-lunge|Rückwärts-Ausfallschritte|Beine|Kurzhantel|Reverse Lunge
walking-lunge|Gehende Ausfallschritte|Beine|Kurzhantel|Walking Lunge
barbell-lunge|Ausfallschritte mit Langhantel|Beine|Langhantel|Barbell Lunge
step-up|Step-ups|Beine|Kurzhantel|Step Up
leg-extension|Beinstrecker|Beine|Maschine|Leg Extension
leg-curl|Beinbeuger|Beine|Maschine|Leg Curl
seated-curl|Beinbeuger sitzend|Beine|Maschine|Seated Leg Curl
lying-curl|Beinbeuger liegend|Beine|Maschine|Lying Leg Curl
standing-curl|Beinbeuger stehend|Beine|Maschine|Standing Leg Curl
nordic-curl|Nordic Curls|Beine|Körpergewicht|Nordic Hamstring Curl
glute-ham|Glute-Ham Raises|Beine|Maschine|Glute Ham Raise
romanian-deadlift|Rumänisches Kreuzheben|Beine|Langhantel|Romanian Deadlift;RDL
db-rdl|Rumänisches Kreuzheben mit Kurzhanteln|Beine|Kurzhantel|Dumbbell Romanian Deadlift
single-rdl|Einbeiniges rumänisches Kreuzheben|Beine|Kurzhantel|Single Leg Romanian Deadlift
good-morning|Good Mornings|Beine|Langhantel|Good Morning
hip-thrust|Hip Thrusts|Beine|Langhantel|Barbell Hip Thrust
hip-machine|Hip-Thrust-Maschine|Beine|Maschine|Glute Drive;Hip Thrust Machine
smith-hip|Hip Thrusts an der Multipresse|Beine|Multipresse|Smith Machine Hip Thrust
glute-bridge|Glute Bridge|Beine|Körpergewicht|Glute Bridge
cable-glute|Kickbacks für Gesäß am Kabelzug|Beine|Kabelzug|Cable Glute Kickback
pull-through|Pull-throughs am Kabelzug|Beine|Kabelzug|Cable Pull Through
abduction|Abduktorenmaschine|Beine|Maschine|Hip Abduction
adduction|Adduktorenmaschine|Beine|Maschine|Hip Adduction
band-abduction|Hüftabduktion mit Widerstandsband|Beine|Widerstandsband|Band Hip Abduction
calf-raise|Wadenheben|Waden|Maschine|Calf Raise
standing-calf|Wadenheben stehend|Waden|Maschine|Standing Calf Raise
seated-calf|Wadenheben sitzend|Waden|Maschine|Seated Calf Raise
leg-press-calf|Wadenheben an der Beinpresse|Waden|Maschine|Leg Press Calf Raise
smith-calf|Wadenheben an der Multipresse|Waden|Multipresse|Smith Machine Calf Raise
single-calf|Einbeiniges Wadenheben|Waden|Körpergewicht|Single Leg Calf Raise
db-calf|Wadenheben mit Kurzhanteln|Waden|Kurzhantel|Dumbbell Calf Raise
crunch|Crunches|Bauch|Körpergewicht|Crunch
reverse-crunch|Reverse Crunches|Bauch|Körpergewicht|Reverse Crunch
sit-up|Sit-ups|Bauch|Körpergewicht|Sit Up
cable-crunch|Crunches am Kabelzug|Bauch|Kabelzug|Kneeling Crunch;Cable Crunch
machine-crunch|Bauchmaschine|Bauch|Maschine|Abdominal Crunch Machine
hanging-knee|Hängendes Knieheben|Bauch|Körpergewicht|Hanging Knee Raise
hanging-leg|Hängendes Beinheben|Bauch|Körpergewicht|Hanging Leg Raise
lying-leg|Beinheben liegend|Bauch|Körpergewicht|Lying Leg Raise
russian-twist|Russian Twist|Bauch|Körpergewicht|Russian Twist
woodchop|Holzhacker am Kabelzug|Bauch|Kabelzug|Cable Woodchop
pallof|Pallof Press|Bauch|Kabelzug|Pallof Press
ab-wheel|Ab-Wheel Rollouts|Bauch|Ab-Roller|Ab Wheel Rollout
bicycle-crunch|Fahrrad-Crunches|Bauch|Körpergewicht|Bicycle Crunch
dead-bug|Dead Bug|Bauch|Körpergewicht|Dead Bug
wrist-curl|Handgelenkcurls mit Langhantel|Sonstige|Langhantel|Seated Wrist Curl;Wrist Curl
reverse-wrist|Umgekehrte Handgelenkcurls|Sonstige|Kurzhantel|Reverse Wrist Curl
wrist-db|Handgelenkcurls mit Kurzhanteln|Sonstige|Kurzhantel|Dumbbell Wrist Curl
deadlift|Kreuzheben|Ganzkörper|Langhantel|Deadlift
sumo-deadlift|Sumo-Kreuzheben|Ganzkörper|Langhantel|Sumo Deadlift
trap-deadlift|Kreuzheben mit Trap Bar|Ganzkörper|Trap Bar|Trap Bar Deadlift;Hex Bar Deadlift
kb-swing|Kettlebell Swings|Ganzkörper|Kettlebell|Kettlebell Swing
kb-clean|Kettlebell Clean|Ganzkörper|Kettlebell|Kettlebell Clean
kb-press|Kettlebell Clean and Press|Ganzkörper|Kettlebell|Kettlebell Clean and Press
thruster|Thruster mit Kurzhanteln|Ganzkörper|Kurzhantel|Dumbbell Thruster
burpee|Burpees|Ganzkörper|Körpergewicht|Burpee
`;
export const exerciseCatalog: CatalogExercise[] = rows
  .trim()
  .split("\n")
  .map((row) => {
    const [key, name, muscle, equipment, aliases] = row.split("|");
    return { key, name, muscle, equipment, aliases: aliases.split(";") };
  });
export const catalogId = (key: string) => `set-catalog-v1-${key}`;
export const normalizeExerciseName = (value: string) =>
  value
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
