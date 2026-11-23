import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { calculateCharacterStats, calculateWeaponStats } from '../src/app/game/game-core.ts';
import { characterStatLevelMultiplier, experienceRequiredForNextLevel } from '../src/app/game/character-progression-core.ts';
import { getMaterialStorageEntries } from '../src/app/game/material-storage-core.ts';
import { materialSellDataById } from '../src/app/game/economy-core.ts';
import { claimMission } from '../src/app/game/mission-core.ts';
import { QUALIFIED_RUN_WAVES, REQUIRED_QUALIFIED_RUNS } from '../src/app/game/dungeon-progress-rules.ts';
import { GameDungeonService, GameDungeonSessionService, makeWorld, nextEvent, seededRandom } from './lib/dungeon-balance-harness.mjs';

const profiles = JSON.parse(readFileSync(new URL('./fixtures/dungeon-v2-b-reference-teams.json', import.meta.url), 'utf8'));
const seeds = Array.from({ length: 12 }, (_, index) => 11321 + index * 7919);
const transitionLimitMs = 24 * 3600_000;
const xpTotal = actor => actor.xp + Array.from({ length: actor.level - 1 }, (_, index) =>
  experienceRequiredForNextLevel(index + 1)).reduce((total, required) => total + required, 0);

function run(profile, quality, seed, singleExpedition) {
  Math.random = seededRandom(seed);
  const id = profile.dungeonId;
  const world = makeWorld(profile, id);
  for (let next = id + 1; next <= 5; next++) delete world.releaseProgress.claimed['dungeon_' + next];
  for (const [index, actor] of world.characters.entries()) {
    const weapon = world.weaponInventory[index];
    weapon.slots = weapon.slots.map(slot => ({ ...slot, quality }));
    weapon.stats = calculateWeaponStats(weapon.slots, weapon.weaponForm);
    const stats = calculateCharacterStats(actor.classId, [weapon], characterStatLevelMultiplier(actor.level));
    Object.assign(actor, stats, { hp: stats.maxHp, energy: stats.maxEnergy });
  }

  const gameState = { getState: () => world };
  const dungeon = new GameDungeonService(gameState);
  const sessions = new GameDungeonSessionService(gameState, dungeon);
  const team = world.teams[1];
  const initialXp = world.characters.map(xpTotal);
  let at = 0, events = 0, attempts = 0, encounters = 0, wins = 0, defeats = 0;
  let firstLevelMs = null, firstQualificationMs = null, metalUpgradeMs = null, accessMs = null;

  const start = dungeon.startRun.bind(dungeon);
  const victory = dungeon.grantWaveExperience.bind(dungeon);
  const failure = dungeon.resetCycleAfterFailure.bind(dungeon);
  dungeon.startRun = (...args) => { const started = start(...args); if (started) encounters++; return started; };
  dungeon.grantWaveExperience = (...args) => { wins++; return victory(...args); };
  dungeon.resetCycleAfterFailure = (...args) => { defeats++; return failure(...args); };

  function startExpedition() {
    attempts++;
    const result = sessions.toggleRun(at);
    assert.ok(team.dungeonAuto, result.alertMessage);
  }

  function collectRuneOrMaterialMilestones() {
    sessions.collectLoot();
    if (metalUpgradeMs === null && getMaterialStorageEntries(world.inventory).some(entry =>
      entry.category === 'Metall' && entry.quality > quality && entry.quality < 6 && entry.qty >= 2)) metalUpgradeMs = at;
  }

  sessions.open(at);
  startExpedition();
  const durationMs = sessions.getDurationMs();
  const limit = singleExpedition ? durationMs : transitionLimitMs;
  while (at < limit) {
    const next = Math.min(nextEvent(team), team.dungeonSessionEndsAt, limit);
    assert.ok(Number.isFinite(next) && next >= at);
    at = next;
    sessions.update(at);
    if (firstLevelMs === null && world.characters.some((actor, index) => actor.level > profile.level[index])) firstLevelMs = at;
    if (firstQualificationMs === null && (world.releaseProgress.qualifiedRuns[id] ?? 0) >= 1) firstQualificationMs = at;
    if (!singleExpedition && id < 5 && world.releaseProgress.accessFound[id + 1]) {
      assert.ok(claimMission(world, 'dungeon_' + (id + 1)));
      accessMs = at;
      sessions.toggleRun(at);
    }
    if (!singleExpedition && id < 5 && team.dungeonAuto && team.progress?.qualified && !team.progress.searchEligible) {
      sessions.toggleRun(at);
    }
    if (!team.dungeonAuto) {
      collectRuneOrMaterialMilestones();
      if (singleExpedition || accessMs !== null || at >= limit) break;
      startExpedition();
    }
    if (++events > 1_000_000) throw Error('Expedition exceeded one million scheduled events.');
  }
  if (team.dungeonAuto) sessions.toggleRun(at);
  collectRuneOrMaterialMilestones();
  const loot = getMaterialStorageEntries(world.inventory);
  const qualities = [1, 2, 3, 4, 5, 6].map(quality => loot.filter(entry => entry.quality === quality).reduce((sum, entry) => sum + entry.qty, 0));
  let nickel = 0, marketSeconds = 0;
  for (const { materialId, quality, qty } of loot) {
    const sale = materialSellDataById(materialId, quality);
    nickel += sale.valueNickel * qty;
    marketSeconds += sale.seconds * qty;
  }
  assert.equal(loot.length, new Set(loot.map(entry => entry.storageKey)).size);
  assert.ok(wins <= encounters);
  return { seed, elapsedMs: at, durationMs, attempts, encounters, wins, defeats,
    qualifiedRuns: world.releaseProgress.qualifiedRuns[id] ?? 0,
    totalXp: world.characters.reduce((sum, actor, index) => sum + xpTotal(actor) - initialXp[index], 0),
    endLevels: world.characters.map(actor => actor.level),
    materials: qualities.reduce((sum, qty) => sum + qty, 0), qualities, nickel, marketSeconds,
    runes: world.runeInventory?.length ?? 0, firstLevelMs, firstQualificationMs, metalUpgradeMs, accessMs };
}

const originalRandom = Math.random;
const originalDocument = globalThis.document;
globalThis.document ??= new EventTarget();
try {
  const plans = profiles.map(profile => ({ profile, quality: 1 }));
  const late = profiles.at(-1);
  for (const quality of [1, 3]) plans.push({ profile: { ...late, id: 'entry-5-native-s' + quality, materials: [77, 74, 75] }, quality });
  const rows = plans.map(({ profile, quality }) => {
    const expeditions = seeds.map(seed => run(profile, quality, seed, true));
    const progress = seeds.map(seed => run(profile, quality, seed, false));
    console.log(profile.id, JSON.stringify({ wins: expeditions.map(item => item.wins), access: progress.map(item => item.accessMs) }));
    return { profile, quality, expeditions, progress };
  });
  const output = process.argv[2];
  if (output) writeFileSync(output, JSON.stringify({ seeds, transitionLimitMs, qualifyingWaves: QUALIFIED_RUN_WAVES,
    requiredQualifiedRuns: REQUIRED_QUALIFIED_RUNS, rows }, null, 2) + '\n');
} finally {
  Math.random = originalRandom;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}
