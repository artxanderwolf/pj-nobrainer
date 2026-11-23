# Großupdate v2 · Etappe E · S15 Balancevergleich

Basis `migration/angular` bei `61ff1d1`, Version 0.27.0.2 / Save 28. S15 untersucht die aktive Spielbalance. Eine Änderung an Kampfwerten wird aus diesen Messungen allein nicht abgeleitet. Die gesonderte S14-Wirtschaftsabnahme ist offen.

## Messmethode

- 11 Varianten mit je 480 frischen Wellen im tatsächlichen Dungeon-Service. Pro Variante liefen drei feste Zufallsfolgen mit je 160 Wellen. Jeder Versuch startet mit vollen HP. Die Dauer umfasst gewonnene und verlorene Kämpfe. Eine frische Welle ersetzt weder eine Expedition noch eine gemessene Freischaltzeit.
- Die fünf Referenzteams aus Etappe B treten mit explizitem S1 an. Im Trainingslager und in der Waffenkammer enthalten die Referenzteams bereits freigeschaltete Waffenformen. Ihre Ergebnisse beschreiben die Kampfstärke dieser Teams.
- Die Materialprüfung ersetzt jeweils ein Bauteil eines 1H-Schwerts eines Rekruten auf Level 16. 77 Materialarten ergeben über die passenden Bauteile 561 Kombinationen in S1, S3 und S6. Der Waffenleistungswert nutzt die bestehenden Rüstungsbenchmarks 0/40/80. Effektive HP modellieren einen bereits als Treffer ausgewürfelten Angriff ohne Durchschlag und berücksichtigen Rüstung und Ausweichen. Heilung und Kampfverlauf gehen in diesen Einzelwert nicht ein.
- Der Rüstungsgrenzfall bestätigt 80 % Obergrenze vor Durchschlag. Bei 120 Rüstung und 50 % Durchschlag bleiben 40 % wirksame Rüstung. Ein synthetischer Charakterwert erreicht die Ausweichobergrenze von 95 %. Die Runensockel reichen von 0 in S1 bis 5 in S6. Das gemessene S3-Runenteam verwendet Präzision I und Geschwindigkeit I je Waffe.

| Referenz / Variante | Siege | Ø Sekunden pro Welle |
|---|---:|---:|
| D1 S1 | 441 / 480 | 75,2 |
| D2 S1 | 427 / 480 | 97,4 |
| D3 S1 | 399 / 480 | 110,8 |
| D4 S1 | 395 / 480 | 126,1 |
| D5 S1, Material des Referenzteams | 337 / 480 | 160,0 |
| D5 S1, Material aus D5 | 354 / 480 | 161,8 |
| D5 S3, Material aus D5 | 417 / 480 | 150,9 |
| D5 S3, 1H-Axt / 2H-Axt / Bogen / Dolch | 329 / 480 | 167,1 |
| D5 S3 mit Runen | 457 / 480 | 142,4 |
| D5 S3 mit Hochelfen ohne Runen | 465 / 480 | 155,6 |
| D5 mit hypothetischer D1-S6-Ausrüstung | 355 / 480 | 160,1 |

## Auswertung

- S6-Kupfer am Arbeitsteil erreicht 4,51 Waffenleistung. Sonnenstahl erreicht am selben Teil 4,59 in S1 und 4,85 in S3. Das S3-Team aus D5 schlägt den hypothetischen D1-S6-Build. Das stützt S6 als Bonus für einzelne Funde. Ob S6 für die normale Langzeitprogression entbehrlich bleibt, muss S16 über ganze Expeditionen messen.
- Lichtbirke S3 im Griffkern steigert in der Testwaffe den Leistungswert von 4,59 auf 4,88. Als Parierstange steigert sie die effektiven HP von 266,87 auf 283,90. Nachtleder S3 in der Griffwicklung liefert 29,59 % Krit-Chance. Die Rolle eines Materials hängt vom Bauteil ab.
- Das alternative Waffenprofil und das Standardprofil ändern mehrere Waffen gleichzeitig. Die gemessene Differenz ordnet die Teamkombinationen ein. Sie erlaubt keine isolierte Aussage über Äxte oder Dolche. Hochelfenheilung und Runen erhöhen in dieser Stichprobe die Zahl gewonnener D5-Wellen. Die gemischten Klassen und unterschiedlichen Effekte bleiben für S16 mit realer Verfügbarkeit getrennt zu betrachten.

Wiederholung aus dem Projektverzeichnis mit `node --no-warnings --experimental-strip-types scripts/analyze-grossupdate-v2-s15.mjs <Ausgabe.json>`. Die Rohwerte enthalten die Ergebnisse pro Zufallsfolge und Materialkombination.

S16 folgt nach S15-Abnahme. Für den nächsten Schritt sind vollständige Expeditionen mit tatsächlicher XP-, Beute- und Nickelrate, real erreichbaren Materialien und Zeit bis zu Ausrüstung oder Dungeonzugang erforderlich.
