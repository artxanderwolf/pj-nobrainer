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
  ['base', 'tavern', 'roster', 'storage', 'forge', 'market', 'dungeon', 'index'],
  'Für v0.12.63 sollen alle acht sichtbaren Seiten Angular-eigenes Seitenmarkup besitzen.'
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

const dungeonMarkup = getAngularOwnedPageMarkup('dungeon') ?? '';
assert.match(dungeonMarkup, /id="enemyHp"/, 'Der Gegnerbasis-Anker fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="enemyArmor"/, 'Der Gegner-Trefferchance-Anker fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="enemyDamage"/, 'Der Gegner-Geschwindigkeits-Anker fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="energyCost"/, 'Der Energie-Anker fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="runDuration"/, 'Der Wellenzähler-Anker fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="dungeonRunCard"/, 'Der Dungeon-Statusanker fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="autoDungeonBtn"/, 'Der Dungeon-Automatikbutton fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="collectLootBtn"/, 'Der Beute-Einsammelbutton fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="teamCard"/, 'Der Dungeon-Team-Renderanker fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="dungeonLoot"/, 'Der Dungeon-Beute-Renderanker fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="dungeonLootEmpty"/, 'Der Dungeon-Beute-Leerzustand fehlt im Angular-eigenen Dungeon-Markup.');
assert.match(dungeonMarkup, /id="combatLog"/, 'Das Expeditionsprotokoll fehlt im Angular-eigenen Dungeon-Markup.');

const indexMarkup = getAngularOwnedPageMarkup('index') ?? '';
assert.match(indexMarkup, /id="materialIndexRows"/, 'Der Materialindex-Renderanker fehlt im Angular-eigenen Index-Markup.');
assert.match(indexMarkup, /<h2>Waffenslots & Funktion<\/h2>/, 'Die Waffenslot-Dokumentation fehlt im Angular-eigenen Index-Markup.');
assert.match(indexMarkup, /<h2>Klassen<\/h2>/, 'Die Klassendokumentation fehlt im Angular-eigenen Index-Markup.');
assert.match(indexMarkup, /<h2>Aktuelle Schadensberechnungen<\/h2>/, 'Die Schadensformeln fehlen im Angular-eigenen Index-Markup.');
assert.match(indexMarkup, /<h2>Gebäude-Upgrades<\/h2>/, 'Die Gebäude-Upgrade-Tabelle fehlt im Angular-eigenen Index-Markup.');
assert.match(indexMarkup, /<h2>Versionshinweise<\/h2>/, 'Die Versionshinweise fehlen im Angular-eigenen Index-Markup.');

const composed = composePageMarkup(APP_SHELL_PAGE_IDS);
for (const pageId of APP_SHELL_PAGE_IDS) {
  const matches = composed.match(new RegExp(`id="${pageId}"`, 'g')) ?? [];
  assert.equal(matches.length, 1, `Seite ${pageId} ist im zusammengesetzten Markup nicht genau einmal vorhanden.`);
}

assert.throws(
  () => composePageMarkup(['unknown-page']),
  /Unbekannte Angular-Seite: unknown-page/,
  'Der Seiten-Composer soll unbekannte Seiten nicht stillschweigend akzeptieren.'
);
assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS\)/, 'Der App-Component verwendet nicht mehr ausschließlich das Angular-eigene Seitenmarkup.');
assert.doesNotMatch(appComponent, /main > section#/, 'Der App-Component enthält weiterhin einen Legacy-Seiten-Fallback.');
assert.doesNotMatch(appComponent, /querySelector<HTMLElement>\('body > \.app'\)/, 'Der Legacy-App-Rahmen wird weiterhin als Markup-Quelle abgefragt.');
assert.doesNotMatch(appComponent, /DOMParser/, 'Die Legacy-HTML wird weiterhin zur Laufzeit geparst.');
assert.doesNotMatch(appComponent, /querySelector<HTMLScriptElement>/, 'Das Legacy-Script wird weiterhin aus der HTML-Datei extrahiert.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Das Angular-eigene Seitenmarkup wird nicht mehr in die Angular-Shell eingesetzt.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.63';/, 'Die App-Version wurde nicht auf v0.12.63 gesetzt.');

console.log('Seiten-Markup: Alle acht sichtbaren Seiten liegen vollständig in Angular; die Legacy-HTML ist auch keine Runtime-Quelle mehr.');
