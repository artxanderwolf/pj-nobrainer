# Großupdate v2 · Etappe D, S12 · Materialverkauf und Hochelfen-Heilung

Basis ist `migration/angular` bei `6e7f489` mit abgeschlossener Etappe C. Der Prüfstand hat App-Version 0.27.0.1, Android-Installationscode 16 und weiterhin Save 28. Die Heilungsänderung ergänzt den Schrittplan und aktualisiert für diesen Stand den Betrag aus Masterliste v1.1 (E-265/E-266).

## S12 · Materialverkauf

Die [Preismatrix](grossupdate-v2-etappe-d-materialpreise-462.csv) enthält alle 77 Material-IDs mit je sechs Stückpreisen. Grundlage sind 10 Nickel mal dem Faktor der festen Materialstufe (1 / 1,5 / 2,2 / 3,2 / 4,6) und dem Qualitätsfaktor (1 / 1,6 / 2,5 / 4 / 7 / 15), kaufmännisch gerundet. Die Berechnung nutzt ganzzahlige Prozentfaktoren, damit halbe Nickel zuverlässig aufgerundet werden. Der bisherige SPE-Aufschlag entfällt mit der vereinbarten Preisformel.

Die bestehende Zeitformel bleibt in Kraft. Pro Stück werden 15 Sekunden plus 1,5 Sekunden je Nickel auf die nächsten 5 Sekunden aufgerundet. Zum Beispiel kosten Stufe 1/S1 und Stufe 1/S6 je 10 bzw. 150 Nickel und belegen den Markt je 30 bzw. 240 Sekunden. Die Anzeige im Lager, die Marktvorschau und neue Aufträge lesen dieselben Werte pro Material-ID und Qualität. Bestehende aktive, wartende und abholbereite Aufträge verwenden weiter die beim Anlegen gespeicherten Werte. Die Save-Struktur braucht dafür keine Erweiterung.

## Ergänzung · Hochelfen im Kampf

Rekruten (selbst) und Kämpfer (verletzter Verbündeter) heilen nach Ausweichen mit dem bisherigen Fünf-Sekunden-Cooldown. Bogner (selbst) und Gelehrte (verletzter Verbündeter) heilen im bestehenden Zehn-Sekunden-Takt. Die Höchstmenge beträgt 10 HP pro Auslösung. Das Kampfprotokoll zeigt die tatsächlich hinzugekommenen HP, einschließlich Teilheilung an der HP-Obergrenze. Auswahl nach relativem HP-Mangel, Gleichstand nach Charakter-ID und Ausschluss gefallener Figuren gelten weiter.

## Abnahme und Fortsetzung

- Im Markt Zinn S1 und S6 sowie ein Material der Stufe 2 preislich vergleichen. Mehrere Einheiten auswählen, Vorschau und Auftrag vergleichen, einen Verkauf abbrechen und die Rückgabe derselben Qualität im Lager prüfen.
- Einen vor der Änderung gestarteten Verkauf nach dem Laden abschließen und auf den ursprünglich zugesagten Betrag prüfen. Nach erneutem Laden darf es keine zweite Auszahlung geben.
- Einen verletzten Hochelfen im aktiven Kampf beobachten und Heilprotokoll, HP-Grenze und Auslöseintervall vergleichen. Im Team einen verwundeten und einen gefallenen Verbündeten prüfen.
- Nach Abnahme von S12 folgt S13. Für den Produktwert ist die Beispielrechnung aus dem Plan 125 Nickel Material und Verarbeitung (7 × 10 Nickel, dann × 1,5 + 20 Nickel). Vor der Umsetzung muss der Leistungsanteil gegen den bereits vorhandenen Leistungswert und die Qualitätsbeiträge der Waffen abgeglichen werden, damit dieselbe Qualität nicht doppelt vergütet wird. Tor D umfasst außerdem die Wirtschaftssimulation mit frühem, mittlerem und spätem Spielprofil. S14 prüft Durchsatz, Nickel pro Stunde, Lagerreserve, Offline-Fortschritt und Verkaufsschleifen.

## Prüfstand

- Web-Produktion und Android-Web-Build erfolgreich. Die vorhandene Warnung zum 500-kB-Bundlebudget bleibt sichtbar (rund 686 kB).
- Chrome prüft die Stufen- und Qualitätsvorschau, den Mengenpreis, die reservierte Qualität, Preis und Dauer des Auftrags, Storno und Save/Load. Ein weiterer Chrome-Fall bezahlt einen alten Materialauftrag mit seinen gespeicherten 123 Nickel aus und prüft die einmalige Auszahlung.
- Tests am Dungeon-Service prüfen volle und gedeckelte Heilung im Protokoll sowie die Fünf-Sekunden-Grenze nach Ausweichen.
- Capacitor-Synchronisierung und nativer Debug-Build erfolgreich. Die APK-Metadaten bestätigen Version 0.27.0.1 / Code 16. Der lokale Emulator startete in beiden Versuchen nicht. Ein Gerätetest bleibt offen.
