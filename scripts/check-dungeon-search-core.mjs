import assert from 'node:assert/strict';
import { healParticipantsAfterSearchMiss, resolveDungeonSearch } from '../src/app/game/dungeon-search-core.ts';

assert.equal(resolveDungeonSearch(0.10, 0), 'encounter');
assert.equal(resolveDungeonSearch(0.10, 0.099999), 'encounter');
assert.equal(resolveDungeonSearch(0.10, 0.10), 'miss');
assert.equal(resolveDungeonSearch(0.10, 0.9), 'miss');
assert.equal(resolveDungeonSearch(-1, 0), 'miss');
assert.equal(resolveDungeonSearch(2, 0.999), 'encounter');

const participants = [
  { hp: 20, maxHp: 30, alive: true },
  { hp: 30, maxHp: 30, alive: true },
  { hp: 0, maxHp: 35, alive: false },
  { hp: 29.5, maxHp: 30, alive: true }
];

assert.equal(healParticipantsAfterSearchMiss(participants, 1), 1.5);
assert.deepEqual(participants.map(character => character.hp), [21, 30, 0, 30]);

const noHeal = [{ hp: 10, maxHp: 30, alive: true }];
assert.equal(healParticipantsAfterSearchMiss(noHeal, 0), 0);
assert.equal(noHeal[0].hp, 10);

console.log('Dungeon-Suche: Begegnungswurf und +1-HP-Regeneration bei Fehlsuche sind konsistent.');
