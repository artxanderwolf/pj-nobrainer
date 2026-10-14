import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APP_SHELL_PAGE_IDS,
  composeAppShell
} from '../src/app/game/app-shell-presentation-core.ts';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const probePage = '<section class="page" id="probe">Probe</section>';
const shell = composeAppShell(probePage);

assert.deepEqual(
  [...APP_SHELL_PAGE_IDS],
  ['base', 'dungeon', 'tavern', 'roster', 'storage', 'forge', 'market', 'index'],
  'Die Angular-Shell enthält nicht mehr die erwartete Seitenreihenfolge.'
);

assert.match(shell, /^<div class="app">/, 'Die Angular-Shell besitzt keinen App-Wurzelcontainer.');
assert.match(shell, /<aside>[\s\S]*<nav id="nav">/, 'Sidebar oder Navigation fehlen in der Angular-Shell.');
assert.match(shell, /<h1 id="pageTitle">Stützpunkt<\/h1>/, 'Der Seitentitel-Anker fehlt in der Angular-Shell.');
assert.match(shell, /id="gold"/, 'Der Geld-Anker fehlt in der Angular-Shell.');
assert.match(shell, /id="matCount"/, 'Der Material-Anker fehlt in der Angular-Shell.');
assert.match(shell, /onclick="saveGame\(true\)"/, 'Der manuelle Speichern-Button fehlt in der Angular-Shell.');
assert.match(shell, /onclick="resetSave\(\)"/, 'Der Reset-Button fehlt in der Angular-Shell.');
assert.match(shell, /id="saveStatus"/, 'Der Save-Status-Anker fehlt in der Angular-Shell.');
assert.ok(shell.includes(probePage), 'Seitenmarkup wird nicht in die Angular-Shell eingesetzt.');

for (const pageId of APP_SHELL_PAGE_IDS) {
  assert.match(shell, new RegExp(`data-page="${pageId}"`), `Navigationsziel ${pageId} fehlt in der Angular-Shell.`);
}

assert.match(
  appComponent,
  /composePageMarkup\(APP_SHELL_PAGE_IDS\)/,
  'Der App-Component bezieht die Seiten nicht mehr vollständig aus dem Angular-eigenen Seiten-Composer.'
);
assert.match(
  appComponent,
  /composeAppShell\(pageMarkup\)/,
  'Der App-Component baut die Oberfläche nicht mehr über die Angular-eigene Shell auf.'
);
assert.doesNotMatch(
  appComponent,
  /adaptLegacyWeaponMarkup\(app\.outerHTML\)/,
  'Der App-Component übernimmt weiterhin den kompletten Legacy-App-Rahmen.'
);
assert.doesNotMatch(
  appComponent,
  /main > section#/,
  'Der App-Component enthält weiterhin einen Legacy-Seiten-Fallback.'
);
assert.doesNotMatch(appComponent, /DOMParser/, 'Der App-Component parst weiterhin die Legacy-HTML.');
assert.doesNotMatch(appComponent, /querySelector<HTMLScriptElement>/, 'Der App-Component liest weiterhin ein Script aus der Legacy-HTML.');
assert.match(
  appComponent,
  /const LEGACY_RUNTIME_PATH = 'legacy\/NoBrainer_GitHub_v0\.12\.2\.runtime\.js';/,
  'Der App-Component verweist nicht auf das eigenständige Runtime-Asset.'
);
assert.match(appComponent, /const APP_VERSION = '0\.12\.64';/, 'Die App-Version wurde nicht auf v0.12.64 gesetzt.');

console.log('App-Shell-Präsentation: Navigation, Topbar, Ressourcenrahmen und alle Seiten sind Angular-eigen; die Legacy-Runtime kommt als eigenständiges Asset.');
