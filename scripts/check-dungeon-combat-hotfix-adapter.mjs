import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const adapter = readFileSync(new URL('../src/app/core/legacy-dungeon-domain-adapter.service.ts', import.meta.url), 'utf8');
const core = readFileSync(new URL('../src/app/game/dungeon-core.ts', import.meta.url), 'utf8');

assert.match(core, /export function filterActiveDungeonAttackPoints/);
assert.match(core, /filterActiveDungeonAttackPoints,/);
assert.match(
  adapter,
  /run\.attackPoints=window\.NoBrainerDungeonCore\.filterActiveDungeonAttackPoints\(run\.attackPoints,alivePlayers\.map\(c=>c\.id\),aliveEnemies\.map\(e=>e\.id\)\);/
);

const aliveCheckIndex = adapter.indexOf('if(!alivePlayers.length)');
const pruneIndex = adapter.indexOf('run.attackPoints=window.NoBrainerDungeonCore.filterActiveDungeonAttackPoints');
const dueIndex = adapter.indexOf('const due=window.NoBrainerDungeonCore.getNextDueAttack');
assert.ok(aliveCheckIndex >= 0 && pruneIndex > aliveCheckIndex && dueIndex > pruneIndex, 'Inaktive Angriffspunkte müssen nach der Wellenprüfung und vor der Auswahl der nächsten Aktion entfernt werden.');

console.log('Dungeon-Kampf-Hotfix: Runtime filtert inaktive Angriffspunkte vor der nächsten Kampfaktion.');
