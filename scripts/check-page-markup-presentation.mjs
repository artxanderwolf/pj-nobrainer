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
  forge: ['forgeUpgradeCardInline'],
  'forge-form': ['weaponForm', 'slotWorkingPart', 'slotBack', 'slotGripCore', 'slotGripWrap', 'slotSpecial', 'slotParry', 'slotBowstring', 'forgePreviewNextBtn'],
  'forge-preview': ['forgeWeaponName', 'forgeTimePreview', 'forgeValuePreview', 'forgeDamagePreview', 'forgeSpeedPreview', 'forgeHitPreview', 'forgeRawPreview', 'forgePenPreview', 'forgeRarityPreview', 'forgeReinforcementPreview', 'forgeStartBtn'],
  'forge-jobs': ['forgeJobCard', 'forgeQueueCard'],
  'forge-upgrade': ['forgeUpgradeCard'],
  market: ['marketUpgradeCardInline'],
  'market-materials': ['marketMaterials', 'marketMaterialsEmpty'],
  'market-weapons': ['marketWeapons', 'marketWeaponsEmpty'],
  'market-jobs': ['marketJobCard', 'marketQueueCard'],
  'market-upgrade': ['marketUpgradeCard'],
  dungeon: ['dungeonOverviewOpenBtn', 'dungeonOverviewAction'],
  'dungeon-select': ['dungeonTeamCard', 'dungeonPrimaryStatus', 'dungeonPrimaryBtn', 'enemyHp', 'enemyArmor', 'enemyDamage', 'energyCost', 'runDuration'],
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

const forgeHub = getAngularOwnedPageMarkup('forge') ?? '';
assert.doesNotMatch(forgeHub, /go\('forge-upgrade'\)/, 'Schmiede-Ausbau darf nicht mehr auf eine Extra-Unterseite verweisen.');
assert.match(forgeHub, /id="forgeUpgradeCardInline"/, 'Schmiede-Ausbau wird nicht direkt im Hub gerendert.');

const marketHub = getAngularOwnedPageMarkup('market') ?? '';
assert.doesNotMatch(marketHub, /go\('market-upgrade'\)/, 'Markt-Ausbau darf nicht mehr auf eine Extra-Unterseite verweisen.');
assert.match(marketHub, /id="marketUpgradeCardInline"/, 'Markt-Ausbau wird nicht direkt im Hub gerendert.');

const forgeForm = getAngularOwnedPageMarkup('forge-form') ?? '';
for (const option of ['Dolch', '1H Schwert', '1H Axt', '2H Schwert', '2H Axt', 'Bogen', 'Stab']) {
  assert.ok(forgeForm.includes(`>${option}</option>`), `Schmiedeoption ${option} fehlt.`);
}
for (const obsolete of ['slotBaseMaterial', 'slotBlade', 'slotGripShape', 'slotGripMaterial', 'slotReinforcementMaterial']) {
  assert.doesNotMatch(forgeForm, new RegExp(`id="${obsolete}"`), `Alter Schmiede-Renderanker ${obsolete} darf nicht mehr verwendet werden.`);
}
assert.match(forgeForm, /id="weaponForm" class="forge-weapon-native"[^>]*aria-hidden="true"[^>]*tabindex="-1"/, 'Der technische Waffenform-Anker muss unsichtbar erhalten bleiben.');
assert.doesNotMatch(forgeForm, /1\. Waffenform wählen|2\. Materialien wählen|Waffenform bestimmt Bauteile und 1H\/2H-Nutzung|Materialbedarf:|forgeParryInfo|forgeMaterialTotalPreview/, 'Die entfernten Schmiede-Erklärungselemente sind noch sichtbar im Forge-Form-Markup vorhanden.');
assert.match(forgeForm, /class="forge-slot-wrap"/, 'Die kompakte Materialtabelle fehlt.');
assert.doesNotMatch(forgeForm, /forge-slot-wrap scroll-region/, 'Die Materialauswahl darf keinen eigenen Scrollbereich mehr besitzen.');
assert.match(forgeForm, /id="forgeParryRow"/);
assert.match(forgeForm, /id="forgeBowstringRow"/);
assert.match(forgeForm, /id="forgePreviewNextBtn"[^>]*disabled/);
assert.equal(getAngularOwnedPageMarkup('forge-materials'), null, 'Materialauswahl darf keine eigene Schmiedeseite mehr sein.');

const forgePreview = getAngularOwnedPageMarkup('forge-preview') ?? '';
assert.match(forgePreview, /<span>Leistungswert<\/span>/, 'Schmiedevorschau bezeichnet den Qualitätswert nicht als Leistungswert.');

const dungeonHub = getAngularOwnedPageMarkup('dungeon') ?? '';
assert.match(dungeonHub, /id="dungeonOverviewOpenBtn"[\s\S]*go\('dungeon-select'\)[\s\S]*Dungeon 1/, 'Dungeon-Bereich führt nicht direkt zu Dungeon 1.');
assert.match(dungeonHub, /id="dungeonOverviewAction"[^>]*>Lauf starten<\/button>/, 'Dungeon-Bereich besitzt keine direkte Status-/Laufaktion.');
assert.doesNotMatch(dungeonHub, /go\('dungeon-team'\)|go\('dungeon-expedition'\)|go\('dungeon-loot'\)/, 'Die alten Dungeon-Unterseiten dürfen nicht mehr als Hauptauswahl angeboten werden.');
const dungeonOne = getAngularOwnedPageMarkup('dungeon-select') ?? '';
assert.match(dungeonOne, /id="dungeonTeamCard"/, 'Dungeon 1 enthält keine direkte Teamauswahl.');
assert.match(dungeonOne, /id="dungeonPrimaryBtn"[^>]*>Lauf starten<\/button>/, 'Dungeon 1 enthält keine zentrale Laufaktion.');

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
for (const runtimeAnchor of ['inventoryRows', 'weaponInventory', 'forgeStartBtn', 'marketMaterials', 'dungeonTeamCard', 'dungeonPrimaryBtn', 'combatLog', 'forgeUpgradeCardInline', 'marketUpgradeCardInline', 'dungeonOverviewAction']) {
  assert.equal((composed.match(new RegExp(`id="${runtimeAnchor}"`, 'g')) ?? []).length, 1, `Runtime-Anker ${runtimeAnchor} muss trotz Seitenaufteilung genau einmal existieren.`);
}
assert.equal((composed.match(/id="forgePreviewNextBtn"/g) ?? []).length, 1, 'Weiter-zur-Vorschau-Button muss genau einmal existieren.');
assert.throws(() => composePageMarkup(['unknown-page']), /Unbekannte Angular-Seite: unknown-page/, 'Der Seiten-Composer soll unbekannte Seiten nicht stillschweigend akzeptieren.');
assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS\)/, 'Der App-Component verwendet nicht ausschließlich Angular-eigenes Seitenmarkup.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Das Angular-eigene Seitenmarkup wird nicht in die Angular-Shell eingesetzt.');
assert.doesNotMatch(appComponent, /DOMParser/, 'Angular-eigenes Seitenmarkup darf nicht aus Legacy-HTML geparst werden.');

console.log('Seiten-Markup: kompakte nicht-scrollende Waffenherstellung sowie Dungeonstatus und direkte Ausbaukarten sind Angular-eigen.');
