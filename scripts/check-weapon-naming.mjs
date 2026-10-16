import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import { CONFIG, calculateWeaponStats, normalizeWeaponSlots, rarityFactor } from '../src/app/game/game-core.ts';
import { adaptLegacyWeaponScript } from '../src/app/game/weapon-naming.ts';

const html = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');
const legacySource = scriptMatch[1];

function replaceRangeOnce(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  if (start < 0 || text.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error(`Testadapter: Startanker für ${label} fehlt oder ist nicht eindeutig.`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Testadapter: Endanker für ${label} fehlt.`);
  return text.slice(0, start) + replacement + text.slice(end);
}

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
assert.ok(adaptedScript.includes('cleanWeapon["weaponType"]'), 'Alte Waffen müssen den expliziten Legacy-Key weiterhin migrieren.');
assert.ok(adaptedScript.includes('migrateMarketJobToCurrentRules'), 'Reservierte Waffen in Marktaufträgen müssen weiterhin migriert werden.');
assert.equal(adaptedScript.includes('.weaponType'), false, 'Aktiver Runtime-Code darf .weaponType nicht mehr verwenden.');
assert.equal(adaptedScript.includes('weaponTypes'), false, 'Aktiver Runtime-Code darf weaponTypes nicht mehr verwenden.');

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
const expectedSlotIds = ['baseMaterial', 'workingPart', 'back', 'gripCore', 'gripWrap', 'special'];
const oldWeapon = { id: 42, name: 'Legacy', weaponType: 'dagger', slots: legacySlots, valueNickel: 123, craftedSeconds: 99 };
const migratedWeapon = migrate.migrateWeaponToCurrentRules(oldWeapon);
assert.equal(migratedWeapon.weaponForm, 'dagger');
assert.equal(Object.prototype.hasOwnProperty.call(migratedWeapon, 'weaponType'), false);
assert.deepEqual(Array.from(migratedWeapon.slots, entry => entry.slot), expectedSlotIds, 'Alte Slotnamen müssen auf die neue Bauteilsemantik migrieren.');
assert.equal(migratedWeapon.stats.baseDamage, 6, 'Migrierter Dolch muss die neue Waffenbasis verwenden.');

const oldForgeJob = { weaponType: 'sword', weaponName: 'Legacy Job', slots: legacySlots, totalSeconds: 30, startedAt: 1000 };
const migratedForgeJob = migrate.migrateForgeJobToCurrentRules(oldForgeJob);
assert.equal(migratedForgeJob.weaponForm, 'sword');
assert.equal(migratedForgeJob.stats.baseDamage, 10);

const migratedMarketJob = migrate.migrateMarketJobToCurrentRules({ type: 'weapon', weaponSnapshot: oldWeapon });
assert.equal(migratedMarketJob.weaponSnapshot.weaponForm, 'dagger');

console.log('Waffenbenennung und Altstand-Migration bleiben mit der neuen Bauteilsemantik kompatibel.');
