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
    refreshCharacterAttackPoints,
    resetDungeonCycle,
    resolveSearchStep,
    rollEnemyClass,
    rollEnemyCount,
    rescheduleDungeonAttack
  } = await import(`${temporaryUrl.href}?check=${Date.now()}`);

  const character = { id: 1, name: 'Test', hp: 20, maxHp: 30, alive: true, energy: 100 };
  const check = checkDungeonStart([character]);
  assert.equal(check.ok, true);
  assert.equal(check.share, 0, 'Dungeon 1 darf keine Energie pro Charakter berechnen.');
  assert.equal(check.totalCost, 0, 'Dungeon 1 darf keine Gesamtenergiekosten berechnen.');
  payDungeonEnergy(check.participants, check.share);
  assert.equal(character.energy, 100, 'Dungeon 1 darf Charakterenergie nicht verändern.');

  character.energy = 0;
  assert.equal(checkDungeonStart([character]).ok, true, 'Energie darf den Dungeonstart nicht blockieren.');
  character.energy = 100;
  character.hp = 10;
  assert.equal(resolveSearchStep([character], 0.5), 'miss');
  assert.equal(character.hp, 11);
  assert.equal(resolveSearchStep([character], 0.049999), 'encounter');
  assert.equal(resolveSearchStep([character], 0.05), 'miss', 'Die Begegnungschance beträgt genau 5 % pro Suchschritt.');

  assert.equal(rollEnemyCount(1, 0), 1);
  assert.equal(rollEnemyCount(1, 0.71), 2);
  assert.equal(rollEnemyCount(4, 0.99), 4);
  assert.equal(rollEnemyClass(0), 'recruit');
  assert.equal(rollEnemyClass(0.56), 'fighter');

  const enemy = createDungeonEnemy(1, 'recruit');
  assert.equal(enemy.name, 'Neuling 1');
  assert.equal(enemy.maxHp, 60);
  assert.equal(enemy.hitChance, 0.5);
  assert.deepEqual(enemy.lootMaterialIds, [9, 5, 3]);
  assert.equal(enemy.xpDrop, 10);

  const points = createDungeonAttackPoints([character], [enemy], 1000, () => [{ kind: 'fist', speed: 1 }]);
  assert.equal(points.length, 2);
  assert.equal(points[0].nextAt, 2000);
  assert.equal(points[1].nextAt, 2250);
  assert.equal(getNextDueAttack(points, 2100), points[0]);
  rescheduleDungeonAttack(points[0], 1, points);
  assert.equal(points[1].nextAt < points[0].nextAt, true, 'Gegner muss nach Spieleraktion als nächster Angriff erhalten bleiben');
  assert.equal(points[1].nextAt, 3000);
  assert.equal(points[0].nextAt, 3750);

  const twoHandedPoints = createDungeonAttackPoints([character], [], 1000, () => [
    { kind: 'weapon', weaponId: 77, speed: 0.8, label: '2H Schwert' },
    { kind: 'weapon', weaponId: 77, speed: 0.8, label: '2H Schwert' }
  ]);
  assert.equal(twoHandedPoints.length, 1, 'Dieselbe 2H-Waffe darf trotz Belegung beider Handplätze nur einen Angriffspunkt erzeugen.');
  assert.equal(twoHandedPoints[0].weaponId, 77);

  const equipmentTimeline = [
    { side: 'enemy', ownerId: 'e1', kind: 'enemy', nextAt: 1050 },
    { side: 'player', ownerId: 1, kind: 'fist', weaponId: null, label: 'Faust', nextAt: 1200 }
  ];
  const switchedToStaff = refreshCharacterAttackPoints(
    equipmentTimeline,
    1,
    [
      { kind: 'weapon', weaponId: 77, speed: 1, label: 'Linke Hand' },
      { kind: 'weapon', weaponId: 77, speed: 1, label: 'Rechte Hand' }
    ],
    1100
  );
  assert.equal(switchedToStaff.filter(point => point.side === 'player').length, 1, 'Eine 2H-Waffe darf nach dem Wechsel nur einen Angriffspunkt besitzen.');
  assert.equal(switchedToStaff.find(point => point.side === 'player')?.weaponId, 77, 'Ein vorhandener Faust-Angriffspunkt muss sofort durch die ausgerüstete Waffe ersetzt werden.');
  assert.equal(switchedToStaff.find(point => point.side === 'player')?.nextAt, 1200, 'Ein Waffenwechsel darf den bereits laufenden Angriffstimer nicht zurücksetzen.');

  const switchedStaffAgain = refreshCharacterAttackPoints(
    switchedToStaff,
    1,
    [
      { kind: 'weapon', weaponId: 78, speed: 0.9, label: 'Linke Hand' },
      { kind: 'weapon', weaponId: 78, speed: 0.9, label: 'Rechte Hand' }
    ],
    1150
  );
  assert.equal(switchedStaffAgain.find(point => point.side === 'player')?.weaponId, 78, '2H-gegen-2H muss auch in einer laufenden Welle auf die neue Waffe wechseln.');
  assert.equal(switchedStaffAgain.find(point => point.side === 'player')?.nextAt, 1200, '2H-gegen-2H muss den laufenden Angriffstimer erhalten.');

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

  console.log('Dungeon-Core: Suche, energiefreier Start, Gegnerprofile, 2H-Angriffspunkte, Waffenwechsel-Timeline, Phasen und Niederlagen-Reset sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
}
