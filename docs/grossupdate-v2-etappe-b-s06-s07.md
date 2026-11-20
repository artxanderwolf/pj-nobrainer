# Großupdate v2 – Etappe B: S06/S07 und Tor B

Stand: 20.11.2026. Basis ist der vom Nutzer abgenommene S05-Commit `4b9aba080c3785b5f65af4a8d2d27c9ce9c21422` im Entwurfs-PR #204. `migration/angular` bleibt vorerst auf `d08bb584`; kein Merge oder Spielrelease. Sicherung: `backup/pre-v2-s06-s07-2026-11-20`.

## Ziel und Umfang

Der Nutzer hat S05 abgenommen und S06/S07 gemeinsam zur Fortsetzung freigegeben. Der Stand v0.26.0.0 setzt die sanftere Gegnersteigerung, unabhängige XP und erreichbare Dungeonübergänge um. Große App-Versionsstufe wegen der zusammenhängenden Gegner-/Fortschrittsänderung. Save 27 bleibt erhalten: Es ändern sich Werte und Regeln, keine persistierten Felder. Androidname v0.26.0.0 / Code 14 ist nur vorbereitet.

Betroffen: kanonische Balancing-CSV, Generator/Validierung, Gegnererzeugung, gemeinsamer Fortschrittskern und tatsächliche Ladegrenzen, Missionsanzeige, Hilfe, Versionsangaben und Tests. Keine Änderung an Material-/Runenwürfen, Waffen-/Rassenwerten, globalem Kampftakt, Inventarpreisen, Teamsperren oder Fünfstundengrenze. Die bestehenden ID-basierten Angular-Pfade bleiben maßgeblich. Der wiederverwendete Simulationsharness ist nur Entwicklungswerkzeug und Teil keines App-Bundles.

## Festgelegte Gegner- und XP-Werte

| Dungeon | HP-Faktor | Schaden | Tempo | Rüstung | Ausweichen | Trefferfaktor | Eigener XP-Faktor |
|---|---:|---:|---:|---:|---:|---:|---:|
| D1 | 4 | 1 | 1 | 1 | 1 | 1 | 1 |
| D2 | 5.5 | 1.25 | 1.05 | 1.25 | 1.1 | 1.05 | 2 |
| D3 | 7 | 1.55 | 1.1 | 1.5 | 1.2 | 1.1 | 4 |
| D4 | 9 | 1.9 | 1.15 | 1.75 | 1.3 | 1.15 | 8 |
| D5 | 12 | 2.4 | 1.2 | 2 | 1.4 | 1.2 | 16 |

D1 behält alle tatsächlichen Gegnerwerte. Die HP-/Schaden-/Tempofaktoren entsprechen dem v2-Plan. Für Defensive und Treffer wurden getrennte sanfte Faktoren festgelegt. Zusätzliche, separat validierte Obergrenzen für neue Gegner: Rüstung 12 %, Ausweichen 30 %, effektive Trefferchance inklusive Klassenpräzision 80 %. Aktuelle Gegner erreichen höchstens 6 % Rüstung, 21 % Ausweichen und 69 % Trefferchance. Die globalen Spieler-/Kampfcaps bleiben unverändert (80 % Rüstung, 95 % Ausweichen, 100 % Trefferchance). Gegnerdurchschlag bleibt 0.

Bosse behalten Rekrutenbasis, zehnfache HP, doppelten Schaden, festes Tempo 0,8 und 40 Basis-XP. Die XP verwenden ein eigenes CSV-Feld `enemy_xp_multiplier`; ein geringerer Schadensfaktor kann dadurch keine Belohnung mehr senken. Normale Basis-XP bleiben 10/14/14/16, höhere Dungeons erhalten weiterhin Faktor 1/2/4/8/16.

## Tor B: Referenzteams und Messmethode

Die Profile wurden nach einer offen dokumentierten Erkundung der Levelgrenzen festgelegt. Danach erfolgte die abschließende Validierung mit neuen Seeds 128021, 256019 und 512009 (je 2.000 Kämpfe pro Dungeon, 6.000 pro Referenzteam). Die Levelprofile sind Eintritts-Diagnoseprofile und keine Freischaltvoraussetzungen. Sie wurden nicht als dieselben Charaktere auf einer einzigen durchgespielten Kampagne simuliert.

Alle vier Charaktere sind Menschen ohne Runen: Rekrut mit 1H-Schwert, Kämpfer mit 2H-Schwert, Bogner mit Bogen, Gelehrter mit Stab. Reale Bauteil- und Waffenwerte, keine erfundenen Rüstungsteile. Waffenboni liefern die zusätzlichen Rüstungswerte. D2–D5 verwenden ausschließlich Materialien aus dem vorherigen Gebiet. Das starke Endspielprofil wird nur als obere Vergleichsgrenze verwendet.

