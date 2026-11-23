# Großupdate v2 · Etappe E · S16 Langzeitprogression

Basis `migration/angular` bei `61ff1d1`, App-Version 0.27.0.2 / Save 28. Der Prüfstand setzt auf dem abgenommenen S15-Branch auf. Die Simulation änderte keine Spielwerte.

## Versuchsaufbau

- Sieben Profile mit jeweils zwölf festen Zufallsfolgen. Pro Profil gab es zwölf vollständige Fünf-Stunden-Expeditionen und zwölf gesonderte Fortschrittssimulationen mit jeweils maximal 24 Spielstunden. Insgesamt wurden rund 1.938 Spielstunden simuliert.
- Die fünf Referenzteams aus Etappe B tragen durchgehend S1. Die beiden zusätzlichen D5-Teams verwenden Sonnenstahl, Lichtbirke und Amethystleder, einmal in S1 und einmal in S3. Klassen, Level und Waffenformen bleiben bei beiden D5-Vergleichen gleich. Die Teams starten als Menschen ohne Runen. Sie nutzen gefundene Materialien während der Messung nicht für neue Ausrüstung.
- Lauf und Kämpfe werden über den aktuellen Spielservice abgewickelt. XP sind tatsächlich verbuchte Charakter-XP, über alle vier Figuren summiert. Nickel ist der S12-Rohverkaufswert der eingesammelten Beute, bevor ein Marktauftrag angelegt wird. Die Marktzeit ist die Summe der bestehenden Verkaufsdauern bei einem Platz und Arbeitsfaktor 1. Waffenverkäufe, Kapazitätsgrenzen, Ausbaukosten und Offline-Auszahlung gehören zur separaten S14-Abnahme.
- Für Dungeonzugänge sammelt die Simulation zunächst fünf qualifizierte Läufe mit mindestens 50 Siegen. Sie beendet diese Läufe nach der Qualifikation gezielt und beansprucht den nächsten Zugang nach dem tatsächlichen Fund. Im normalen Spiel können längere Pausen sowie spätere Abholung und Neustarts die Zeit erhöhen. Die Referenzteams stellen Ausrüstung bereits bereit, deshalb sind diese Zeiten keine Schätzung für einen frischen Spielstand.
- Als messbare Bauteilverbesserung gelten zwei nach dem Lauf abgeholte Metalle derselben Material-ID und Qualität oberhalb der getragenen Qualitätsstufe, mit S5 als Obergrenze. Das reicht für das Arbeitsteil eines 1H-Schwerts. Die Messung umfasst weder die übrigen Bauteile einer neuen Waffe noch Schmiedezeit.

## Ertrag einer vollständigen Expedition

Werte sind Mittelwerte pro Profil. Siege je Lauf, Siegesquote aus allen Begegnungen, Marktbedarf je fünf Stunden Dungeonzeit.

| Profil | Siege | Siegesquote | Team-XP/h | Materialien/h | Rohwert Nickel/h | Marktbedarf |
|---|---:|---:|---:|---:|---:|---:|
| D1 S1 | 155,3 | 69,7 % | 1.232 | 61,9 | 843 | 3,10 h |
| D2 S1 | 112,5 | 59,2 % | 1.743 | 44,3 | 865 | 2,90 h |
| D3 S1 | 98,1 | 55,4 % | 3.001 | 38,3 | 1.090 | 3,18 h |
| D4 S1 | 82,8 | 51,5 % | 5.251 | 31,6 | 1.313 | 3,49 h |
| D5 S1, Zugangsausrüstung | 60,3 | 46,5 % | 7.014 | 21,3 | 1.269 | 3,14 h |
| D5 S1, D5-Materialien | 62,0 | 47,8 % | 7.316 | 22,8 | 1.333 | 3,31 h |
| D5 S3, D5-Materialien | 70,2 | 52,6 % | 8.773 | 27,0 | 1.617 | 4,00 h |

## Zeit bis zu Fortschrittszielen

Median in Spielstunden. Die Zeit bis zum ersten Levelaufstieg bezieht sich auf die erste der vier Figuren. D5 ist der letzte Dungeon.

| Profil | Levelaufstieg | Erste Qualifikation | Besseres Metall | Nächster Zugang |
|---|---:|---:|---:|---:|
| D1 S1 | 0,98 | 1,74 | 1,74 | 9,54 |
| D2 S1 | 2,43 | 2,37 | 2,39 | 12,71 |
| D3 S1 | 2,86 | 2,59 | 2,69 | 14,64 |
| D4 S1 | 4,30 | 3,06 | 3,24 | 17,05 |
| D5 S1, Zugangsausrüstung | 8,98 | 4,15 | 5,00 | — |
| D5 S1, D5-Materialien | 8,30 | 4,02 | 5,00 | — |
| D5 S3, D5-Materialien | 7,16 | 3,59 | 15,00 unter den 6 erfolgreichen von 12 | — |

Alle 48 simulierten Übergänge von D1 bis D5 gelangten innerhalb der 24-Stunden-Grenze zur tatsächlichen Freischaltung. Die beobachteten Zeiten reichten je Übergang von 8,83–11,44 h, 12,12–13,97 h, 13,97–16,16 h und 16,26–19,38 h. Alle D5-Profile qualifizierten sich in allen zwölf Fünf-Stunden-Expeditionen. Kein Versuch fand ein S6-Material.

## Bewertung für die Abnahme

- S6 war für die gemessenen Dungeonzugänge und D5-Qualifikationen entbehrlich. D5 ist mit S1 erreichbar und messbar erfolgreicher, wenn das Team zur D5-Ausrüstung und dann zu S3 wechselt.
- Für das D5-Einstiegsteam steigt der XP-Ertrag gegenüber D4 um rund 34 %, während der Rohwert je Stunde um rund 3 % fällt. D5-Material in S1 hebt den Rohwert knapp über D4. Diese Profile zeigen einen wirtschaftlichen Einstiegsknick, keinen allgemeinen Ertragsabfall für alle Builds. Vor einer Änderung der Verkaufs- oder Beuteraten sollte S14 die reale Auszahlung und den Produktionsdurchsatz messen.
- Der erste bessere Metallbestand nach S3 war im 24-Stunden-Fenster nur in der Hälfte der D5-Versuche erreichbar. Klassenwechsel, Bauteilwahl, Ausrüstungsmix und Runen bleiben eigenständige Fortschrittsziele. Eine weitere Seltenheitsstufe als Pflichtziel wäre mit diesen Messungen nicht begründet.
- Alle 91 Web-Prüfungen bestanden. Da die Änderung Analyse und Dokumentation betrifft, bleibt die ausgelieferte Version 0.27.0.2 / Save 28. Etappe F folgt gemäß Schrittplan nach der Abnahme von S16.

Reproduktion aus dem Projektverzeichnis mit `node --no-warnings --experimental-strip-types scripts/analyze-grossupdate-v2-s16.mjs <Ausgabe.json>`. Die JSON-Datei enthält alle Einzelläufe und verwendeten Zufallsfolgen.
