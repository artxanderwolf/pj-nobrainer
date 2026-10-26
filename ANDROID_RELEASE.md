# Smiths of Eldravar – Android Release

Dieses Dokument beschreibt den verbindlichen Android-Releaseweg ab Gate A.

## Dauerhafte Identität

- App-Name: `Smiths of Eldravar`
- Android-Paket-ID: `com.smithsofeldravar.game`
- Save-Version: `14` (unabhängig von App-/Android-Version)
- Capacitor: exakt `8.5.3`
- Dauerhafter Release-Key bleibt außerhalb des Repositories.

Die Paket-ID und der Release-Key dürfen nach der ersten verteilten Installation nicht wechseln, wenn spätere APKs als Updates derselben App installiert werden sollen.

## Gemeinsame Codebasis

Android ist keine zweite Spielimplementierung. Der vorhandene Angular-Code wird über die Angular-Konfiguration `android` gebaut und mit Capacitor in das versionierte Android-Projekt synchronisiert.

```text
Angular / src
  -> npm run build:android:web
  -> dist/nobrainer/browser
  -> npx cap sync android
  -> Android Studio / Gradle
```

Der normale Web-/GitHub-Pages-Build bleibt davon getrennt und weiterhin buildbar.

## Android-Versionierung

`versionName` folgt der ausdrücklich als Android-Release bzw. Android-Teststand freigegebenen Spielversion. `versionCode` ist eine eigene, streng steigende Ganzzahl.

Ein normaler Merge oder eine neue Web-Version veröffentlicht niemals automatisch eine Android-Version.

## Release-Signierung

Der Release-Key wird außerhalb des Repositories mindestens zweifach offline gesichert. Keystore-Dateien und Passwörter dürfen niemals committed werden. Die native Release-Konfiguration liest ausschließlich:

- `SOE_RELEASE_STORE_FILE`
- `SOE_RELEASE_STORE_PASSWORD`
- `SOE_RELEASE_KEY_ALIAS`
- `SOE_RELEASE_KEY_PASSWORD`

Ohne diese Werte kann CI Debug- und unsignierte Release-Builds zur technischen Prüfung erzeugen. Verteilbare APKs werden anschließend mit dem dauerhaft gesicherten Key signiert.

## Gate B – Updateprüfung und APK-Download

Aktueller Gate-B-Teststand:

- App-Version `0.19.3`
- Android `versionCode 5`
- Save-Version `14`
- Stable-Kanal: `/android-update/stable.json`, bis Gate C bewusst geschlossen (`available=false`)

### Ablauf

1. Smiths of Eldravar prüft nur den ausdrücklich freigegebenen Stable-Kanal.
2. Ist eine neue Version vorhanden, zeigt die App Version und Release Notes an.
3. Auf Nutzeraktion lädt die App die APK ausschließlich über HTTPS in ihren privaten Cache.
4. Vor einer Freigabe prüft die native Brücke erneut:
   - exakte APK-Größe,
   - SHA-256,
   - Paket-ID,
   - höheren `versionCode`,
   - erwarteten `versionName`,
   - Signatur gegen die installierte Smiths-of-Eldravar-App.
5. `APK speichern` öffnet Androids System-Dateiauswahl (`ACTION_CREATE_DOCUMENT`).
6. Die bereits geprüfte APK wird in einen vom Nutzer gewählten Ordner, z. B. `Downloads`, kopiert.
7. Die Installation startet **nicht** aus Smiths of Eldravar. Der Nutzer öffnet die gespeicherte APK anschließend außerhalb der App über `Downloads` / `Eigene Dateien` und bestätigt dort das Android-Update.

### Sicherheitsgrenze

Der direkte Installationspfad wurde nach realem Play-Protect-A/B-Test entfernt:

- kein `REQUEST_INSTALL_PACKAGES`,
- kein `PackageInstaller` in Smiths of Eldravar,
- kein `UpdateInstallReceiver`,
- kein Silent-Install,
- keine Root-/ADB-Lösung,
- keine neue Drittanbieter-Updatebibliothek.

CI prüft ausdrücklich, dass diese Installationspfade nicht versehentlich zurückkehren.

Der A/B-Test auf demselben realen Gerät zeigte: Mit `REQUEST_INSTALL_PACKAGES` erschien „Schädliche App blockiert“; bei ansonsten gleichem Build ohne diese Berechtigung verschwand die Warnung vollständig.

## Gate-B-Startup-Isolation

Der auf dem Gerät bestätigte Runtime-/Offline-Startpfad von Gate A bleibt erhalten. Der Updater wird erst nach aufgebauter Spieloberfläche und einem möglichen ersten Paint initialisiert. Ein Updaterfehler darf den Spielstart niemals blockieren. Der frühere globale rekursive `MutationObserver` bleibt entfernt.

## Späterer Releaseablauf

```text
APK bauen
-> vollständige Tests
-> mit dauerhaftem Release-Key signieren
-> APK hochladen
-> Download testen
-> SHA-256 prüfen
-> stable.json als letzten Schritt freigeben
```

Nur eine ausdrückliche Android-Releasefreigabe ändert den Stable-Kanal. Gate C testet anschließend die reale Updatekette inklusive erhaltenem Spielstand.

## Gate C – realer Updatezyklus

Vorbereiteter Zielstand: **App 0.19.4 / Android-Code 6 / Save-Version 14**.
Ausgangspunkt für den Gerätetest ist die bereits freigegebene und installierte
v0.19.3 mit Android-Code 5. Paket-ID, Capacitor-Ursprung, Speicherschlüssel und
Release-Key müssen unverändert bleiben.

