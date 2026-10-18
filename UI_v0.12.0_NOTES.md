# UI v0.12.0

Die Oberfläche ist als responsive, hierarchische Screen-Navigation umgesetzt.

Hauptbereiche:
- Übersicht
- Charakter
- Lager
- Dungeon

Prinzipien:
- kleine, klar abgegrenzte Screens statt langer Gesamtseiten
- globaler Zurück-Button oben links
- Geld oben rechts
- feste Bottom-Navigation mit vier Hauptbereichen
- Unterseiten für Kader, Rekrutierung, Lager, Schmiede, Verkauf und Dungeon
- große Listen und Detailmengen scrollen innerhalb eines begrenzten Inhaltsbereichs
- Safe-Area-Unterstützung für mobile Geräte und Android-WebView
- zentrierte Maximalbreite für Tablet/Desktop bei gleicher Screen-Hierarchie

Die bestehende Spiellogik und die Angular-Domain-/Service-Trennung bleiben unverändert; der Umbau betrifft primär Shell, Navigation, Markup-Aufteilung und responsive Präsentation.