| Dungeon | Level Rekrut/Kämpfer/Bogner/Gelehrter | Metall/Holz/Leder (IDs) | Ziel frische Welle | Gemessen (6.000) |
|---|---|---|---|---|
| D1 | 4/4/4/4 | 5/2/7 | 90–98 % | 93.00 % |
| D2 | 8/8/8/8 | 5/2/7 | 80–90 % | 88.92 % |
| D3 | 10/11/10/11 | 16/10/19 | 75–85 % | 83.33 % |
| D4 | 13/14/13/14 | 32/26/35 | 70–80 % | 80.38 % |
| D5 | 16/16/16/17 | 48/42/51 | 65–75 % | 68.57 % |

D4 liegt als Punktschätzung um rund 0,4 Prozentpunkte über der vorläufigen 80-%-Obergrenze. Das ungefähre 95-%-Intervall beträgt hier 79,4–81,4 %. Es wurde nach der abschließenden Stichprobe nicht weiter auf ein gewünschtes Ergebnis hin nachkalibriert. Die Werte sind zufallsabhängige Schätzungen und keine Zusage für beliebige Teams oder einen kompletten Lauf.

Einzelrekrut, günstiges Zweierteam und gut ausgerüstetes Level-20-Viererteam wurden zusätzlich in allen Dungeons mit je 1.000 frischen Kämpfen geprüft (15.000 Stresskämpfe). Insgesamt umfasst der abschließende Lauf damit 45.000 frische Kämpfe. Das schwache Solo-Startprofil bleibt bewusst schwach, da die D1-Kampfstärke laut Auftrag erhalten bleibt. Kein S6-Material oder neues Runensystem ist Voraussetzung.

## S07: begründete Zugangsänderung

Die vorgelagerte Fünfstundenprüfung der sanfteren Gegner mit einheitlichen Eintrittsleveln zeigte: D2 erreichte 105–123 Siege, D4 77–102; kein solcher D2-/D4-Lauf erreichte 150 Siege. Die bisherigen 20 qualifizierten Läufe mit je 150 Siegen erzwingen daher deutlich stärkere Farmteams und machen die normale Gebietsstaffelung unnötig schwer.

Festgelegt und vor Umsetzung im Chat erläutert: fünf qualifizierte Läufe mit je 50 erfolgreichen Wellen. Die Zugangssuche wird erst in einem danach neu gestarteten Lauf ab erfolgreicher Welle 50 aktiv. Fundchance bleibt 5 % je erfolgreicher Welle; Claim bleibt erforderlich. Ein Lauf zählt genau einmal; auch ein nach Erreichen der 50 Siege manuell beendeter Lauf bleibt angerechnet. Kein zusätzlicher Wurf vor Berechtigung und kein weiterer Wurf nach Fund/Claim. Die frühere Zählung 20/150/100 wird nur für diese neue Regel abgelöst.

Alle vier Regeln stehen einmalig in `game_settings.csv`; Generierung, Missionsanzeige, Hilfe und Tests verwenden denselben Regelkern. Bestehende höhere Laufzähler werden nicht auf fünf gekürzt. Zugänge und Claims werden nicht zurückgesetzt. Noch unqualifizierte laufende Save-27-Teams ab 50 Siegen werden beim Laden einmalig angerechnet. Das alte `searchEligible` bleibt im laufenden Durchgang erhalten; die neue Suchberechtigung gilt erst beim nächsten Start. Derselbe Anrechnungskern wird an den vorhandenen modernen und älteren Ladegrenzen verwendet.

Der reine Erwartungsansatz sinkt von 20×150 + 99 + 1/0,05 = 3.119 auf 5×50 + 49 + 1/0,05 = 319 Siege. Kampf-/Sammelzeiten, Teamverluste, praktische Bedienzeit und Neustarts sind darin noch nicht enthalten.

### Echte Fünfstundenläufe und Zugangspfade

Je Referenzteam wurden 20 vollständige Fünfstundenläufe mit dem echten GameDungeonSessionService geprüft (100 Läufe / 500 simulierte Stunden). Dazu 20 komplette Zugangspfade für jeden der vier Gebietswechsel, einschließlich tatsächlicher Beuteabholung, Levelaufstiege, HP-/Teamschwund, Wiederbelebung nach Niederlagen und Laufneustarts. Die Endfrist wird vom echten Sitzungsservice durchgesetzt. Seeds: 7919, 15838, …, 158380.

Die Zugangspfade verwenden eine günstige Spielweise: nach der jeweils ersten Qualifikation abholen und sofort neu starten, bis fünf Läufe zählen; dann die Suche im neuen Lauf fortsetzen. Kein Herstellungs-/Ausrüstungswechsel, keine Arbeiter-/Stadt-/Rekrutierungskosten, keine Offline-Abweichung und keine menschliche Bedienpause. Die gemessenen Zeiten beginnen bereits mit dem jeweiligen Referenzteam; sie sind keine Gesamtdauer eines neuen Spielstands. Bei voller Fünfstundenlaufzeit statt gezielter Neustarts dauert es länger.

