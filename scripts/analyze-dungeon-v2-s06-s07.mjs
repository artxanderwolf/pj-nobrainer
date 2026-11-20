import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { GameDungeonService, GameDungeonSessionService, makeWorld, nextEvent, freshWave, seededRandom } from './lib/dungeon-balance-harness.mjs';
import { GENERATED_DUNGEONS } from '../src/app/game/data/generated/game-data.generated.ts';
import { QUALIFIED_RUN_WAVES, REQUIRED_QUALIFIED_RUNS } from '../src/app/game/dungeon-progress-rules.ts';
import { claimMission } from '../src/app/game/mission-core.ts';
import { materialSellDataById } from '../src/app/game/economy-core.ts';

const references = JSON.parse(readFileSync(new URL('./fixtures/dungeon-v2-b-reference-teams.json', import.meta.url), 'utf8'));
const trials = Number(process.env.BALANCE_SAMPLES ?? 2000);
const seeds = [128021, 256019, 512009]; // Final validation; distinct from all exploratory scans.
const sessionSeeds = Array.from({ length: 20 }, (_, i) => (i + 1) * 7919);
if (!Number.isSafeInteger(trials) || trials < 1) throw Error('Invalid BALANCE_SAMPLES');

function fullRun(profile, dungeonId) {
  const world = makeWorld(profile, dungeonId);
  const gameState = { getState: () => world };
  const dungeon = new GameDungeonService(gameState), sessions = new GameDungeonSessionService(gameState, dungeon);
  const team = world.teams[1];
  let defeats = 0, encounters = 0, baseXp = 0, first50 = null;
  const start = dungeon.startRun.bind(dungeon), failure = dungeon.resetCycleAfterFailure.bind(dungeon), grant = dungeon.grantWaveExperience.bind(dungeon);
  dungeon.startRun = (...args) => { const ok = start(...args); if (ok) encounters++; return ok; };
  dungeon.resetCycleAfterFailure = (...args) => { defeats++; return failure(...args); };
  dungeon.grantWaveExperience = (state, run, outcome) => { baseXp += run.enemies.reduce((s, e) => s + e.xpDrop, 0); return grant(state, run, outcome); };
  sessions.open(0); sessions.toggleRun(0);
  let events = 0;
  while (team.dungeonAuto) {
    const at = Math.min(nextEvent(team), team.dungeonSessionEndsAt);
    sessions.update(at);
    if (team.dungeonWavesDefeated >= QUALIFIED_RUN_WAVES && first50 === null) first50 = at / 1000;
    if (++events > 1_000_000) throw Error('Run event limit');
  }
  const loot = Object.entries(team.dungeonLoot);
  return { encounters, wins: team.dungeonWavesDefeated, defeats, baseXp, firstQualifyingSeconds: first50,
    creditedRuns: world.releaseProgress.qualifiedRuns[dungeonId] ?? 0,
    materials: loot.reduce((sum, [, entry]) => sum + entry.qty, 0),
    materialSaleValueNickel: loot.reduce((sum, [id, entry]) => sum + entry.qty * materialSellDataById(+id).valueNickel, 0),
    endLevels: world.characters.map(c => c.level) };
}

function transition(profile, dungeonId) {
  const world = makeWorld(profile, dungeonId);
  for (let id = dungeonId + 1; id <= 5; id++) delete world.releaseProgress.claimed[`dungeon_${id}`];
  const gameState = { getState: () => world }, dungeon = new GameDungeonService(gameState);
  const sessions = new GameDungeonSessionService(gameState, dungeon), team = world.teams[1];
  let at = 0, events = 0, restarts = 0;
  sessions.open(at); sessions.toggleRun(at);
  while (at < 50 * 3600_000) {
    at = Math.min(nextEvent(team), team.dungeonSessionEndsAt);
    sessions.update(at);
    if (world.releaseProgress.accessFound[dungeonId + 1]) {
      const claimed = claimMission(world, `dungeon_${dungeonId + 1}`);
      if (!claimed) throw Error('Measured access could not be claimed');
      return { seconds: at / 1000, waves: team.dungeonWavesDefeated, restarts, claimed, endLevels: world.characters.map(c => c.level) };
    }
    // Explicit best-case player strategy: restart at first qualification until five
    // runs are credited; then keep searching in the next newly started run.
    if (team.progress?.qualified && !team.progress.searchEligible) {
      sessions.toggleRun(at);
    }
    if (!team.dungeonAuto) {
      sessions.collectLoot();
      restarts++;
      const started = sessions.toggleRun(at);
      if (!team.dungeonAuto) throw Error('Measured restart rejected: ' + started.alertMessage);
    }
    if (++events > 2_000_000) throw Error('Transition event limit');
  }
  return { seconds: null, waves: team.dungeonWavesDefeated, restarts, claimed: false };
}

const originalRandom = Math.random;
const originalDocument = globalThis.document;
// Real loot collection dispatches a UI notification; retain actual loot ownership
// and rune grants while providing the standard EventTarget in this Node harness.
globalThis.document ??= new EventTarget();
const output = { trials, seeds, sessionSeeds, rules: { qualifyingWaves: QUALIFIED_RUN_WAVES, requiredRuns: REQUIRED_QUALIFIED_RUNS },
  definitions: structuredClone(GENERATED_DUNGEONS), references: [], stress: [] };
try {
  for (const profile of references) {
    const waves = [];
    for (const seed of seeds) {
      Math.random = seededRandom(seed);
      let wins = 0, ms = 0;
      for (let n = 0; n < trials; n++) { const r = freshWave(profile, profile.dungeonId); wins += +r.won; ms += r.ms; }
      waves.push({ seed, wins, trials, winRate: wins / trials, meanSeconds: ms / trials / 1000 });
    }
    const runs = [], transitions = [];
    for (const seed of sessionSeeds) {
      Math.random = seededRandom(seed);
      runs.push({ seed, ...fullRun(profile, profile.dungeonId) });
      if (profile.dungeonId < 5) {
        Math.random = seededRandom(seed);
        transitions.push({ seed, ...transition(profile, profile.dungeonId) });
      }
    }
    const row = { profile, snapshot: makeWorld(profile, profile.dungeonId), waves, runs, transitions };
    output.references.push(row);
    console.log(profile.id, JSON.stringify({ waves, runWins: runs.map(r => r.wins), transitionHours: transitions.map(r => r.seconds === null ? null : r.seconds / 3600) }));
  }
  for (const profile of [
    { id: 'solo-start', level: 1, classes: ['recruit'], forms: ['starter'], materials: [5, 1, 9] },
    { id: 'duo-budget', level: 5, classes: ['recruit', 'fighter'], forms: ['dagger', 'axe1h'], materials: [5, 1, 9] },
    { id: 'endgame', level: 20, classes: ['recruit','fighter','archer','scholar'], forms: ['sword','axe2h','bow','staff'], materials: [68,62,71] }
  ]) for (let id = 1; id <= 5; id++) {
    Math.random = seededRandom(191919 + id); let wins = 0;
    for (let n = 0; n < 1000; n++) wins += +freshWave(profile, id).won;
    output.stress.push({ profile: profile.id, dungeonId: id, trials: 1000, wins });
  }
} finally {
  Math.random = originalRandom;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}
mkdirSync('.generated', { recursive: true });
writeFileSync('.generated/dungeon-v2-s06-s07-measurements.json', JSON.stringify(output, null, 2) + '\n');
