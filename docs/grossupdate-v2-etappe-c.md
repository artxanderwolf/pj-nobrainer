# Großupdate v2 · Etappe C · S08–S11

Stand: v0.27.0.0 / Save 28. Basis: migration/angular, 2ac6c2f86c4d592bcf8094a6ad8bee7994fe0425 (v0.26.0.0 / Save 27).

## Tor C: Modell und Werte

Die 77 stabilen materialId bleiben erhalten. Qualität ist eine eigene Ganzzahl von 1 bis 6; kanonische Bestände verwenden `materialId:quality` und enthalten materialId, quality, category und qty. Verschiedene Qualitäten sind unabhängig. Waffenbauteile und Marktaufträge speichern die Qualität explizit. Namen werden nur angezeigt oder an der bestehenden Altstand-Grenze auf IDs aufgelöst.

Die vollständigen 462 Werte stehen in grossupdate-v2-etappe-c-materialwerte-462.csv und sind mit `node --no-warnings --experimental-strip-types scripts/analyze-material-quality-v2-c.mjs` reproduzierbar. Die Analyse enthält außerdem je Waffenform und Bauteil die aktivierten Statfelder. Qualität multipliziert alle numerischen Materialstats mit 1 / 1,20 / 1,45 / 1,75 / 2,10 / 2,55. Rundung: sechs Dezimalstellen je Materialstat, ohne Ganzprozent-Rundung. Null bleibt null. Materialmenge skaliert den Verbrauch, nicht den Statbeitrag. Bestehende finale Caps bleiben bestehen: Trefferchance und Durchschlag 0–100 %, Charakterrüstung maximal 80 %, weitere Charaktergrenzen aus dem gemeinsamen Charakter-Core.

Die individuellen Grundprofile und Dungeonpools bleiben erhalten; die Qualitätsachse ersetzt die Materialart nicht. Auf identischer Qualität bleiben die unterschiedlichen Profile und späteren Fundorte unterscheidbar. Morsche Fichte (ID 1) besitzt bislang nur HP und damit keinen direkten aktiven Waffenstatbeitrag. Dieser bestehende Profilfall ist bewusst ausgewiesen: Ihre Qualität zählt trotzdem für den niedrigsten Waffenrang und die daraus folgende Sockelzahl. Es werden dafür keine fremden Statboni erfunden. Die umfassende Kampf-/Progressionsbalance gehört zur späteren Etappe E.

## S08: Save und Migration

Save 28 ergänzt `materialQualitySchema: 1`, unabhängige Qualitätsbestände und Bauteilqualitäten sowie historische Basiswert-Snapshots für bestehende Waffen. Vor dem Austausch des Angular-Zustands wird eine getrennte Kopie validiert/migriert. Auch Offline-Snapshots werden migriert. Der reine JSON-Codec bleibt verlustfrei; Importvalidierung prüft die Migration auf einer Kopie.

Alte Bestände und ausstehende Materialfunde erhalten ihre bisher feste Materialseltenheit als Qualität; ihre Mengen bleiben erhalten. Das gilt für Lager, Team-/Dungeonbeute, ausstehendes Einsammeln und Marktaufträge. Bekannte widersprüchliche IDs/Qualitäten, ungültige Mengen und doppelte Bestände desselben Paars werden abgewiesen. Unbekannte historische Inventarobjekte bleiben bestehen und werden nicht als aktive Materialien ausgegeben. Wiederholtes Laden ändert einen migrierten Spielstand nicht erneut.

Vorhandene Waffen behalten Stats und Wert. Bereits eingesetzte Runen werden für ihren historischen Materialbasiswert herausgerechnet und später über die unveränderte Runenberechnung wieder angewendet. Unveränderte Sockelbelegung verwendet den bestehenden exakten Snapshot; Entfernen/Einsetzen einer Rune arbeitet weiterhin. Reservierte aktive, wartende und abholbereite Schmiedeaufträge behalten Stats, Wert, Dauer und Arbeitsfortschritt. Abholung überträgt den historischen Basiswert. Die tatsächlich berührte alte Waffen-/Auftragsnormalisierung delegiert an den Angular-Core und berechnet gespeicherte Werte nicht mehr neu.

