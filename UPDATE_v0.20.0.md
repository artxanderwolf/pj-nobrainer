# v0.20.0 – Waffenregeln und Trainingslager

Version auf Basis von v0.19.4 (`6ce2284`, migration/angular).
Android-Code 7; Paket-ID und Save-Version 14 bleiben bestehen.
Der Nutzer hat Veröffentlichung und Updatekanal am 27.10.2026 ausdrücklich freigegeben.

## Ausrüstung

| Klasse | Dolch | 1H-Schwert | 2H-Schwert | 1H-Axt | 2H-Axt | Bogen | Stab |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rekrut | ja | ja | ja | ja | ja | nein | ja |
| Kämpfer | nein | ja | ja | ja | ja | nein | nein |
| Bogner | ja | ja | nein | ja | nein | ja | nein |
| Gelehrter/Magier | ja | nein | nein | nein | nein | nein | ja |

Nur Rekruten führen zwei getrennte Einhandwaffen. Jede verursacht 75 % ihres normalen
Waffentrefferschadens. Genau ein 1H-Schwert und ein Dolch erhalten zusätzlich den
Präferenzfaktor 1,10: zusammen 0,75 × 1,10 = 0,825 je Waffe. Hände sind austauschbar.
Einzelwaffen beim Rekruten erhalten keinen Präferenzbonus.

Kämpfer erhalten +10 % Waffentrefferschaden mit 2H-Schwert oder 2H-Axt, Bogner mit
Bogen, Gelehrte mit Stab. Dies ist ein Trägereffekt, keine Änderung des Gegenstands,
seines Marktpreises, Tempos, seiner Trefferchance oder der Kritwerte. Der Faktor gilt
vor der regulären Krit-/Rüstungsberechnung genau einmal; Lebensraub folgt dem Schaden.
Es gibt keinen Präferenzbonus für Fäuste oder Gegner. Ein schlechteres Präferenzitem
muss kein hochwertigeres Alternativitem schlagen.

Bogen und Stab belegen beide Hände, greifen aber nur einmal an. Die Tabellenfreigabe
Waffe+Schild ist für Rekrut und Kämpfer hinterlegt; dieses Update führt keine Schilde ein.
Herstellung, Besitz und Verkauf bleiben unabhängig von Klassenfreigaben möglich.

Kader und Waffenlager verwenden dieselbe Prüfung vor jeder Änderung. Im Kader zeigen
Vorschauen den vollständigen erwarteten Charakter-ROH einschließlich der Faktoren.
Waffenkarten zeigen weiterhin Gegenstandsgrundwerte. Hilfe und Index erklären die Regeln.

## Vorhandene Spielstände

Beim Laden und JSON-Import werden einzeln verbotene Waffen abgelegt. Eine gültige
verbleibende Waffe bleibt ausgerüstet. Sind zwei Waffen einzeln zulässig, aber zusammen
verboten, werden beide abgelegt. Zweihänder werden atomar behandelt. Gegenstands-IDs,
Materialien und Lagerobjekte bleiben erhalten; es gibt keine Ersatzgegenstände.

Die Änderung heilt nicht: Maximalwerte werden neu berechnet, aktuelle HP/Energie bei
Bedarf begrenzt. Laufende Dungeon-Angriffe werden vor dem Offline-Fortschritt angepasst.
Eine gesammelte Meldung erscheint einmal. Der nächste Start wiederholt die Bereinigung
nicht. Es ist kein neues Saveformat nötig.

## Trainingslager und Icon

Begegnungschance 5 % je Suchsekunde statt 10 %: durchschnittlich 20 statt 10 Sekunden
reine Suche, weiterhin zufällig. Die gesamte Wellenzahl pro Stunde halbiert sich dadurch
nicht. +1 HP bei Fehlsuche, Gegner, Anzahlgewichtung, Drops und XP pro Gegner bleiben
gleich. Belohnungen pro Stunde sinken durch weniger Kämpfe. Kein zusätzlicher Gegnerbuff.

Das vom Nutzer bereitgestellte Original `design/app-icon/eldravar-emblem-128.png` ersetzt
die aktiven Android-/Web-Icons. Skalierung erhält die Pixelgrafik; Android berücksichtigt
Launcher-Masken. Web-Icon-URLs besitzen eine neue Cacheversion.

## Prüfung und Abnahme

- Vollständige Projektprüfungen über `npm run build` und `npm run build:android:web`.
- Neue Fachtests: 28 Freigaben, direkte Mutation, atomare Ablehnung, Zweiwaffenfaktoren,
  Krit/Rüstung/Lebensraub, 2H-Deduplizierung, Erhalt der Inventarobjekte und HP-Begrenzung.
- Neue Browserregression: beide Ausrüstungsoberflächen, Vorschau, Startschwert, JSON-Import,
  illegale Paare, laufender Dungeon, einmalige Meldung und wiederholtes Laden.
- Bestehende Browserprüfungen für Kader, Rekrutierung, Schmiede, Markt, Dungeon und Save-Transfer.
- Android-Build, Signatur, Paket-ID/Code, zipalign und Icon-Vorschau vor Verteilung prüfen.
- Noch erforderliche Nutzerabnahme: bestehende Code-6-App ohne Deinstallation aktualisieren;
  eigenen Spielstand, abgelegte Waffen, Klassenboni, Icon und Fortsetzen nach Neustart prüfen.

Die signierte APK ist als `android-v0.20.0-code7` veröffentlicht. Der öffentliche
HTTPS-Download wurde vollständig gegen die lokale APK geprüft: 3.618.248 Bytes,
SHA-256 `8f2c04b3e56b47b758a7f692dc5f8c91f090738389c818ae309d527d7378e711`.
Das bisherige Release-Zertifikat, Paket-ID und Save-Version bleiben erhalten.
Das geprüfte Stable-Manifest bietet Code 7 als freiwilliges Update an.
Die tatsächliche Abnahme auf dem Android-Gerät dieser Version steht weiterhin aus.
