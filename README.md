# BASE.

Workout-Tracker: Plan. Train. Track. Progress.

Aktueller Bereinigungsstand und Datenerhalt: [Back to Minimal Performance](docs/BASE-MINIMAL-PERFORMANCE.md). Tagebuch, Wassertracker, Scanner, Screenshot-Übernahme und Kamera-Push-up-Zähler sind entfernt; historische Ernährungsdaten bleiben im JSON-Backup erhalten.

BASE. ist der neue Name von SET. Die bestehende URL, IndexedDB-Datenbank `SET` und lokalen Speicherschlüssel bleiben für den Datenerhalt unverändert. Alte SET-Backups können weiterhin importiert werden. Neue Exporte heißen `BASE-backup-…`. Neuinstallationen verwenden den Namen BASE.; bestehende iOS-Home-Bildschirm-Beschriftungen können den alten Namen behalten.

Mobile-first Workout-PWA mit React, TypeScript, Vite, Tailwind, Dexie/IndexedDB, React Router, Recharts, date-fns. Monochrome Oberfläche; keine Accounts, Werbung oder vorbefüllte Trainingshistorie.

## Start

Node.js 22.12+ verwenden.

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

## Implementiert

- Dashboard mit echten gespeicherten Werten, letztem Workout und Fortsetzen.
- Freie Workouts und unabhängige Vorlagen, Duplikation, Bearbeitung und Löschen.
- Aufklappbare Übungskarten, Satzverwaltung, Plus/Minus, Abschlussstatus und IndexedDB-Autosave.
- Übungsbibliothek, Suche, Filter, Favoriten, Bearbeitung, Notizen und individuelle Pausenzeit. Historische Namen bleiben beim Löschen erhalten.
- Persistenter Pausentimer mit absolutem Endzeitpunkt, Pause, Fortsetzen, +30 Sekunden und Schließen.
- Monatskalender mit Montag als Wochenbeginn und nachträglich bearbeitbaren Workouts.
- Diagramme für Volumen, Häufigkeit und maximale Gewichte; Rekorde für gewählten Zeitraum.
- JSON-Backup mit Schema-Prüfung, Vorschau durch Bestätigungsdialog und transaktionaler vollständiger Wiederherstellung.
- Manifest, Workbox-Service-Worker und Hantel-Icons für installierbare PWA.

## Datenspeicherung und Backup

Alle Workouts, Vorlagen, Definitionen und Einstellungen liegen in IndexedDB im Browser. Kein Server erhält Trainingsdaten. Browserdaten können vom Nutzer oder Betriebssystem gelöscht werden. Regelmäßig unter Einstellungen ein JSON-Backup exportieren und außerhalb des Browsers aufbewahren. Wiederherstellung ersetzt alle vorhandenen Daten nach Bestätigung.

Ein Workout enthält Übungsnamen-Snapshots und Sätze. Vorlagen sind getrennte Datensätze mit eigenem Status; beim Start wird unabhängig kopiert. Nur abgeschlossene Sätze zählen zum Volumen, nur abgeschlossene Workouts zur Statistik. 0 kg kann für Körpergewichtsübungen verwendet werden; leere Werte bleiben null.

## Offline und iPhone

Die App einmal online vollständig öffnen. Der Service Worker speichert die Anwendung. Danach funktionieren lokale Trainingsfunktionen ohne Internet. iOS garantiert keine Timer-Ausführung oder Benachrichtigung im Hintergrund. Beim Wiederöffnen wird die Restzeit aus dem gespeicherten Endzeitpunkt berechnet.

Installation: HTTPS-Adresse in Safari öffnen → Teilen → Zum Home-Bildschirm → Hinzufügen. Safe-Areas werden berücksichtigt. Tests auf einem echten iPhone 16 stehen aus.

## GitHub

Im Projektverzeichnis:

```sh
git add .
git commit -m "Implement SET workout PWA"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/SET.git
git push -u origin main
```

