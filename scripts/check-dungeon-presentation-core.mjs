import assert from 'node:assert/strict';
import {
  getDungeonLootPresentation,
  getDungeonStatusPresentation
} from '../src/app/game/dungeon-presentation-core.ts';

const active = getDungeonStatusPresentation({
  auto: true,
  selectedCharacterCount: 2,
  lootTotal: 3,
  lootCollect: null,
  run: {
    participantIds: [1, 2],
    energyShare: 4,
    enemies: [
      { name: 'G Goblin 1', hp: 7.25, maxHp: 10, alive: true },
      { name: 'G Goblin 2', hp: 0, maxHp: 10, alive: false }
    ]
  }
});
assert.equal(active.autoButtonText, 'Automatik anhalten');
assert.equal(active.autoButtonDisabled, false);
assert.equal(active.collectButtonText, 'Einsammeln (3)');
assert.equal(active.collectButtonDisabled, false);
assert.deepEqual(active.card, {
  mode: 'active',
  className: '',
  title: 'Welle aktiv',
  aliveText: '1 / 2 Gegner leben',
  metaText: '2 Charaktere · 4 EN je Charakter · Automatik aktiv',
  enemies: [
    { name: 'G Goblin 1', hpText: '7.3 / 10 HP' },
    { name: 'G Goblin 2', hpText: '0.0 / 10 HP' }
  ]
});

const pausedWave = getDungeonStatusPresentation({
  auto: false,
  selectedCharacterCount: 1,
  lootTotal: 0,
  lootCollect: null,
  run: {
    participantIds: [1],
    energyShare: 5,
    enemies: [{ name: 'G Wolf 1', hp: 4, maxHp: 8, alive: true }]
  }
});
assert.equal(pausedWave.card.mode, 'active');
assert.equal(pausedWave.card.metaText, '1 Charakter · 5 EN je Charakter · Automatik angehalten – diese Welle wird noch beendet');

const collecting = getDungeonStatusPresentation({
  auto: false,
  selectedCharacterCount: 1,
  lootTotal: 0,
  run: null,
  lootCollect: { enemyCount: 1 }
});
assert.deepEqual(collecting.card, {
  mode: 'collecting',
  className: 'empty',
  title: 'Beute wird eingesammelt …',
  detailText: '1 Materialwurf'
});

const searching = getDungeonStatusPresentation({
  auto: true,
  selectedCharacterCount: 2,
  lootTotal: 0,
  run: null,
  lootCollect: null
});
assert.deepEqual(searching.card, {
  mode: 'searching',
  className: 'empty',
  title: 'Dungeon wird durchsucht …',
  detailText: '10 % Begegnungschance pro Sekunde · Energie erst bei Kampfbeginn'
});

const paused = getDungeonStatusPresentation({
  auto: false,
  selectedCharacterCount: 1,
  lootTotal: 0,
  run: null,
  lootCollect: null
});
assert.equal(paused.card.mode, 'idle');
assert.equal(paused.card.text, 'Automatik angehalten.');
assert.equal(paused.autoButtonDisabled, false);

const unassigned = getDungeonStatusPresentation({
  auto: false,
  selectedCharacterCount: 0,
  lootTotal: 0,
  run: null,
  lootCollect: null
});
assert.equal(unassigned.card.mode, 'idle');
assert.equal(unassigned.card.text, 'Kein Charakter zugewiesen.');
assert.equal(unassigned.autoButtonDisabled, true);
assert.equal(unassigned.collectButtonText, 'Einsammeln');
assert.equal(unassigned.collectButtonDisabled, true);

assert.deepEqual(
  getDungeonLootPresentation([
    { name: 'Zinn', qty: 2 },
    { name: 'Aluminium', qty: 1 },
    { name: 'Kupfer', qty: 0 }
  ]),
  {
    empty: false,
    entries: [
      { name: 'Aluminium', quantityText: '×1' },
      { name: 'Zinn', quantityText: '×2' }
    ]
  }
);
assert.deepEqual(getDungeonLootPresentation([{ name: 'Kupfer', qty: 0 }]), { empty: true, entries: [] });

console.log('Dungeon-Presentation-Core: Statusphasen, Buttons, Gegnerwerte und ID-aufgelöste Beuteanzeige sind konsistent.');
