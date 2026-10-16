import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  GENERATED_LEGACY_RUNTIME_PATH,
  LEGACY_HTML_REFERENCE_PATH,
  extractLegacyRuntimeSource
} from './legacy-runtime-source.mjs';

const legacyHtml = readFileSync(LEGACY_HTML_REFERENCE_PATH, 'utf8');
const generatedRuntime = readFileSync(GENERATED_LEGACY_RUNTIME_PATH, 'utf8');
const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const angularConfig = JSON.parse(readFileSync('angular.json', 'utf8'));
const gitignore = readFileSync('.gitignore', 'utf8');

assert.equal(
  generatedRuntime,
  extractLegacyRuntimeSource(legacyHtml),
  'Die generierte Übergangs-Runtime weicht vom Script der v0.12.2-Referenz ab.'
);

assert.match(
  appComponent,
  /const LEGACY_RUNTIME_PATH = 'legacy\/NoBrainer_GitHub_v0\.12\.2\.runtime\.js';/,
  'Der App-Component verweist nicht auf das eigenständige Legacy-Runtime-Asset.'
);
assert.doesNotMatch(appComponent, /LEGACY_PROTOTYPE_PATH/, 'Der alte Legacy-HTML-Laufzeitpfad ist noch im App-Component vorhanden.');
assert.doesNotMatch(appComponent, /DOMParser/, 'Der App-Component parst weiterhin die Legacy-HTML zur Laufzeit.');
assert.doesNotMatch(appComponent, /querySelector<HTMLScriptElement>/, 'Der App-Component extrahiert weiterhin ein Script aus der Legacy-HTML.');
assert.match(appComponent, /const source = await response\.text\(\);/, 'Die eigenständige Runtime-Datei wird nicht als Scriptquelle geladen.');

const assets = angularConfig.projects?.nobrainer?.architect?.build?.options?.assets ?? [];
const runtimeAsset = assets.find(asset =>
  typeof asset === 'object' &&
  asset.glob === 'NoBrainer_GitHub_v0.12.2.runtime.js'
);
assert.ok(runtimeAsset, 'Das generierte Legacy-Runtime-Asset ist nicht im Angular-Build registriert.');
assert.equal(runtimeAsset.input, '.generated', 'Das Runtime-Asset wird nicht aus dem generierten Übergangsverzeichnis übernommen.');
assert.equal(runtimeAsset.output, '/legacy/', 'Das Runtime-Asset wird nicht unter /legacy/ veröffentlicht.');
assert.ok(
  !assets.some(asset => typeof asset === 'object' && String(asset.glob).endsWith('.html')),
  'Die alte Legacy-HTML wird weiterhin als Angular-Laufzeitasset ausgeliefert.'
);
assert.match(gitignore, /^\/\.generated$/m, 'Das generierte Übergangsverzeichnis ist nicht von Git ausgeschlossen.');

const obsoleteRuntimeAssumptions = readdirSync('scripts')
  .filter(file => file.endsWith('.mjs') && file !== 'check-legacy-runtime-source.mjs')
  .filter(file => readFileSync(`scripts/${file}`, 'utf8').includes('legacyScript.textContent'));
assert.deepEqual(
  obsoleteRuntimeAssumptions,
  [],
  `Veraltete HTML-Script-Annahmen in Regressionstests: ${obsoleteRuntimeAssumptions.join(', ')}`
);

console.log('Runtime-Source-Cutover: Die alte HTML ist nur noch Build-Referenz; der Browser lädt ausschließlich das eigenständige Legacy-Runtime-Asset.');