Vorher ein leeres GitHub-Repository erstellen. Falls bereits ein Remote existiert, dessen URL prüfen statt erneut hinzuzufügen. `.env*`, Build-Ausgaben und Abhängigkeiten sind ausgeschlossen. Es wurden keine Zugangsdaten angelegt.

## Vercel

GitHub-Repository in Vercel importieren. Framework Vite, Build `npm run build`, Ausgabe `dist`, Install `npm install`. Root Directory auf das Projektverzeichnis setzen. `vercel.json` enthält SPA-Rewrites mit ausgenommenem API-Pfad. Nach Deployment die HTTPS-Adresse öffnen und Installation sowie Offline-Verhalten überprüfen. Die App ist unter https://set-workout.vercel.app bereitgestellt.

## Funktionsumfang

Die Screenshot-Erkennung einschließlich lokaler OCR und KI-Schaltfläche wurde auf Nutzerwunsch entfernt. Bereits gespeicherte Workouts bleiben reguläre Trainingsdaten. JSON-Backup-Import und -Export sind weiterhin verfügbar. Alte `/import`-Links führen zur Trainingsseite.

## Tests und aktueller Abnahmestand

`npm test`: sechs Vitest-Tests für leeren Start, Volumenberechnung, IndexedDB-Wiederöffnung, Backup-Roundtrip, Ablehnung defekter Backups, historische Namen. `npm run build` erfolgreich mit Bundle-Größenwarnung. Der Testumfang deckt nicht die vollständige geforderte Abnahmematrix ab.

Noch offen: echte Browser-/iPhone- und Offline-Abnahme, RTL-Interaktionstests, explizite PWA-Update-Oberfläche, durchschnittliche Trainingsdauer in Statistik und weitergehende Modularisierung. Die erste Datenbankversion hat noch keine spätere Migration zu testen.

Diese Ausgabe ist ein funktionsfähiger Grundstand, keine vollständige Erfüllung der umfangreichen SET-Abnahmekriterien.

## SET 2.0 Erweiterungen

- Satztypen: Arbeitssatz oder W (Aufwärmsatz). Alte Sätze bleiben Arbeitssätze. Volumen, Satzzähler und Rekorde berücksichtigen ausschließlich abgeschlossene Arbeitssätze.
- RPE/RIR: Unter „Belastung · optional“, einklappbar und löschbar. RPE 1–10 in halben Schritten, RIR 0–10 ganzzahlig. Historische Werte bleiben erhalten; beim Vorlagenstart werden sie zurückgesetzt.
- Live-Übersicht: Dauer, Arbeitssätze, Volumen und Fortschritt während des aktiven Workouts.
- Focus Mode: Nächster offener Satz, große Eingaben, Abschlussbutton und vorhandener Timer. Derselbe Editor bleibt montiert; Umschalten löscht keine Eingaben. Workout in der normalen Ansicht abschließen.
- Übung ersetzen: Gleiche Muskelgruppe, priorisiert nach Bewegungsmuster und Equipment. Bewegungsmuster sind in der Bibliothek editierbar. Abgeschlossene Sätze bleiben bei der ursprünglichen Übung; offene Sätze werden zu leeren Sätzen der Ersatzübung ohne übertragene Gewichte, Wiederholungen oder Belastungswerte.
- Muscle Map: Unter Statistik, Vorder-/Rückseite, 7-/30-Tage-Filter. Primäre Muskelgruppen anhand gespeicherter Zuordnungen; keine geschätzte sekundäre Belastung. Fehlende Zuordnungen erscheinen als „Nicht zugeordnet“. Textbuttons ergänzen die SVG-Bedienung.
- Theme Studio: Unter Einstellungen, Swiss Light, Midnight, Stone, Forest oder Systemdesign. Zentrale CSS-Tokens, Auswahl in IndexedDB und Backups.

