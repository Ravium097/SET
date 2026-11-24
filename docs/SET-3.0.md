# SET 3.0 – Modular Nutrition

## Bestand und Erweiterung
Die bestehende React/Vite-PWA nutzt React Router, Dexie (Datenbank SET), lokale Fonts und einen Workbox-Service-Worker. Workout-Ansichten, Themes und Timer bleiben erhalten. Der schwebende Dock bekommt nur bei aktiviertem Nutrition- oder Trinkmodul einen zusätzlichen Tagebuch-Link. Beide Module sind initial aus.

IndexedDB-Version 3 ergänzt nutrition, foods und dayNotes ohne bestehende Tabellen zu verändern. Fotos werden als Bild-Data-URLs in IndexedDB gespeichert und sind Bestandteil des JSON-Backups. Einzelfotos sind auf 8 MB begrenzt. Browser-Speichergrenzen gelten weiterhin; Schreibfehler werden angezeigt.

Backup-Schema 2 exportiert sämtliche Tabellen und Modulschalter in einer Transaktion. Restore validiert vor dem atomaren Ersetzen; Schema-1-Backups ersetzen nur die bisherigen Tabellen und lassen Nutrition-Daten erhalten. Timer werden wie bisher zurückgesetzt. Kein echtes Nutzerbackup wurde verwendet: Tests nutzen synthetische Daten und die bestehende Exportfunktion.

## Nutzung
Einstellungen → Modules: Ernährungstagebuch und Trinktagebuch separat aktivieren. Im Tagebuch Datum wählen, Einträge anlegen, bearbeiten und löschen. Eigene Lebensmittel, Getränke und Rezepte (mit Zutaten/Freitext in Notizen) können gespeichert und erneut verwendet werden. Häufige Einträge werden nach Verwendungszahl angeboten. Die Suche filtert auch Sammlung und Historie.

Open Food Facts wird ausschließlich nach einer Suchaktion kontaktiert. Suchbegriffe/Barcodes werden übertragen, keine Tagebucheinträge. Ergebnisse werden lokal gecacht. Energieangaben sind optionale Herstellerdaten pro 100 g/ml; für Portionen erfolgt keine automatische Umrechnung. Keine Bewertung von Lebensmitteln oder Gewicht. Datenquelle: https://world.openfoodfacts.org/ (ODbL).

Der ZXing-Scanner nutzt die Rückkamera mit HTTPS/Kameraberechtigung und beendet den Stream beim Schließen. Bei fehlender Kamera ist manuelle Barcode-Eingabe möglich. Die PWA muss einmal online geladen werden, bevor Offline-Neuladen verfügbar ist. Manuelle Einträge, Fotos, Backups und gespeicherte Suchergebnisse funktionieren lokal.

## Erweiterungen
`src/features/nutrition/service.ts` definiert Schnittstellen für DiaryImportAdapter, ShortcutsAdapter und LocalAIAdapter. Es gibt keine implementierte KI, keinen Ollama-Aufruf, keinen Pflichtaccount und keine kostenpflichtige API.

## Prüfung
- `npm test`: bestehende Workout-Tests und neue Nutrition-Tests.
- `npm run build`: TypeScript und Produktions-PWA.
- `CHROMIUM_PATH=/usr/bin/chromium node scripts/check-ui.cjs`: bestehende responsive UI-Prüfungen.
- `node scripts/check-nutrition.cjs`: Modulschalter, Offline-Neuladen/-Bearbeiten, Datenerhalt und Mobil-/Tabletansichten.

Physische iPhone/iPad-Kameras, tatsächliche Scan-Erkennung und Live-API-Verfügbarkeit müssen zusätzlich auf Geräten geprüft werden. Automatisierte Chromium-Viewporttests ersetzen keinen Safari-Gerätetest.

## Nutrition Settings 03
Ernährungseinstellungen unter Einstellungen: Nährwertanzeige, 1–12 individuelle Mahlzeitenkategorien in eigener Reihenfolge, frei wählbare Erinnerungszeiten sowie Standardgetränk, Standardmenge und optionale Trinkmengensumme. Einstellungen werden explizit gespeichert, in IndexedDB gehalten und mit JSON exportiert. Bestehende Backups erhalten die bisherigen Vorgaben; bestehende Einträge in entfernten Kategorien bleiben sichtbar. Die reservierte Kategorie Getränke bleibt dem unabhängigen Trinkmodul zugeordnet.

Erinnerungen sind standardmäßig deaktiviert und erscheinen nur bei geöffneter, sichtbarer App mit aktiviertem Nutrition-Modul zur eingestellten Minute. Geschlossene Apps erhalten keine Hintergrundbenachrichtigungen. Pro Tag/Uhrzeit wird die Anzeige lokal vorgemerkt, um Wiederholungen beim Neuladen zu verhindern. Keine kostenpflichtigen Dienste, Push-Server, KI oder Kalorienzielberechnung.

## BASE. Klartext 07
Flache Oberflächen ohne Glasverläufe, ruhige Ränder, ein Lime-Akzent und flache Navigation. Kopfzeilen und Satzzeilen teilen ein festes Raster; UI-Checks prüfen die Spaltenausrichtung bei 320/393/820 px. Die Körperillustration wurde durch eine auswählbare Muskelgruppenliste ersetzt. Eigene Trainingsnamen bleiben unverändert; neue integrierte Vorlagen heißen Drücktraining/Zugtraining.

Der Start zeigt ein aktives Training oder den tatsächlichen Leerzustand, keinen erfundenen Trainingsplan. Letzte Satzwerte werden weiterhin beim Anlegen neuer Arbeitssätze übernommen. Tagebuch-Mahlzeiten zeigen optionale Energie-/Makrosummen nur bei vollständigen Angaben und bekannten Gramm-/Millilitermengen. Unbekannte Werte erscheinen als Strich; Portionen ohne definierte Größe werden nicht umgerechnet. Die vorhandenen Backup-Schemas unterstützen die zusätzlichen optionalen Nährwertfelder.
