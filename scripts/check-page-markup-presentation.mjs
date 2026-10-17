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
for (const pageId of ['base', 'market', 'dungeon']) {
  assert.equal(normalizeMarkup(getAngularOwnedPageMarkup(pageId)), normalizeMarkup(extractLegacyPage(pageId)), `Das Angular-Markup für ${pageId} weicht unerwartet von der bisherigen Referenzdarstellung ab.`);
}

const requiredAnchors = {
  roster: ['rosterCard'],
  storage: ['inventoryRows', 'inventoryEmpty', 'weaponInventory', 'weaponInventoryEmpty'],
  forge: ['forgeWeaponName', 'weaponForm', 'slotWorkingPart', 'slotBack', 'slotGripCore', 'slotGripWrap', 'slotSpecial', 'slotParry', 'slotBowstring', 'forgeParryInfo', 'forgeMaterialTotalPreview', 'forgeStartBtn', 'forgeUpgradeCard', 'forgeJobCard', 'forgeQueueCard'],
  market: ['marketUpgradeCard', 'marketJobCard', 'marketQueueCard', 'marketMaterials', 'marketMaterialsEmpty', 'marketWeapons', 'marketWeaponsEmpty'],
  dungeon: ['enemyHp', 'enemyArmor', 'enemyDamage', 'energyCost', 'runDuration', 'dungeonRunCard', 'autoDungeonBtn', 'collectLootBtn', 'teamCard', 'dungeonLoot', 'dungeonLootEmpty', 'combatLog'],
  index: ['materialIndexRows']
};
for (const [pageId, ids] of Object.entries(requiredAnchors)) {
  const markup = getAngularOwnedPageMarkup(pageId) ?? '';
  for (const id of ids) assert.match(markup, new RegExp(`id="${id}"`), `Renderanker ${id} fehlt auf ${pageId}.`);
}

const forgeMarkup = getAngularOwnedPageMarkup('forge') ?? '';
for (const obsolete of ['slotBaseMaterial', 'slotBlade', 'slotGripShape', 'slotGripMaterial', 'slotReinforcementMaterial']) {
  assert.doesNotMatch(forgeMarkup, new RegExp(`id="${obsolete}"`), `Alter Schmiede-Renderanker ${obsolete} darf nicht mehr verwendet werden.`);
}
assert.match(forgeMarkup, /Die Waffenform ist ein Bauplan/);
assert.match(forgeMarkup, /1H\/2H ist reine Ausrüstungsmetadaten/);
assert.match(forgeMarkup, /id="forgeParryRow"/);
assert.match(forgeMarkup, /id="slotParry"/);
assert.match(forgeMarkup, /id="forgeBowstringRow"/);
assert.match(forgeMarkup, /id="slotBowstring"/);
for (const option of ['Dolch', '1H Schwert', '1H Axt', '2H Schwert', '2H Axt', 'Bogen', 'Stab']) {
  assert.ok(forgeMarkup.includes(`>${option}</option>`), `Schmiedeoption ${option} fehlt.`);
}

const indexMarkup = getAngularOwnedPageMarkup('index') ?? '';
for (const heading of ['Materialindex – gemeinsames Stat-System', 'Bauteile & Materialwirkung', 'Waffenbaupläne', 'Waffen-Grundwerte & Formboni', 'Waffen-Handverteilung', 'Klassen-Grundwerte', 'Level & Erfahrung', 'Dungeon 1 – Gegner & Belohnungen', 'Kampfberechnung', 'Stat-Legende & Displayposition', 'Seltenheit, Herstellung & aktueller Umfang']) {
  assert.ok(indexMarkup.includes(`<h2>${heading}</h2>`), `Index-Abschnitt ${heading} fehlt.`);
}
assert.match(indexMarkup, /Bedrohung = unveränderter Klassen-Grundwert/);
assert.match(indexMarkup, /Skalierbarer Nicht-null-Klassenwert auf Level L/);
assert.match(indexMarkup, /Bedrohung \(B\) ist die bewusste Ausnahme/);
assert.match(indexMarkup, /10 Basis-XP/);
assert.match(indexMarkup, /Neuling/);
assert.match(indexMarkup, /Tank/);
assert.match(indexMarkup, /Jäger/);
assert.match(indexMarkup, /Lehrling/);
assert.match(indexMarkup, /relative Gewichte/);
assert.match(indexMarkup, /Sehne/);
assert.match(indexMarkup, /Bogen/);
assert.match(indexMarkup, /2H Axt/);
assert.match(indexMarkup, /XP für Level L/);
assert.match(indexMarkup, /1H-Waffe → belegt genau eine/);
assert.match(indexMarkup, /2H-Waffe → benötigt beide Hände/);
assert.match(indexMarkup, /A = alle, S = nur schwer, M = nur mittel, L = nur leicht/);

const composed = composePageMarkup(APP_SHELL_PAGE_IDS);
for (const pageId of APP_SHELL_PAGE_IDS) assert.equal((composed.match(new RegExp(`id="${pageId}"`, 'g')) ?? []).length, 1, `Seite ${pageId} ist im zusammengesetzten Markup nicht genau einmal vorhanden.`);
assert.throws(() => composePageMarkup(['unknown-page']), /Unbekannte Angular-Seite: unknown-page/, 'Der Seiten-Composer soll unbekannte Seiten nicht stillschweigend akzeptieren.');
assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS\)/, 'Der App-Component verwendet nicht ausschließlich Angular-eigenes Seitenmarkup.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Das Angular-eigene Seitenmarkup wird nicht in die Angular-Shell eingesetzt.');
assert.doesNotMatch(appComponent, /adaptLegacyWeaponMarkup/, 'Angular-eigenes Seitenmarkup darf nicht mehr durch den Legacy-Waffen-Markupadapter verändert werden.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.86';/, 'Die App-Version wurde nicht auf v0.12.86 gesetzt.');

console.log('Seiten-Markup: Waffen, Dungeon-Gegner/XP, Levelskalierung mit fixer Bedrohung und aktuelles Stat-/Bauplansystem sind in Angular dokumentiert.');
