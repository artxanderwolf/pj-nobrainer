# Großupdate v2 – Etappe B: S05 und Vorbereitung von Tor B

Basis: `migration/angular`, Commit `d08bb584ec7d1468e36ae9e1a2e6c0c23a7c1c53`, v0.25.0.1 / Save 27. Stand: 20.11.2026.
Rückfallpunkt: `backup/pre-v2-etappe-b-2026-11-20` auf derselben Basis.

## Umfang und Abnahmegrenze

S05 ist als kleine, eigenständig prüfbare Änderung auf v0.25.0.2 vorbereitet: alle fünf CSV-Begegnungswerte von 0,05 auf 0,08. Keine Änderung des Save-Formats (27), der Gegnerwerte, XP pro Gegner, Beutepools, Material-/Runenwürfe, Kampfregeln oder Zugangsvoraussetzungen. Hilfe und native Versionsvorbereitung werden mitgeführt. Android-Code 13 ist nur eine Versionsvorbereitung; kein signierter Release und keine Änderung des Stable-Kanals.

Die automatischen Prüfungen ersetzen keine Spielerabnahme. Gemäß Schrittplan erfolgt vor S06/S07 Tor B; der nächste Umsetzungsschritt beginnt erst nach Abnahme des vorherigen. Tor B ist hier ausdrücklich noch nicht erfüllt: Die Referenzteams pro Dungeon, endgültige Defensivwerte und Übergangsdauern sind noch festzulegen. Es wurden keine S06-/S07-Balancewerte produktiv geändert.

## Messverfahren

`node --no-warnings --experimental-strip-types scripts/analyze-dungeon-v2-b.mjs` erzeugt `.generated/dungeon-v2-b-measurements.json`. Benötigt nur die bestehende TypeScript-Entwicklungsabhängigkeit. Der tatsächliche GameDungeonService wird ohne Angular-Dekorator transpiliert und mit seinen unveränderten Methoden ausgeführt. Tabellenvarianten werden ausschließlich im Speicher verändert und anschließend wiederhergestellt. Kein kopierter vereinfachter Kampfalgorithmus.

2.000 unabhängige Wellen je Team/Dungeon/Balancevariante, jeweils mit vollen HP; einschließlich realer Gegnerzahlen, Bedrohungs-Zielwahl, 1-%-Bosswürfen, globaler Aktionspause, Treffer-/Ausweich-/Kritwürfen und Klassen-/Waffenfaktoren. Startseed 1000 + Dungeon-ID. Schätzungen, keine garantierten Spielquoten; die maximale ungefähre 95-%-Unsicherheit einer Quote bei n=2.000 beträgt ±2,2 Prozentpunkte.

Für S05 zusätzlich 30 echte einstündige D1-Sitzungen je Profil und Suchvariante; Seeds 101, 202, …, 3030. Levelaufstiege, +1 HP pro Fehlsuche, Ausscheiden von Teammitgliedern und vollständiges Wiederherstellen nach Niederlage bleiben aktiv. Der Ausgangskader bestimmt weiterhin die Gegneranzahl. Rohdaten enthalten komplette Referenzwerte, Waffen, Slots und Material-IDs. Für höhere Dungeons wurden bisher frische Kämpfe, keine vollständigen Langzeitsitzungen gemessen.

## Referenzprofile

Alle Charaktere sind Menschen, ohne Runen. Es werden tatsächlich vorhandene Waffen berechnet; keine erfundenen Rüstungsgegenstände. Der Rüstungswert stammt aus Klasse/Level und aktivierten Waffenbauteilen. Die vier Profile sind Diagnoseprofile, noch keine endgültigen Abnahmeteams je Dungeon. Waffenformen setzen ihre bereits erfüllten Herstellungsvoraussetzungen voraus.

| Profil | Level | Team / Waffen | Material-IDs |
|---|---:|---|---|
| solo-start | 1 | 1 Rekrut, unverändertes Startschwert | Startbauplan: 4/1/1/9/1 |
| duo-budget | 5 | Rekrut mit Dolch; Kämpfer mit 1H-Axt | Metall 5, Holz 1, Leder 9 |
| mixed-four | 10 | Rekrut/1H-Schwert, Kämpfer/2H-Schwert, Bogner/Bogen, Gelehrter/Stab | Metall 12, Holz 10, Leder 11 (D2) |
| equipped-four | 20 | Rekrut/1H-Schwert, Kämpfer/2H-Axt, Bogner/Bogen, Gelehrter/Stab | Metall 68, Holz 62, Leder 71 (D5) |

