import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const legacyHtml = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const angularStyles = readFileSync('src/styles.css', 'utf8');
const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const angularConfig = JSON.parse(readFileSync('angular.json', 'utf8'));

const styleMatch = legacyHtml.match(/<style>([\s\S]*?)<\/style>/);
assert.ok(styleMatch, 'Legacy-Stylesheet konnte nicht aus der Referenz-HTML extrahiert werden.');

const normalizeCss = css => css
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .join('\n');

assert.ok(
  normalizeCss(angularStyles).includes(normalizeCss(styleMatch[1])),
  'Das Angular-Stylesheet enthält nicht mehr vollständig die bisherigen Legacy-Styles.'
);
assert.match(
  angularStyles,
  /html,\s*body,\s*app-root,\s*\.legacy-host\s*\{\s*min-height:\s*100%;\s*\}/,
  'Die Angular-Host-Höhenregel fehlt.'
);

assert.doesNotMatch(appComponent, /LEGACY_STYLE_ID/, 'Die alte dynamische Style-ID ist noch im App-Component vorhanden.');
assert.doesNotMatch(appComponent, /installLegacyStyle/, 'Die alte dynamische Style-Installation ist noch aktiv.');
assert.doesNotMatch(appComponent, /querySelector<HTMLStyleElement>\('head > style'\)/, 'Der App-Component liest weiterhin das Legacy-Stylesheet zur Laufzeit.');
assert.doesNotMatch(appComponent, /querySelector<HTMLElement>\('body > \.app'\)/, 'Der App-Component liest weiterhin Legacy-Seitenmarkup zur Laufzeit.');
assert.doesNotMatch(appComponent, /DOMParser/, 'Der App-Component parst weiterhin die Legacy-HTML zur Laufzeit.');
assert.doesNotMatch(appComponent, /querySelector<HTMLScriptElement>/, 'Der App-Component extrahiert weiterhin ein Script aus der Legacy-HTML.');
assert.match(appComponent, /LEGACY_RUNTIME_PATH/, 'Der App-Component verwendet nicht das eigenständige Runtime-Asset.');
assert.match(appComponent, /legacyHost\.nativeElement\.innerHTML = adaptedMarkup;/, 'Das zusammengesetzte Angular-Markup wird nicht mehr in den Angular-Host eingebunden.');

const buildStyles = angularConfig.projects?.nobrainer?.architect?.build?.options?.styles ?? [];
assert.ok(buildStyles.includes('src/styles.css'), 'src/styles.css ist nicht als Angular-Build-Stylesheet registriert.');
const buildAssets = angularConfig.projects?.nobrainer?.architect?.build?.options?.assets ?? [];
assert.ok(
  !buildAssets.some(asset => typeof asset === 'object' && String(asset.glob).endsWith('.html')),
  'Die Legacy-HTML wird weiterhin als Laufzeitasset ausgeliefert.'
);

console.log('Style-Cutover: Legacy-CSS liegt vollständig im Angular-Build; Legacy-HTML wird weder für Seitenmarkup noch Styles oder Runtime zur Laufzeit geladen.');
