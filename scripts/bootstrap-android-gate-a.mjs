import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const APP_VERSION = '0.18.0';
const ANDROID_VERSION_CODE = 1;
const APP_ID = 'com.smithsofeldravar.game';
const APP_NAME = 'Smiths of Eldravar';
const CAPACITOR_VERSION = '8.5.3';

function read(path) {
  return readFileSync(path, 'utf8');
}

function write(path, content) {
  writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function replaceRequired(content, search, replacement, label) {
  if (content.includes(replacement)) return content;
  if (!content.includes(search)) throw new Error(`Bootstrap konnte ${label} nicht finden.`);
  return content.replace(search, replacement);
}

const packagePath = 'package.json';
const packageJson = JSON.parse(read(packagePath));
packageJson.version = APP_VERSION;
packageJson.dependencies ??= {};
packageJson.devDependencies ??= {};
packageJson.dependencies['@capacitor/core'] = CAPACITOR_VERSION;
packageJson.dependencies['@capacitor/android'] = CAPACITOR_VERSION;
packageJson.devDependencies['@capacitor/cli'] = CAPACITOR_VERSION;
packageJson.scripts ??= {};
packageJson.scripts['build:android:web'] = 'npm run check && ng build --configuration android';
packageJson.scripts['android:sync'] = 'npm run build:android:web && npx cap sync android';
packageJson.scripts['android:open'] = 'npx cap open android';
packageJson.scripts['check:android-base'] = 'node scripts/check-android-base.mjs';
write(packagePath, JSON.stringify(packageJson, null, 2));

const angularPath = 'angular.json';
const angular = JSON.parse(read(angularPath));
const build = angular.projects?.nobrainer?.architect?.build;
if (!build) throw new Error('Angular-Buildkonfiguration nobrainer wurde nicht gefunden.');
build.configurations ??= {};
build.configurations.android = {
  baseHref: '/',
  optimization: true,
  extractLicenses: true,
  sourceMap: false,
  budgets: [
    { type: 'initial', maximumWarning: '500kB', maximumError: '1MB' }
  ],
  outputHashing: 'all'
};
write(angularPath, JSON.stringify(angular, null, 2));

write('capacitor.config.ts', `import type { CapacitorConfig } from '@capacitor/cli';\n\nconst config: CapacitorConfig = {\n  appId: '${APP_ID}',\n  appName: '${APP_NAME}',\n  webDir: 'dist/nobrainer/browser'\n};\n\nexport default config;\n`);

const shellPath = 'src/app/game/app-shell-presentation-core.ts';
let shell = read(shellPath);
shell = shell.replace(/export const APP_UI_VERSION = '[^']+';/, `export const APP_UI_VERSION = '${APP_VERSION}';`);
shell = shell.replace('NO BRAINER · v${APP_UI_VERSION}', 'SMITHS OF ELDRAVAR · v${APP_UI_VERSION}');
write(shellPath, shell);

const componentPath = 'src/app/app.component.ts';
let component = read(componentPath);
component = component.replace('document.title = `Projekt NoBrainer – v${APP_UI_VERSION}`;', 'document.title = `Smiths of Eldravar – v${APP_UI_VERSION}`;');
component = component.replace('Die NoBrainer-Runtime konnte nicht geladen werden. Bitte Seite neu laden.', 'Smiths of Eldravar konnte nicht geladen werden. Bitte die App neu starten.');
write(componentPath, component);

const indexPath = 'src/index.html';
let indexHtml = read(indexPath);
indexHtml = indexHtml.replace(/<title>[^<]*<\/title>/, `<title>${APP_NAME}</title>`);
write(indexPath, indexHtml);

const shellTestPath = 'scripts/check-app-shell-presentation.mjs';
let shellTest = read(shellTestPath);
shellTest = shellTest.replace("assert.equal(APP_UI_VERSION, '0.17.3', 'Die gemeinsame sichtbare App-Version muss v0.17.3 sein.');", `assert.equal(APP_UI_VERSION, '${APP_VERSION}', 'Die gemeinsame sichtbare App-Version muss v${APP_VERSION} sein.');`);
shellTest = shellTest.replace(/data-ui-version=\\"0\\\.17\\\.3\\"/, 'data-ui-version=\\"0\\.18\\.0\\"');
shellTest = shellTest.replace(/NO BRAINER · v0\\\.17\\\.3/, 'SMITHS OF ELDRAVAR · v0\\.18\\.0');
shellTest = shellTest.replace('Die modulare UI-v0.17.3-Shell fehlt.', 'Die modulare UI-v0.18.0-Shell fehlt.');
shellTest = shellTest.replace('Die sichtbare Versionsanzeige ist nicht v0.17.3.', 'Die sichtbare Versionsanzeige ist nicht v0.18.0.');
shellTest = shellTest.replace('responsive UI v0.17.3', 'responsive UI v0.18.0');
write(shellTestPath, shellTest);

const gitignorePath = '.gitignore';
let gitignore = read(gitignorePath);
for (const pattern of ['*.jks', '*.keystore', '*.p12', 'keystore.properties']) {
  if (!gitignore.split(/\r?\n/).includes(pattern)) gitignore += `${gitignore.endsWith('\n') ? '' : '\n'}${pattern}\n`;
}
write(gitignorePath, gitignore);

if (existsSync('android/app/build.gradle')) {
  const gradlePath = 'android/app/build.gradle';
  let gradle = read(gradlePath);
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${ANDROID_VERSION_CODE}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${APP_VERSION}"`);

  if (!gradle.includes('SOE_RELEASE_STORE_FILE')) {
    const signingPrelude = `def soeReleaseStoreFile = System.getenv('SOE_RELEASE_STORE_FILE')\ndef soeReleaseStorePassword = System.getenv('SOE_RELEASE_STORE_PASSWORD')\ndef soeReleaseKeyAlias = System.getenv('SOE_RELEASE_KEY_ALIAS')\ndef soeReleaseKeyPassword = System.getenv('SOE_RELEASE_KEY_PASSWORD')\ndef soeReleaseSigningConfigured = [soeReleaseStoreFile, soeReleaseStorePassword, soeReleaseKeyAlias, soeReleaseKeyPassword].every { it != null && !it.trim().isEmpty() }\n\n`;
    gradle = signingPrelude + gradle;
    gradle = replaceRequired(
      gradle,
      '    defaultConfig {',
      `    signingConfigs {\n        release {\n            if (soeReleaseSigningConfigured) {\n                storeFile file(soeReleaseStoreFile)\n                storePassword soeReleaseStorePassword\n                keyAlias soeReleaseKeyAlias\n                keyPassword soeReleaseKeyPassword\n            }\n        }\n    }\n    defaultConfig {`,
      'Android-Signing-Konfiguration'
    );
    gradle = replaceRequired(
      gradle,
      '        release {\n            minifyEnabled false',
      `        release {\n            if (soeReleaseSigningConfigured) {\n                signingConfig signingConfigs.release\n            }\n            minifyEnabled false`,
      'Release-Buildtyp'
    );
  }
  write(gradlePath, gradle);
}
