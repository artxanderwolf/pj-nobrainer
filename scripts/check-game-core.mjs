import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import {
  CHARACTER_CLASSES,
  CONFIG,
  DUNGEON_LOOT_TABLES,
  MATERIALS,
  MATERIAL_SALE_RARITY_BONUS,
  calculateWeaponStats,
  normalizeWeaponSlots,
  rarityFactor,
  reinforcementEffectText,
  weaponDamageAfterArmor
} from '../src/app/game/game-core.ts';

const html = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) {
  throw new Error('Legacy-JavaScript konnte für den Game-Core-Vergleich nicht extrahiert werden.');
}
const source = scriptMatch[1];

function sliceRange(startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Legacy-Bereich für ${label} konnte nicht extrahiert werden.`);
  }
  return source.slice(start, end);
}

const legacyCoreSource = [
  sliceRange('const CONFIG = {', 'function getCharacterClass(c){', 'Konfiguration und Klassen'),
  sliceRange('const MATERIAL_SALE_RARITY_BONUS=', 'function findWeakestStarterSlots(){', 'Materialdaten'),
  sliceRange('const DUNGEON_LOOT_TABLES={', 'const titles = {', 'Dungeon-Lootdaten'),
  sliceRange('function weaponDamageAfterArmor(', 'function getCharacterById(', 'Rüstungsberechnung'),
  sliceRange('function normalizeWeaponSlots(', 'function rarityFactor(', 'Waffenslot-Normalisierung'),
  sliceRange('function rarityFactor(', 'function reinforcementEffectText(', 'Seltenheitsberechnung'),
  sliceRange('function reinforcementEffectText(', 'function requirements(', 'Verstärkungstext'),
  sliceRange('function calculateWeaponStats(', 'function forgePreview(', 'Waffenwertberechnung'),
  `globalThis.__legacyCore={CONFIG,CHARACTER_CLASSES,MATERIAL_SALE_RARITY_BONUS,MATERIALS,DUNGEON_LOOT_TABLES,normalizeWeaponSlots,rarityFactor,reinforcementEffectText,calculateWeaponStats,weaponDamageAfterArmor};`
].join('\n');

const context = createContext({ console });
new Script(legacyCoreSource, { filename: 'NoBrainer_v0.12.2.game-core.js' }).runInContext(context);
const legacy = context.__legacyCore;

function jsonEqual(actual, expected, label) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), `${label} weicht von v0.12.2 ab.`);
}

jsonEqual(CONFIG, legacy.CONFIG, 'CONFIG');
jsonEqual(CHARACTER_CLASSES, legacy.CHARACTER_CLASSES, 'CHARACTER_CLASSES');
jsonEqual(MATERIAL_SALE_RARITY_BONUS, legacy.MATERIAL_SALE_RARITY_BONUS, 'MATERIAL_SALE_RARITY_BONUS');
jsonEqual(MATERIALS, legacy.MATERIALS, 'MATERIALS');
jsonEqual(DUNGEON_LOOT_TABLES, legacy.DUNGEON_LOOT_TABLES, 'DUNGEON_LOOT_TABLES');

const weakestStarterSlots = [
  { slot: 'Waffentyp', material: 'Fichte' },
  { slot: 'Schneide', material: 'Zinn' },
  { slot: 'Rückseite', material: 'Zinn' },
  { slot: 'Griffform', material: 'Morsche Fichte' },
  { slot: 'Griffmaterial', material: 'Lederfetzen' },
  { slot: 'Verstärkungsmaterial', material: 'Morsche Fichte' }
];

const reinforcementSlots = [
  { slot: 'Waffentyp', material: 'Aluminium' },
  { slot: 'Schneide', material: 'Aluminium' },
  { slot: 'Rückseite', material: 'Kupfer' },
  { slot: 'Griffform', material: 'Tanne' },
  { slot: 'Griffmaterial', material: 'Fuchs-Leder' },
  { slot: 'Verstärkungsmaterial', material: 'Fuchs-Leder' }
];

for (const [slots, weaponType] of [
  [weakestStarterSlots, 'sword'],
  [weakestStarterSlots, 'dagger'],
  [reinforcementSlots, 'sword'],
  [reinforcementSlots, 'dagger']
]) {
  jsonEqual(
    calculateWeaponStats(slots, weaponType),
    legacy.calculateWeaponStats(slots, weaponType),
    `calculateWeaponStats(${weaponType})`
  );
}

jsonEqual(normalizeWeaponSlots([{ slot: 'Hauptmaterial', material: 'Kupfer' }]), legacy.normalizeWeaponSlots([{ slot: 'Hauptmaterial', material: 'Kupfer' }]), 'normalizeWeaponSlots');
assert.equal(rarityFactor(reinforcementSlots), legacy.rarityFactor(reinforcementSlots), 'rarityFactor weicht von v0.12.2 ab.');

for (const materialName of Object.keys(MATERIALS)) {
  assert.equal(reinforcementEffectText(materialName), legacy.reinforcementEffectText(materialName), `Verstärkungstext für ${materialName} weicht ab.`);
}

const testWeapon = { stats: calculateWeaponStats(reinforcementSlots, 'sword') };
for (const armor of [0, 3, 10, 50]) {
  for (const character of [null, { strengthFactor: 1.1, precision: 0.95 }, { strengthFactor: 1.15, precision: 1.1 }]) {
    jsonEqual(
      weaponDamageAfterArmor(testWeapon, armor, character),
      legacy.weaponDamageAfterArmor(testWeapon, armor, character),
      `weaponDamageAfterArmor(armor=${armor})`
    );
  }
}

assert.equal(calculateWeaponStats(weakestStarterSlots, 'sword').expectedRaw, 3.6, 'Starter-ROH muss 3.6 bleiben.');
assert.equal(
  calculateWeaponStats(weakestStarterSlots, 'dagger').expectedRaw,
  calculateWeaponStats(weakestStarterSlots, 'sword').expectedRaw * 0.84,
  'Dolch-ROH muss bei gleichen Materialien 84 % des Einhänders bleiben.'
);

console.log('Game-Core-Daten und reine Berechnungen entsprechen v0.12.2.');
