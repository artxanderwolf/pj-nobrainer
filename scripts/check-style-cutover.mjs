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
assert.match(appComponent, /querySelector<HTMLElement>\('body > \.app'\)/, 'Das Legacy-Markup wird nicht mehr wie erwartet geladen.');
assert.match(appComponent, /querySelector<HTMLScriptElement>\('body > script'\)/, 'Das Legacy-Script wird nicht mehr wie erwartet geladen.');
assert.match(appComponent, /legacyHost\.nativeElement\.innerHTML = adaptedMarkup;/, 'Das adaptierte Legacy-Markup wird nicht mehr in den Angular-Host eingebunden.');

const buildStyles = angularConfig.projects?.nobrainer?.architect?.build?.options?.styles ?? [];
assert.ok(buildStyles.includes('src/styles.css'), 'src/styles.css ist nicht als Angular-Build-Stylesheet registriert.');

console.log('Style-Cutover: Legacy-CSS liegt vollständig im Angular-Build und wird nicht mehr zur Laufzeit aus der HTML-Datei injiziert.');
