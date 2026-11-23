import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { calculateCharacterStats, calculateWeaponStats } from '../src/app/game/game-core.ts';
import { characterStatLevelMultiplier } from '../src/app/game/character-progression-core.ts';
import { getDungeonDefinition } from '../src/app/game/dungeon-definitions.ts';
import { GameDungeonService, GameDungeonSessionService, makeWorld, nextEvent, seededRandom } from './lib/dungeon-balance-harness.mjs';

const references = JSON.parse(readFileSync(new URL('./fixtures/dungeon-v2-b-reference-teams.json', import.meta.url), 'utf8'));
const profiles = {
  d4: { ...references[3], quality: 1 },
  d5: { ...references[4], materials: [77, 74, 75], quality: 4 },
  d5entry: { ...references[4], quality: 1 }
};

function expedition(profile, seed, damageFactor) {
  Math.random = seededRandom(seed);
  const id = profile.dungeonId;
  const world = makeWorld(profile, id);
  for (const [index, actor] of world.characters.entries()) {
    const weapon = world.weaponInventory[index];
    weapon.slots = weapon.slots.map(slot => ({ ...slot, quality: profile.quality }));
    weapon.stats = calculateWeaponStats(weapon.slots, weapon.weaponForm);
    const stats = calculateCharacterStats(actor.classId, [weapon], characterStatLevelMultiplier(actor.level));
    Object.assign(actor, stats, { hp: stats.maxHp, energy: stats.maxEnergy });
  }
  const state = { getState: () => world };
  const dungeon = new GameDungeonService(state);
  const session = new GameDungeonSessionService(state, dungeon);
  const team = world.teams[1];
  const scale = damageFactor / getDungeonDefinition(id).enemyMultipliers.damage;
  const start = dungeon.startRun.bind(dungeon);
  dungeon.startRun = (...args) => {
    const started = start(...args);
    if (started && scale !== 1) for (const enemy of team.dungeonRun.enemies) enemy.damage *= scale;
    return started;
  };

  session.open(0);
  session.toggleRun(0);
  let qualificationMs = null;
  let events = 0;
  while (team.dungeonAuto) {
    const at = Math.min(nextEvent(team), team.dungeonSessionEndsAt);
    assert.ok(Number.isFinite(at));
    session.update(at);
    if ((world.releaseProgress.qualifiedRuns[id] ?? 0) > 0 && qualificationMs === null) qualificationMs = at;
    if (++events > 50000) throw Error('Expedition event limit exceeded');
  }
  return { seed, qualificationMs, wins: team.dungeonWavesDefeated };
}

const [name, countText, firstSeedText, factorsText, output] = process.argv.slice(2);
const count = Number(countText);
const firstSeed = Number(firstSeedText);
const factors = factorsText?.split(',').map(Number);
assert.ok(profiles[name] && Number.isSafeInteger(count) && count > 0 && Number.isSafeInteger(firstSeed));
assert.ok(factors?.length && factors.every(factor => Number.isFinite(factor) && factor > 0));
const originalRandom = Math.random;
try {
  const cases = factors.map(damageFactor => {
    const rows = Array.from({ length: count }, (_, index) => expedition(profiles[name], firstSeed + index * 7919, damageFactor));
    const qualified = rows.filter(row => row.qualificationMs !== null).length;
    const meanWins = rows.reduce((sum, row) => sum + row.wins, 0) / rows.length;
    console.log(name, damageFactor, qualified + '/' + count, 'mean wins:', meanWins.toFixed(2));
    return { damageFactor, qualified, meanWins, rows };
  });
  if (output) writeFileSync(output, JSON.stringify({ profile: profiles[name], count, firstSeed, cases }, null, 2) + '\n');
} finally {
  Math.random = originalRandom;
}
