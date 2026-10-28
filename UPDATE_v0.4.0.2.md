# v0.4.0.2 – qualifizierte Läufe ab 150 Wellen, aktueller Android-Build

Grundlage: veröffentlichte Web-Version 0.4.0.1, `migration/angular` bei `f6054f5ed397d502ee8bd1354124fcba149b4b32`. Entwicklungsregeln und relevante aktuelle Repository-Dateien vor Änderungen geprüft.

- Ein Lauf qualifiziert sich in allen fünf Dungeons ab 150 erfolgreichen Wellen genau einmal. Eine gemeinsame Konstante gilt für Kampf-Fortschritt und Übernahme alter Spielstände. Hilfe und Grenzwerttests sind angepasst.
- Gespeicherte noch nicht qualifizierte laufende Runs ab 150 Wellen werden beim Laden einmal angerechnet; erneutes Laden und weitere Siege zählen sie nicht doppelt. Bereits qualifizierte Läufe bleiben erhalten. Historische beendete Läufe werden nicht aus Gesamtwellen rekonstruiert, weil ihre Einzelergebnisse nicht gespeichert wurden.
- Weiterhin 20 qualifizierte Läufe im Vorgängerdungeon. Die Zugangssuche beginnt erst in einem neuen Lauf und würfelt ab dessen 100. erfolgreicher Welle mit 5 %. Die normale Gegnersuche bleibt bei 5 % pro Suchsekunde.
- Die Android-Ausgabe erhält dieselbe aktuelle gemeinsame Spielversion einschließlich Dungeons, Missionen, Heiler, Materialien, parallelen Läufen und neuer Oberfläche. Android-Bootstrap liest die App-Version aus package.json statt sie auf 0.20.0 zurückzusetzen. Veraltete Android-Prüfungen sind auf das bestehende Save-Format 16 synchronisiert. Die vollständige Android-Prüfkette umfasst auch die Schnellrelease- und Paralleltests.

App-Version 0.4.0.2; Android versionCode 8 als Nachfolger von Code 7. Save bleibt 16, da das Format unverändert ist. Die bestehende Migration übernimmt Android-v14-Spielstände und Web-v15/v16-Spielstände. Paket-ID, Capacitor-Ursprung und Speicherschlüssel bleiben gleich. Die APK wird mit dem bisherigen dauerhaften Release-Zertifikat signiert.

Die APK wird zunächst direkt als Datei bereitgestellt. Der GitHub-Release-Upload über Computerbedienung ist wegen nicht zuverlässig prüfbarer Browseradresse blockiert. Der öffentliche Android-Updatekanal bleibt deshalb unverändert bei 0.20.0 / Code 7; er darf erst nach öffentlichem Upload und vollständigem Download-/Hashvergleich umgestellt werden. Die Web-Version wird über den vorhandenen GitHub-Pages-Prozess veröffentlicht.

Prüfung: Grenzen 149/150, genau eine Anrechnung, Laden eines bisherigen Runs bei 150 Wellen, unveränderte Zugangssuche, alte Saves, unabhängige parallele Dungeons, vollständige Projektprüfungen, Web-/Android-Builds, Browserprüfungen sowie APK-Paket-ID, Version, Signierer, V2/V3 und 16K-Ausrichtung. Ein echter Update-/Gerätetest bleibt erforderlich: vorhandene App ohne Deinstallation aktualisieren, Spielstand und laufende Dungeons kontrollieren, vollständig schließen und erneut öffnen.