Das freigegebene 64×64-Eldravar-Pixelmotiv ist als Android-Launcher-Icon und als
Web-Favicon/Webmanifest-Icon enthalten. Die Originalquelle liegt unter
`design/app-icon/`; es wurde ausschließlich ohne Glättung skaliert.

### Vorbereitung und Veröffentlichung

1. `npm ci` und `npm run android:sync` ausführen. Die vollständigen Projektprüfungen
   laufen dabei vor dem Android-Webbuild. Zusätzlich `npm run check:android-base`
   ausführen und den normalen Web-/Pages-Build sowie die Browserprüfungen testen.
2. Einen Release-Build mit Java 21 / Android SDK 36 erstellen. Ohne die vier oben
   beschriebenen `SOE_RELEASE_*`-Werte entsteht ausschließlich eine **unsignierte** APK.
   Diese darf nicht verteilt oder im Stable-Kanal eingetragen werden.
3. Die APK ausschließlich mit dem dauerhaft gesicherten Gate-A/B-Release-Key signieren.
   Zertifikat-Fingerabdruck gegen den bisherigen Release-Key bzw. die bisherige APK
   prüfen. Keinen Ersatzschlüssel erzeugen.
4. Die signierte APK als GitHub-Release-Asset dieses Repositories hochladen. Ein
   GitHub-Actions-Artefakt ist kein öffentlicher Update-Download.
5. Den öffentlichen Download und die echte APK mit dem folgenden Werkzeug prüfen:

   ```text
   npm run android:prepare-update -- --apk <signierte-APK> --apk-url <GitHub-Release-Download-URL> --certificate-sha256 <bisheriger-Zertifikat-SHA256> --notes android-release-notes.json --sdk <Android-SDK>
   ```

   Optional wählt `--java <java.exe>` eine Java-Laufzeit. Das Werkzeug prüft mit
   `aapt` und `apksigner` Paket-ID, Version, nicht-debuggable Release-Build,
   gültige Signatur und den vorgegebenen bisherigen Signierer. Anschließend lädt
   es die hochgeladene Datei über HTTPS und vergleicht Größe und SHA-256 vollständig.
   Erst bei Erfolg entsteht `.generated/android-release/stable.json` als lokaler
   Entwurf. Es werden weder Schlüssel noch Passwörter benötigt oder gespeichert.
6. Den geprüften Entwurf als **letzten Veröffentlichungsschritt** nach
   `public/android-update/stable.json` übernehmen. Den Pages-Build und den öffentlich
   ausgelieferten Stable-Endpunkt erneut prüfen. Normale Web-Merges erzeugen oder
   aktualisieren kein Android-Release automatisch.

`npm run check:android-update-release` prüft Fehlerfälle der Vorbereitung mit
Testdaten und simulierten Downloads. Das ersetzt weder eine echte APK-Prüfung
noch einen Test auf dem Gerät.

### Abnahme auf dem vorhandenen Android-Gerät

1. In Code 5 den vorhandenen Spielstand kontrollieren und optional als JSON sichern.
2. Unter Hilfe/Info `Nach Update suchen`: v0.19.4 / Code 6 und Release Notes erscheinen.
3. `Update herunterladen`: Download und Prüfung erfolgreich; anschließend `APK speichern`.
4. Die APK über Androids Dateiauswahl in `Downloads` speichern. Ein Abbruch des
   Dialogs muss eine erneute Speicherung ermöglichen.
5. Die gespeicherte APK außerhalb des Spiels über `Downloads` / `Eigene Dateien`
   öffnen und die vorhandene App aktualisieren. **Die App vorher nicht deinstallieren.**
6. Start, Pixel-Icon, v0.19.4 / Code 6 und den erhaltenen Spielstand prüfen.
   Gold, Materialien, Kader/Ausrüstung und einen gespeicherten Dungeonfortschritt
   kontrollieren. Anschließend das Spiel einmal vollständig schließen und neu öffnen.
7. Eine erneute Updateprüfung darf Code 6 nicht nochmals als neueres Update anbieten.
   Auch der Offline-Start muss weiter funktionieren.

Gate C ist erst nach erfolgreicher Veröffentlichung und dieser realen Geräteabnahme
bestanden. Bis die echte signierte APK geprüft ist, bleibt `available:false` gesetzt.

### Veröffentlichter Gate-C-Teststand

Die signierte v0.19.4 / Code 6 ist als GitHub-Testrelease `android-v0.19.4-code6`
veröffentlicht. Der vollständige öffentliche HTTPS-Download wurde gegen die lokale
APK geprüft: **3.573.192 Bytes**, SHA-256
`37ebdddeceeb46c89b076aaa6b0eb2efbac43f65bb1e52c929d008eefc517196`.
Das Zertifikat stimmt mit dem dauerhaft gesicherten Gate-A/B-Zertifikat überein;
V2/V3 und 16K-zipalign sind verifiziert.

Das freigegebene Stable-Manifest liegt auf dem Gate-C-Testbranch. Für den realen
Test veröffentlicht der bestehende Pages-Workflow ausdrücklich auch diesen Branch.
Der begrenzte Push-Trigger ist nötig, da der Workflow auf dem alten Defaultbranch
`main` noch nicht vorhanden ist und GitHub deshalb keinen manuellen Start anbietet.
Der PR bleibt bis zum bestätigten Gerätetest ein Entwurf; es erfolgt kein vorzeitiger
Gate-C-Abschluss. Normale Pages-Builds von `migration/angular` würden bis zum Merge
weiterhin dessen zuletzt freigegebenen Kanal ausliefern.
