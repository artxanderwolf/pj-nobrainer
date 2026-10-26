import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APP_VERSION = '0.19.0';
const APP_ID = 'com.smithsofeldravar.game';
const APP_NAME = 'Smiths of Eldravar';
const CAPACITOR_VERSION = '8.5.3';

const read = path => readFileSync(path, 'utf8');
const packageJson = JSON.parse(read('package.json'));
const angular = JSON.parse(read('angular.json'));
const capacitorConfig = read('capacitor.config.ts');
const appShell = read('src/app/game/app-shell-presentation-core.ts');
const appComponent = read('src/app/app.component.ts');
const saveCodec = read('src/app/game/save-codec.ts');
const gitignore = read('.gitignore');

assert.equal(packageJson.version, APP_VERSION, 'Android-Gate-B muss App-Version 0.19.0 verwenden.');
assert.equal(packageJson.dependencies?.['@capacitor/core'], CAPACITOR_VERSION, 'Capacitor Core muss exakt gepinnt sein.');
assert.equal(packageJson.dependencies?.['@capacitor/android'], CAPACITOR_VERSION, 'Capacitor Android muss exakt gepinnt sein.');
assert.equal(packageJson.devDependencies?.['@capacitor/cli'], CAPACITOR_VERSION, 'Capacitor CLI muss exakt gepinnt sein.');
assert.equal(packageJson.scripts?.['build:android:web'], 'npm run check && ng build --configuration android');
assert.equal(packageJson.scripts?.['android:sync'], 'npm run build:android:web && npx cap sync android');

const androidConfiguration = angular.projects?.nobrainer?.architect?.build?.configurations?.android;
assert.ok(androidConfiguration, 'Eigene Angular-Android-Buildkonfiguration fehlt.');
assert.equal(androidConfiguration.baseHref, '/', 'Android muss mit lokalem Root-BaseHref gebaut werden.');
assert.equal(androidConfiguration.sourceMap, false, 'Android-Produktionsbuild darf keine Source Maps ausliefern.');
assert.equal(androidConfiguration.optimization, true, 'Android-Produktionsbuild muss optimiert sein.');

assert.match(capacitorConfig, new RegExp(`appId:\\s*['\"]${APP_ID.replaceAll('.', '\\.') }['\"]`), 'Dauerhafte Android-Paket-ID stimmt nicht.');
assert.match(capacitorConfig, new RegExp(`appName:\\s*['\"]${APP_NAME}['\"]`), 'Android-Appname stimmt nicht.');
assert.match(capacitorConfig, /webDir:\s*['"]dist\/nobrainer\/browser['"]/, 'Capacitor muss den bestehenden Angular-Build verwenden.');

assert.match(appShell, /APP_UI_VERSION\s*=\s*'0\.19\.0'/, 'Sichtbare App-Version ist nicht v0.19.0.');
assert.match(appShell, /SMITHS OF ELDRAVAR · v\$\{APP_UI_VERSION\}/, 'Offizieller Spielname fehlt in der sichtbaren Shell.');
assert.match(appComponent, /Smiths of Eldravar – v\$\{APP_UI_VERSION\}/, 'Dokumenttitel verwendet nicht den offiziellen Spielnamen.');
assert.match(saveCodec, /export const SAVE_VERSION = 14;/, 'Gate B darf die Save-Version nicht verändern.');

for (const ignored of ['*.jks', '*.keystore', '*.p12', 'keystore.properties']) {
  assert.ok(gitignore.split(/\r?\n/).includes(ignored), `${ignored} muss von Git ausgeschlossen sein.`);
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const forbiddenKeyFiles = walk('.').filter(path => /\.(?:jks|keystore|p12)$/i.test(path));
assert.deepEqual(forbiddenKeyFiles, [], `Signierschlüssel dürfen nicht im Repository liegen: ${forbiddenKeyFiles.join(', ')}`);

if (existsSync('android/app/build.gradle')) {
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, new RegExp(`applicationId\\s+['\"]${APP_ID.replaceAll('.', '\\.') }['\"]`), 'Native applicationId stimmt nicht.');
  assert.match(gradle, /versionCode\s+1\b/, 'Android versionCode muss für das erste Release 1 sein.');
  assert.match(gradle, /versionName\s+"0\.19\.0"/, 'Android versionName muss 0.19.0 sein.');
  for (const env of ['SOE_RELEASE_STORE_FILE', 'SOE_RELEASE_STORE_PASSWORD', 'SOE_RELEASE_KEY_ALIAS', 'SOE_RELEASE_KEY_PASSWORD']) {
    assert.ok(gradle.includes(env), `Release-Signing muss ${env} ausschließlich aus der Umgebung lesen.`);
  }
  assert.ok(existsSync('android/gradlew'), 'Gradle Wrapper fehlt im versionierten Android-Projekt.');
}

console.log('Android Gate B: gemeinsame Angular-Codebasis, Smiths-of-Eldravar-Identität, Save-Version 14 und schlüsselfreie Release-Signing-Konfiguration sind konsistent.');
