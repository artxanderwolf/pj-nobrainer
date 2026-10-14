import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_SHELL_PAGE_IDS } from '../src/app/game/app-shell-presentation-core.ts';
import {
  ANGULAR_OWNED_PAGE_IDS,
  composePageMarkup,
  getAngularOwnedPageMarkup
} from '../src/app/game/page-markup-presentation-core.ts';

const legacyHtml = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const appComponent = readFileSync('src/app/app.component.ts', 'utf8');

function extractLegacyPage(pageId) {
  const match = legacyHtml.match(new RegExp(`<section class="page(?: active)?" id="${pageId}">[\\s\\S]*?<\\/section>`));
  assert.ok(match, `Legacy-Seitenbereich ${pageId} konnte nicht aus der Referenz extrahiert werden.`);
  return match[0];
}

function normalizeMarkup(markup) {
  return markup
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

assert.deepEqual(
  [...ANGULAR_OWNED_PAGE_IDS],
  ['base', 'tavern', 'roster', 'storage'],
  'Für v0.12.53 sollen Stützpunkt, Taverne, Kader und Lager Angular-eigenes Seitenmarkup besitzen.'
);

for (const pageId of ANGULAR_OWNED_PAGE_IDS) {
  assert.equal(
    normalizeMarkup(getAngularOwnedPageMarkup(pageId)),
    normalizeMarkup(extractLegacyPage(pageId)),
    `Das Angular-Markup für ${pageId} weicht von der bisherigen Referenzdarstellung ab.`
  );
}

const rosterMarkup = getAngularOwnedPageMarkup('roster') ?? '';
assert.match(rosterMarkup, /id="rosterCard"/, 'Der Kader-Renderanker fehlt im Angular-eigenen Kader-Markup.');

const storageMarkup = getAngularOwnedPageMarkup('storage') ?? '';
assert.match(storageMarkup, /id="inventoryRows"/, 'Der Materiallager-Tabellenanker fehlt im Angular-eigenen Lager-Markup.');
assert.match(storageMarkup, /id="inventoryEmpty"/, 'Der Materiallager-Leerzustand fehlt im Angular-eigenen Lager-Markup.');
assert.match(storageMarkup, /id="weaponInventory"/, 'Der Waffenlager-Renderanker fehlt im Angular-eigenen Lager-Markup.');
assert.match(storageMarkup, /id="weaponInventoryEmpty"/, 'Der Waffenlager-Leerzustand fehlt im Angular-eigenen Lager-Markup.');

const legacyFallbackCalls = [];
const composed = composePageMarkup(APP_SHELL_PAGE_IDS, pageId => {
  legacyFallbackCalls.push(pageId);
  return extractLegacyPage(pageId);
});

assert.deepEqual(
  legacyFallbackCalls,
  ['dungeon', 'forge', 'market', 'index'],
  'Der Markup-Cutover greift auf mehr oder weniger Legacy-Seiten als vorgesehen zurück.'
);

for (const pageId of APP_SHELL_PAGE_IDS) {
  const matches = composed.match(new RegExp(`id="${pageId}"`, 'g')) ?? [];
  assert.equal(matches.length, 1, `Seite ${pageId} ist im zusammengesetzten Markup nicht genau einmal vorhanden.`);
}

assert.equal(getAngularOwnedPageMarkup('dungeon'), null, 'Dungeon soll in v0.12.53 noch nicht Angular-eigen sein.');
assert.equal(getAngularOwnedPageMarkup('forge'), null, 'Schmiede soll in v0.12.53 noch nicht Angular-eigen sein.');
assert.equal(getAngularOwnedPageMarkup('market'), null, 'Markt soll in v0.12.53 noch nicht Angular-eigen sein.');
assert.equal(getAngularOwnedPageMarkup('index'), null, 'Index soll in v0.12.53 noch nicht Angular-eigen sein.');
assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS, pageId => \{/, 'Der App-Component verwendet den Seiten-Markup-Composer nicht mit der Shell-Seitenreihenfolge.');
assert.match(appComponent, /app\.querySelector<HTMLElement>\(`main > section#\$\{pageId\}\.page`\)/, 'Der kontrollierte Legacy-Fallback für noch nicht migrierte Seiten fehlt.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Das zusammengesetzte Seitenmarkup wird nicht mehr in die Angular-Shell eingesetzt.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.53';/, 'Die App-Version wurde nicht auf v0.12.53 gesetzt.');

console.log('Seiten-Markup: Stützpunkt, Taverne, Kader und Lager liegen in Angular; vier Seiten bleiben kontrollierter Legacy-Fallback.');
