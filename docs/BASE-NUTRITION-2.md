# BASE — Nutrition Module 2.0

## Umsetzung

Die vorhandenen IndexedDB-Tabellen `foods` und `nutrition` bleiben bestehen. Zusätzliche Felder sind optional; bestehende Datensätze und Backups bleiben gültig. Die Backup-Validierung erhält Herkunft, Favoriten, Barcode-Zuordnungen und Zutaten. Keine neue Abhängigkeit, API-Abrechnung, KI-Bilderkennung oder Serverkomponente.

- Lokale, deutsche/englische Namenssuche mit Normalisierung und begrenztem Tippfehlerabgleich. Open-Food-Facts-Vorschläge nach 550 ms; veraltete Antworten werden ignoriert bzw. abgebrochen.
- Textanfragen mindestens 6,5 Sekunden auseinander, Barcodeanfragen mindestens 1 Sekunde; erneute identische Suchen für fünf Minuten im Arbeitsspeicher zwischengespeichert. HTTP 429 respektiert Retry-After (mindestens 60 Sekunden) ohne automatische Wiederholung.
- Datenbankprodukte werden automatisch lokal gespeichert, primär anhand ihrer Barcode-ID zusammengeführt. Manuelle Korrekturen und Favoriten werden durch Suchantworten nicht überschrieben. Produktbilder werden angezeigt, wenn erreichbar; offline sind die gespeicherten Produkttexte und Nährwerte verfügbar.
- Unbekannte Barcodes lassen sich manuell zuordnen. Die nächste Suche nach diesem Barcode verwendet den lokalen Eintrag ohne Netzwerkanfrage.
- Herkunft wird als Datenbank, vergleichbares Produkt, manuelle Angabe oder eigenes Rezept ausgewiesen. Vergleichsvorschläge benötigen eine ausdrückliche Auswahl. Fehlende Werte bleiben unbekannt.
- Favoriten, zuletzt verwendete Einträge, eigene Lebensmittel und strukturierte Rezepte im kompakten Bottom Sheet. Rezepte haben editierbare Zutaten mit Mengen und einen expliziten Portionsertrag. Ein Nährwert wird nur berechnet, wenn alle Zutaten diesen Wert enthalten. Keine angenommene Dichte oder Umrechnung unbekannter Portionsgrößen.
- Frühere Rezepte und Freitextnotizen bleiben gespeichert. Bestehende Tagebucheinträge sind Snapshots und werden durch spätere Rezeptänderungen nicht umgerechnet.
- Bestehende Modulschalter, Fotos, Tagesnotizen und Nährwert-Anzeigepräferenzen bleiben erhalten.

## Qualitätssicherung

- 76 Tests in 18 Dateien erfolgreich. Vollständige Vitest-Suite: Datenmigration, Backup/Wiederherstellung, Trainingsservices, Vorlagen, Satzwerte, Ernährung und neue Komponentenabläufe.
- Neue Regressionstests: lokaler Tippfehler-/Aliasabgleich, Deduplizierung, manuelle Barcodezuordnung offline, HTTP-429-Verhalten, Abbruch veralteter Suchanfragen, unbekannte Rezeptwerte, Portionsberechnung, Metadaten im Backup, Modulschalter und Bottom-Sheet-Eingabe.
- Scanner-Code gegenüber dem bisherigen Stand unverändert, ausschließlich für Tests exportiert. Gemockte ZXing-Tests prüfen Rückkamera-Constraints, einmalige Barcodeübernahme, Kamera-Fehlertext und Aufräumen bei später Initialisierung.
- TypeScript, Produktionsbuild und Service-Worker-Erzeugung erfolgreich; git diff --check ohne Fehler.
- Die Vorschau-Infrastruktur scheitert erneut am Relay-Timeout für Port 4173. Kein erfolgreicher visueller Browser-/iPhone-Test behauptet. Reale Kamera-Decodierung, Safari-Tastatur, Safe Areas und PWA-Offline-Neustart sind weiterhin auf einem Gerät zu prüfen.

## Grenzen

Open Food Facts ist eine öffentliche Community-Datenbank; Vollständigkeit und Trefferqualität variieren. Die Tippfehlertoleranz ist lokal ein Zeichenvergleich, keine semantische oder KI-basierte Zuordnung. Bilder benötigen bei der ersten Anzeige eine Verbindung. Bei Fehlern stehen lokale Produkte und die manuelle Eingabe zur Verfügung.
