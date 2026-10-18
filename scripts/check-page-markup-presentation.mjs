import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_SHELL_PAGE_IDS } from '../src/app/game/app-shell-presentation-core.ts';
import { ANGULAR_OWNED_PAGE_IDS, composePageMarkup, getAngularOwnedPageMarkup } from '../src/app/game/page-markup-presentation-core.ts';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');

assert.deepEqual([...ANGULAR_OWNED_PAGE_IDS], [...APP_SHELL_PAGE_IDS], 'Shell und Seiten-Composer müssen dieselben modularen Seiten besitzen.');

const requiredPageAnchors = {
  base: ['baseTavernSummary'],
  roster: ['rosterCard'],
  tavern: ['tavernOffer'],
  'character-capacity': ['tavernCapacity', 'innUpgradeCard'],
  'storage-materials': ['inventoryRows', 'inventoryEmpty'],
  'storage-weapons': ['weaponInventory', 'weaponInventoryEmpty'],
  'forge-form': ['weaponForm'],
  'forge-materials': ['slotWorkingPart', 'slotBack', 'slotGripCore', 'slotGripWrap', 'slotSpecial', 'slotParry', 'slotBowstring', 'forgeParryInfo', 'forgeMaterialTotalPreview'],
  'forge-preview': ['forgeWeaponName', 'forgeTimePreview', 'forgeValuePreview', 'forgeDamagePreview', 'forgeSpeedPreview', 'forgeHitPreview', 'forgeRawPreview', 'forgePenPreview', 'forgeRarityPreview', 'forgeReinforcementPreview', 'forgeStartBtn'],
  'forge-jobs': ['forgeJobCard', 'forgeQueueCard'],
  'forge-upgrade': ['forgeUpgradeCard'],
  'market-materials': ['marketMaterials', 'marketMaterialsEmpty'],
  'market-weapons': ['marketWeapons', 'marketWeaponsEmpty'],
  'market-jobs': ['marketJobCard', 'marketQueueCard'],
  'market-upgrade': ['marketUpgradeCard'],
  'dungeon-select': ['enemyHp', 'enemyArmor', 'enemyDamage', 'energyCost', 'runDuration'],
  'dungeon-team': ['teamCard'],
  'dungeon-expedition': ['dungeonRunCard', 'autoDungeonBtn'],
  'dungeon-loot': ['collectLootBtn', 'dungeonLoot', 'dungeonLootEmpty'],
  'dungeon-log': ['combatLog'],
  index: ['materialIndexRows']
};

for (const [pageId, ids] of Object.entries(requiredPageAnchors)) {
  const markup = getAngularOwnedPageMarkup(pageId) ?? '';
  for (const id of ids) assert.match(markup, new RegExp(`id="${id}"`), `Renderanker ${id} fehlt auf ${pageId}.`);
}

for (const hub of ['character', 'storage', 'forge', 'market', 'dungeon']) {
  const markup = getAngularOwnedPageMarkup(hub) ?? '';
  assert.match(markup, /class="screen-menu/, `Bereichsseite ${hub} verwendet nicht das kompakte Menümuster.`);
  assert.doesNotMatch(markup, /class="grid"/, `Bereichsseite ${hub} ist wieder zu einer alten Dashboard-Gridseite geworden.`);
}

const forgeForm = getAngularOwnedPageMarkup('forge-form') ?? '';
for (const option of ['Dolch', '1H Schwert', '1H Axt', '2H Schwert', '2H Axt', 'Bogen', 'Stab']) {
  assert.ok(forgeForm.includes(`>${option}</option>`), `Schmiedeoption ${option} fehlt.`);
}
const forgeMaterials = getAngularOwnedPageMarkup('forge-materials') ?? '';
for (const obsolete of ['slotBaseMaterial', 'slotBlade', 'slotGripShape', 'slotGripMaterial', 'slotReinforcementMaterial']) {
  assert.doesNotMatch(forgeMaterials, new RegExp(`id="${obsolete}"`), `Alter Schmiede-Renderanker ${obsolete} darf nicht mehr verwendet werden.`);
}
assert.match(forgeMaterials, /id="forgeParryRow"/);
assert.match(forgeMaterials, /id="forgeBowstringRow"/);
const forgePreview = getAngularOwnedPageMarkup('forge-preview') ?? '';
assert.match(forgePreview, /<span>Leistungswert<\/span>/, 'Schmiedevorschau bezeichnet den Qualitätswert nicht als Leistungswert.');

const indexMarkup = getAngularOwnedPageMarkup('index') ?? '';
for (const heading of ['Materialindex – gemeinsames Stat-System', 'Klassen-Grundwerte', 'Dungeon 1 – Gegner & Belohnungen', 'Kampfberechnung', 'Wirtschaft, Herstellung & Verkauf']) {
  assert.ok(indexMarkup.includes(`<h2>${heading}</h2>`), `Index-Abschnitt ${heading} fehlt.`);
}
assert.match(indexMarkup, /Rüstung = additive Prozentpunkte, begrenzt auf maximal 80 %/);
assert.match(indexMarkup, /Materialwert = 10 Nickel × Seltenheit/);
assert.match(indexMarkup, /40 Nickel \+ 6 × Leistungswert/);

const composed = composePageMarkup(APP_SHELL_PAGE_IDS);
for (const pageId of APP_SHELL_PAGE_IDS) {
  assert.equal((composed.match(new RegExp(`<section class="[^"]*page[^"]*" id="${pageId}"`, 'g')) ?? []).length, 1, `Seite ${pageId} ist im zusammengesetzten Markup nicht genau einmal vorhanden.`);
}
for (const runtimeAnchor of ['inventoryRows', 'weaponInventory', 'forgeStartBtn', 'marketMaterials', 'teamCard', 'dungeonRunCard', 'combatLog']) {
  assert.equal((composed.match(new RegExp(`id="${runtimeAnchor}"`, 'g')) ?? []).length, 1, `Runtime-Anker ${runtimeAnchor} muss trotz Seitenaufteilung genau einmal existieren.`);
}
assert.throws(() => composePageMarkup(['unknown-page']), /Unbekannte Angular-Seite: unknown-page/, 'Der Seiten-Composer soll unbekannte Seiten nicht stillschweigend akzeptieren.');
assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS\)/, 'Der App-Component verwendet nicht ausschließlich Angular-eigenes Seitenmarkup.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Das Angular-eigene Seitenmarkup wird nicht in die Angular-Shell eingesetzt.');
assert.doesNotMatch(appComponent, /DOMParser/, 'Angular-eigenes Seitenmarkup darf nicht aus Legacy-HTML geparst werden.');

console.log('Seiten-Markup: UI v0.12.0 verteilt die bestehenden Renderanker auf kleine, hierarchische Screens ohne Spiellogik zu duplizieren.');
