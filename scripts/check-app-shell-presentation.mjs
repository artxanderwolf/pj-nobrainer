import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_SHELL_PAGE_IDS, composeAppShell } from '../src/app/game/app-shell-presentation-core.ts';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const angularConfig = JSON.parse(readFileSync('angular.json', 'utf8'));
const probePage = '<section class="page" id="probe">Probe</section>';
const shell = composeAppShell(probePage);

assert.equal(APP_SHELL_PAGE_IDS[0], 'base');
for (const required of ['character', 'storage', 'forge-preview', 'market-jobs', 'dungeon-select', 'index']) {
  assert.ok(APP_SHELL_PAGE_IDS.includes(required), `Modulare Seite ${required} fehlt in der Shell-Seitenliste.`);
}
assert.match(shell, /^<div class="app modular-ui" data-ui-version="0\.13\.9">/, 'Die modulare UI-v0.13.9-Shell fehlt.');
assert.match(shell, /id="backBtn"[\s\S]*onclick="goBack\(\)"/, 'Der globale Zurück-Button fehlt.');
assert.match(shell, /<div class="ui-version">NO BRAINER · v0\.13\.9<\/div>/, 'Die sichtbare Versionsanzeige ist nicht v0.13.9.');
assert.match(shell, /<h1 id="pageTitle">Übersicht<\/h1>/, 'Der Seitentitel-Anker fehlt.');
assert.match(shell, /id="gold"/, 'Der Geld-Anker fehlt.');
assert.match(shell, /class="help-btn"[\s\S]*onclick="go\('index'\)"/, 'Der Hilfezugang fehlt.');
assert.match(shell, /id="matCount" class="sr-only"/, 'Der Legacy-Materialanker muss unsichtbar erhalten bleiben.');
assert.match(shell, /id="saveStatus" class="sr-only"/, 'Der Save-Status-Anker muss unsichtbar erhalten bleiben.');
assert.ok(shell.includes(probePage), 'Seitenmarkup wird nicht in die Angular-Shell eingesetzt.');

const bottomItems = [
  ['base', 'base', 'Übersicht'],
  ['character', 'character', 'Charakter'],
  ['storage', 'storage', 'Lager'],
  ['dungeon', 'dungeon', 'Dungeon']
];
for (const [pageId, sectionId, title] of bottomItems) {
  assert.match(shell, new RegExp(`data-page="${pageId}" data-section="${sectionId}"[^>]*>${title}<`), `Bottom-Navigation ${title} fehlt.`);
}
assert.doesNotMatch(shell, /<aside>/, 'Die alte Sidebar darf in der modularen Shell nicht mehr erscheinen.');
assert.doesNotMatch(shell, /onclick="saveGame\(true\)"/, 'Manuelles Speichern soll nicht mehr permanent in der Spiel-UI stehen.');
assert.doesNotMatch(shell, /onclick="resetSave\(\)"/, 'Spielstand-Reset soll nicht mehr permanent in der Spiel-UI stehen.');

const styles = angularConfig.projects?.nobrainer?.architect?.build?.options?.styles ?? [];
assert.ok(styles.includes('src/styles.css'));
assert.ok(styles.includes('src/ui-shell-v0.12.0.css'), 'Das responsive modulare UI-Stylesheet ist nicht registriert.');

assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS\)/, 'Der App-Component bezieht die Seiten nicht mehr vollständig aus dem Angular-eigenen Seiten-Composer.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Der App-Component baut die Oberfläche nicht mehr über die Angular-eigene Shell auf.');
assert.doesNotMatch(appComponent, /DOMParser/, 'Der App-Component parst weiterhin die Legacy-HTML.');
assert.match(appComponent, /const LEGACY_RUNTIME_PATH = 'legacy\/NoBrainer_GitHub_v0\.12\.2\.runtime\.js';/, 'Der App-Component verweist nicht auf das eigenständige Runtime-Asset.');

console.log('App-Shell-Präsentation: responsive UI v0.13.9 mit Topbar, Zurück-Button und vierteiliger Bottom-Navigation ist Angular-eigen.');