Das letzte Profil zeigt eine obere Ausrüstungsgrenze. D5-Material darf nicht als Voraussetzung für den erstmaligen D5-Zugang festgelegt werden. Es fehlt noch ein Übergangsprofil mit D4-Ausrüstung.

## S05: Suchzeit und wirksamer Ertrag

Geometrische Suche: E[Schritte] = 1/p, E[Fehlschritte] = (1-p)/p. Bei 5 %: 20 Sekunden Suche, 19 mögliche Heilpunkte je lebendem Charakter. Bei 8 %: 12,5 Sekunden Suche, 11,5 mögliche Heilpunkte. Heilung endet am HP-Maximum; Begegnungsschritte heilen nicht. 37,5 % weniger reine Suchzeit bedeutet weder 37,5 % kürzere Kämpfe noch 60 % mehr realen Ertrag.

Ohne Kampf-/Sammelzeit wären 180 bzw. 288 Begegnungen pro Stunde möglich. Tatsächlich gilt bei konstanten Dauern ungefähr 3600 / (1/p + Kampfsekunden + Sammelsekunden). In echten Sitzungen verändern Niederlagen, Teamschwund und Levelaufstiege diese Größen.

Folgende Werte sind Mittelwerte pro Stunde über 30 Seeds. „Nickelwert“ ist der unverändert berechnete Verkaufswert der Materialien, kein bereits ausgezahlter Marktgewinn; Verkaufsdauer, Marktbelegung und Herstellung sind nicht simuliert. XP bezeichnet die gesamte Basis-XP vor Verteilung auf die Teilnehmer.

| Profil | Chance | Begegnungen | Siege | Niederlagen | Basis-XP | Materialien | Nickelwert |
|---|---:|---:|---:|---:|---:|---:|---:|
| solo-start | 5 % | 82.10 | 6.20 | 75.23 | 75.13 | 4.07 | 46.47 |
| duo-budget | 5 % | 46.90 | 22.33 | 23.97 | 436.40 | 21.93 | 263.60 |
| mixed-four | 5 % | 41.57 | 37.00 | 3.80 | 1537.73 | 79.70 | 964.23 |
| equipped-four | 5 % | 56.73 | 55.97 | 0.00 | 2380.13 | 122.10 | 1473.30 |
| solo-start | 8 % | 101.90 | 9.37 | 91.83 | 111.87 | 5.73 | 69.47 |
| duo-budget | 8 % | 53.23 | 24.07 | 28.43 | 462.87 | 23.50 | 279.47 |
| mixed-four | 8 % | 47.30 | 40.47 | 5.90 | 1669.87 | 84.63 | 1017.20 |
| equipped-four | 8 % | 63.47 | 62.70 | 0.00 | 2699.93 | 136.83 | 1640.13 |

Begonnene, zum Stundenende noch laufende Wellen erklären Differenzen zwischen Begegnungen und abgeschlossenen Siegen/Niederlagen. Beim gemischten Viererteam steigt die Niederlagenzahl durch weniger Heilung, obwohl der Gesamtertrag wächst. S05 ist daher keine Zusage unveränderter Erfolgschancen über einen ganzen Lauf; die Kampfstärke einer frischen Welle bleibt identisch.

### Erste neu hergestellte Waffe

Für den einzelnen Startrekruten werden leere Materialbestände angenommen; das bestehende Startschwert bleibt ausgerüstet. Gemessen wird der erste vollständig belegbare Dolch (jede Bauteilmenge und zulässige Kategorie, kein mehrfaches Verbrauchen derselben Einheit). Herstellung beginnt im Modell sofort bei ausreichendem Material, ohne Arbeiter oder Warteschlange. Bedienzeit, Gebäudezugang und manuelle Abholung sind zusätzliche Bedingungen.

