import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync(new URL('../src/app/core/game-dungeon.service.ts', import.meta.url), 'utf8');
const core = readFileSync(new URL('../src/app/game/dungeon-core.ts', import.meta.url), 'utf8');

assert.match(core, /export function filterActiveDungeonAttackPoints/);
assert.match(core, /filterActiveDungeonAttackPoints,/);
assert.match(
  service,
  /run\.attackPoints = filterActiveDungeonAttackPoints\([\s\S]*run\.attackPoints,[\s\S]*alivePlayers\.map\(character => character\.id\),[\s\S]*aliveEnemies\.map\(enemy => enemy\.id\)[\s\S]*\);/
);

const aliveCheckIndex = service.indexOf("if (!alivePlayers.length)");
const pruneIndex = service.indexOf('run.attackPoints = filterActiveDungeonAttackPoints');
const dueIndex = service.indexOf('const due = getNextDueAttack');
assert.ok(
  aliveCheckIndex >= 0 && pruneIndex > aliveCheckIndex && dueIndex > pruneIndex,
  'Inaktive Angriffspunkte müssen nach der Wellenprüfung und vor der Auswahl der nächsten Aktion entfernt werden.'
);

console.log('Dungeon-Kampf-Hotfix: Angular-Dungeon-Service filtert inaktive Angriffspunkte vor der nächsten Kampfaktion.');
