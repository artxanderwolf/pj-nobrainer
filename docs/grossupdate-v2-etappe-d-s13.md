# Großupdate v2 · Etappe D, S13 · Waffenpreise

Prüfstand auf `migration/angular` bei `780967d`. App-Version 0.27.0.2, Android-Code 17, Save 28. S12 ist bereits veröffentlicht. S13 nutzt dieselbe Materialpreismatrix und dieselben ID- und Qualitätsfelder. Im aktuellen Spiel sind Waffen die herstellbaren Waren.

## Preis und Zeit

- Jede tatsächlich verbrauchte Einheit geht zum S12-Stückpreis in die Materialsumme ein. Der Material- und Verarbeitungsanteil ist auf 5 Nickel aufgerundet: 1,5 × Materialsumme + 20 Nickel.
- Der Leistungsanteil bewertet dieselben Bauteile in S1 gegen 0 %, 40 % und 80 % Rüstung. Der Mittelwert des erwarteten Schadens nach Rüstung wird mit 6 multipliziert und auf 5 Nickel aufgerundet. Damit wirken Materialqualität und Runen weiterhin im Kampf, während der Qualitätsaufschlag beim Verkauf allein in der Materialsumme steckt.
- Die Schmiedezeit verwendet die bisherige Zeitformel mit dem S1-Referenzwert der Waffe und den bestehenden Form-Mindestzeiten. Die Marktzeit nutzt weiter 15 Sekunden plus 0,5 Sekunden pro Nickel des Verkaufspreises, auf 5 Sekunden aufgerundet.
- Die Beispielaxt mit sieben S1-Einheiten der Stufe 1 ergibt 70 Nickel Materialwert, 125 Nickel einschließlich Verarbeitung und 25 Nickel Leistungsanteil. Der Verkauf bringt 150 Nickel, die Schmiedezeit beträgt 75 Sekunden und der Markt braucht 90 Sekunden.
- Schmiedevorschau, Waffenkarte und Markt verwenden dieselbe Bewertung. Neue Verkäufe von Waffen mit vollständigem Rezept nutzen die neue Formel. Für migrierte, ausdrücklich erhaltene Waffensnapshots gilt der gespeicherte Wert. Angelegte Schmiedeaufträge behalten ihren Preis und ihre Dauer bis zur Abholung. Marktaufträge behalten ihre bereits gespeicherten Verkaufskonditionen.

## Modellrechnung für Tor D

Das stationäre Modell verwendet je einen Schmiede- und Marktplatz mit Faktor 1, keine Startreserve, passgenaue Rezeptzufuhr und keine Absatzlücken durch manuelle Abholung. Die angenommene Zufuhr in Einheiten pro Stunde ist ein Szenario, keine gemessene Dungeon-Ausbeute. Chargen pro Stunde sind durch Zufuhr und Bearbeitungskapazität begrenzt. Das Modell bildet weder unterschiedliche Freischaltungszeiten noch Ausbaukosten oder reale Offline-Abholungen ab.

| Profil | Zufuhr pro Stunde | Rezept | Rohwert / Rohmarktzeit | Schmiede / Waffenmarkt | Waffenwert | Rohverkauf pro Stunde | Waffenverkauf pro Stunde |
|---|---:|---|---:|---:|---:|---:|---:|
| Früh | 40 | Dolch, 4 Einheiten | 40 Nickel / 120 s | 75 s / 65 s | 100 Nickel | 400 Nickel | 1.000 Nickel |
| Mittel | 70 | 1H-Axt, 7 Einheiten | 206 Nickel / 430 s | 80 s / 195 s | 360 Nickel | 1.725 Nickel | 3.600 Nickel |
| Spät | 130 | 2H-Axt, 13 Einheiten | 1.305 Nickel / 2.200 s | 90 s / 1.025 s | 2.020 Nickel | 2.135 Nickel | 7.095 Nickel |

In der Reihenfolge Arbeitsteil, Rücken, Griffkern, Griffwicklung sind die Material-ID-Qualität-Paare `4:1,4:1,2:1,9:1`, `28:2,28:1,27:2,31:1` und `77:4,76:2,74:2,75:3`. Die Mengen kommen aus den bestehenden Rezepten. Im frühen Profil begrenzt die Zufuhr beide Wege. Im mittleren Profil begrenzt der Markt den Rohverkauf. Im späten Profil begrenzt er beide Wege. Der Zeitunterschied kann den Absatz und die Ausbaufähigkeit stark verschieben. Aus dem Modell folgt keine belastbare Balancefreigabe.

## Abnahme

- Eine Waffe aus S1 und eine mit höherer Qualität desselben Materials in der Schmiede vergleichen. Der Preis ändert sich, die Schmiedezeit bleibt bei gleichen Materialarten gleich.
- Die Waffe einsammeln und Preis in Waffenkarte, Marktvorschau und Auftrag vergleichen. Einen alten Marktauftrag zum zugesagten Betrag auszahlen.
- Einen bereits angelegten Schmiedeauftrag über Speichern und Laden hinweg prüfen. Wert und Restzeit des Auftrags bleiben erhalten.
- Nach S13-Abnahme folgt S14 mit gemessenen frühen, mittleren und späten Spielprofilen, Nickel pro Stunde, Ausbauzeiten, Lagerreserven, Offline-Abholung und Prüfungen auf doppelte Auszahlungen und wiederholbare Gewinne ohne Materialzufuhr. Der aktuelle Marktwert ist bis zu dieser Prüfung ein Teststand.

## Prüfungen

Alle 94 Projektchecks bestanden. Der Web-Produktionsbuild und der Chrome-Fall für Herstellung, Abholung und Marktauftrag mit gemischten Qualitäten bestanden. Der Android-Web-Build, Capacitor-Sync und native Debug-Build waren erfolgreich. Die bekannte Web-Bundlewarnung bleibt sichtbar (rund 687 kB), der Android-Gerätetest steht aus.
