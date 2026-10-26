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
