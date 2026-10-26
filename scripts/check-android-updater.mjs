import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const plugin = read('android/app/src/main/java/com/smithsofeldravar/game/AndroidUpdaterPlugin.java');
const receiver = read('android/app/src/main/java/com/smithsofeldravar/game/UpdateInstallReceiver.java');
const activity = read('android/app/src/main/java/com/smithsofeldravar/game/MainActivity.java');
const service = read('src/app/core/game-update.service.ts');
const main = read('src/main.ts');
const bridge = read('src/app/core/android-updater.plugin.ts');
const stable = JSON.parse(read('public/android-update/stable.json'));
const saveCodec = read('src/app/game/save-codec.ts');

assert.match(manifest, /android\.permission\.INTERNET/);
assert.doesNotMatch(manifest, /android\.permission\.REQUEST_INSTALL_PACKAGES/, 'Play-Protect-Test A muss ausschließlich die Installationsberechtigung entfernen.');
assert.match(manifest, /android:name="\.UpdateInstallReceiver"/);
assert.match(manifest, /android:exported="false"/);
assert.match(activity, /registerPlugin\(AndroidUpdaterPlugin\.class\)/);
assert.match(bridge, /registerPlugin<AndroidUpdaterPlugin>\('AndroidUpdater'\)/);

assert.match(plugin, /HttpsURLConnection/);
assert.match(plugin, /SHA-256/);
assert.match(plugin, /candidate\.packageName/);
assert.match(plugin, /candidateCode <= currentCode/);
assert.match(plugin, /signerFingerprints\(installed\)\.equals\(signerFingerprints\(candidate\)\)/);
assert.match(plugin, /PackageInstaller\.SessionParams/);
assert.match(plugin, /USER_ACTION_REQUIRED/);
assert.match(plugin, /canRequestPackageInstalls\(\)/);
assert.match(plugin, /getAvailableBytes\(\)/);
assert.match(plugin, /clearUpdateFiles/);
assert.doesNotMatch(plugin, /ACTION_INSTALL_PACKAGE/);
assert.match(receiver, /STATUS_PENDING_USER_ACTION/);
assert.match(receiver, /STATUS_SUCCESS/);

assert.match(service, /android-update\/stable\.json/);
assert.match(service, /AUTO_CHECK_INTERVAL_MS = 12 \* 60 \* 60 \* 1000/);
assert.match(service, /Capacitor\.isNativePlatform\(\)/);
assert.match(service, /Nach Update suchen/);
assert.match(service, /Jetzt aktualisieren/);
assert.match(service, /Installieren/);
assert.match(service, /Später/);
assert.doesNotMatch(service, /MutationObserver|domObserver|installPresentationObserver/, 'Updater darf den gesamten DOM nicht rekursiv beobachten.');
assert.match(main, /document\.querySelector\('#index \.grid'\)/, 'Updater darf erst starten, wenn die Spieloberfläche vorhanden ist.');
assert.match(main, /requestAnimationFrame/, 'Vor Updater-Initialisierung muss ein Paint-Zeitfenster möglich sein.');
assert.match(main, /setTimeout/, 'Updater-Initialisierung muss in einen nachgelagerten Task verschoben werden.');
assert.match(main, /updateService\.initialize\(\)\.catch/, 'Updaterfehler müssen vom Spielstart isoliert bleiben.');

assert.deepEqual(stable, { schemaVersion: 1, available: false }, 'Gate B darf noch kein reales Remote-Update freischalten.');
assert.match(saveCodec, /export const SAVE_VERSION = 14;/, 'Gate B darf das persistierte Save-Format nicht verändern.');

console.log('Android Play-Protect-Test A: Updater-Code bleibt erhalten, REQUEST_INSTALL_PACKAGES ist gezielt entfernt.');