Bei 5 % reichen in 6/30 Sitzungen innerhalb einer Stunde die Materialien, bei 8 % in 14/30. In den übrigen Sitzungen wurde der Meilenstein innerhalb der Messstunde nicht erreicht; daraus lässt sich keine unbedingte mittlere Fertigstellungszeit ableiten. In den erfolgreichen Stichproben liegen Materialfund plus berechnete Herstellungszeit bei 27,5–60,8 Minuten (5 %) bzw. 25,5–59,9 Minuten (8 %). Das langsame Solo-Startprofil bleibt ein offener Balancebefund. S05 allein erfüllt noch nicht die gesamte Einstiegsabnahme.

## S06: Vergleich mit den vorgeschlagenen Faktoren

Produktiv bleiben vorerst HP 4/8/16/32/64 und Schaden/Tempo/Rüstung/Ausweichen/Trefferfaktor 1/2/4/8/16. Der Messkandidat verwendet die PDF-Vorschläge HP 4/5,5/7/9/12, Schaden 1/1,25/1,55/1,9/2,4 und Tempo 1/1,05/1,1/1,15/1,2. Nur zur Diagnose ergänzte Defensiv-Testwerte: Rüstung ×1/1,25/1,5/1,75/2, Ausweichen ×1/1,1/1,2/1,3/1,4, Trefferfaktor ×1/1,05/1,1/1,15/1,2. Diese Ergänzungen sind keine bestätigte Designentscheidung.

Unveränderte globale Regeln: Rüstung maximal 80 %, Ausweichen maximal 95 %, Trefferchance maximal 100 %, Durchschlag 0–100 %. Gegnerdurchschlag bleibt wegen Basis 0 gleich 0. Gegner haben weiterhin ihre Klassen-SF/P-Werte. Bosse: Rekrutenbasis, HP ×10, Schaden ×2 und festes Tempo 0,8. Rüstung, Ausweichen und Trefferchance werden vor einer finalen S06-Umsetzung getrennt begrenzt und geprüft.

Frische Welle mit vollem Team:

| Variante / Profil | D1 | D2 | D3 | D4 | D5 |
|---|---:|---:|---:|---:|---:|
| Bestand / solo-start | 9.45 % | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| Bestand / duo-budget | 60.85 % | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| Bestand / mixed-four | 99.70 % | 5.05 % | 0.00 % | 0.00 % | 0.00 % |
| Bestand / equipped-four | 100.00 % | 99.55 % | 5.15 % | 0.00 % | 0.00 % |
| Messkandidat / solo-start | 9.45 % | 0.15 % | 0.00 % | 0.00 % | 0.00 % |
| Messkandidat / duo-budget | 60.85 % | 21.90 % | 14.55 % | 3.30 % | 0.00 % |
| Messkandidat / mixed-four | 99.70 % | 96.40 % | 66.40 % | 25.25 % | 12.35 % |
| Messkandidat / equipped-four | 100.00 % | 100.00 % | 100.00 % | 100.00 % | 99.95 % |

Die S05-Suchänderung verändert diese isolierten Kämpfe nicht; dafür ist keine zweite identische Stichprobe erforderlich. Die vorgeschlagenen Faktoren beseitigen die extremen Sprünge, ergeben mit einem einzigen Referenzkader aber nicht automatisch die Zielbereiche. mixed-four erreicht im Kandidaten in D4 nur 25,25 %, equipped-four in D5 99,95 %. Ein Ziel von 65–75 % für D5 braucht ein vorab nachvollziehbar festgelegtes Eintrittsteam, ohne D5-Material vorauszusetzen.

## S07: XP-Kopplung und Zugangsdauer

Im aktuellen Code gilt XP = runden(Klassenbasis × enemyMultipliers.damage). Klassenbasis: Rekrut 10, Kämpfer 14, Bogner 14, Gelehrter 16; Bossbasis 40. Eine bloße Änderung des Schadensfaktors verändert deshalb ungewollt Belohnungen. Ohne Entkopplung ergäbe der Messkandidat:

| Dungeon | Bestehende XP: Rekrut/Kämpfer/Bogner/Gelehrter/Boss | Gekoppelte Kandidaten-XP |
|---|---|---|
| D1 | 10 / 14 / 14 / 16 / 40 | 10 / 14 / 14 / 16 / 40 |
| D2 | 20 / 28 / 28 / 32 / 80 | 13 / 18 / 18 / 20 / 50 |
| D3 | 40 / 56 / 56 / 64 / 160 | 16 / 22 / 22 / 25 / 62 |
| D4 | 80 / 112 / 112 / 128 / 320 | 19 / 27 / 27 / 30 / 76 |
| D5 | 160 / 224 / 224 / 256 / 640 | 24 / 34 / 34 / 38 / 96 |

