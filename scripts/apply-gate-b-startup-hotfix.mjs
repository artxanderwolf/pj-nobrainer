import { readFileSync, writeFileSync } from 'node:fs';

const FROM_VERSION = '0.19.0';
const TO_VERSION = '0.19.1';

const read = path => readFileSync(path, 'utf8');
const write = (path, content) => writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`, 'utf8');

function replaceRequired(content, search, replacement, label) {
  if (content.includes(replacement)) return content;
  if (!content.includes(search)) throw new Error(`Startup-Hotfix konnte ${label} nicht finden.`);
  return content.replace(search, replacement);
}

const runtimePath = 'src/app/core/game-runtime.service.ts';
let runtime = read(runtimePath);
runtime = replaceRequired(
  runtime,
  '  private visibilityHandlerRegistered = false;\n',
  '  private visibilityHandlerRegistered = false;\n  private pendingStartupOfflineSummary: { before: SaveSnapshot; after: SaveSnapshot } | null = null;\n',
  'Pending-Offline-Zusammenfassung'
);
runtime = replaceRequired(
  runtime,
  '      if (after) this.offlineProgress.showSummary(before, after);\n',
  '      if (after) this.pendingStartupOfflineSummary = { before, after };\n',
  'direkte Startup-Zusammenfassung'
);
runtime = replaceRequired(
  runtime,
  '    this.dungeonPresentation.render();\n  }\n\n  stopTick(): void {',
  `    this.dungeonPresentation.render();\n    this.flushStartupOfflineSummary();\n  }\n\n  private flushStartupOfflineSummary(): void {\n    const summary = this.pendingStartupOfflineSummary;\n    this.pendingStartupOfflineSummary = null;\n    if (!summary) return;\n\n    window.requestAnimationFrame(() => {\n      window.setTimeout(() => this.offlineProgress.showSummary(summary.before, summary.after), 0);\n    });\n  }\n\n  stopTick(): void {`,
  'Erst-Render-Flush'
);
write(runtimePath, runtime);

const packagePath = 'package.json';
const packageJson = JSON.parse(read(packagePath));
packageJson.version = TO_VERSION;
packageJson.scripts['check:offline-startup'] = 'node scripts/check-offline-startup-order.mjs';
if (!packageJson.scripts.check.includes('npm run check:offline-startup')) {
  packageJson.scripts.check += ' && npm run check:offline-startup';
}
write(packagePath, JSON.stringify(packageJson, null, 2));

const lockPath = 'package-lock.json';
const lock = JSON.parse(read(lockPath));
lock.version = TO_VERSION;
if (lock.packages?.['']) lock.packages[''].version = TO_VERSION;
write(lockPath, JSON.stringify(lock, null, 2));

const shellPath = 'src/app/game/app-shell-presentation-core.ts';
write(shellPath, replaceRequired(
  read(shellPath),
  `export const APP_UI_VERSION = '${FROM_VERSION}';`,
  `export const APP_UI_VERSION = '${TO_VERSION}';`,
  'sichtbare App-Version'
));

const bootstrapPath = 'scripts/bootstrap-android.mjs';
write(bootstrapPath, replaceRequired(
  read(bootstrapPath),
  `const APP_VERSION = '${FROM_VERSION}';`,
  `const APP_VERSION = '${TO_VERSION}';`,
  'Android-Bootstrap-Version'
));

const gradlePath = 'android/app/build.gradle';
write(gradlePath, replaceRequired(
  read(gradlePath),
  `versionName "${FROM_VERSION}"`,
  `versionName "${TO_VERSION}"`,
  'Android-versionName'
));

for (const path of [
  'scripts/check-android-base.mjs',
  'scripts/check-app-shell-presentation.mjs',
  'scripts/check-built-runtime-startup.mjs',
  'scripts/check-built-save-transfer.mjs'
]) {
  let content = read(path);
  content = content.replaceAll(FROM_VERSION, TO_VERSION).replaceAll('0\\.19\\.0', '0\\.19\\.1');
  write(path, content);
}

const offlineCheck = `import assert from 'node:assert/strict';\nimport { readFileSync } from 'node:fs';\n\nconst source = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');\nconst prepareStart = source.indexOf('  prepare(): void {');\nconst renderStart = source.indexOf('  renderInitial(): void {');\nconst stopTickStart = source.indexOf('  stopTick(): void {');\n\nassert.ok(prepareStart >= 0 && renderStart > prepareStart && stopTickStart > renderStart, 'Runtime-Lebenszyklus konnte nicht geprüft werden.');\nconst prepareBlock = source.slice(prepareStart, renderStart);\nconst renderBlock = source.slice(renderStart, stopTickStart);\n\nassert.match(source, /pendingStartupOfflineSummary/, 'Startup-Zusammenfassung muss bis nach dem Erst-Render gepuffert werden.');\nassert.doesNotMatch(prepareBlock, /offlineProgress\\.showSummary/, 'prepare() darf keinen blockierenden Offline-Dialog vor dem Erst-Render öffnen.');\nassert.match(prepareBlock, /pendingStartupOfflineSummary = \\{ before, after \\}/, 'prepare() muss die Offline-Zusammenfassung nur vormerken.');\nassert.match(renderBlock, /flushStartupOfflineSummary\\(\\)/, 'renderInitial() muss die vorgemerkte Offline-Zusammenfassung nach dem Render freigeben.');\nassert.match(renderBlock, /requestAnimationFrame/, 'Vor dem Offline-Dialog muss mindestens ein Browser-Frame möglich sein.');\nassert.match(renderBlock, /setTimeout/, 'Der Offline-Dialog muss in einem nachgelagerten Browser-Task laufen.');\n\nconsole.log('Offline-Startup-Reihenfolge: kein blockierender Dialog vor dem Erst-Render.');\n`;
write('scripts/check-offline-startup-order.mjs', offlineCheck);

const releaseDocPath = 'ANDROID_RELEASE.md';
let releaseDoc = read(releaseDocPath);
releaseDoc = releaseDoc.replace('App-Version: 0.19.0; Save-Version bleibt 14.', 'App-Version: 0.19.1; Save-Version bleibt 14.');
if (!releaseDoc.includes('### Gate-B-Startup-Hotfix v0.19.1')) {
  releaseDoc += `\n\n### Gate-B-Startup-Hotfix v0.19.1\n\n- Offline-Fortschritt wird beim App-Start weiterhin berechnet und gespeichert, aber erst nach dem ersten vollständigen UI-Render angezeigt.\n- Dadurch kann ein blockierender Android/WebView-Dialog den ersten sichtbaren Frame nicht mehr verhindern.\n- Save-Version bleibt 14; Gameplay- und Balancinglogik bleiben unverändert.\n`;
}
write(releaseDocPath, releaseDoc);
