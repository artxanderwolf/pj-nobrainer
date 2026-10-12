import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import { CONFIG, calculateWeaponStats, normalizeWeaponSlots, rarityFactor } from '../src/app/game/game-core.ts';
import { adaptLegacyWeaponMarkup, adaptLegacyWeaponScript } from '../src/app/game/weapon-naming.ts';

const html = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');
const legacySource = scriptMatch[1];

function replaceRangeOnce(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  if (start < 0 || text.indexOf(startMarker, start + startMarker.length) >= 0) {
    throw new Error(`Testadapter: Startanker für ${label} fehlt oder ist nicht eindeutig.`);
  }
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Testadapter: Endanker für ${label} fehlt.`);
  return text.slice(0, start) + replacement + text.slice(end);
}

// Reproduziert nur die Game-Core-Substitutionen, die vor der Waffenbenennungs-
// Kompatibilität stattfinden. Dungeon-, Save- und Timer-Adapter verändern keine
// Waffenbezeichner und sind für diesen isolierten Test daher nicht erforderlich.
let postCoreAdapter = legacySource;
postCoreAdapter = replaceRangeOnce(postCoreAdapter, 'const CONFIG = {', 'function getCharacterClass(c){', 'const CONFIG=window.NoBrainerGameCore.CONFIG;\nconst CHARACTER_CLASSES=window.NoBrainerGameCore.CHARACTER_CLASSES;\n\n', 'Konfiguration');
postCoreAdapter = replaceRangeOnce(postCoreAdapter, 'const MATERIAL_SALE_RARITY_BONUS=', 'function findWeakestStarterSlots(){', 'const MATERIAL_SALE_RARITY_BONUS=window.NoBrainerGameCore.MATERIAL_SALE_RARITY_BONUS;\nconst MATERIALS=window.NoBrainerGameCore.MATERIALS;\n\n', 'Materialdaten');
postCoreAdapter = replaceRangeOnce(postCoreAdapter, 'const DUNGEON_LOOT_TABLES={', 'const titles = {', 'const DUNGEON_LOOT_TABLES=window.NoBrainerGameCore.DUNGEON_LOOT_TABLES;\n\n', 'Lootdaten');
postCoreAdapter = replaceRangeOnce(postCoreAdapter, 'function weaponDamageAfterArmor(', 'function getCharacterById(', 'function weaponDamageAfterArmor(weapon,enemyArmor=CONFIG.dungeon.enemyArmor,character=null){ return window.NoBrainerGameCore.weaponDamageAfterArmor(weapon,enemyArmor,character); }\n\n', 'Rüstungsberechnung');
postCoreAdapter = replaceRangeOnce(postCoreAdapter, 'function normalizeWeaponSlots(', 'function rarityFactor(', 'function normalizeWeaponSlots(slots){ return window.NoBrainerGameCore.normalizeWeaponSlots(slots); }\n\n', 'Slotnormalisierung');
postCoreAdapter = replaceRangeOnce(postCoreAdapter, 'function rarityFactor(', 'function reinforcementEffectText(', 'function rarityFactor(slots){ return window.NoBrainerGameCore.rarityFactor(slots); }\n\n', 'Seltenheit');
postCoreAdapter = replaceRangeOnce(postCoreAdapter, 'function reinforcementEffectText(', 'function requirements(', 'function reinforcementEffectText(materialName){ return window.NoBrainerGameCore.reinforcementEffectText(materialName); }\n\n', 'Verstärkungstext');
postCoreAdapter = replaceRangeOnce(postCoreAdapter, 'function calculateWeaponStats(', 'function forgePreview(', 'function calculateWeaponStats(slots,weaponType){ return window.NoBrainerGameCore.calculateWeaponStats(slots,weaponType); }\n\n', 'Waffenwerte');

const adaptedScript = adaptLegacyWeaponScript(postCoreAdapter);
new Script(adaptedScript, { filename: 'NoBrainer.weapon-naming.adapted.js' });

assert.ok(adaptedScript.includes('CONFIG.forge.weaponForms'), 'Aktiver Runtime-Code muss weaponForms verwenden.');
assert.ok(adaptedScript.includes('weaponForm:document.getElementById("weaponForm")'), 'Schmiedeauswahl muss weaponForm verwenden.');
assert.ok(adaptedScript.includes('{slot:"baseMaterial",material:document.getElementById("slotBaseMaterial")?.value}'), 'Schmiedeauswahl muss baseMaterial verwenden.');
assert.ok(adaptedScript.includes('formDamageFactor'), 'Waffenstats müssen formDamageFactor verwenden.');
assert.ok(adaptedScript.includes('formSpeedFactor'), 'Waffenstats müssen formSpeedFactor verwenden.');
assert.ok(adaptedScript.includes('cleanWeapon["weaponType"]'), 'v8-Waffen müssen über den expliziten Legacy-Key migriert werden.');
assert.ok(adaptedScript.includes('migrateMarketJobToCurrentRules'), 'Reservierte Waffen in Marktaufträgen müssen migriert werden.');
assert.equal(adaptedScript.includes('.weaponType'), false, 'Aktiver Runtime-Code darf .weaponType nicht mehr verwenden.');
assert.equal(adaptedScript.includes('weaponTypes'), false, 'Aktiver Runtime-Code darf weaponTypes nicht mehr verwenden.');
assert.equal(adaptedScript.includes('slot:"Waffentyp"'), false, 'Aktiver Runtime-Code darf deutsche interne Slot-IDs nicht mehr verwenden.');
assert.equal(adaptedScript.includes('slot:"Schneide"'), false, 'Aktiver Runtime-Code darf deutsche interne Slot-IDs nicht mehr verwenden.');
assert.equal(adaptedScript.includes('slot:"Rückseite"'), false, 'Aktiver Runtime-Code darf deutsche interne Slot-IDs nicht mehr verwenden.');
assert.equal(adaptedScript.includes('slot:"Griffform"'), false, 'Aktiver Runtime-Code darf deutsche interne Slot-IDs nicht mehr verwenden.');
assert.equal(adaptedScript.includes('slot:"Griffmaterial"'), false, 'Aktiver Runtime-Code darf deutsche interne Slot-IDs nicht mehr verwenden.');
assert.equal(adaptedScript.includes('slot:"Verstärkungsmaterial"'), false, 'Aktiver Runtime-Code darf deutsche interne Slot-IDs nicht mehr verwenden.');

const markupBeforeScript = html.slice(0, html.indexOf('<script>'));
const adaptedMarkup = adaptLegacyWeaponMarkup(markupBeforeScript);
assert.ok(adaptedMarkup.includes('id="weaponForm"'), 'Markup muss die Waffenform-ID verwenden.');
assert.ok(adaptedMarkup.includes('id="slotBaseMaterial"'), 'Markup muss die Grundmaterial-ID verwenden.');
assert.ok(adaptedMarkup.includes('<td>Grundmaterial</td>'), 'Schmiede muss Grundmaterial anzeigen.');
assert.ok(adaptedMarkup.includes('<td>1. Grundmaterial</td>'), 'Index muss Grundmaterial anzeigen.');
assert.ok(adaptedMarkup.includes('<th>Waffenform</th><th>Schadensfaktor</th>'), 'Berechnungstabelle muss Waffenform anzeigen.');
assert.equal(adaptedMarkup.includes('Waffentyp'), false, 'Sichtbares Markup darf Waffentyp nicht mehr enthalten.');

function extractRange(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Migrationsblock ${startMarker} konnte nicht extrahiert werden.`);
  return source.slice(start, end);
}