### Datenkompatibilität

IndexedDB-Version 2 ergänzt vorhandene Workout-Übungen um Muskel-/Equipment-Momentaufnahmen aus der Bibliothek. IDs, Sätze, Notizen, Workouts und Timer bleiben erhalten. Die neuen optionalen Satzfelder benötigen keine destruktive Migration. Alte Backups (Schema 1) bleiben importierbar. Gelöschte Übungen ohne gespeicherte Zuordnung werden nicht geraten.

Die gemeinsamen Filter isWork und isCompletedWork in src/data.ts schließen Aufwärmsätze aus Arbeitsberechnungen aus. Eine eigenständige Smart-Progression-Funktion existiert im Ausgangsprojekt nicht; zukünftige Vorschläge müssen diese Filter ebenfalls verwenden.

### Prüfung der Erweiterungen

npm test prüft bestehende Funktionen, Satztypen, Belastungsgrenzen, Live-Berechnungen, Übungswechsel, Muskelzeitfenster, eine echte Version-1-Datenbankmigration und Backup-Rundläufe. Focus-Wechsel, Persistenz, Übungswechsel und alle vier Themes wurden zusätzlich in Chromium bei 390 × 844 Pixeln geprüft. Ein Test auf einem physischen iPhone/Safari steht noch aus.

Liquid Glass ist zusätzlich im Theme Studio auswählbar: helle, transluzente Flächen, dezente Lichtkanten und eine gläserne Navigation. Die Umsetzung ist vom Liquid-Glass-Stil inspiriert, keine native iOS-Systemoberfläche. Bestehende Themes und Auswahl bleiben erhalten. Ohne Backdrop-Filter sowie bei reduzierter Transparenz/erhöhtem Kontrast werden deckende Flächen verwendet. Es gibt keine dauerhaften Animationen oder zusätzlichen Abhängigkeiten.
## SET 2.0 – Visual Preview

Die visuelle Überarbeitung liegt auf `feat/set-2-visual-identity`. Die Datenbank bleibt auf Version 1; vorhandene Trainings werden nicht migriert oder zurückgesetzt.

Unter **Training → Deine Push- & Pull-Vorlagen** lassen sich die vom Nutzer bereitgestellten Pläne prüfen und mit einem Klick ergänzen (Push: 10 Übungen/29 Sätze, Pull: 8 Übungen/22 Sätze). Die Übernahme ist atomar und überschreibt keine vorhandenen Einträge. Erneutes Klicken erzeugt keine Duplikate. Körpergewicht ohne Zusatzgewicht bleibt `null`. Abweichende Satzpausen bei Tricep Pushdown und Bicep Curl stehen in den Übungsnotizen, da das bestehende Modell nur eine Pause pro Übung unterstützt. Hier verwendet der Timer weiterhin die eingestellte Standardpause.

**Einstellungen → Auf Updates prüfen** prüft die veröffentlichte PWA. Neue Service Worker können alte Offline-Versionen ablösen; eine offene Trainingsansicht wird nicht automatisch neu geladen. „Update öffnen“ bzw. „Ansicht neu laden“ verlangt eine Bestätigung. Vorher die laufende Eingabe abschließen und auf „Gespeichert“ warten. Kein Löschen von Browserdaten erforderlich.

Zusätzliche Browserprüfungen:

```sh
npx playwright install chromium
npm run test:ui
npm run test:pwa
```

Alternativ einen vorhandenen Chromium über `CHROMIUM_PATH=/usr/bin/chromium` auswählen. Die Skripte starten lokale Testserver und verwenden isolierte Browserprofile. `test:pwa` prüft den Wechsel von einer alten gecachten Version, Datenerhalt, Backup und Offline-Reload. Chromium-Tests ersetzen keine Prüfung auf einem echten iPhone/iPad mit Safari.

### Aktueller Designstand: Classic UI

