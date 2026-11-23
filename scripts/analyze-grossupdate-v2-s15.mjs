import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { calculateCharacterStats, calculateWeaponStats, CONFIG, getWeaponForm, getMaterialReferenceById, MATERIAL_REFERENCES } from '../src/app/game/game-core.ts';
import { characterStatLevelMultiplier } from '../src/app/game/character-progression-core.ts';
import { getWeaponClassRestriction } from '../src/app/game/equipment-rules-core.ts';
import { calculateWeaponPerformance } from '../src/app/game/economy-core.ts';
import { resolveArmor } from '../src/app/game/armor-core.ts';
import { applyRuneBonuses, runeSocketCount } from '../src/app/game/rune-core.ts';
import { makeWorld, freshWave, seededRandom } from './lib/dungeon-balance-harness.mjs';

const profiles = JSON.parse(readFileSync(new URL('./fixtures/dungeon-v2-b-reference-teams.json', import.meta.url), 'utf8'));
const seeds = [128021, 256019, 512009];
const samples = 160;
const runeIds = ['rune-p-1', 'rune-ges-1'];
const lateMaterials = [77, 74, 75];

function build(profile, dungeonId, { quality, materials = profile.materials, runes = [], race = 'human' }) {
  assert.ok(runes.length <= runeSocketCount(quality));
  const world = makeWorld({ ...profile, materials }, dungeonId);
  world.weaponInventory.forEach(weapon => {
    weapon.slots = weapon.slots.map(slot => ({ ...slot, quality }));
    const stats = calculateWeaponStats(weapon.slots, weapon.weaponForm);
    weapon.stats = runes.length ? applyRuneBonuses(stats, runes) : stats;
  });
  world.characters.forEach((actor, index) => {
    const weapon = world.weaponInventory[index];
    assert.equal(getWeaponClassRestriction(actor.classId, weapon.weaponForm), null);
    const stats = calculateCharacterStats(actor.classId, [weapon], characterStatLevelMultiplier(actor.level));
    Object.assign(actor, stats, { hp: stats.maxHp, energy: stats.maxEnergy, raceId: race });
  });
  return world;
}

function compare(profile, label, options) {
  const factory = (profile, dungeonId) => build(profile, dungeonId, options);
  const world = factory(profile, profile.dungeonId);
  const batches = [];
  for (const seed of seeds) {
    Math.random = seededRandom(seed);
    let wins = 0;
    let seconds = 0;
    for (let sample = 0; sample < samples; sample++) {
      const result = freshWave(profile, profile.dungeonId, factory);
      wins += Number(result.won);
      seconds += result.ms / 1000;
    }
    batches.push({ seed, wins, meanSeconds: seconds / samples });
  }
  return { profile: profile.id, label, options,
    loadout: world.characters.map(({ classId, maxHp, armor, dodge }, index) => {
      const weapon = world.weaponInventory[index];
      return { classId, form: weapon.weaponForm, maxHp, armor, dodge, weaponPerformance: calculateWeaponPerformance(weapon.stats) };
    }), batches };
}

function materialScan(profile) {
  const world = build(profile, profile.dungeonId, { quality: 1, materials: lateMaterials });
  const actor = world.characters[0], weapon = world.weaponInventory[0];
  return MATERIAL_REFERENCES.flatMap(({ materialId, displayName, definition }) => getWeaponForm(weapon.weaponForm).parts
    .filter(part => part.categories.includes(definition.category))
    .map(({ materialSlot: slot }) => {
    const qualities = [1, 3, 6].map(quality => {
      const slots = weapon.slots.map(part => part.slot === slot ? { ...part, materialId, quality } : part);
      const stats = calculateWeaponStats(slots, weapon.weaponForm);
      const unit = calculateCharacterStats(actor.classId, [{ ...weapon, slots, stats }], characterStatLevelMultiplier(actor.level));
      const incomingFraction = (1 - unit.dodge) * (1 - resolveArmor(unit.armor, 0).reduction);
      return { quality, performance: calculateWeaponPerformance(stats), hp: unit.maxHp,
        armor: unit.armor, dodge: unit.dodge, critChance: unit.critChance, effectiveHp: unit.maxHp / incomingFraction };
    });
    return { materialId, displayName, tier: definition.rarity, category: definition.category, slot, qualities };
  }));
}

const original = Math.random;
try {
  const waves = profiles.map(profile => compare(profile, 'S1 reference', { quality: 1 }));
  const late = profiles.at(-1);
  waves.push(
    compare(late, 'D5 S1', { quality: 1, materials: lateMaterials }),
    compare(late, 'D5 S3', { quality: 3, materials: lateMaterials }),
    compare({ ...late, forms: ['axe1h', 'axe2h', 'bow', 'dagger'] }, 'D5 S3 alternative weapons', { quality: 3, materials: lateMaterials }),
    compare(late, 'D5 S3 with runes', { quality: 3, materials: lateMaterials, runes: runeIds }),
    compare(late, 'D5 S3 high elves', { quality: 3, materials: lateMaterials, race: 'high-elf' }),
    compare(late, 'D1 S6 stress test', { quality: 6, materials: profiles[0].materials })
  );
  const materialRows = materialScan(late);
  assert.equal(new Set(materialRows.map(row => row.materialId)).size, 77);
  const caps = {
    armor: resolveArmor(120, 0.5),
    syntheticArcherDodge: calculateCharacterStats('archer', [], 10).dodge,
    sockets: [1, 2, 3, 4, 5, 6].map(runeSocketCount),
    permittedForms: Object.keys(CONFIG.forge.weaponForms).map(form => ({
      form, classes: late.classes.filter(id => getWeaponClassRestriction(id, form) === null)
    }))
  };
  assert.equal(caps.armor.effectiveArmor, 40);
  assert.equal(caps.syntheticArcherDodge, 0.95);
  assert.deepEqual(caps.sockets, [0, 1, 2, 3, 4, 5]);
  assert.ok(materialRows.some(row => row.materialId === 5 && row.displayName === getMaterialReferenceById(5).displayName));
  const report = { samples, seeds, caps, waves, materialRows };
  const output = process.argv[2];
  if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  for (const { profile, label, batches } of waves) {
    const wins = batches.reduce((total, batch) => total + batch.wins, 0);
    console.log(profile, label, wins + '/' + (samples * seeds.length));
  }
} finally {
  Math.random = original;
}
