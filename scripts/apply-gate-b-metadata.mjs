import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const write = (path, content) => writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`, 'utf8');

execFileSync(process.execPath, ['scripts/bootstrap-android.mjs'], { stdio: 'inherit' });

const lockPath = 'package-lock.json';
const lock = JSON.parse(read(lockPath));
lock.version = '0.19.0';
if (lock.packages?.['']) lock.packages[''].version = '0.19.0';
write(lockPath, JSON.stringify(lock, null, 2));

for (const path of [
  'scripts/check-android-base.mjs',
  'scripts/check-app-shell-presentation.mjs',
  'scripts/check-built-runtime-startup.mjs',
  'scripts/check-built-save-transfer.mjs'
]) {
  let content = read(path);
  content = content.replaceAll('0.18.0', '0.19.0').replaceAll('0\\.18\\.0', '0\\.19\\.0');
  if (path === 'scripts/check-android-base.mjs') content = content.replaceAll('Gate A', 'Gate B').replaceAll('Gate-A', 'Gate-B');
  write(path, content);
}

const androidCiPath = '.github/workflows/android-ci.yml';
let androidCi = read(androidCiPath);
androidCi = androidCi.replace('      - feature/android-v0.18.0-gate-a\n', '      - feature/android-v0.19.0-gate-b\n');
androidCi = androidCi.replaceAll('bootstrap-android-gate-a.mjs', 'bootstrap-android.mjs');
androidCi = androidCi.replaceAll('v0.18.0-debug', 'v0.19.0-debug');
androidCi = androidCi.replaceAll('v0.18.0-release-unsigned', 'v0.19.0-release-unsigned');
if (!androidCi.includes('Verify Android updater')) {
  androidCi = androidCi.replace(
    '      - name: Verify Android base\n        run: npm run check:android-base\n',
    '      - name: Verify Android base\n        run: npm run check:android-base\n\n      - name: Verify Android updater\n        run: npm run check:android-updater\n'
  );
}
write(androidCiPath, androidCi);

const pagesPath = '.github/workflows/pages.yml';
let pages = read(pagesPath);
if (!pages.includes('Verify Android update channel')) {
  pages = pages.replace(
    '      - name: Smoke test built runtime\n        run: node scripts/check-built-runtime-startup.mjs\n',
    '      - name: Smoke test built runtime\n        run: node scripts/check-built-runtime-startup.mjs\n\n      - name: Verify Android update channel\n        run: test -f dist/nobrainer/browser/android-update/stable.json && node scripts/check-update-core.mjs\n'
  );
}
write(pagesPath, pages);

const releaseDocPath = 'ANDROID_RELEASE.md';
let releaseDoc = read(releaseDocPath);
if (!releaseDoc.includes('## Gate B – technischer In-App-Updater')) {
  releaseDoc += `\n## Gate B – technischer In-App-Updater\n\n- App-Version: 0.19.0; Save-Version bleibt 14.\n- Android versionCode bleibt 1, solange Gate C noch keine echte zweite Android-APK freigibt.\n- Fester Stable-Kanal: GitHub Pages /android-update/stable.json.\n- Ein Merge veröffentlicht niemals automatisch ein Android-Update. Das Manifest bleibt bis zur ausdrücklichen Android-Releasefreigabe geschlossen (available=false).\n- Vor der Installation prüft die native Brücke HTTPS, freien Speicher, APK-Größe, SHA-256, Paket-ID, höheren versionCode, versionName und die Signatur gegen die installierte App.\n- Installation läuft ausschließlich über Android PackageInstaller mit Benutzerbestätigung.\n- Der Release-Key bleibt außerhalb des Repositories.\n- Reihenfolge eines späteren Releases: APK bauen → testen → signieren → hochladen → Download testen → SHA-256 prüfen → stable.json zuletzt freigeben.\n`;
}
write(releaseDocPath, releaseDoc);

if (existsSync('scripts/bootstrap-android-gate-a.mjs')) unlinkSync('scripts/bootstrap-android-gate-a.mjs');
