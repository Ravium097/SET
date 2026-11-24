# BASE — Minimal Performance

Überarbeitung der bestehenden React/PWA-Codebasis. Keine neue App, keine neuen Abhängigkeiten. IndexedDB-Schema, gespeicherte Einstellungen, Service- und Berechnungsfunktionen bleiben bestehen.

## Änderungen

- Gemeinsame Minimal-Performance-Komponentenregeln in `src/styles/performance.css`, lokale Inter-Schrift, neutrale Light-/Dark-Tokens. Weitere vorhandene Paletten bleiben erhalten.
- Bottom Navigation mit Start, Training, Fortschritt und optionalem Tagebuch. Dock und Timer belegen eine eigene Layoutzeile; Safe Areas bleiben reserviert. Visual Viewport berücksichtigt die Bildschirmtastatur.
- Tagesübersicht mit fortsetzbarem Training bzw. Abschlusszusammenfassung, Wochenkalender, Wochenkennzahlen und kompaktem Tagebuch-Link.
- Vorlagen mit Play-Start und gemeinsamem Kontextmenü für Bearbeiten, Duplizieren und bestätigtes Löschen. Bestehende Vorlagengruppen bleiben bestehen.
- Fortschritt mit Übersicht, Verlauf und Muskeln; alte URLs bleiben erreichbar. Gemeinsame Zeitraumfilter, lineare Messwertverbindungen, kompakte Diagrammdaten und ganzzahlige Trainingsanzahl-Achsen.
- Muskelkarten-Erklärung über Info-Aufklappfläche. Tagebuchaktionen über gemeinsames Kontextmenü.
- Geometrisches B als SVG sowie PNG-Icons für Manifest, iOS und Favicon.

## Verifikation

- `npm run build`: erfolgreich, einschließlich TypeScript und generiertem Service Worker/Manifest.
- `npm test`: 60 Tests in 14 Dateien erfolgreich. Bestehende Tests prüfen unter anderem Migration, Backup/Wiederherstellung, Datenhaltung, Vorlagen, Satzwerte und Ernährungseinstellungen.
- `git diff --check`: erfolgreich.
- Datenbankdateien und Datenservices wurden nicht geändert; keine Migration und keine Löschoperation beim Update hinzugefügt.
- Browserprüfung blockiert: `sites-preview start /workspace/SET` scheitert am Relay-Timeout für Port 4173. Daher sind responsive Darstellung, tatsächliche iOS-Tastatur-/Safe-Area-Wirkung, Trainingsabläufe über die UI, Offline-Neustart und Installation auf einem echten iPhone noch offen. Die vorhandenen Playwright-Skripte wurden nicht als erfolgreich gewertet.
- Vorhandene Browser-Tests müssen für die neue Fortschritt-Unternavigation (gezielt `nav[aria-label="Hauptnavigation"]`) und die neuen Kontextmenüs angepasst werden, bevor sie unverändert weiterverwendet werden können.
- Build meldet große JavaScript-Chunks und Hinweise zu PURE-Kommentaren aus Zod; kein Buildfehler.

## Geräteprüfung vor Freigabe

Auf iPhone in beiden Modi prüfen: Trainingsstart, Satz erfassen, Pause, Abschluss, Tageszusammenfassung und Verlauf; Vorlagen erstellen/duplizieren/bearbeiten/löschen; Tagebuch mit unbekannten Nährwerten und Sammlung; Module aus-/einschalten; Backup exportieren/wiederherstellen; installierte PWA offline öffnen; Tastatur und Safe Areas auf allen Ansichten.
