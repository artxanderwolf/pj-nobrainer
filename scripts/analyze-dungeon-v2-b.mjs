import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { GameDungeonService, seededRandom, makeWorld, nextEvent, freshWave } from './lib/dungeon-balance-harness.mjs';
import { GENERATED_DUNGEONS } from '../src/app/game/data/generated/game-data.generated.ts';
import { getWeaponForm, MATERIAL_REFERENCES } from '../src/app/game/game-core.ts';
import { materialSellDataById } from '../src/app/game/economy-core.ts';
import { calculateWeaponBalanceSnapshot } from '../src/app/game/forge-core.ts';
const profiles = [
  { id: 'solo-start', level: 1, classes: ['recruit'], forms: ['starter'], materials: [5, 1, 9] },
  { id: 'duo-budget', level: 5, classes: ['recruit', 'fighter'], forms: ['dagger', 'axe1h'], materials: [5, 1, 9] },
  { id: 'mixed-four', level: 10, classes: ['recruit', 'fighter', 'archer', 'scholar'], forms: ['sword', 'sword2h', 'bow', 'staff'], materials: [12, 10, 11] },
  { id: 'equipped-four', level: 20, classes: ['recruit', 'fighter', 'archer', 'scholar'], forms: ['sword', 'axe2h', 'bow', 'staff'], materials: [68, 62, 71] }
];
function session(profile, dungeonId, seconds, firstWeapon = false) {
  const world = makeWorld(profile, dungeonId), service = new GameDungeonService({ getState: () => world });
  const team = world.teams[1];
  service.toggleAuto(0);
  let encounters = 0, defeats = 0, xp = 0, at = 0, firstWeaponAt = null, firstWeaponReadyAt = null;
  // Count actual XP before grants, not remaining XP after level-ups.
  const grant = service.grantWaveExperience.bind(service);
  service.grantWaveExperience = (state, run, outcome) => {
    xp += run.enemies.reduce((sum, e) => sum + e.xpDrop, 0);
    return grant(state, run, outcome);
  };
  const start = service.startRun.bind(service);
  service.startRun = (...args) => { const result = start(...args); if (result) encounters++; return result; };
  const failure = service.resetCycleAfterFailure.bind(service);
  service.resetCycleAfterFailure = (...args) => { defeats++; return failure(...args); };
  const stock = {};
  const daggerParts = getWeaponForm('dagger').parts;
  // First craftable new weapon = any legal dagger; no starter materials assumed.
  function canCraftDagger() {
    const parts = [...daggerParts].sort((a, b) => a.categories.length - b.categories.length);
    function allocate(index, remaining, slots = []) {
      if (index === parts.length) return slots;
      const part = parts[index];
      for (const [id, qty] of Object.entries(remaining)) {
        const ref = MATERIAL_REFERENCES.find(r => r.materialId === +id);
        if (qty >= part.quantity && part.categories.includes(ref.definition.category)) {
          const next = { ...remaining, [id]: qty - part.quantity };
          const result = allocate(index + 1, next, [...slots, {slot: part.materialSlot, materialId: +id}]);
          if (result) return result;
        }
      }
      return false;
    }
    return allocate(0, stock);
  }
  while ((at = nextEvent(team)) <= seconds * 1000) {
    service.update(at);
    if (firstWeapon && firstWeaponAt === null) {
      for (const [id, entry] of Object.entries(team.dungeonLoot)) stock[id] = entry.qty;
      const slots = canCraftDagger();
      if (slots) {
        firstWeaponAt = at / 1000;
        firstWeaponReadyAt = firstWeaponAt + calculateWeaponBalanceSnapshot('dagger', slots).forgeSeconds;
      }
    }
  }
  const loot = Object.entries(team.dungeonLoot);
  return { encounters, wins: team.dungeonWavesDefeated, defeats, baseXp: xp,
    materials: loot.reduce((s, [, e]) => s + e.qty, 0),
    materialSaleValueNickel: loot.reduce((s, [id, e]) => s + e.qty * materialSellDataById(+id).valueNickel, 0),
    firstWeaponMaterialsSeconds: firstWeaponAt,
    firstWeaponReadySecondsWithoutWorkers: firstWeaponReadyAt,
    levels: world.characters.map(c => c.level) };
}

const original = structuredClone(GENERATED_DUNGEONS);
const modes = {
  current: { chance: .05 },
  search08: { chance: .08 },
  proposed: { chance: .08, hp: [4, 5.5, 7, 9, 12], damage: [1, 1.25, 1.55, 1.9, 2.4], speed: [1, 1.05, 1.1, 1.15, 1.2],
    armor: [1, 1.25, 1.5, 1.75, 2], dodge: [1, 1.1, 1.2, 1.3, 1.4], hitChance: [1, 1.05, 1.1, 1.15, 1.2] }
};
const samples = Number(process.env.BALANCE_SAMPLES ?? 2000);
if (!Number.isSafeInteger(samples) || samples < 1) throw Error('BALANCE_SAMPLES must be a positive integer');
const sessionSeeds = Array.from({length: 30}, (_, i) => (i + 1) * 101);
const results = { samples, sessionSeeds, profiles: profiles.map(p => ({ ...p, snapshot: makeWorld(p, 1) })), modes: {} };
const originalRandom = Math.random;
try {
  for (const [mode, values] of Object.entries(modes)) {
    for (let id = 1; id <= 5; id++) {
      Object.assign(GENERATED_DUNGEONS[id], structuredClone(original[id]));
      GENERATED_DUNGEONS[id].encounterChance = values.chance;
      for (const stat of ['hp', 'damage', 'speed', 'armor', 'dodge', 'hitChance'])
        if (values[stat]) GENERATED_DUNGEONS[id].enemyMultipliers[stat] = values[stat][id - 1];
    }
    const waves = [];
    // Search-only changes cannot alter a fresh full-HP fight; reuse paired baseline.
    if (mode !== 'search08') for (const p of profiles) for (let id = 1; id <= 5; id++) {
      let wins = 0, ms = 0;
      Math.random = seededRandom(1000 + id);
      for (let i = 0; i < samples; i++) { const result = freshWave(p, id); wins += +result.won; ms += result.ms; }
      waves.push({ profile: p.id, dungeonId: id, wins, trials: samples, winRate: wins / samples, meanCombatSeconds: ms / samples / 1000 });
    }
    const sessions = [];
    for (const p of profiles) for (const seed of sessionSeeds) {
      Math.random = seededRandom(seed);
      sessions.push({ profile: p.id, dungeonId: 1, seed, ...session(p, 1, 3600, p.id === 'solo-start') });
    }
    results.modes[mode] = { definitions: structuredClone(GENERATED_DUNGEONS), waves, sessions };
    console.log(mode, JSON.stringify({ waves, sessions }));
  }
} finally {
  Math.random = originalRandom;
  for (let id = 1; id <= 5; id++) Object.assign(GENERATED_DUNGEONS[id], original[id]);
}
mkdirSync('.generated', { recursive: true });
writeFileSync('.generated/dungeon-v2-b-measurements.json', JSON.stringify(results, null, 2) + '\n');
