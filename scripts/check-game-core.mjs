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
  'globalThis.__legacyCore={CONFIG,CHARACTER_CLASSES,MATERIAL_SALE_RARITY_BONUS,MATERIALS,DUNGEON_LOOT_TABLES,normalizeWeaponSlots,rarityFactor,reinforcementEffectText,calculateWeaponStats,weaponDamageAfterArmor};'
].join('\n');

const context = createContext({ console });
new Script(legacyCoreSource, { filename: 'NoBrainer_v0.12.2.game-core.js' }).runInContext(context);
const legacy = context.__legacyCore;

function jsonEqual(actual, expected, label) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), `${label} weicht semantisch von v0.12.2 ab.`);
}

const legacyCompatibleConfig = {
  ...CONFIG,
  forge: {
    baseSeconds: CONFIG.forge.baseSeconds,
    weaponTypes: CONFIG.forge.weaponForms
  }
};
jsonEqual(legacyCompatibleConfig, legacy.CONFIG, 'CONFIG');
jsonEqual(CHARACTER_CLASSES, legacy.CHARACTER_CLASSES, 'CHARACTER_CLASSES');
jsonEqual(MATERIAL_SALE_RARITY_BONUS, legacy.MATERIAL_SALE_RARITY_BONUS, 'MATERIAL_SALE_RARITY_BONUS');
jsonEqual(MATERIALS, legacy.MATERIALS, 'MATERIALS');
jsonEqual(DUNGEON_LOOT_TABLES, legacy.DUNGEON_LOOT_TABLES, 'DUNGEON_LOOT_TABLES');

const LEGACY_SLOT_NAMES = {
  baseMaterial: 'Waffentyp',
  blade: 'Schneide',
  back: 'Rückseite',
  gripShape: 'Griffform',
  gripMaterial: 'Griffmaterial',
  reinforcementMaterial: 'Verstärkungsmaterial'
};

function toLegacySlots(slots) {
  return slots.map((entry) => ({ ...entry, slot: LEGACY_SLOT_NAMES[entry.slot] }));
}

function statsAsLegacy(stats) {
  return {
    materialBaseDamage: stats.materialBaseDamage,
    materialBaseSpeed: stats.materialBaseSpeed,
    typeDamageFactor: stats.formDamageFactor,
    typeSpeedFactor: stats.formSpeedFactor,
    baseDamage: stats.baseDamage,
    baseSpeed: stats.baseSpeed,
    bladeMultiplier: stats.bladeMultiplier,
    gripMultiplier: stats.gripMultiplier,
    reinforcementMaterial: stats.reinforcementMaterial,
    reinforcementSpeedFactor: stats.reinforcementSpeedFactor,
    reinforcementHitChanceAdd: stats.reinforcementHitChanceAdd,
    reinforcementPenetrationAdd: stats.reinforcementPenetrationAdd,
    hitChance: stats.hitChance,
    penetration: stats.penetration,
    damagePerHit: stats.damagePerHit,
    attackSpeed: stats.attackSpeed,
    expectedRaw: stats.expectedRaw
  };
}

const namesFor = (...categories) => Object.entries(MATERIALS)
  .filter(([, material]) => categories.includes(material.category))
  .map(([name]) => name);
const baseMaterials = namesFor('Holz', 'Metall');
const bladeMaterials = namesFor('Metall');
const backMaterials = bladeMaterials;
const gripShapeMaterials = namesFor('Holz');
const gripMaterials = namesFor('Leder');
const reinforcementMaterials = Object.keys(MATERIALS);
const weaponForms = Object.keys(CONFIG.forge.weaponForms);

let comparedWeapons = 0;
for (const baseMaterial of baseMaterials) {
  for (const blade of bladeMaterials) {
    for (const back of backMaterials) {
      for (const gripShape of gripShapeMaterials) {
        for (const gripMaterial of gripMaterials) {
          for (const reinforcementMaterial of reinforcementMaterials) {
            const slots = [
              { slot: 'baseMaterial', material: baseMaterial },
              { slot: 'blade', material: blade },
              { slot: 'back', material: back },
              { slot: 'gripShape', material: gripShape },
              { slot: 'gripMaterial', material: gripMaterial },
              { slot: 'reinforcementMaterial', material: reinforcementMaterial }
            ];
            const legacySlots = toLegacySlots(slots);
            for (const weaponForm of weaponForms) {
              jsonEqual(
                statsAsLegacy(calculateWeaponStats(slots, weaponForm)),
                legacy.calculateWeaponStats(legacySlots, weaponForm),
                `calculateWeaponStats(${weaponForm}, ${slots.map((entry) => entry.material).join('/')})`
              );
              comparedWeapons++;
            }
          }
        }
      }
    }
  }
}

const weakestStarterSlots = [
  { slot: 'baseMaterial', material: 'Fichte' },
  { slot: 'blade', material: 'Zinn' },
  { slot: 'back', material: 'Zinn' },
  { slot: 'gripShape', material: 'Morsche Fichte' },
  { slot: 'gripMaterial', material: 'Lederfetzen' },
  { slot: 'reinforcementMaterial', material: 'Morsche Fichte' }
];
const reinforcementSlots = [
  { slot: 'baseMaterial', material: 'Aluminium' },
  { slot: 'blade', material: 'Aluminium' },
  { slot: 'back', material: 'Kupfer' },
  { slot: 'gripShape', material: 'Tanne' },
  { slot: 'gripMaterial', material: 'Fuchs-Leder' },
  { slot: 'reinforcementMaterial', material: 'Fuchs-Leder' }
];

jsonEqual(
  normalizeWeaponSlots(toLegacySlots(reinforcementSlots)),
  reinforcementSlots,
  'Legacy-Slot-Normalisierung'
);
assert.equal(
  normalizeWeaponSlots([{ slot: 'Hauptmaterial', material: 'Kupfer' }])[0]?.slot,
  'reinforcementMaterial',
  'Sehr alte Hauptmaterial-Saves müssen weiterhin auf reinforcementMaterial migriert werden.'
);
assert.equal(
  rarityFactor(reinforcementSlots),
  legacy.rarityFactor(toLegacySlots(reinforcementSlots)),
  'rarityFactor weicht von v0.12.2 ab.'
);

for (const materialName of Object.keys(MATERIALS)) {
  assert.equal(reinforcementEffectText(materialName), legacy.reinforcementEffectText(materialName), `Verstärkungstext für ${materialName} weicht ab.`);
}

const testWeapon = { stats: calculateWeaponStats(reinforcementSlots, 'sword') };
const legacyTestWeapon = { stats: legacy.calculateWeaponStats(toLegacySlots(reinforcementSlots), 'sword') };
for (const armor of [0, 3, 10, 50]) {
  for (const character of [null, { strengthFactor: 1.1, precision: 0.95 }, { strengthFactor: 1.15, precision: 1.1 }]) {
    jsonEqual(
      weaponDamageAfterArmor(testWeapon, armor, character),
      legacy.weaponDamageAfterArmor(legacyTestWeapon, armor, character),
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

assert.equal(comparedWeapons, 8748, 'Alle 8.748 gültigen Waffenvarianten müssen geprüft werden.');
console.log(`Game-Core-Benennung migriert; ${comparedWeapons} Waffenvarianten bleiben rechnerisch identisch zu v0.12.2.`);
