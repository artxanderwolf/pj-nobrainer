import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDungeonEnemy } from '../src/app/game/dungeon-core.ts';
import { GENERATED_DUNGEONS } from '../src/app/game/data/generated/game-data.generated.ts';
import { createTeam, migrateTeams } from '../src/app/game/team-core.ts';
import { initializeReleaseProgress, startProgressSession, recordSuccessfulWave, claimMission } from '../src/app/game/mission-core.ts';
import { encodeSave, decodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';
import { INDEX_PAGE_MARKUP } from '../src/app/game/index-page-markup.ts';
import { readAllTables } from './data/read-tabular-data.mjs';
import { validateGameData } from './data/validate-game-data.mjs';

assert.equal(SAVE_VERSION, 28);
const xp = { recruit: 10, fighter: 14, archer: 14, scholar: 16 };
for (let id = 1; id <= 5; id++) {
  for (const classId of Object.keys(xp)) {
    const enemy = createDungeonEnemy(1, classId, id);
    assert.equal(enemy.xpDrop, xp[classId] * [1,2,4,8,16][id - 1]);
    if (id === 1) {
      assert.equal(enemy.maxHp, {recruit:120,fighter:140,archer:104,scholar:88}[classId]);
      assert.equal(enemy.damage, 6); assert.equal(enemy.speed, .8); assert.equal(enemy.hitChance, .5);
      assert.equal(enemy.armor, {recruit:2,fighter:3,archer:1,scholar:0}[classId]);
      assert.equal(enemy.dodge, {recruit:.1,fighter:.08,archer:.15,scholar:.05}[classId]);
    }
  }
  const boss = createDungeonEnemy(1, 'recruit', id, true), normal = createDungeonEnemy(1, 'recruit', id);
  assert.equal(boss.maxHp, normal.maxHp * 10); assert.equal(boss.damage, normal.damage * 2);
  assert.equal(boss.speed, .8); assert.equal(boss.xpDrop, 40 * [1,2,4,8,16][id-1]);
}
const original = structuredClone(GENERATED_DUNGEONS[2]);
try {
  // Changing combat power cannot silently change XP; extreme data still obey caps.
  Object.assign(GENERATED_DUNGEONS[2].enemyMultipliers, {damage:99, armor:1000, dodge:1000, hitChance:1000});
  for (const classId of Object.keys(xp)) {
    const enemy = createDungeonEnemy(1, classId, 2);
    assert.equal(enemy.xpDrop, xp[classId] * 2);
    assert.ok(enemy.armor <= 12); assert.ok(enemy.dodge <= .3);
    assert.ok(enemy.hitChance * enemy.precision <= .8 + 1e-12);
  }
} finally { Object.assign(GENERATED_DUNGEONS[2], original); }

for (let id = 1; id <= 4; id++) {
  const state = { teams: {1: createTeam(1, id)} }, p = initializeReleaseProgress(state);
  for (let did = 2; did <= id; did++) p.claimed[`dungeon_${did}`] = true;
  p.qualifiedRuns[id] = 4;
  startProgressSession(state, 1);
  const noRoll = () => { throw Error('Access RNG used outside eligible new run'); };
  for (let wave = 0; wave < 49; wave++) recordSuccessfulWave(state, 1, noRoll);
  assert.equal(p.qualifiedRuns[id], 4);
  recordSuccessfulWave(state, 1, noRoll); assert.equal(p.qualifiedRuns[id], 5);
  for (let wave = 0; wave < 100; wave++) recordSuccessfulWave(state, 1, noRoll);
  assert.equal(p.qualifiedRuns[id], 5, 'One run must never qualify twice');
  const restored = decodeSave(encodeSave(state)).state;
  migrateTeams(restored);
  recordSuccessfulWave(restored, 1, noRoll);
  assert.equal(restored.releaseProgress.qualifiedRuns[id], 5);
  startProgressSession(restored, 1);
  for (let wave = 0; wave < 49; wave++) recordSuccessfulWave(restored, 1, noRoll);
  recordSuccessfulWave(restored, 1, () => .05);
  assert.equal(restored.releaseProgress.accessFound[id + 1], undefined);
  recordSuccessfulWave(restored, 1, () => .049999);
  assert.equal(restored.releaseProgress.accessFound[id + 1], true);
  const savedFind = decodeSave(encodeSave(restored)).state;
  recordSuccessfulWave(savedFind, 1, noRoll);
  assert.equal(claimMission(savedFind, `dungeon_${id+1}`), true);
  assert.equal(claimMission(savedFind, `dungeon_${id+1}`), false);
}

// Released Save 27: modern teams skipped the old parallel-dungeon migration.
const old = {teams:{1:createTeam(1,2)},characters:[],inventory:{'5':{materialId:5,qty:9,category:'Metall'}}};
const p = initializeReleaseProgress(old);
p.qualifiedRuns[2] = 4; p.accessFound[4] = true; p.claimed.dungeon_2 = true;
Object.assign(old.teams[1], { dungeonAuto:true, dungeonSessionEndsAt:999999,
  progress:{dungeonId:2,waves:80,qualified:false,searchEligible:false},
  dungeonRun:{dungeonId:2,startedAt:100,participantIds:[],attackPoints:[],energyShare:0,totalEnergyCost:0,
    enemies:[{...createDungeonEnemy(1,'recruit',2),maxHp:240,hp:175,damage:12,speed:1.6,xpDrop:20}]} });
const restored = decodeSave(encodeSave(old)).state;
const enemySnapshot = structuredClone(restored.teams[1].dungeonRun);
assert.equal(migrateTeams(restored), true);
assert.equal(restored.releaseProgress.qualifiedRuns[2], 5);
assert.equal(restored.teams[1].progress.searchEligible, false, 'Existing search eligibility is retained until restart');
assert.deepEqual(restored.teams[1].dungeonRun, enemySnapshot, 'An old active combat snapshot is never rebalanced');
assert.equal(restored.inventory['5'].qty,9); assert.equal(restored.releaseProgress.accessFound[4],true);
assert.equal(restored.releaseProgress.claimed.dungeon_2,true);
assert.equal(migrateTeams(restored),false);
const again = decodeSave(encodeSave(restored)).state;
assert.equal(migrateTeams(again),false); assert.equal(again.releaseProgress.qualifiedRuns[2],5);
again.releaseProgress.qualifiedRuns[2] = 20;
migrateTeams(again); assert.equal(again.releaseProgress.qualifiedRuns[2],20,'Old counters must not be clamped to five');

const tables = await readAllTables();
for (const [field,value] of [['enemy_xp_multiplier',0],['enemy_max_armor',81],['enemy_max_dodge',1],['enemy_max_hit_chance',2],['enemy_mult_speed',0]]) {
  const bad = structuredClone(tables); bad.dungeons.rows[1][field] = value;
  assert.throws(() => validateGameData(bad));
}
const missing = structuredClone(tables);
missing.game_settings.rows = missing.game_settings.rows.filter(row => row.key !== 'dungeon.accessChance');
assert.throws(() => validateGameData(missing));
assert.match(INDEX_PAGE_MARKUP,/ab 50 erfolgreichen Wellen/);
assert.match(INDEX_PAGE_MARKUP,/Nach 5 qualifizierten Läufen/);
assert.match(INDEX_PAGE_MARKUP,/kein Wurf vor Welle 50/);
assert.match(INDEX_PAGE_MARKUP,/Gegner-XP skalieren unabhängig/);
const refs = JSON.parse(readFileSync(new URL('./fixtures/dungeon-v2-b-reference-teams.json',import.meta.url),'utf8'));
for (const ref of refs) assert.equal(ref.forms.length,4);
console.log('Etappe B: unverändertes D1, eigenständige XP, Defensivcaps, alle Zugänge 5/50/50/5%, Save-27-Altfortschritt und Kampfsnapshots geprüft.');
