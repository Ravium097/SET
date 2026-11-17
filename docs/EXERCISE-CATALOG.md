# Erweiterte Übungsbibliothek und letzte Satzwerte

## Recherche (16. November 2026)

Die Auswahl wurde anhand folgender öffentlich erreichbarer Kataloge abgeglichen:

- [ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/): Einteilung nach Muskelgruppen und Equipment, freie Gewichte, Kabel und Körpergewicht.
- [Life Fitness Strength Training](https://www.lifefitness.com/en-us/catalog/strength-training): Geräteklassen und verbreitete Maschinenvarianten (u.a. Brustpresse, Hack Squat, Belt Squat, Glute Drive).
- [Life Fitness / Hammer Strength](https://www.lifefitness.com/en-us/brands/hammer-strength): Zug-, Druck-, Bein- und Isolationsmaschinen.
- [Muscle & Strength – Exercises by Equipment](https://www.muscleandstrength.com/exercises/all.html): Abgleich englischer Übungsbezeichnungen und Varianten an freien Gewichten, Kabelzug, Multipresse und Bändern.

SET enthält einen selbst zusammengestellten Katalog mit 169 Definitionen, deutschen Namen und englischen Suchaliasen. Keine fremden Bilder, Videos oder Anleitungstexte übernommen. Keine Behauptung, jede existierende Übung oder jedes herstellerspezifische Gerät abzudecken. Maschinen werden nach Bewegungs-/Gerätevariante statt nach Markenname eingeordnet. Eigene Übungen bleiben möglich.

## Umfang und Grenzen

- Acht zusätzliche Gerätefilter: Multipresse, SZ-Stange, Trap Bar, Kettlebell, Widerstandsband, Landmine, Schlingentrainer und Ab-Roller.
- Neue Einträge über **Übungsbibliothek → Mehr Übungen & Geräte → Übungsbibliothek erweitern** ergänzen. Die bewusste Übernahme verhindert, dass gelöschte Übungen bei jedem Neustart wieder erscheinen.
- Exakte normalisierte Namen/englische Aliasnamen plus gleiches Equipment vermeiden bekannte Duplikate. Kein unsicheres Fuzzy-Merging. Selbst gewählte Bezeichnungen können deshalb zusätzliche Einträge ergeben.
- Bestehende IDs, Notizen, Pausen, Favoriten, Vorlagen und Historie bleiben unverändert. Eine IndexedDB-Transaktion legt ausschließlich fehlende Definitionen an. Wiederholtes oder gleichzeitiges Übernehmen ist idempotent.
- Keine Trainingswerte oder Beispielsessions ergänzt. Gewichte, Wiederholungen und Pausen werden nicht erfunden.
- Fokus auf wiederholungsbasierte Kraftübungen. Cardio, Distanz-/Zeitübungen (z.B. Plank, Farmer's Carry) sind nicht als vollwertig erfassbare Übungen aufgenommen, da das bestehende Satzmodell diese Einheiten nicht unterstützt. Unterstützungsmaschinen sind als eigene Gerätevarianten getrennt; bei ihnen eingegebene kg stellen Unterstützung dar. Das bisherige Statistikmodell unterscheidet diese Bedeutung noch nicht.
- Der Katalog und die Suchaliase werden lokal mit der App ausgeliefert. Nach Caching und Übernahme funktioniert alles offline, ohne Laufzeitabruf bei den Recherchequellen.

## Letzte Trainingswerte

Nur in aktiven Sessions. Vergleich anhand derselben stabilen Übungs-ID; bei mehrfach derselben Übung pro Einheit anhand ihrer Position unter den Vorkommen dieser ID. Keine Vermischung ähnlich benannter Geräte. Neu angelegte Definitionen haben bis zur ersten dokumentierten Einheit keine Historie.

Es zählt die neueste frühere abgeschlossene Einheit mit mindestens einem abgeschlossenen Satz mit Wiederholungsangabe. Satzpositionen bleiben erhalten: ein offener Satz 1 verschiebt Satz 2 nicht nach vorn. Fehlende Werte bleiben null. Bei Einheiten am selben Tag wird nur verglichen, wenn beide Startzeitpunkte bekannt sind und die frühere Einheit tatsächlich davor liegt. Sonst wird konservativ eine frühere Datums-Einheit verwendet.

„Übernehmen“ kopiert ausschließlich Gewicht und Wiederholungen auf ausdrücklichen Klick; weder Abschlussstatus noch Timer werden geändert. Für schon abgeschlossene Sätze ist der Button deaktiviert. Historische Bearbeitungen/Löschungen aktualisieren den Vergleich per Dexie-LiveQuery. Keine automatische Änderung laufender Eingaben durch einen neuen Vergleichswert.

## Architektur

Bestehendes Datenmodell, DB-Version 1 und JSON-Backup-Schema unverändert. Geräte waren bereits freie Strings; nur die Auswahl wurde erweitert. `src/catalog/exercises.ts` enthält Definitionen, `src/services/exerciseCatalog.ts` die additive Speicherung/Suche und `src/services/previousPerformance.ts` den Vergleich. Das Originaldesign und die Sperre gegen horizontales Scrollen bleiben erhalten.

## Validierung

- `npm run typecheck`: erfolgreich.
- `npm test`: 24/24 Tests erfolgreich, bestehende Tests unverändert. Neue Tests prüfen stabile IDs/Kategorien, additive Transaktionen/Rollback, Duplikatvermeidung, Datenerhalt/Backup, zweisprachige Suche, Vergleichsreihenfolge, Übungsidentität, Satzpositionen und ausdrückliche Werteübernahme.
- `npm run build`: erfolgreich; vorhandene nicht fatale Bundlegrößen-/Zod-Warnungen bleiben.
- `CHROMIUM_PATH=/usr/bin/chromium node scripts/check-library.cjs`: erfolgreich; Bibliothekserweiterung, englische Suche, Kettlebell-Filter, Backup/Restore, echte UI-Übernahme der letzten Werte, Reload, Live-Aktualisierung historischer Änderungen, Offline-Nutzung und vier mobile/Tablet-Breiten.
- `CHROMIUM_PATH=/usr/bin/chromium node scripts/check-ui.cjs`: erfolgreich; bestehende Kernabläufe und sechs Viewportgrößen.
- Keine reale iOS-Geräteprüfung. Browserprüfungen verwenden isolierte Profile und Testdaten, keine persönlichen Nutzerdaten.
