import assert from 'node:assert/strict';
import { energyCostPerCharacter, updateEnergyState } from '../src/app/game/energy-core.ts';

assert.equal(energyCostPerCharacter(4, 0), 0);
assert.equal(energyCostPerCharacter(4, 1), 4);
assert.equal(energyCostPerCharacter(4, 2), 2);
assert.equal(energyCostPerCharacter(4, 3), 2);
assert.equal(energyCostPerCharacter(4, 4), 1);

const makeState = () => ({
  characters: [{ energy: 50, maxEnergy: 100, classId: 'recruit' }],
  lastEnergyUpdate: 1_000_000,
  dungeonAuto: false,
  dungeonRun: null,
  dungeonLootCollect: null
});
const getClass = () => ({ energyRegenPerMinute: 5 });

const idle = makeState();
const idleResult = updateEnergyState(idle, getClass, 1_120_000);
assert.equal(idle.characters[0].energy, 60, '2 Minuten Leerlauf müssen 10 Energie regenerieren.');
assert.equal(idle.lastEnergyUpdate, 1_120_000);
assert.equal(idleResult.regenerated, true);

const capped = makeState();
capped.characters[0].energy = 99;
updateEnergyState(capped, getClass, 1_120_000);
assert.equal(capped.characters[0].energy, 100, 'Energie darf maxEnergy nicht überschreiten.');

for (const lock of ['dungeonAuto', 'dungeonRun', 'dungeonLootCollect']) {
  const active = makeState();
  if (lock === 'dungeonAuto') active.dungeonAuto = true;
  else active[lock] = {};
  updateEnergyState(active, getClass, 1_120_000);
  assert.equal(active.characters[0].energy, 50, `${lock} muss Regeneration blockieren.`);
  assert.equal(active.lastEnergyUpdate, 1_120_000, 'Zeitstempel muss auch während blockierter Regeneration weiterlaufen.');
}

console.log('Energy-Core: Regeneration, Sperren, Cap und Dungeon-Kosten sind konsistent.');
