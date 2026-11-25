# Persönliches Dashboard und Wochenplan

Das bestehende Dashboard bleibt die Standardanordnung. Karten verwenden weiterhin
BASEs vorhandene Widget-Klassen, Farben, Schrift und Oberflächen. Navigation und
Trainingseditor bleiben unverändert.

## Bedienung

- Über den Einstellungsregler oder langes Drücken auf eine Karte den Bearbeitungsmodus öffnen.
- Karten über den Griff verschieben; alternativ die Auf-/Ab-Schaltflächen verwenden.
- Klein (1×1), Mittel (2×1) oder Groß (2×2) auswählen. Die bisherigen Standardkarten behalten ihre ursprüngliche Höhe.
- Karten einzeln ausblenden, entfernen oder über die Galerie ersetzen. Die Galerie zeigt aktuelle lokale Daten.
- „Standard wiederherstellen“ setzt nur die Kartenanordnung zurück.
- „Wochenplan“ im Bearbeitungsmodus öffnet den Planer. Mehrere benannte Pläne lassen sich erstellen, duplizieren und wechseln.
- Pro Wochentag sind mehrere Vorlagen oder eigene Trainings möglich. Eine leere Tagesliste bedeutet Erholung.
- Ein Training über die Tagesauswahl auf einen anderen Wochentag verschieben.
- „Nur an einem Datum“ überschreibt den wiederkehrenden Plan ausschließlich für dieses Datum. Dort lässt sich auch ein zusätzlicher Ruhetag festlegen und die Ausnahme wieder entfernen.
- Geplante Trainings starten über „Heutiges Training“ oder „Nächstes Training“. Ein bereits laufendes Training wird durch den vorhandenen Startdienst fortgesetzt.

## Daten und Kompatibilität

Keine neue Datenbank und keine destruktive Migration. Optionale Felder in der
bestehenden Settings-Zeile speichern `dashboardLayout`, `trainingPlans` und
`activeTrainingPlan`. Die alten `dashboardWidgets` bleiben für die bisherigen
Karten synchronisiert. Alte Backups bleiben gültig; neue Einstellungen werden
vom bestehenden JSON-Export und -Import mitgesichert.

Trainings erhalten optional `templateId`, `scheduledSlot` und `scheduledDate`.
Der vorhandene Trainingsabschluss behält diese Felder bei. Abschlüsse werden
pro Datum und Slot einmal gezählt. Für ältere Trainings ohne Zuordnung werden
Vorlagen-ID oder exakter Name verwendet; gleiche Trainingsnamen können bei
alten Daten daher nicht sicher unterschieden werden. Ruhetage erzeugen keine
offenen Trainings und es gibt keine Strafpunkte oder negativen Serien.

Notizen liegen in der bestehenden `dayNotes`-Tabelle unter `training-notes`.
Alle Funktionen arbeiten lokal; keine neuen APIs oder kostenpflichtigen Dienste.

## Prüfung

Vitest prüft Größen, Verschieben per Schaltfläche und Pointer-Ereignissen,
Galerie/Ersetzen/Entfernen, Ausblenden, Standardlayout, Planwechsel,
Duplizieren, Datums-Ausnahmen, tatsächliche Abschlüsse und Backup-Roundtrips.
`npm run build` prüft TypeScript und erzeugt weiterhin das Safari-15-Bundle
sowie die vorhandene PWA/Service-Worker-Ausgabe.

Die verwaltete Browser-Vorschau war bei der Implementierung wegen eines
Relay-Timeouts nicht verfügbar. Visuelle Browserprüfung, echtes iPhone-Safari,
Touch-Scrolling während des Ziehens und installierte PWA müssen vor dem Merge
auf einem Gerät geprüft werden. Es wurde kein fremdes Nutzer-Backup verwendet.