| Gebiet | Siege/Stunde im 5-h-Lauf | 50 Siege erreicht | Ø Minuten bis 50 Siege | Basis-XP/Stunde | Material/Stunde | Material-Nickelwert/Stunde | Ø nächster Zugang (Stunden) |
|---|---:|---:|---:|---:|---:|---:|---:|
| D1 | 31.38 | 20/20 | 97.4 | 1238.5 | 61.6 | 725.7 | 9.43 |
| D2 | 23.12 | 20/20 | 135.2 | 1788.5 | 44.3 | 886.0 | 12.73 |
| D3 | 19.20 | 20/20 | 163.2 | 2940.9 | 36.8 | 1103.4 | 14.95 |
| D4 | 16.45 | 20/20 | 183.8 | 5256.3 | 31.6 | 1264.8 | 18.10 |
| D5 | 11.55 | 20/20 | 257.0 | 6833.0 | 21.2 | 1058.0 | kein D6 |

Der Nickelwert ist nur der unveränderte Verkaufswert gefundener Materialien, kein bereits ausgezahlter Marktertrag. Die spätere Material-/Preisüberarbeitung bleibt Etappe C/D vorbehalten. Alle 80 gemessenen Zugangspfade konnten den Fund regulär claimen. Ein fortgeschrittenes oder besser zusammengestelltes Team kann schneller sein; schwächere Teams können erheblich länger brauchen. Langzeitmotivation und weitere globale Ökonomie bleiben Gegenstand der späteren Etappen.

## Save-Sicherheit, Hilfe und Prüfungen

- Save-Version 27, vorhandene Material-IDs und bestehende Inventare bleiben erhalten. Neue Faktoren werden bei Gegnererzeugung angewandt. Ein gespeicherter laufender Gegner wird nicht nachträglich umgerechnet; sein HP-/Schaden-/Tempo-/XP-Snapshot gilt bis zum Ende dieses Kampfes.
- Neue Regression prüft alle vier Zugangsschwellen, exakte 5-%-Grenzwürfe, keinen Frühwurf, einmalige Qualifikation über mehrere Reloads, Altzähler über fünf, unveränderte Beute und vorhandene Zugänge sowie entkoppelte XP und Caps bei Extremwerten. Tabellen mit fehlenden Regeln oder ungültigen Faktoren werden abgewiesen.
- Der zusätzliche echte Browsertest lädt einen laufenden Save 27 mit 80 Siegen und 4 Alt-Läufen: genau ein weiterer Lauf wird angerechnet; wiederholtes Laden zählt nicht erneut. HP, Materialien, gefundener Zugang und absolute Endfrist bleiben erhalten.
- Lokal bestanden: 90 Webchecks, 17 bestehende Chrome-Browserregressionen und der zusätzliche Save-27-Browsertest; Web-, Pages- und Android-Webbuild; Android-Basis-, Updater- und Releasevorbereitung. Die vorhandene Bundlegrößenwarnung bleibt bestehen.
- Hilfe erklärt 5/50/50/5 %, erhaltenen Fortschritt, Gegnerkurve, Grenzen und unabhängige XP. Die spielerrelevante Missionsanzeige ist synchron.
- Vollständige GitHub-CI folgt mit dem aktualisierten Entwurfs-PR. Reales Gerät, Merge, Webveröffentlichung und signierter Android-Release bleiben getrennt.

## Reproduktion und Spielerabnahme

`node --no-warnings --experimental-strip-types scripts/analyze-dungeon-v2-s06-s07.mjs` erzeugt die vollständigen Messwerte, Referenz-Waffen und Charakterwerte unter `.generated/dungeon-v2-s06-s07-measurements.json`. Der Service-Harness entfernt lediglich Angular-Dekoratoren und führt die tatsächlichen Spielmethoden aus. Die eingefrorenen Referenzteams stehen in `scripts/fixtures/dungeon-v2-b-reference-teams.json`.

Bitte im Prüfstand v0.26.0.0 testen:
1. Alten Spielstand mit laufendem Kampf laden: Gegnerwerte bleiben erhalten, Beute/Runen und Ausrüstung fehlen nicht.
2. Einen frischen D2–D5-Kampf starten: sanftere Werte; Gegner-XP bleiben nach der bekannten Dungeonstaffel erhalten.
3. Lauf mit 49 und dann 50 Siegen prüfen: genau einmal angerechnet, auch nach Neustart.
4. Nach fünf qualifizierten Läufen einen neuen Lauf starten: vor Welle 50 kein Zugang, danach zufälliger Fund; erst Claim öffnet das nächste Gebiet.
5. Bereits gefundene Zugänge, höhere Alt-Laufzähler, zweite Teams und JSON-Export/-Import prüfen.

Etappe B ist technisch zur gemeinsamen Abnahme vorbereitet. Die Nutzerabnahme von S05 ist dokumentiert; reale S06-/S07-Abnahme und Veröffentlichungsfreigabe werden nicht aus automatischen Prüfungen abgeleitet.