const migrationSource = extractRange(adaptedScript, 'function migrateWeaponToCurrentRules(w){', 'function normalizeLoadedState(raw){');
const migrationContext = createContext({
  console,
  CONFIG,
  calculateWeaponStats,
  normalizeWeaponSlots,
  rarityFactor,
  cloneStarterWeapon: () => ({ id: 0, starter: true, weaponForm: 'starter', slots: [] }),
  Number,
  Math
});
new Script(`${migrationSource}\nglobalThis.__migrate={migrateWeaponToCurrentRules,migrateForgeJobToCurrentRules,migrateMarketJobToCurrentRules};`).runInContext(migrationContext);
const migrate = migrationContext.__migrate;

const legacySlots = [
  { slot: 'Waffentyp', material: 'Kupfer' },
  { slot: 'Schneide', material: 'Kupfer' },
  { slot: 'Rückseite', material: 'Kupfer' },
  { slot: 'Griffform', material: 'Fichte' },
  { slot: 'Griffmaterial', material: 'Lederfetzen' },
  { slot: 'Verstärkungsmaterial', material: 'Kupfer' }
];
const expectedSlotIds = ['baseMaterial', 'blade', 'back', 'gripShape', 'gripMaterial', 'reinforcementMaterial'];
const oldWeapon = { id: 42, name: 'Legacy', weaponType: 'dagger', slots: legacySlots, valueNickel: 123, craftedSeconds: 99 };
const migratedWeapon = migrate.migrateWeaponToCurrentRules(oldWeapon);
assert.equal(migratedWeapon.weaponForm, 'dagger', 'v8-Waffe muss weaponType zu weaponForm migrieren.');
assert.equal(Object.prototype.hasOwnProperty.call(migratedWeapon, 'weaponType'), false, 'Alter weaponType-Key darf nach Migration nicht bestehen bleiben.');
assert.deepEqual(Array.from(migratedWeapon.slots, (entry) => entry.slot), expectedSlotIds, 'v8-Slotnamen müssen auf aktuelle IDs migrieren.');

const oldForgeJob = { weaponType: 'sword', weaponName: 'Legacy Job', slots: legacySlots, totalSeconds: 30, startedAt: 1000 };
const migratedForgeJob = migrate.migrateForgeJobToCurrentRules(oldForgeJob);
assert.equal(migratedForgeJob.weaponForm, 'sword', 'v8-Schmiedeauftrag muss weaponForm erhalten.');
assert.equal(Object.prototype.hasOwnProperty.call(migratedForgeJob, 'weaponType'), false, 'Schmiedeauftrag darf alten weaponType-Key nicht behalten.');

const migratedMarketJob = migrate.migrateMarketJobToCurrentRules({ type: 'weapon', weaponSnapshot: oldWeapon });
assert.equal(migratedMarketJob.weaponSnapshot.weaponForm, 'dagger', 'Reservierter Markt-Waffensnapshot muss migriert werden.');
assert.equal(Object.prototype.hasOwnProperty.call(migratedMarketJob.weaponSnapshot, 'weaponType'), false, 'Markt-Waffensnapshot darf alten weaponType-Key nicht behalten.');

console.log('Waffenbenennung, UI-Terminologie und v8→v9-Kompatibilitätsmigration sind konsistent.');