## S09–S10: unabhängige Qualität

| Qualität | Chance | Statfaktor |
|---|---:|---:|
| S1 | 70 % | 1,00 |
| S2 | 22 % | 1,20 |
| S3 | 6 % | 1,45 |
| S4 | 1,8 % | 1,75 |
| S5 | 0,1999 % | 2,10 |
| S6 | 0,0001 % | 2,55 |

Die Qualitätsregel liegt in einer eigenen validierten Datentabelle. Nach dem erfolgreichen Materialwurf und der Materialart folgt ein unabhängiger Qualitätswurf. Ein Boss behält fünf verschiedene Arten, jede mit eigenem Qualitätswurf. Der 60-%-Materialwurf sowie Runenreihenfolge, Runenchance, Runeffekte und Sockelregel S1–S6 = 0–5 bleiben erhalten. Keine Verschmelzung, Aufwertung, garantierte S6-Erzeugung oder versteckter Zähler.

Drei feste Seeds erzeugen je eine Million Würfe; die Ergebnisse stehen in grossupdate-v2-etappe-c-statistik.json. S6 trat 0 / 1 / 1 Mal auf. Der Test prüft die häufigeren Qualitäten gegen sechs Standardabweichungen und verlangt ausdrücklich keinen S6 pro Million. Grenzwerte, alle Qualitäten durch den echten normalen Lootpfad, fünf unabhängige Bossqualitäten und der Runenfund ohne Materialfund sind separat geprüft.

## S11: Oberfläche und Reservierungen

Lager, Dungeonbeute, Materialpicker, Schmiedevorschau, Waffenkarten, Markt und Index zeigen die Qualität. Der Index zeigt über eine S1–S6-Auswahl jeweils alle 77 Arten. Die Schmiede zeigt nur passende, verfügbare Bestände, reserviert Mengen pro ID/Qualität und setzt eine unzureichende Auswahl sichtbar zurück. Dieselbe ID in verschiedenen Qualitäten kann in verschiedenen Bauteilen verwendet werden. Waffenrang ist die niedrigste verbaute Qualität; die Vorschau zeigt Rang und Sockelzahl.

Marktreservierung und Abbruch betreffen genau die ausgewählte Qualität. Die Materialpreisformel bleibt in C beim bisherigen Materialstufenpreis; die neue Preis-/Erlös-/Zeitmatrix folgt verbindlich in Etappe D. Spielerhilfe wurde gleichzeitig aktualisiert.

## Nachweise und Grenzen

- Vollständiger Check mit 94 Teilprüfungen erfolgreich; darin 91 Web-/Fachprüfungen einschließlich neuer 462-Kombinationen-/3-Millionen-Testreihe erfolgreich.
- Produktionsbuild erfolgreich; bestehende Größenwarnung bei 500 kB, Ergebnis rund 686 kB und unter der 1-MB-Fehlergrenze.
- 18 unterschiedliche echte Chrome-Browserprüfungen erfolgreich. Neue C-Prüfung: Save27 laden, alte Waffe/Auftrag erhalten, alten Auftrag abholen, S6/S1/S4/S5 mischen, exakt reservieren, S6 verkaufen und stornieren, Index S6, neu laden und qualitätsgenau abholen.
- Normal-/Bossloot, ausstehende S6-Beute nach Reload, wiederholtes Einsammeln und unveränderte Runengrenzen zusätzlich über den echten Dungeon-Service geprüft.
- Gemeinsame Android-Basis-, System-, Updater- und Releasevorbereitungsprüfungen erfolgreich. Android-Angular-Build und Capacitor-Synchronisierung erfolgreich. Native Version vorbereitet auf 0.27.0.0 / Code 15; keine signierte APK und kein Gerätetest.
- Web-/Android-CI erhalten den neuen Browserfall. Lokale bestehende Browserharnesses wurden nur für den installierten Windows-Chrome in temporären Kopien angepasst.

GitHub-Upload, Merge, öffentliche Web-Aktualisierung und manuelle Abnahme werden separat dokumentiert. Die öffentliche Webversion wurde durch die lokale Umsetzung nicht verändert.
