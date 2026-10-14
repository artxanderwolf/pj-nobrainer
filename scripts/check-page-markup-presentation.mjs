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
  ['base', 'tavern', 'roster', 'storage', 'forge', 'market'],
  'Für v0.12.54 sollen Stützpunkt, Taverne, Kader, Lager, Schmiede und Markt Angular-eigenes Seitenmarkup besitzen.'
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

const forgeMarkup = getAngularOwnedPageMarkup('forge') ?? '';
assert.match(forgeMarkup, /id="forgeWeaponName"/, 'Das Waffenname-Feld fehlt im Angular-eigenen Schmiede-Markup.');
assert.match(forgeMarkup, /id="weaponType"/, 'Die Waffenform-Auswahl fehlt im Angular-eigenen Schmiede-Markup.');
assert.match(forgeMarkup, /id="slotWeaponType"/, 'Der Waffentyp-Materialslot fehlt im Angular-eigenen Schmiede-Markup.');
assert.match(forgeMarkup, /id="slotReinforcementMaterial"/, 'Der Verstärkungsmaterial-Slot fehlt im Angular-eigenen Schmiede-Markup.');
assert.match(forgeMarkup, /id="forgeStartBtn"/, 'Der Herstellungsbutton fehlt im Angular-eigenen Schmiede-Markup.');
assert.match(forgeMarkup, /id="forgeUpgradeCard"/, 'Der Schmiede-Upgrade-Renderanker fehlt im Angular-eigenen Schmiede-Markup.');
assert.match(forgeMarkup, /id="forgeJobCard"/, 'Der aktive Schmiedeauftrag fehlt im Angular-eigenen Schmiede-Markup.');
assert.match(forgeMarkup, /id="forgeQueueCard"/, 'Die Schmiede-Warteschlange fehlt im Angular-eigenen Schmiede-Markup.');

const marketMarkup = getAngularOwnedPageMarkup('market') ?? '';
assert.match(marketMarkup, /id="marketUpgradeCard"/, 'Der Markt-Upgrade-Renderanker fehlt im Angular-eigenen Markt-Markup.');
assert.match(marketMarkup, /id="marketJobCard"/, 'Der aktive Verkauf fehlt im Angular-eigenen Markt-Markup.');
assert.match(marketMarkup, /id="marketQueueCard"/, 'Die Markt-Warteschlange fehlt im Angular-eigenen Markt-Markup.');
assert.match(marketMarkup, /id="marketMaterials"/, 'Der Materialverkauf-Renderanker fehlt im Angular-eigenen Markt-Markup.');
assert.match(marketMarkup, /id="marketMaterialsEmpty"/, 'Der Materialverkauf-Leerzustand fehlt im Angular-eigenen Markt-Markup.');
assert.match(marketMarkup, /id="marketWeapons"/, 'Der Waffenverkauf-Renderanker fehlt im Angular-eigenen Markt-Markup.');
assert.match(marketMarkup, /id="marketWeaponsEmpty"/, 'Der Waffenverkauf-Leerzustand fehlt im Angular-eigenen Markt-Markup.');

const legacyFallbackCalls = [];
const composed = composePageMarkup(APP_SHELL_PAGE_IDS, pageId => {
  legacyFallbackCalls.push(pageId);
  return extractLegacyPage(pageId);
});

assert.deepEqual(
  legacyFallbackCalls,
  ['dungeon', 'index'],
  'Der Markup-Cutover greift auf mehr oder weniger Legacy-Seiten als vorgesehen zurück.'
);

for (const pageId of APP_SHELL_PAGE_IDS) {
  const matches = composed.match(new RegExp(`id="${pageId}"`, 'g')) ?? [];
  assert.equal(matches.length, 1, `Seite ${pageId} ist im zusammengesetzten Markup nicht genau einmal vorhanden.`);
}

assert.equal(getAngularOwnedPageMarkup('dungeon'), null, 'Dungeon soll in v0.12.54 noch nicht Angular-eigen sein.');
assert.equal(getAngularOwnedPageMarkup('index'), null, 'Index soll in v0.12.54 noch nicht Angular-eigen sein.');
assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS, pageId => \{/, 'Der App-Component verwendet den Seiten-Markup-Composer nicht mit der Shell-Seitenreihenfolge.');
assert.match(appComponent, /app\.querySelector<HTMLElement>\(`main > section#\$\{pageId\}\.page`\)/, 'Der kontrollierte Legacy-Fallback für noch nicht migrierte Seiten fehlt.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Das zusammengesetzte Seitenmarkup wird nicht mehr in die Angular-Shell eingesetzt.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.54';/, 'Die App-Version wurde nicht auf v0.12.54 gesetzt.');

console.log('Seiten-Markup: Stützpunkt, Taverne, Kader, Lager, Schmiede und Markt liegen in Angular; Dungeon und Index bleiben kontrollierter Legacy-Fallback.');
