# Android v0.27.0.0 / Code 15 / Save 28

Freigabe: 21.11.2026, Nutzerauftrag „Dann Veröffentliche es für Andoid“.

## Veröffentlichung

- Release: https://github.com/artxanderwolf/pj-nobrainer/releases/tag/android-v0.27.0.0-code15
- Signierte APK: https://github.com/artxanderwolf/pj-nobrainer/releases/download/android-v0.27.0.0-code15/Smiths-of-Eldravar-v0.27.0.0-code15-release.apk
- APK-Größe: 3.718.112 Bytes
- APK-SHA-256: `33c0149b7d67636a156de52bf32355512cc787f91f223e39a1c0cc87a1c4ad9d`
- Paket-ID: `com.smithsofeldravar.game`
- Dauerhaftes Zertifikat-SHA-256: `87f74ee84aae855c71dff3241323bab7abbfc0275ae029889b0fe1e4e0a7fff7`
- Quellcommit und Release-Tag: `04f0eceff8d81618bcd2459e4fee1d21bb2d7030`
- Quell-Tree: `2976242dd9ec665d22080527162ddbec30989403`
- Erfolgreicher Android-CI-Lauf: https://github.com/artxanderwolf/pj-nobrainer/actions/runs/44852156660

Die tatsächliche APK-Metadatenprüfung bestätigt 0.27.0.0 / Code 15. Der historische Dateiname des CI-Artefakts ist keine Versionsquelle. Das unsignierte Artefakt wurde aus diesem geprüften Lauf bezogen, lokal 16K-ausgerichtet und ausschließlich mit dem bisherigen dauerhaften Schlüssel signiert. V2/V3, nicht-debuggable Release, Paket-ID, Code und Zertifikat sind geprüft. Schlüssel und Zugangsdaten sind nicht Teil von Commit, Release oder Prüfdaten.

`prepare-android-update.mjs` hat anschließend die echte öffentliche HTTPS-Datei vollständig geladen und Größe sowie SHA-256 mit der signierten APK verglichen. Erst danach wurde das erzeugte Manifest für `public/android-update/stable.json` übernommen. Der vorherige Kanal bot Code 7 an; Code 15 ist ein freiwilliges Update. APK und JSON-Manifest sind getrennte Veröffentlichungsschritte; der Kanal wird zuletzt aktiviert.

Diese Änderung betrifft nur Veröffentlichungsmetadaten und den bestehenden Updatekanal. App-/Android-Version und Save-Version bleiben 0.27.0.0 / 15 / 28. Kein zusätzlicher Gameplay- oder Save-Schema-Schritt. Das APK enthält den vorherigen eingebetteten Kanalstand; die App prüft den aktuellen HTTPS-Stable-Endpunkt.

## Nachweise und Grenzen

- Vollständige Web-/Android-CI und Browserprüfungen des APK-Quellstands erfolgreich.
- Signatur mit dem bisherigen Zertifikat, V2/V3 und zipalign 4 Byte / 16K erfolgreich.
- Öffentlicher Download, Dateigröße und SHA-256 identisch zur lokalen signierten Datei.
- Bereitgestellter echter v0.17.3-Spielstand (Save 14) in der aus der APK extrahierten Anwendung nach Save 28 geladen: Mengen, Gold, Waffen-/Verkaufswerte erhalten; erneutes Laden stabil.
- Die reale Installation, der native Start und die Abnahme auf dem Besitzergerät sind noch offen.

## Gerätetest

In der vorhandenen App nach Updates suchen, die APK herunterladen und speichern. Anschließend über Downloads / Eigene Dateien öffnen und die vorhandene App aktualisieren. Vorher nicht deinstallieren. Optional vorher einen JSON-Spielstand exportieren. Nach dem Update Version 0.27.0.0, Kader, Waffen, Runen und Materialbestände kontrollieren; App schließen und erneut starten. Code 15 darf nicht nochmals als neueres Update angeboten werden.
