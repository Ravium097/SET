# BASE — Back to Minimal Performance

Stand: 2026-11-27. Grundlage: Repository SET, Branch main.

## Änderungen

- Ernährungstagebuch, Getränke-/Wassertracker, Barcode-Scanner, Lebensmittel-Suche, Rezepte, Ziele und Erinnerungen samt UI und Programmlogik entfernt.
- Kamera-Push-up-Counter einschließlich MediaPipe, Modell-Download, Modell-Cache-Konfiguration und Tests der entfernten Funktion entfernt. Manuelle Wiederholungen und Liegestütze in der Übungsbibliothek bleiben erhalten.
- Screenshot-Vorlagen-Übernahme entfernt. Bereits gespeicherte Vorlagen bleiben normale Trainingsdatensätze. Der historische `/import`-Link führt weiterhin zum Training.
- Keine implementierte Apple-Health-Integration oder KI-Lebensmittelerkennung im analysierten main vorhanden; die ungenutzten Adapter-Schnittstellen wurden mit dem Tagebuchservice entfernt.
- Tagebuch-Navigation und Modulschalter entfernt. Es gab hier ausschließlich Ernährungs-/Trinkmodule; andere Funktionen sind unverändert.
- Alte Tagebuch-Widgets werden vor dem Rendern herausgefiltert. Das bestehende Grid schließt Lücken; übrige Widget-IDs, Reihenfolge, Größen und Sichtbarkeit bleiben erhalten. Galerie und Standardlayout bieten keine Tagebuch-Widgets an. Historische Links auf entfernte Seiten führen zur Startseite.
- Swiss-Editorial-Layout, schwebende Navigation, Typografie, Design-Tokens, Themes und Animationen bleiben unverändert. Das Körpergewicht-Widget kann vorhandene gespeicherte Angaben weiterhin anzeigen; sein Link führt nicht mehr zu entfernten Ernährungszielen.
- Abhängigkeiten `@mediapipe/tasks-vision` und `@zxing/browser` einschließlich transitiver Pakete entfernt.

## Datenerhalt und Kompatibilität

Keine Datenbankmigration, kein Wechsel des Datenbanknamens oder der Speicherschlüssel. Die bisherigen Ernährungsschemas, Tabellen und optionalen Settings bleiben ausschließlich für verlustfreien JSON-Export und Import erhalten. Auch `nutrition` als historischer Widget-Typ bleibt validierbar. Die Tabelle `dayNotes` wird weiterhin für Trainingsnotizen gebraucht.

Ein Update schreibt oder löscht keine Bestandsdaten. Die explizite Trainingsdaten-Zurücksetzung in Einstellungen löscht keine archivierten Mahlzeiten, Lebensmittel oder Tagebuchnotizen mehr. Die bestehende, bestätigte Backup-Wiederherstellung ersetzt bei Schema 2 weiterhin die im Backup enthaltenen Tabellen; vor einer Wiederherstellung exportieren. Schema 1 lässt Ernährungsarchive bestehen.

Ein echtes Nutzerbackup war nicht verfügbar. Die Kompatibilitätsprüfung verwendet synthetische Datensätze mit dem echten Export-/Restore-Code: alte und aktuelle Backups, Fotos, optionale Nährwerte, doppelte IDs und ungültige Daten. Es wurden keine persönlichen Nutzerdaten abgerufen. Ein Export aus einer frischen lokalen Browserinstallation wäre kein echtes Nutzerbackup.

Historische Dokumente unter docs beschreiben frühere Versionen; für den aktuellen Funktionsumfang gilt dieses Dokument.

## Prüfung

Ergebnisse werden nach Abschluss der Prüfungen unten ergänzt. Keine neuen Produktfunktionen und keine allgemeinen Refactorings.

- Produktionsbuild einschließlich TypeScript: erfolgreich. PWA-Service-Worker und Manifest generiert.
- Tests: 21 Dateien, 93 Tests erfolgreich (`npm test -- --maxWorkers=2`).
- Übersetzungsprüfung: 647 Einträge und JSX-Prüfung erfolgreich.
- Browserprüfung mit Chromium: 320, 375, 393, 430, 820 und 1180 Pixel Breite ohne horizontalen Überlauf; Trainingsablauf, Timer, Historie, Charts, Backup-Export/-Import und Weiterleitung alter Tagebuch-Links erfolgreich.
- PWA-Updateprüfung: alter Worker bei geöffnetem Tab ersetzt, kein erzwungenes Neuladen, Workout und Export erhalten, Offline-Neuladen erfolgreich.
- `git diff --check`: erfolgreich.

Verbleibende Grenzen: kein echtes Nutzerbackup und kein physisches iPhone getestet. Build meldet weiterhin einen JavaScript-Chunk über 500 kB sowie Hinweise zu PURE-Kommentaren in Zod; keine Buildfehler. Keine zusätzlichen Optimierungs-Refactorings im Feature Freeze.
