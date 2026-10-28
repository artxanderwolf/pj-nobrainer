# Web v0.4.0.1 – Dungeonansicht und Browser-Skalierung

Ergänzt den bestehenden Entwurf v0.4.0.0 auf Grundlage des unveränderten GitHub-Hauptstands und des aktuellen PR-Heads. Projektregeln vor Änderungen geprüft.

- Browser-Textvergrößerung durch automatisches Text-Autosizing wird mit `text-size-adjust: 100%` vereinheitlicht. Die Grundschrift ist explizit 16 px, auf schmalen Bildschirmen 14 px. Benutzer-Zoom bleibt verfügbar. Browser-Adressleiste und Systemleisten können die verfügbare Höhe weiterhin beeinflussen.
- Das Dungeonfenster nutzt wieder die volle verfügbare Höhe. Die obere Spielleiste und Hauptnavigation bleiben bis zum Schließen verborgen. Dies ersetzt auf ausdrücklichen Wunsch den vorherigen Questzugriff über der Dungeonansicht; nach dem Schließen ist das Quest-Icon wieder erreichbar.
- Zwischen Dungeonname und X steht „Wellen besiegt: …“. Der Wert entspricht ausschließlich den Siegen des aktuellen beziehungsweise zuletzt beendeten Laufs im geöffneten Dungeon und beginnt beim neuen Lauf bei null.
- Hilfe beschreibt den Zähler und die ausgeblendete Navigation.

App-Version 0.4.0.1; Save-Version bleibt 16. Kein neues Datenformat, keine Änderung an Suche, Kampf, Missionen oder Android-spezifischen Pfaden. Keine neue Abhängigkeit oder Architekturänderung.

Prüfung: 71 Web-Prüfungen und Produktionsbuild. Ergänzte Browserprüfungen kontrollieren Sichtbarkeit der Navigation, Wiederherstellung nach Schließen, volle mobile Fensterhöhe, getrennte Zähler einschließlich migriertem Lauf und Dungeonwechsel. Bekannte Bundle-Warnung oberhalb 500 kB bleibt unter dem Fehlerlimit 1 MB.

Praktisch auf dem betroffenen Smartphone prüfen: Spielgröße gegenüber App, Dungeon öffnen/schließen, eine Welle besiegen, Dungeon wechseln und Seite neu laden. Die genaue Darstellung mit Samsung Internet und persönlichen Schrift-/Zoom-Einstellungen muss am Gerät geprüft werden. Nicht veröffentlicht.
