import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { calculateCharacterStats, calculateWeaponStats } from '../src/app/game/game-core.ts';
import { characterStatLevelMultiplier } from '../src/app/game/character-progression-core.ts';
import { GameDungeonService, GameDungeonSessionService, makeWorld, nextEvent, seededRandom } from './lib/dungeon-balance-harness.mjs';

const base = JSON.parse(readFileSync(new URL('./fixtures/dungeon-v2-b-reference-teams.json', import.meta.url), 'utf8')).at(-1);
const profiles = [
  { ...base, id: 'access-s1', quality: 1 },
  { ...base, id: 'native-s3', materials: [77, 74, 75], quality: 3 }
];
const expeditionCount = 192;
const bossWaveCount = 800;

function setup(profile, seed, multiplier) {
  Math.random = seededRandom(seed);
  const world = makeWorld(profile, 5);
  for (const [index, actor] of world.characters.entries()) {
    const weapon = world.weaponInventory[index];
    weapon.slots = weapon.slots.map(slot => ({ ...slot, quality: profile.quality }));
    weapon.stats = calculateWeaponStats(weapon.slots, weapon.weaponForm);
    const stats = calculateCharacterStats(actor.classId, [weapon], characterStatLevelMultiplier(actor.level));
    Object.assign(actor, stats, { hp: stats.maxHp, energy: stats.maxEnergy });
  }
  const gameState = { getState: () => world };
  const dungeon = new GameDungeonService(gameState);
  const team = world.teams[1];
  let bossWaves = 0, bossWins = 0, bossDefeats = 0, containsBoss = false;
  const start = dungeon.startRun.bind(dungeon);
  const win = dungeon.grantWaveExperience.bind(dungeon);
  const lose = dungeon.resetCycleAfterFailure.bind(dungeon);
  dungeon.startRun = (...args) => {
    const started = start(...args);
    if (started) {
      const bosses = team.dungeonRun.enemies.filter(enemy => enemy.boss);
      containsBoss = bosses.length > 0;
      if (containsBoss) bossWaves++;
      for (const boss of bosses) boss.damage *= multiplier;
    }
    return started;
  };
  dungeon.grantWaveExperience = (...args) => {
    if (containsBoss) bossWins++;
    return win(...args);
  };
  dungeon.resetCycleAfterFailure = (...args) => {
    if (containsBoss) bossDefeats++;
    return lose(...args);
  };
  return { world, gameState, dungeon, team, counts: () => ({ bossWaves, bossWins, bossDefeats }) };
}

function expedition(profile, seed, multiplier) {
  const { world, gameState, dungeon, team, counts } = setup(profile, seed, multiplier);
  const session = new GameDungeonSessionService(gameState, dungeon);
  session.open(0);
  session.toggleRun(0);
  assert.ok(team.dungeonAuto);
  let qualificationMs = null;
  let events = 0;
  while (team.dungeonAuto) {
    const at = Math.min(nextEvent(team), team.dungeonSessionEndsAt);
    assert.ok(Number.isFinite(at));
    session.update(at);
    if (qualificationMs === null && world.releaseProgress.qualifiedRuns[5] > 0) qualificationMs = at;
    if (++events > 50000) throw Error('Expedition event limit exceeded');
  }
  return { qualificationMs, wins: team.dungeonWavesDefeated, ...counts() };
}

function bossWave(profile, seed, multiplier) {
  const { dungeon, team, counts } = setup(profile, seed, multiplier);
  dungeon.toggleAuto(0);
  dungeon.startRun(dungeon.getState(), 0, { events: [], saveRequested: false });
  if (!counts().bossWaves) return null;
  let elapsedMs = 0;
  let events = 0;
  while (team.dungeonRun) {
    elapsedMs = nextEvent(team);
    dungeon.update(elapsedMs);
    if (++events > 20000) throw Error('Wave event limit exceeded');
  }
  return { won: team.dungeonWavesDefeated > 0, elapsedMs };
}

const originalRandom = Math.random;
try {
  const rows = profiles.map(profile => {
    const expeditions = Array.from({ length: expeditionCount }, (_, index) => {
      const seed = 9257 + index * 7919;
      return { seed, current: expedition(profile, seed, 1), increased: expedition(profile, seed, 1.05) };
    });
    const bossWaves = [];
    for (let index = 0; bossWaves.length < bossWaveCount && index < 100000; index++) {
      const seed = 13799 + index * 7907;
      const current = bossWave(profile, seed, 1);
      if (!current) continue;
      const increased = bossWave(profile, seed, 1.05);
      assert.ok(increased, 'Both variants must start with identical boss presence');
      bossWaves.push({ seed, current, increased });
    }
    assert.equal(bossWaves.length, bossWaveCount);
    console.log(profile.id, JSON.stringify({
      qualified: ['current', 'increased'].map(key => expeditions.filter(row => row[key].qualificationMs !== null).length),
      bossWaveWins: ['current', 'increased'].map(key => bossWaves.filter(row => row[key].won).length)
    }));
    return { profile, expeditions, bossWaves };
  });
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ expeditionCount, bossWaveCount, rows }, null, 2) + '\n');
} finally {
  Math.random = originalRandom;
}
