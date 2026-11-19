# S24 – Gesamtabnahme, Balance und Releasevorbereitung

**Stand:** 19.11.2026 · **Basis:** `migration/angular` @ `ab4ac1b1f5ad6cf01cff8b3d1150df8bcc6d9f75` · **Etappe:** F des Großupdate-Schrittplans v1.1

**Status: Prüf- und Freigabevorbereitung, KEIN bestätigter Gesamt-Release.**
S24 umfasst Integration, Testnachweise, Spielerhilfe, Balancekontrolle und Rückfallweg. Ein Web-/Android-Abschlussrelease wird erst nach ausdrücklicher Nutzerfreigabe vorgenommen.

## Version, Migration und Rückfall

- Ausgangs-App: **v0.24.0.0**. Aktuell keine erneute Gameplay- oder Save-Schemaänderung. Save-Version bleibt **27**.
- Bei einer abgeschlossenen S24-Änderung muss die App-Version gemäß Entwicklungsregeln synchron erhöht werden; bislang ist dieses PR ausdrücklich ein ungemergter Prüfstand.
- Vor Etappe F: `migration/angular` @ `ab4ac1b1f5ad6cf01cff8b3d1150df8bcc6d9f75`; vor Etappe E: `backup/pre-etappe-e-s20-s23-2026-11-19`.
- Spielstand vor erster Migration exportieren. Niemals einen v27-Save ungeprüft in ältere App-Versionen zurückimportieren.
- Android bleibt separat: keine Veröffentlichung von signierten APKs und keine Änderung an `stable.json` durch S24.

## Belegte automatisierte Vorprüfungen (S20–S23, unveränderte Etappe E)

| Bereich | Nachweis | Status |
| --- | --- | --- |
| Angular-Build und Web-Regressionspaket | [Angular CI #44562017544](https://github.com/artxanderwolf/pj-nobrainer/actions/runs/44562017544) | Erfolgreich für Etappe-E-Commit `603c2265` |
| Android-Build/Capacitor-Sync und automatisierte Browserregressionen | [Android CI #44562017456](https://github.com/artxanderwolf/pj-nobrainer/actions/runs/44562017456) | Erfolgreich für Etappe-E-Commit `603c2265` |
| S20: Runentypen/Sockel, fünf GES-II-Runen | `scripts/check-s20-runes.mjs` | Im E-CI enthalten |
| S21–S23: Altwaffen, Aufträge, idempotente Migration, Werkstatt, 1.000.000 Dropversuche | `scripts/check-s21-s23-runes.mjs` | Im E-CI enthalten |
| S24: übergreifende Versions-, Hilfe-, Sockel- und CI-Guards | `scripts/check-s24-release-readiness.mjs` | **Neu, Ergebnis erst mit S24-CI bestätigen** |

Die Android-CI erstellt Debug- und **unsignierte** Release-APKs; ein bestandener Workflow ist **kein** Test auf einem echten Android-Endgerät.

## Gesamt-Abnahmematrix: noch auf realen Spielständen/Geräten zu prüfen

1. **Save/Migration:** Export/Import mit v27; älterer Save (vor S17 und vor S21) migriert genau einmal; ID-Eindeutigkeit der Runen; wiederholtes Laden ohne zusätzliche Items oder verlorene Waffen.
2. **Stadt/Gebäude:** Rasterpositionen und Gebäude-IDs, Verschieben/Erweitern, Neubau, Kapazitäten und erhaltene Altansprüche; Werkstattplatzierung bei belegter Stadt; separate Bau- und Produktionsaufträge.
3. **Charaktere/Taverne:** Altklassen- und Rassenmigration, gespeicherter Kader, Ausrüstung, Kosten und maximal zwei Tagesbewerber; Grenzfälle beim Tageswechsel in `Europe/Berlin`, inklusive Sommerzeitwechsel und Offline-Wiederkehr.
4. **Teams/Dungeons:** Zehn parallele Teams, Reservierungen, Ausgangsgröße der Gegnerzahl, aktive Läufe über App-Neustart, Offline-Fortschritt, Tod, Abbruch, Beutesammeln und unabhängige Material-/Runenwürfe.
5. **Schmiede/Markt:** Materialien per ID reservieren; fertige Aufträge genau einmal abholen; Waffen aus Altaufträgen und Runen-Statwerte erhalten; Verkauf/Rückgabe/Offline-Claim ohne Doppelzahlung.
6. **Runen:** Jede der sechs Kombinationen P/DS/GES × I/II, S1-Bestandsschutz nach Entnahme, fünf gleichartige Runen, Einsetzen/Tauschen/Entfernen und Persistenz; neue Waffen ohne Spezialbauteil.
7. **Hilfe/UI:** Alle Mechaniken aktuell und widerspruchsfrei; Desktop, kleine Smartphone-Bildschirme, lange Listen, Dialoge, Rücknavigation und barrierearme Bedienbarkeit.
8. **Performance/Balance:** Lange Offline-Zyklen mit mehreren Teams, umfangreiche Inventare und fünf GES-II-Runen im realen Kampf. Laufzeit, Speicherlast, reale Runenrate und Nickel-/Zeitökonomie erfassen; Balance nicht ohne Messergebnisse ändern.
9. **Android-Gerät:** Echte Installation/Update mit **unverändertem Release-Signierschlüssel**, Offline-Start, Wiederaufnahme, System-Zurück und JSON-Datei-Export/-Import testen. Kein Produktions-Updater ohne eigene Freigabe.

## Blockierende Release-Gates

- [ ] S24-Web-CI nach den neuen Änderungen erfolgreich.
- [ ] S24-Android-CI nach den neuen Änderungen erfolgreich.
- [ ] Spieler bestätigt die funktionale Web-Abnahme (Desktop und Smartphone).
- [ ] Spieler bestätigt reale Android-Geräteabnahme, soweit Android Bestandteil des Releases sein soll.
- [ ] Endgültige Balancewerte anhand eigener Spieltests bestätigt oder ausdrücklich als vorläufig akzeptiert.
- [ ] Letzten Changelog-, Version- und Fallbackvergleich durchgeführt.
- [ ] **Ausdrückliche Abschluss- und Veröffentlichungsfreigabe des Nutzers erhalten.**

## Änderungen während S24

- Überholten Hinweis im Kader-Waffenvergleich zur späteren Rune entfernt. Nun entspricht der Text der tatsächlich aktiven Runenwerkstatt und dem Waffenvergleich.
- Übergreifende Integrationsprüfung ohne neues Gameplay, Material, Runenitem oder Save-Schema ergänzt.
- Der im Android-Projekt vorhandene Text `android-release-notes.json` beschreibt einen **älteren Android-Release** (u. a. Save 14); nicht als aktuelle v27-Release-Note verwenden. Beim separaten Android-Release gezielt aktualisieren.

**Noch nicht durchgeführt:** vollständige reale Endgeräte-, Web-Nutzer-, Stress- und Langzeittests; finale Balancebestätigung. Kein stillschweigender Merge/Release.
