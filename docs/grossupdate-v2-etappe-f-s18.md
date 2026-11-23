# Großupdate v2 · Etappe F · S18 Gesamtprüfung

Geprüfter Quellstand ist `migration/angular` bei `2a3ea720312d8f3dccccead1bfcbb97aa53eb626`. Die Webversion 0.27.0.3 ist öffentlich. Die lokale Android-Test-APK trägt Version 0.27.0.3 / Code 18. Beide verwenden Save 28.

## Gesamtprüfung

| Bereich | Ergebnis |
|---|---|
| Save und Integration | S17 abgenommen. 94 Projektchecks, Save-14-Übernahme und erneutes Laden auf Save 28, Save-27-Regression, gespeicherte Marktwerte, Browser und native Builds sind im [S17-Bericht](grossupdate-v2-etappe-f-s17.md) dokumentiert. |
| Web live | Desktop und mobiler Darstellungsmodus in Chrome geprüft. Jeweils 462 Bestandszeilen zu 10.000 Materialeinheiten geladen, im Markt angezeigt und ohne Verlust wieder gespeichert. Keine JavaScript-Fehler. |
| Performance | Bei zwei lokalen Einzelmessungen vom Neuladen bis zum gerenderten Bestand 109 ms am Desktop und 114 ms bei mobiler Darstellung. Marktwechsel einschließlich synchronem Rendern 73 ms bzw. 66 ms. Die Zahlen beschreiben diesen Rechner und die Browserprüfung. |
| Android | Nativer Release-Build und lokale Signierung erfolgreich. V2/V3-Signatur, vorhandenes Release-Zertifikat, Paket-ID, Version, 16-KiB-Ausrichtung und alle 46 eingebetteten Webdateien geprüft. |
| Echtes Gerät | Kein Android-Gerät verbunden. Installation, Spielstanderhalt beim nativen Update, Zurück-Geste, Dateiexport und realer Smartphone-Webtest sind offen. |

## Changelog zur Gesamtfreigabe

- Dungeon 4 und 5 haben stärkere Gegner. Die übrigen Dungeons behalten ihre vorhandenen Werte. Bereits erzeugte Gegner behalten ihre gespeicherten Kampfdaten.
- Materialverkauf berücksichtigt Stufe und Qualität. Waffenpreise berücksichtigen verbrauchte Materialien, Verarbeitung und die S1-Referenzleistung. Angelegte Verkaufs- und Schmiedeaufträge behalten zugesagte Konditionen.
- Hochelfen heilen bis zu 10 HP je Auslösung. Die tatsächlich wiederhergestellten HP stehen im Kampfprotokoll.
- Save 28 übernimmt ältere Bestände in getrennte Material-ID- und Qualitätsbestände. Web und Android verwenden dieselbe Spielbasis.

## Gerätetest und Freigabe

1. Auf dem Gerät mit Code 17 einen Spielstand exportieren und die lokale Code-18-Test-APK als Update der bestehenden App installieren.
2. Beim ersten und zweiten Start Version, Gold, Lager, ausgerüstete Waffen, Runen und bestehende Aufträge vergleichen. Mindestens einen fertigen Auftrag abholen und eine laufende Expedition fortsetzen.
3. System-Zurück in einem Dialog und auf einer Unterseite testen. Einen JSON-Export über die Android-Dateiauswahl speichern. Das öffentliche Webspiel am realen Smartphone laden.
4. Nach der Geräteprüfung die separate Android-Releasefreigabe festhalten.

Der öffentliche Android-Kanal liefert weiterhin 0.27.0.2 / Code 17. Der vorhandene APK-Download wurde erneut vollständig per Größe und SHA-256 verifiziert. Der Rückfallstand für den Quellcode ist `61ff1d1`. Bei einem später erforderlichen Android-Rückfall für bereits auf Code 18 aktualisierte Installationen braucht der bisherige Code einen neuen, höheren Installationscode. Code 17 bleibt der aktuell verfügbare Stand für Geräte ohne Testupdate.

Lokale Test-APK: `Smiths-of-Eldravar-v0.27.0.3-code18-release.apk`, SHA-256 `cd343160606e31fb4d2df50d923525a96274d07a4dd54140344e8a67fe0668a2`.