Empfohlene Vorbereitung für S06/S07: einen eigenen kanonischen XP-Faktor in der Dungeon-Tabelle führen, zunächst 1/2/4/8/16 erhalten, anschließend den XP-Ertrag je Stunde gezielt prüfen. Das wäre eine kleine Erweiterung des Balancing-Datenmodells, keine Save-Migration. Geänderte Gegnerfaktoren wirken nur bei neu erzeugten Gegnern; gespeicherte laufende Kämpfe behalten ihren Snapshot. Eine eventuell gewünschte Anpassung laufender Gegner müsste gesondert entschieden werden.

Zugänge bestehen aus 20 qualifizierten Läufen mit jeweils mindestens 150 Siegen; die Suche nach dem nächsten Zugang wird erst im nachfolgenden neuen Lauf ab Welle 100 aktiv, danach 5 % je erfolgreicher Welle. Ein Lauf zählt nur einmal, auch nach Neuladen. Minimaler Erwartungsansatz: 20 × 150 + 99 + 1/0,05 = 3.119 Siege. Die theoretische absolute Untergrenze allein aus Suchzeit beträgt bei 5 % 17,33 Stunden, bei 8 % 10,83 Stunden; Kampf-, Sammelzeit, Niederlagen, manuelle Neustarts und die Fünfstundengrenze fehlen dabei. Diese Untergrenzen sind ausdrücklich keine realen Freischaltzeiten.

Selbst das starke Diagnoseprofil erreicht im D1-Stundenfenster nur 62,7 Siege pro Stunde bei 8 %. Eine lineare, nicht garantierte Größenordnung wäre damit knapp 50 aktive Teamstunden für 3.119 Siege; nachlassende Heilung, Laufbedingungen und Teamwahl können dies verändern. Mehrere Teams teilen Fortschritt, erfordern aber zusätzliche Charaktere und Kosten. Vor Änderungen der 20/150/100/5-%-Regeln werden Langzeitläufe und die Bedingung „150 Siege innerhalb eines Laufs“ gesondert vermessen. S05 verkürzt keinen dieser Schwellenwerte.

## Prüfungen und offene Abnahme

- Erfolgreich lokal: 89 Webprüfungen; darin neue echte Servicefälle für alle fünf Dungeons, 8-%-Grenzwurf, Suchheilung, Reload während Suche und bestehendem Kampf sowie unveränderte Gegner-HP/Schaden/XP.
- Erfolgreich lokal: Angular-Webbuild, Android-Webbuild und Pages-Produktionsbuild; Android-Basis-, Updater- und Releasevorbereitungsprüfungen. Die vorhandene Bundlegrößenwarnung bleibt bestehen.
- Erfolgreich lokal: fünf Browserregressionen (Runtime-Start, Dungeonfenster, Fortsetzung nach Browser-Neustart, Beute einsammeln, Save-Export/-Import), mit Chrome unter Windows; nur die Browserpfad-Erkennung der bestehenden Tests wurde für die lokale Ausführung ersetzt.
- GitHub-CI folgt im Entwurfs-PR. Der Nutzer hat am 20.11.2026 den Upload der 19 geänderten Dateien in das öffentliche Repository und die Anlage des Entwurfs-PR ausdrücklich freigegeben. Merge, Web-/Android-Veröffentlichung und reale Geräteabnahme sind separat.
- S05-Spielertest: Version v0.25.0.2, Suche ohne festen Takt, Wellenstart und HP-Heilung, laufenden Dungeon neu laden, Beute und bereits gefundene Runen einsammeln und erneut laden.
- Vor S06: S05 abnehmen; pro Dungeon Eintrittsteam/Level/Ausrüstung, Defensivfaktoren, Bossbehandlung und Erfolgskriterium festlegen. Vor S07: entkoppelte XP sowie reale 150-Wellen-/Zugangszeiten berechnen. Keine automatische Web-/Android-Veröffentlichung.
