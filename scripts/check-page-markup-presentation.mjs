import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_SHELL_PAGE_IDS } from '../src/app/game/app-shell-presentation-core.ts';
import { ANGULAR_OWNED_PAGE_IDS, composePageMarkup, getAngularOwnedPageMarkup } from '../src/app/game/page-markup-presentation-core.ts';

const legacyHtml = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const extractLegacyPage = pageId => {
  const match = legacyHtml.match(new RegExp(`<section class="page(?: active)?" id="${pageId}">[\\s\\S]*?<\\/section>`));
  assert.ok(match, `Legacy-Seitenbereich ${pageId} konnte nicht aus der Referenz extrahiert werden.`);
  return match[0];
};
const normalizeMarkup = markup => markup.replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).filter(Boolean).join('\n');

assert.deepEqual([...ANGULAR_OWNED_PAGE_IDS], ['base', 'tavern', 'roster', 'storage', 'forge', 'market', 'dungeon', 'index'], 'Alle acht sichtbaren Seiten müssen Angular-eigenes Seitenmarkup besitzen.');
for (const pageId of ANGULAR_OWNED_PAGE_IDS) {
  assert.equal(normalizeMarkup(getAngularOwnedPageMarkup(pageId)), normalizeMarkup(extractLegacyPage(pageId)), `Das Angular-Markup für ${pageId} weicht von der bisherigen Referenzdarstellung ab.`);
}

const requiredAnchors = {
  roster: ['rosterCard'],
  storage: ['inventoryRows', 'inventoryEmpty', 'weaponInventory', 'weaponInventoryEmpty'],
  forge: ['forgeWeaponName', 'weaponType', 'slotWeaponType', 'slotReinforcementMaterial', 'forgeStartBtn', 'forgeUpgradeCard', 'forgeJobCard', 'forgeQueueCard'],
  market: ['marketUpgradeCard', 'marketJobCard', 'marketQueueCard', 'marketMaterials', 'marketMaterialsEmpty', 'marketWeapons', 'marketWeaponsEmpty'],
  dungeon: ['enemyHp', 'enemyArmor', 'enemyDamage', 'energyCost', 'runDuration', 'dungeonRunCard', 'autoDungeonBtn', 'collectLootBtn', 'teamCard', 'dungeonLoot', 'dungeonLootEmpty', 'combatLog'],
  index: ['materialIndexRows']
};
for (const [pageId, ids] of Object.entries(requiredAnchors)) {
  const markup = getAngularOwnedPageMarkup(pageId) ?? '';
  for (const id of ids) assert.match(markup, new RegExp(`id="${id}"`), `Renderanker ${id} fehlt auf ${pageId}.`);
}
const indexMarkup = getAngularOwnedPageMarkup('index') ?? '';
for (const heading of ['Waffenslots & Funktion', 'Klassen', 'Aktuelle Schadensberechnungen', 'Gebäude-Upgrades', 'Versionshinweise']) assert.ok(indexMarkup.includes(`<h2>${heading}</h2>`), `Index-Abschnitt ${heading} fehlt.`);

const composed = composePageMarkup(APP_SHELL_PAGE_IDS);
for (const pageId of APP_SHELL_PAGE_IDS) assert.equal((composed.match(new RegExp(`id="${pageId}"`, 'g')) ?? []).length, 1, `Seite ${pageId} ist im zusammengesetzten Markup nicht genau einmal vorhanden.`);
assert.throws(() => composePageMarkup(['unknown-page']), /Unbekannte Angular-Seite: unknown-page/, 'Der Seiten-Composer soll unbekannte Seiten nicht stillschweigend akzeptieren.');
assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS\)/, 'Der App-Component verwendet nicht ausschließlich Angular-eigenes Seitenmarkup.');
assert.doesNotMatch(appComponent, /main > section#|DOMParser|querySelector<HTMLScriptElement>/, 'Der App-Component verwendet weiterhin eine Legacy-Markupquelle.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Das Angular-eigene Seitenmarkup wird nicht in die Angular-Shell eingesetzt.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.69';/, 'Die App-Version wurde nicht auf v0.12.69 gesetzt.');
console.log('Seiten-Markup: Alle acht sichtbaren Seiten liegen vollständig in Angular; die Legacy-HTML bleibt nur Referenz für Darstellungsparität.');
