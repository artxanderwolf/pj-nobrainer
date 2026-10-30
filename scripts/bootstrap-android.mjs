import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const APP_VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version;
const ANDROID_VERSION_NAME = '0.5.0.0';
const ANDROID_VERSION_CODE = 9;
const APP_ID = 'com.smithsofeldravar.game';
const APP_NAME = 'Smiths of Eldravar';
const CAPACITOR_VERSION = '8.5.3';

const read = path => readFileSync(path, 'utf8');
const write = (path, content) => writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`, 'utf8');

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
packageJson.scripts['check:update-core'] = 'node --no-warnings --experimental-strip-types scripts/check-update-core.mjs';
packageJson.scripts['check:android-updater'] = 'node --no-warnings --experimental-strip-types scripts/check-android-updater.mjs';
packageJson.scripts['check:android-update-release'] = 'node --no-warnings --experimental-strip-types scripts/check-android-update-release.mjs';
packageJson.scripts['android:prepare-update'] = 'node --no-warnings --experimental-strip-types scripts/prepare-android-update.mjs';
for (const check of ['npm run check:update-core', 'npm run check:android-updater', 'npm run check:android-update-release']) {
  if (!packageJson.scripts['check'].includes(check)) packageJson.scripts['check'] += ` && ${check}`;
}
write(packagePath, JSON.stringify(packageJson, null, 2));

const angularPath = 'angular.json';
const angular = JSON.parse(read(angularPath));
const build = angular.projects?.nobrainer?.architect?.build;
if (!build) throw new Error('Angular-Buildkonfiguration nobrainer wurde nicht gefunden.');
build.options.assets ??= [];
if (!build.options.assets.some(asset => typeof asset === 'object' && asset.input === 'public')) {
  build.options.assets.push({ glob: '**/*', input: 'public', output: '/' });
}
build.options.styles ??= [];
if (!build.options.styles.includes('src/android-update-v0.19.0.css')) build.options.styles.push('src/android-update-v0.19.0.css');
build.configurations ??= {};
build.configurations.android = {
  baseHref: '/',
  optimization: true,
  extractLicenses: true,
  sourceMap: false,
  budgets: [{ type: 'initial', maximumWarning: '500kB', maximumError: '1MB' }],
  outputHashing: 'all'
};
write(angularPath, JSON.stringify(angular, null, 2));

write('capacitor.config.ts', `import type { CapacitorConfig } from '@capacitor/cli';\n\nconst config: CapacitorConfig = {\n  appId: '${APP_ID}',\n  appName: '${APP_NAME}',\n  webDir: 'dist/nobrainer/browser'\n};\n\nexport default config;\n`);

const shellPath = 'src/app/game/app-shell-presentation-core.ts';
let shell = read(shellPath).replace(/export const APP_UI_VERSION = '[^']+';/, `export const APP_UI_VERSION = '${APP_VERSION}';`);
write(shellPath, shell);

const indexPath = 'src/index.html';
write(indexPath, read(indexPath).replace(/<title>[^<]*<\/title>/, `<title>${APP_NAME}</title>`));

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
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${ANDROID_VERSION_NAME}"`);
  write(gradlePath, gradle);
}
