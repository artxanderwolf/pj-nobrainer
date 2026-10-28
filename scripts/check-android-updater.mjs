import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseAndroidUpdateManifest } from '../src/app/game/android-update-core.ts';

const read = path => readFileSync(path, 'utf8');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const plugin = read('android/app/src/main/java/com/smithsofeldravar/game/AndroidUpdaterPlugin.java');
const activity = read('android/app/src/main/java/com/smithsofeldravar/game/MainActivity.java');
const service = read('src/app/core/game-update.service.ts');
const main = read('src/main.ts');
const bridge = read('src/app/core/android-updater.plugin.ts');
const stable = JSON.parse(read('public/android-update/stable.json'));
const saveCodec = read('src/app/game/save-codec.ts');

assert.match(manifest, /android\.permission\.INTERNET/);
assert.doesNotMatch(manifest, /android\.permission\.REQUEST_INSTALL_PACKAGES/, 'Die Play-Protect-auslösende Installationsberechtigung darf nicht zurückkehren.');
assert.doesNotMatch(manifest, /UpdateInstallReceiver/, 'Der alte direkte Installationsreceiver darf nicht zurückkehren.');
assert.equal(existsSync('android/app/src/main/java/com/smithsofeldravar/game/UpdateInstallReceiver.java'), false, 'Der alte Installationsreceiver muss gelöscht bleiben.');
assert.match(activity, /registerPlugin\(AndroidUpdaterPlugin\.class\)/);
assert.match(bridge, /registerPlugin<AndroidUpdaterPlugin>\('AndroidUpdater'\)/);
assert.match(bridge, /saveVerifiedUpdate/);
assert.doesNotMatch(bridge, /installVerified|openInstallPermissionSettings|getInstallStatus/);

assert.match(plugin, /HttpsURLConnection/);
assert.match(plugin, /SHA-256/);
assert.match(plugin, /candidate\.packageName/);
assert.match(plugin, /candidateCode <= currentCode/);
assert.match(plugin, /signerFingerprints\(installed\)\.equals\(signerFingerprints\(candidate\)\)/);
assert.match(plugin, /Intent\.ACTION_CREATE_DOCUMENT/);
assert.match(plugin, /@ActivityCallback/);
assert.match(plugin, /openOutputStream/);
assert.match(plugin, /releaseFileName/);
assert.match(plugin, /getAvailableBytes\(\)/);
assert.match(plugin, /clearUpdateFiles/);
assert.doesNotMatch(plugin, /PackageInstaller/, 'Smiths of Eldravar darf die APK nicht mehr selbst installieren.');
assert.doesNotMatch(plugin, /ACTION_MANAGE_UNKNOWN_APP_SOURCES|canRequestPackageInstalls|REQUEST_INSTALL_PACKAGES/);

assert.match(service, /android-update\/stable\.json/);
assert.match(service, /AUTO_CHECK_INTERVAL_MS = 12 \* 60 \* 60 \* 1000/);
assert.match(service, /Capacitor\.isNativePlatform\(\)/);
assert.match(service, /Nach Update suchen/);
assert.match(service, /Update herunterladen/);
assert.match(service, /APK speichern/);
assert.match(service, /Downloads/);
assert.match(service, /Eigene Dateien/);
assert.match(service, /saveVerifiedUpdate/);
assert.doesNotMatch(service, /installUpdate|openInstallPermissionSettings|permission-required|Android-Installer|Installieren/);
assert.doesNotMatch(service, /MutationObserver|domObserver|installPresentationObserver/, 'Updater darf den gesamten DOM nicht rekursiv beobachten.');
assert.match(main, /document\.querySelector\('#index \.grid'\)/, 'Updater darf erst starten, wenn die Spieloberfläche vorhanden ist.');
assert.match(main, /requestAnimationFrame/, 'Vor Updater-Initialisierung muss ein Paint-Zeitfenster möglich sein.');
assert.match(main, /setTimeout/, 'Updater-Initialisierung muss in einen nachgelagerten Task verschoben werden.');
assert.match(main, /updateService\.initialize\(\)\.catch/, 'Updaterfehler müssen vom Spielstart isoliert bleiben.');

const channel = parseAndroidUpdateManifest(stable);
if (channel.available) {
  assert.ok(channel.versionCode >= 6, 'Der Stable-Kanal darf erst einen Nachfolger des freigegebenen Gate-B-Stands anbieten.');
  const url = new URL(channel.apkUrl);
  assert.equal(url.hostname, 'github.com', 'Der freigegebene Download muss ein Release dieses Projekts sein.');
  assert.match(url.pathname, /^\/artxanderwolf\/pj-nobrainer\/releases\/download\/[^/]+\/[^/]+\.apk$/);
  assert.equal(url.search, '');
  assert.equal(url.hash, '');
} else {
  assert.deepEqual(stable, { schemaVersion: 1, available: false });
}
assert.match(saveCodec, /export const SAVE_VERSION = 16;/, 'Der Android-Updater verwendet das aktuelle gemeinsame Save-Format.');

console.log('Android Gate C: gültiger Stable-Kanal; geprüfte APK wird über den System-Dateidialog exportiert und ausschließlich außerhalb der App installiert.');
