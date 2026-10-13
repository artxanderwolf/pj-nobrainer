import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const sourceUrl = new URL('../src/app/game/dungeon-core.ts', import.meta.url);
const temporaryUrl = new URL('../src/app/game/dungeon-core.node-check.ts', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8')
  .replace("from './game-core';", "from './game-core.ts';")
  .replace("from './combat-core';", "from './combat-core.ts';")
  .replace("from './dungeon-search-core';", "from './dungeon-search-core.ts';");
writeFileSync(temporaryUrl, source, 'utf8');

try {
  const {
    checkDungeonStart,
    createDungeonAttackPoints,
    createDungeonEnemy,
    filterActiveDungeonAttackPoints,
    getDungeonPhase,
    getNextDueAttack,
    payDungeonEnergy,
    resetDungeonCycle,
    resolveSearchStep,
    rollEnemyClass,
    rollEnemyCount,
    rescheduleDungeonAttack
  } = await import(`${temporaryUrl.href}?check=${Date.now()}`);

  const character = { id: 1, name: 'Test', hp: 20, maxHp: 30, alive: true, energy: 100 };
  const check = checkDungeonStart([character]);
  assert.equal(check.ok, true);
  assert.equal(check.share, 4);
  payDungeonEnergy(check.participants, check.share);
  assert.equal(character.energy, 96);

  character.energy = 3.9;
  assert.equal(checkDungeonStart([character]).ok, false);
  character.energy = 100;
  character.hp = 10;
  assert.equal(resolveSearchStep([character], 0.5), 'miss');
  assert.equal(character.hp, 11);
  assert.equal(resolveSearchStep([character], 0.05), 'encounter');

  assert.equal(rollEnemyCount(1, 0), 1);
  assert.equal(rollEnemyCount(1, 0.71), 2);
  assert.equal(rollEnemyCount(4, 0.99), 4);
  assert.equal(rollEnemyClass(0), 'recruit');
  assert.equal(rollEnemyClass(0.56), 'fighter');

  const enemy = createDungeonEnemy(1, 'recruit');
  assert.equal(enemy.name, 'G Rekrut 1');
  assert.equal(enemy.maxHp, 60);
  assert.equal(enemy.hitChance, 0.5);

  const points = createDungeonAttackPoints([character], [enemy], 1000, () => [{ kind: 'fist', speed: 1 }]);
  assert.equal(points.length, 2);
  assert.equal(points[0].nextAt, 2000);
  assert.equal(points[1].nextAt, 2250);
  assert.equal(getNextDueAttack(points, 2100), points[0]);
  rescheduleDungeonAttack(points[0], 1, points);
  assert.equal(points[1].nextAt < points[0].nextAt, true, 'Gegner muss nach Spieleraktion als nächster Angriff erhalten bleiben');
  assert.equal(points[1].nextAt, 3000);
  assert.equal(points[0].nextAt, 3750);

  const staleTimeline = [
    { side: 'enemy', ownerId: 'e1', kind: 'enemy', nextAt: 1000 },
    { side: 'enemy', ownerId: 'e2', kind: 'enemy', nextAt: 1100 },
    { side: 'player', ownerId: 1, kind: 'fist', nextAt: 1200 },
    { side: 'player', ownerId: 2, kind: 'fist', nextAt: 1300 }
  ];
  const activeTimeline = filterActiveDungeonAttackPoints(staleTimeline, [1], ['e2']);
  assert.deepEqual(activeTimeline.map(point => `${point.side}:${point.ownerId}`), ['enemy:e2', 'player:1']);
  assert.equal(getNextDueAttack(activeTimeline, 1150)?.ownerId, 'e2', 'Ein lebender Gegner darf nicht von einem bereits besiegten Gegner blockiert werden');

  assert.equal(getDungeonPhase({ dungeonAuto: false }), 'idle');
  assert.equal(getDungeonPhase({ dungeonAuto: true }), 'search');
  assert.equal(getDungeonPhase({ dungeonAuto: true, dungeonRun: {} }), 'combat');
  assert.equal(getDungeonPhase({ dungeonAuto: true, dungeonRun: {}, dungeonLootCollect: {} }), 'loot');

  character.hp = 0; character.alive = false;
  resetDungeonCycle([character]);
  assert.equal(character.hp, 30);
  assert.equal(character.alive, true);

  console.log('Dungeon-Core: Suche, Energie, Gegner, Timeline, aktive Kampfteilnehmer, Phasen und Niederlagen-Reset sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
}
