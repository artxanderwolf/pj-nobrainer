# Dungeon 4 und 5 · Schadensstaffel und Qualifikationsziel

Basis `migration/angular` bei `61ff1d1`. Das Ziel von 75 % wurde als Anteil vollständiger fünfstündiger D5-Expeditionen mit mindestens 50 Siegen ausgelegt.

Die Einsame Stadt steigt beim Schadensfaktor von 1,90 auf 2,25. Die Heiligen Ebenen steigen von 2,40 auf 3,50. Die Faktoren gelten für neu erzeugte normale Gegner und Bosse. Das Boss-Verhältnis zum Normalschaden bleibt beim Doppelten. HP, Angriffstempo, Gegnerzahl, XP, Beute und Qualifikationsregeln bleiben gleich. Spielstände behalten Save 28 und bereits erzeugte Gegner behalten ihre gespeicherten Werte. Dies ist eine Datenanpassung in der bestehenden Architektur.

| Profil und Faktor | Qualifizierte Läufe | Ø Siege in fünf Stunden |
|---|---:|---:|
| D4-Referenzteam S1 · alt 1,90 | 96 / 96 | 82,15 |
| D4-Referenzteam S1 · neu 2,25 | 96 / 96 | 67,85 |
| D5-S4-Team · alt 2,40, erste Messreihe | 24 / 24 | 76,08 |
| D5-S4-Team · neu 3,50, Validierung | 147 / 192 (76,6 %) | 53,59 |
| D5-S1-Zugangsteam · neu 3,50 | 4 / 48 (8,3 %) | 40,17 |

Die 192 D5-S4-Validierungsläufe verwenden andere Zufallsfolgen als die Kalibrierung. Nach der Tabellenänderung liefert der integrierte Datenstand dieselben Ergebnisse im echten Dungeon-Service. Das D5-S4-Referenzteam besteht aus Rekrut, Kämpfer und Bogner auf Level 16 sowie einem Gelehrten auf Level 17. Alle Waffen verwenden D5-Materialien (Sonnenstahl, Lichtbirke und Amethystleder) in S4. Die Figuren sind Menschen und tragen keine Runen. Konkrete Quoten hängen auch von der Zusammensetzung des Teams ab.

Das D4-Referenzteam braucht im Median rund 35 Minuten länger bis zur ersten Qualifikation. Die D5-Qualifikation ist mit Zugangsausrüstung erheblich seltener. In der Abnahme sollten zuerst das D4-Zugangstempo und dann ein ausgerüstetes D5-S4-Team geprüft werden.

Reproduktion aus dem Projektverzeichnis mit `node --no-warnings --experimental-strip-types scripts/analyze-late-dungeon-difficulty.mjs d5 192 224311 3.5 <Ausgabe.json>`.

Prüfstand: v0.27.0.3, Android-Code 18, Save 28. 91 Web-Checks und Chrome-Startprüfung bestanden. Der Produktionsbuild meldet die bekannte Bundlegrößenwarnung.

Android-Webbuild, Capacitor-Synchronisierung und nativer Debug-Build bestanden. Der Test auf einem realen Gerät steht aus.
