# S04/S04a – Android-Zurueck und Spielstandexport (v0.6.0.6)

Die System-Zuruecktaste bzw. -geste schliesst zuerst geoeffnete Dialoge, dann
Charakter-/Dungeon-Detailfenster, dann den Spielstand-Tab und danach Unterseiten.
Auf der Startkarte bleibt die Android-App offen; die Web-Navigation wird nicht geaendert.

Der Web-Export bleibt der bisherige JSON-Download. Die Android-App verwendet
ACTION_CREATE_DOCUMENT, damit der Spieler einen Speicherort bestimmen kann.
Die Datei wird als UTF-8 gespeichert und durch SHA-256 und Dateilaenge nach
Ruecklesen kontrolliert. Nur danach wird Erfolg angezeigt. Abbruch/Schreibfehler
liefern eigene Meldungen. Keine neuen Speicherberechtigungen, Save-Version 17.

Testfaelle: Android-Taste und -Geste im Stadtbild, in Unterseiten,
Missionen-Dialog, Charakter-/Tavernenmodal, Dungeon-Modal und Spielstand-Tab;
Android-Export als echte sichtbare Datei, Abbruch, erneuter Import inklusive
Charaktere/Waffen/Ausbauten; Web-Export und -Import unveraendert.
CI: Angular, Browser-Save-Transfer und native Android-APK-Builds.
Ein echter Android-Geraetetest bleibt fuer die abschliessende Abnahme notwendig.
Die native App wird nicht allein durch ein GitHub-Pages-Update aktualisiert.
