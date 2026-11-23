# Dungeon 5 · Boss-Schaden +5 % im Vergleich

Basis ist `migration/angular` bei `61ff1d1` (v0.27.0.2). Der echte Kampfdienst wurde mit den S16-Referenzteams für D5 ausgeführt. Ausschließlich der Schaden erzeugter Bosse wurde für die Vergleichsvariante im Messlauf mit 1,05 multipliziert. Gegnerzahl, Bosschance, Beute und Live-Daten bleiben auf dem bestehenden Stand.

Je Team und Variante wurden 192 vollständige Fünf-Stunden-Expeditionen sowie 800 frische Wellen mit mindestens einem natürlich ausgewürfelten Boss gemessen. Die Varianten eines Paares verwenden denselben Startseed. Sobald ein Kampf anders verläuft, können sich die verbrauchten Zufallswerte und spätere Begegnungen unterscheiden. Frische Bosswellen beginnen mit vollen HP. Bosswellen aus Expeditionen können durch Expirieren der Expedition ohne Ergebnis enden.

| Team und Messgröße | Aktuell | +5 % Boss-Schaden |
|---|---:|---:|
| S1-Zugangsteam, Qualifikation bei 50 Siegen | 186 / 192 (96,9 %) | 182 / 192 (94,8 %) |
| S1-Zugangsteam, Median bis Qualifikation unter erfolgreichen Läufen | 255,0 min | 255,4 min |
| S1-Zugangsteam, gewonnene frische Bosswellen | 6 / 800 | 4 / 800 |
| D5-S3-Team, Qualifikation bei 50 Siegen | 192 / 192 | 192 / 192 |
| D5-S3-Team, Median bis Qualifikation unter erfolgreichen Läufen | 204,5 min | 204,9 min |
| D5-S3-Team, gewonnene frische Bosswellen | 18 / 800 | 14 / 800 |

Bei fünf gepaarten S1-Expeditionen gelang die Qualifikation nur mit aktuellem Boss-Schaden, bei einer nur mit erhöhtem Schaden. Der Unterschied in der Qualifikation ist ein Signal aus dieser Stichprobe. Der gegenwärtige Boss ist für beide getesteten Menschenteams bereits eine hohe Hürde. Der Aufschlag bringt wenig zusätzliche Differenzierung und kann dem S1-Einstieg schaden.

Empfehlung ist, den aktuellen Boss-Schaden beizubehalten. Würde später eine zusätzliche Herausforderung gewünscht, wäre ein freiwilliges Ziel für fortgeschrittene Teams eine sinnvollere Stelle zur Prüfung.

Messung wiederholen mit `node --no-warnings --experimental-strip-types scripts/analyze-d5-boss-damage.mjs <Ausgabe.json>`.