Auf Nutzerwunsch ist das ursprüngliche Clean-Light-Kartendesign wieder aktiv (Versionsanzeige: `Classic UI · 02`). Die Push-/Pull-Vorlagen, sichere additive Übernahme, Update-Korrektur und feste Navigation bleiben erhalten. Der Abschnitt „Visual Preview“ beschreibt die vorherige Gestaltungsphase; an Datenmodell und Trainingswerten wurde bei der Rückkehr nichts geändert.

## Mehr Übungen und letzte Trainingswerte

Unter **Training → Übungsbibliothek → Mehr Übungen & Geräte → Übungsbibliothek erweitern** ergänzt SET fehlende Einträge aus 169 gängigen Übungen und Varianten. Deutsche/englische Suche und Gerätefilter funktionieren auch offline. Eigene Übungen, Favoriten und vorhandene Trainings bleiben erhalten. Acht zusätzliche Geräteklassen stehen auch für eigene Übungen zur Auswahl.

In aktiven Workouts erscheinen frühere abgeschlossene Satzwerte derselben Übung. **Übernehmen** kopiert Gewicht/Wiederholungen, ohne einen Satz abzuschließen. Der Vergleich verwendet echte frühere Einheiten; fehlt eine eindeutige Historie, zeigt SET keine erfundenen Werte.

Recherchequellen, Auswahlgrenzen und Vergleichsregeln: [Dokumentation](docs/EXERCISE-CATALOG.md). Zusätzlicher Browsertest: `CHROMIUM_PATH=/usr/bin/chromium node scripts/check-library.cjs` nach `npm run build` (oder ohne `CHROMIUM_PATH` nach `npx playwright install chromium`).

## Dunkelmodus, Satzführung und Einstieg

- Dunkel ist die Standardeinstellung. Unter **Einstellungen → Darstellung → Farbschema** lässt sich Hell wählen. Theme und ausgeblendete Einführung werden lokal auf diesem Gerät gespeichert (separat vom Trainings-JSON-Backup); kein Datenbankumbau.
- Im aktiven Training wird der erste offene Satz hervorgehoben und in den sichtbaren Bereich gebracht. Die nächste offene Satzposition wird angezeigt; erledigte Sätze bleiben bearbeitbar. Gewichte, Wiederholungen und Timerlogik bleiben unverändert.
- Auf einer leeren Startseite erklärt eine kurze Einführung die Erfassung. **Beispielvorlage laden** legt ausschließlich eine bearbeitbare Ganzkörpervorlage mit drei Übungen und je zwei leeren Sätzen an. Keine erfundenen Leistungsdaten und keine abgeschlossene Einheit. Die Vorlage ist auch über die leere Trainingsseite erreichbar.
- Sichtbare Oberflächentexte verwenden „Start“/„Training“, Diagrammhinweise und Fehlermeldungen sind deutsch. Eigene Übungs- und Vorlagennamen werden nicht umbenannt. `src/i18n/de.ts` bildet den typisierten Einstieg für spätere Übersetzungen; noch kein vollständiger Mehrsprachenmodus.
- Zusätzliche Prüfung: nach `npm run build` mit `CHROMIUM_PATH=/usr/bin/chromium node scripts/check-theme.cjs` beide Themes, Einführung, Satzwechsel, Speicherung und Offline-Wiederaufnahme testen. Eine echte iOS-Geräteprüfung steht separat aus.

Die Standard-Pausenzeit lässt sich vollständig leeren und neu eingeben. Ganze Sekunden von 1 bis 3600 werden beim Verlassen des Feldes oder mit „Pausenzeit speichern“ gespeichert; ungültige Entwürfe ersetzen den gespeicherten Wert nicht. Der Wert gilt für neu gestartete Pausen, sofern keine individuelle Übungszeit hinterlegt ist. Prüfung: `CHROMIUM_PATH=/usr/bin/chromium node scripts/check-rest-duration.cjs` nach dem Build.
