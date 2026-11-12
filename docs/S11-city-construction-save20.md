# S11 – Bauhütten und persistente Bauaufträge

**App-Version:** 0.11.0.0 · **Save-Version:** 20  
**Basis:** S10-Branch `feature/s10-city-economy-v0.10.0.0` (noch ungemergt), PR #188.  
**S11-Pull-Request:** #189, prüfbar gegen `migration/angular`; enthält dadurch vorübergehend auch S10-Diffs.

## Verbindliche Entscheidungen (12.11.2026)

- Alle sechs Bautypen (Schmiede, Markt, Teamgebäude, Bauhütte, Taverne und nach Freischaltung Runenwerkstatt) haben **30 Minuten** Bauzeit.
- Jede bereits fertiggestellte Bauhütte stellt einen festen Baumeister und kann **genau ein** Bauprojekt gleichzeitig bearbeiten; die zweite Bauhütte ermöglicht ein zweites paralleles Projekt. Es sind keine rekrutierten Helden erforderlich.
- Jeder Baujob hat eine unveränderliche `jobId`, die `buildingInstanceId`, die `builderInstanceId`, `startedAt`, `completesAt` und `paidNickel`.
- Beim Start: Kosten-/Bauhütten-/Maximalzahl-/Platzprüfung vor Änderung; kein Bauplatz bedeutet **keinen Auftrag und keinen Nickelabzug**.
- Beim Abbruch **vor** Bauende: Baujob und Baustelle entfernen, Bauhütte frei, **100 % des tatsächlich bezahlten Nickelbetrags** zurückgeben. Kein doppelter Abbruch oder doppelter Refund.
- Abschluss bei erreichen von `completesAt` unabhängig davon, ob die App offen war. Der zentrale Angular-Tick sowie die Startup-Phase übernehmen fällige Jobs exakt einmal.
- Baustellen sind gespeicherte Gebäude mit Status `underConstruction`, keine temporäre UI-Kopie. Aktive Baustellen und arbeitende Bauhütten sind nicht verschiebbar.
- Erstgebäude-Regel aus S10 und Preisformel bleiben erhalten. Die Runenwerkstatt bleibt bis S22 nicht baubar; ihre vereinbarte Bauzeit ist bereits auf 30 Minuten festgelegt.

## Migrations- und Rückfallverhalten

S10-Save19 erhält beim Start einmalig `state.cityConstruction` mit leerer Jobliste und monotonem Jobzähler. Bestehende Gebäude-, Team-, Material-, Schmiede-, Markt- und Dungeoninformationen werden nicht geändert. Der Save20-Import validiert die referenzierten Baujobs, eindeutige IDs und belegten Baumeister. Ein Rollback zu Save19 muss ausdrücklich mit einem vorher gesicherten Save19-Export durchgeführt werden.

## Grenzen

S12 übernimmt die endgültige direkte Navigation über Teamgebäude und gleicht die noch vorhandene ältere Team-Kaufoberfläche ab. S13–S15 stellen die endgültige durch Gebäudeanzahl bestimmte Schmiede- und Markt-Kapazität sowie gemeinsame Auftragslisten her. S11 ersetzt deren existierende Aufträge nicht.

## Abnahme

- `npm run check:city-construction` einschließlich 30 Minuten, parallelen Bauhütten, freier Fläche, Nickel, Abbruch, Neustart, Teamzuordnung und beschädigtem Save.
- `npm run check`, `npm run build`, Angular-CI, Android-CI.
- Im Browser: Bau starten, zweite Bauhütte bauen, zwei parallele Aufträge, bei Geldmangel/Platzkonflikt keinen Abzug; vor Ende abbrechen und vollen Nickelbetrag zurückerhalten; vor Endzeit schließen und nach Ende öffnen, nur ein fertiges Gebäude.
- Kein automatisches Mergen oder Veröffentlichen vor ausdrücklicher Freigabe.
