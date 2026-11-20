# Großupdate v2 – Etappe A · Unterkunftspreise

**Ausgangspunkt:** App v0.24.0.0 / Save 27. **Ziel:** 48 Charakterplätze.

Alle Preise in **Nickel**; 1 Bronze = 1.000 Nickel. Diese Tabelle bezieht sich ausschließlich auf den Erwerb **eines zusätzlichen Platzes**. Bereits erworbene Plätze werden nicht erneut berechnet oder bezahlt. Die gespeicherte Kapazität bleibt unverändert. Die Rekrutierungskosten sind davon unabhängig.

Formel: Für 2 ≤ c ≤ 11 gilt `1.000 + 250 × (c − 2)`; für 12 ≤ c ≤ 47 gilt `3.500 + 350 × (c − 12)`.

| Kapazität vorher → nachher | Nächster Platz (Nickel) | Summe aller Plätze seit 2 (Nickel) |
|---:|---:|---:|
| 2 → 3 | 1.000 | 1.000 |
| 3 → 4 | 1.250 | 2.250 |
| 4 → 5 | 1.500 | 3.750 |
| 5 → 6 | 1.750 | 5.500 |
| 6 → 7 | 2.000 | 7.500 |
| 7 → 8 | 2.250 | 9.750 |
| 8 → 9 | 2.500 | 12.250 |
| 9 → 10 | 2.750 | 15.000 |
| 10 → 11 | 3.000 | 18.000 |
| 11 → 12 | 3.250 | 21.250 |
| 12 → 13 | 3.500 | 24.750 |
| 13 → 14 | 3.850 | 28.600 |
| 14 → 15 | 4.200 | 32.800 |
| 15 → 16 | 4.550 | 37.350 |
| 16 → 17 | 4.900 | 42.250 |
| 17 → 18 | 5.250 | 47.500 |
| 18 → 19 | 5.600 | 53.100 |
| 19 → 20 | 5.950 | 59.050 |
| 20 → 21 | 6.300 | 65.350 |
| 21 → 22 | 6.650 | 72.000 |
| 22 → 23 | 7.000 | 79.000 |
| 23 → 24 | 7.350 | 86.350 |
| 24 → 25 | 7.700 | 94.050 |
| 25 → 26 | 8.050 | 102.100 |
| 26 → 27 | 8.400 | 110.500 |
| 27 → 28 | 8.750 | 119.250 |
| 28 → 29 | 9.100 | 128.350 |
| 29 → 30 | 9.450 | 137.800 |
| 30 → 31 | 9.800 | 147.600 |
| 31 → 32 | 10.150 | 157.750 |
| 32 → 33 | 10.500 | 168.250 |
| 33 → 34 | 10.850 | 179.100 |
| 34 → 35 | 11.200 | 190.300 |
| 35 → 36 | 11.550 | 201.850 |
| 36 → 37 | 11.900 | 213.750 |
| 37 → 38 | 12.250 | 226.000 |
| 38 → 39 | 12.600 | 238.600 |
| 39 → 40 | 12.950 | 251.550 |
| 40 → 41 | 13.300 | 264.850 |
| 41 → 42 | 13.650 | 278.500 |
| 42 → 43 | 14.000 | 292.500 |
| 43 → 44 | 14.350 | 306.850 |
| 44 → 45 | 14.700 | 321.550 |
| 45 → 46 | 15.050 | 336.600 |
| 46 → 47 | 15.400 | 352.000 |
| 47 → 48 | 15.750 | 367.750 |

**Gesamtkosten von 2 auf 48 Plätze:** 367.750 Nickel. Bei 48 Plätzen ist der Ausbau deaktiviert; es erfolgt kein weiterer Kauf oder Abzug.

## Abnahmefälle

- Bereits vorhandene 10 Plätze bleiben nach dem Laden erhalten, ohne Abbuchung.
- Bei 6/6 kostet der nächste Platz 2.000 Nickel; nach Erwerb 6/7.
- Bei 47/47 kostet der letzte Platz 15.750 Nickel; danach 47/48.
- Bei 48/48 erscheint „Maximum erreicht“, ohne weitere Abbuchung.
- Bei unzureichendem Guthaben bleibt Kapazität und Geld unverändert.
- Neue und importierte Spielstände behalten die Kapazität beim Neuladen.
