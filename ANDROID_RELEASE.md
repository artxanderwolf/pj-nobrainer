# Smiths of Eldravar – Android Release

Dieses Dokument beschreibt den verbindlichen Android-Grundstand ab Gate A.

## Dauerhafte Identität

- App-Name: `Smiths of Eldravar`
- Android-Paket-ID: `com.smithsofeldravar.game`
- Erstes Android-Release: App-Version `0.18.0`, Android `versionCode 1`
- Save-Version: `14` (unverändert; Android-Verpackung ändert das Save-Format nicht)
- Capacitor: exakt `8.5.3`

Die Paket-ID darf nach der ersten verteilten Installation nicht mehr geändert werden, wenn spätere APKs als Updates derselben App installiert werden sollen.

## Gemeinsame Codebasis

Android ist keine zweite Spielimplementierung. Der vorhandene Angular-Code wird mit der eigenen Angular-Konfiguration `android` gebaut und über Capacitor in das versionierte Verzeichnis `android/` synchronisiert.

```text
Angular / src
  -> npm run build:android:web
  -> dist/nobrainer/browser
  -> npx cap sync android
  -> Android Studio / Gradle
```

Der normale Web-/GitHub-Pages-Build bleibt davon getrennt und weiterhin buildbar.

## Lokaler Entwicklungsablauf

Voraussetzungen:

- Node gemäß `.nvmrc`
- npm gemäß CI
- aktuelle kompatible Android-Studio-/SDK-Installation

Befehle:

```bash
npm install --no-audit --no-fund
npm run android:sync
npm run check:android-base
npm run android:open
```

`npm run android:open` öffnet das native Projekt in Android Studio.

## Reproduzierbarer CI-Build

`.github/workflows/android-ci.yml` bildet Gate A unabhängig von einem einzelnen Entwicklerrechner nach: Node 22, Java 21, Android SDK 36, Angular-Prüfungen, Capacitor-Synchronisierung und Gradle-Build. Auf dem Gate-A-Feature-Branch wird das einmalig von Capacitor erzeugte native `android/`-Projekt nach erfolgreichem Build versioniert. Debug- und unsignierte Release-APKs werden als CI-Artefakte bereitgestellt; ein Produktions-APK bleibt vom extern gesicherten Release-Key abhängig.

## Android-Versionierung

`versionName` folgt der ausdrücklich als Android-Release freigegebenen Spielversion. `versionCode` ist eine eigene, streng steigende Ganzzahl und wird für jede auf realen Geräten als Update installierte APK erhöht.

Beispiel:

```text
0.18.0 -> versionCode 1
0.18.1 -> kein Android-Release
0.18.2 -> kein Android-Release
0.19.0 -> versionCode 2, falls ausdrücklich freigegeben
```

Ein normaler Merge oder eine neue Web-Version veröffentlicht niemals automatisch eine Android-Version.

## Release-Signierung

Der dauerhafte Release-Key wird außerhalb des Repositories erzeugt und mindestens zweifach offline gesichert. Empfohlener Alias:

`smiths-of-eldravar-release`

Keystore-Dateien und Passwörter dürfen niemals committed werden. Das Repository ignoriert `*.jks`, `*.keystore`, `*.p12` und `keystore.properties`.

Die native Release-Konfiguration liest ausschließlich diese Umgebungsvariablen:

- `SOE_RELEASE_STORE_FILE`
- `SOE_RELEASE_STORE_PASSWORD`
- `SOE_RELEASE_KEY_ALIAS`
- `SOE_RELEASE_KEY_PASSWORD`

Ohne diese Werte kann CI weiterhin Debug- und unsignierte Release-Builds zur technischen Prüfung erstellen. Ein verteilbares Produktions-APK wird erst mit dem dauerhaft gesicherten Release-Key signiert.

## Gate-A-Abnahme

Gate A gilt technisch als vorbereitet, wenn:

1. bestehende Angular-Tests und Web-Build weiterhin erfolgreich sind,
2. das Capacitor-Android-Projekt reproduzierbar erzeugt und versioniert ist,
3. `assembleDebug` und `assembleRelease` erfolgreich laufen,
4. Paket-ID, App-Version und Android-versionCode geprüft sind,
5. keine Signing-Secrets im Repository liegen,
6. der dauerhafte Release-Key extern gesichert ist,
7. eine mit diesem Key signierte Release-APK auf einem realen Android-Gerät installiert und gestartet wurde.

Erst nach der Gate-A-Freigabe wird Gate B (In-App-Updater) begonnen.

## Gate B – technischer In-App-Updater

- App-Version: 0.19.2; Save-Version bleibt 14.
- Android `versionCode 2` wird für den realen v0.19.1-Gerätetest verwendet, damit Android die korrigierte APK eindeutig über der bereits installierten v0.19.0-Testversion erkennt. Der Stable-Kanal bleibt dabei geschlossen; dies ist keine Gate-C-Freigabe.
- Fester Stable-Kanal: GitHub Pages /android-update/stable.json.
- Ein Merge veröffentlicht niemals automatisch ein Android-Update. Das Manifest bleibt bis zur ausdrücklichen Android-Releasefreigabe geschlossen (available=false).
- Vor der Installation prüft die native Brücke HTTPS, freien Speicher, APK-Größe, SHA-256, Paket-ID, höheren versionCode, versionName und die Signatur gegen die installierte App.
- Installation läuft ausschließlich über Android PackageInstaller mit Benutzerbestätigung.
- Der Release-Key bleibt außerhalb des Repositories.
- Reihenfolge eines späteren Releases: APK bauen → testen → signieren → hochladen → Download testen → SHA-256 prüfen → stable.json zuletzt freigeben.

### Gate-B-Startup-Hotfix v0.19.1

- Offline-Fortschritt wird beim App-Start weiterhin berechnet und gespeichert, aber erst nach dem ersten vollständigen UI-Render angezeigt.
- Dadurch kann ein blockierender Android/WebView-Dialog den ersten sichtbaren Frame nicht mehr verhindern.
- Ein eigener Regressionstest erzwingt, dass `prepare()` keinen Offline-Dialog vor dem Erst-Render öffnet.
- Der vollständige Android-/Web-/Browser-CI-Lauf für den v0.19.1-Gerätetest mit `versionCode 2` ist erfolgreich.
- Save-Version bleibt 14; Gameplay- und Balancinglogik bleiben unverändert.

### Gate-B-Startup-Hotfix v0.19.2

- Ursache gegenüber dem funktionierenden Gate-A-Stand eingegrenzt: Der Gate-B-Updater beobachtete den gesamten DOM und mutierte ihn aus demselben Observer heraus.
- Der globale MutationObserver ist entfernt.
- Die Spieloberfläche wird vollständig aufgebaut; erst danach und nach einem möglichen ersten Paint wird der Updater initialisiert.
- Kann der Updater nicht starten, läuft das Spiel ohne Updateprüfung weiter.
- Save-Version bleibt 14; Gameplay und Balancing bleiben unverändert.
