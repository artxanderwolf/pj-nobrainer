import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const sourceUrl = new URL('../src/app/game/forge-core.ts', import.meta.url);
const temporaryUrl = new URL('../src/app/game/forge-core.node-check.ts', import.meta.url);
const economySourceUrl = new URL('../src/app/game/economy-core.ts', import.meta.url);
const temporaryEconomyUrl = new URL('../src/app/game/economy-core.forge-check.ts', import.meta.url);

const economySource = readFileSync(economySourceUrl, 'utf8')
  .replace("from './armor-core';", "from './armor-core.ts';")
  .replace("from './game-core';", "from './game-core.ts';");
writeFileSync(temporaryEconomyUrl, economySource, 'utf8');

const source = readFileSync(sourceUrl, 'utf8')
  .replace("from './economy-core';", "from './economy-core.forge-check.ts';")
  .replace("from './game-core';", "from './game-core.ts';");
writeFileSync(temporaryUrl, source, 'utf8');

const assertClose = (actual, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
};

try {
  const {
    forgeRequirements,
    getForgeSelectionQuantities,
    hasForgeMaterials,
    reserveForgeMaterials,
    calculateWeaponBalanceSnapshot,
    refreshForgeJobBalance,
    createForgeJob,
    enqueueForgeJob,
    advanceForgeJobs,
    normalizeWeaponCraftCounts,
    getWeaponCraftCount,
    recordCompletedWeaponCraft,
    getWeaponUnlockState,
    isWeaponFormUnlocked,
    getVisibleWeaponForms,
    isWeaponProgressionSource
  } = await import(`${temporaryUrl.href}?check=${Date.now()}`);

  const daggerSlots = [
    { slot: 'workingPart', material: 'Zinn' },
    { slot: 'back', material: 'Zinn' },
    { slot: 'gripCore', material: 'Fichte' },
    { slot: 'gripWrap', material: 'Lederfetzen' },
    { slot: 'special', material: 'Fichte' }
  ];
  const daggerIdSlots = [
    { slot: 'workingPart', materialId: 4 },
    { slot: 'back', materialId: 4 },
    { slot: 'gripCore', materialId: 2 },
    { slot: 'gripWrap', materialId: 9 },
    { slot: 'special', materialId: 2 }
  ];
  const swordSlots = [...daggerSlots, { slot: 'parry', material: 'Fichte' }];
  const bowSlots = [
    { slot: 'back', material: 'Fichte' },
    { slot: 'gripCore', material: 'Fichte' },
    { slot: 'gripWrap', material: 'Lederfetzen' },
    { slot: 'special', material: 'Fichte' },
    { slot: 'bowstring', material: 'Lederfetzen' }
  ];

  assert.deepEqual(getForgeSelectionQuantities('dagger'), { workingPart: 1, back: 1, gripCore: 1, gripWrap: 1, special: 1 });
  assert.deepEqual(getForgeSelectionQuantities('sword'), { workingPart: 2, back: 2, gripCore: 1, gripWrap: 1, special: 1, parry: 1 });
  assert.deepEqual(getForgeSelectionQuantities('axe1h'), { workingPart: 1, back: 1, gripCore: 3, gripWrap: 2, special: 1 });
  assert.deepEqual(getForgeSelectionQuantities('sword2h'), { workingPart: 4, back: 4, gripCore: 2, gripWrap: 1, special: 1, parry: 2 });
  assert.deepEqual(getForgeSelectionQuantities('axe2h'), { workingPart: 2, back: 2, gripCore: 6, gripWrap: 3, special: 1 });
  assert.deepEqual(getForgeSelectionQuantities('bow'), { back: 1, gripCore: 5, gripWrap: 6, special: 1, bowstring: 3 });
  assert.deepEqual(getForgeSelectionQuantities('staff'), { back: 1, gripCore: 5, gripWrap: 2, special: 1 });
  assert.deepEqual(forgeRequirements(daggerSlots, 'dagger'), { 2: 2, 4: 2, 9: 1 }, 'Dolch muss genau fünf Materialeinheiten per ID benötigen.');
  assert.deepEqual(forgeRequirements(daggerIdSlots, 'dagger'), { 2: 2, 4: 2, 9: 1 }, 'ID-Auswahl muss denselben Dolchbedarf liefern.');
  assert.deepEqual(forgeRequirements(swordSlots, 'sword'), { 2: 3, 4: 4, 9: 1 }, '1H Schwert muss genau acht Materialeinheiten per ID benötigen.');
  assert.deepEqual(forgeRequirements(bowSlots, 'bow'), { 2: 7, 9: 9 }, 'Bogen muss 16 Einheiten inklusive drei Sehnen-Einheiten benötigen.');

  const inventory = { Zinn: { category: 'Metall', qty: 4 }, Fichte: { category: 'Holz', qty: 3 }, Lederfetzen: { category: 'Leder', qty: 1 } };
  const swordRequirements = forgeRequirements(swordSlots, 'sword');
  assert.equal(hasForgeMaterials(inventory, swordRequirements), true);
  assert.equal(reserveForgeMaterials(inventory, swordRequirements), true);
  assert.equal(inventory.Zinn, undefined);
  assert.equal(inventory.Fichte, undefined);
  assert.equal(inventory.Lederfetzen, undefined);

  const snapshot = calculateWeaponBalanceSnapshot('sword', swordSlots);
  assert.equal(snapshot.valueNickel, 65);
  assert.equal(snapshot.forgeSeconds, 80);
  assertClose(snapshot.performance, 3.759525);
  assertClose(snapshot.stats.penetration, 0.05);
  assert.ok(snapshot.slots.every(slot => Number.isInteger(slot.materialId)), 'Gespeicherte Schmiedeslots müssen stabile Material-IDs besitzen.');

  const job = createForgeJob('sword', '', swordSlots);
  assert.equal(job.weaponName, '1H Schwert');
  assert.equal(job.totalSeconds, 80, 'Schmiedezeit muss aus dem aktuellen Waffenwert berechnet werden.');
  assert.equal(job.valueNickel, 65, 'Fichte-DS muss den Leistungswert des 1H-Testschwerts berücksichtigen.');
  assertClose(job.performance, 3.759525);
  assert.deepEqual(job.slots.map(slot => slot.slot), ['workingPart', 'back', 'gripCore', 'gripWrap', 'special', 'parry']);
  assert.equal(job.slots.some(slot => slot.slot === 'baseMaterial'), false);
  assert.ok(job.slots.every(slot => Number.isInteger(slot.materialId)), 'Schmiedeauftrag persistiert Material-IDs.');

  const idJob = createForgeJob('dagger', '', daggerIdSlots);
  assert.deepEqual(idJob.slots.map(slot => slot.material), ['Zinn', 'Zinn', 'Fichte', 'Lederfetzen', 'Fichte']);
  assert.deepEqual(idJob.slots.map(slot => slot.materialId), [4, 4, 2, 9, 2]);

  const staleJob = weaponName => ({
    ...job,
    weaponName,
    stats: {
      ...job.stats,
      characterModifiers: { ...job.stats.characterModifiers, penetration: 0 },
      penetration: 0,
      reinforcementPenetrationAdd: 0
    },
    valueNickel: 60,
    performance: 3.63825,
    totalSeconds: 75
  });
  const activeStale = { ...staleJob('Aktiv'), startedAt: 1000, finishesAt: 76000 };
  assert.equal(refreshForgeJobBalance(activeStale, true), true);
  assert.equal(activeStale.valueNickel, 65);
  assertClose(activeStale.performance, 3.759525);
  assertClose(activeStale.stats.penetration, 0.05);
  assert.equal(activeStale.totalSeconds, 75, 'Laufende Aufträge behalten ihre bereits gestartete Dauer.');
  assert.equal(activeStale.finishesAt, 76000, 'Laufende Aufträge dürfen durch den Balance-Patch nicht zeitlich verschoben werden.');

  const queuedStale = staleJob('Wartend');
  assert.equal(refreshForgeJobBalance(queuedStale, false), true);
  assert.equal(queuedStale.valueNickel, 65);
  assertClose(queuedStale.performance, 3.759525);
  assertClose(queuedStale.stats.penetration, 0.05);
  assert.equal(queuedStale.totalSeconds, 80, 'Noch nicht gestartete Aufträge übernehmen die neue Schmiedezeit.');

  const bowJob = createForgeJob('bow', '', bowSlots);
  assert.equal(bowJob.weaponName, 'Bogen');
  assert.equal(bowJob.totalSeconds, 80);
  assert.equal(bowJob.valueNickel, 70);
  assertClose(bowJob.performance, 4.66393356);
  assert.deepEqual(bowJob.slots.map(slot => slot.slot), ['back', 'gripCore', 'gripWrap', 'special', 'bowstring']);

  const state = { forgeJobs: [], forgeQueue: [] };
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'A' }, 1, 2, 1000), 'started');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'B' }, 1, 2, 1000), 'queued');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'C' }, 1, 2, 1000), 'queued');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'D' }, 1, 2, 1000), 'full');
  assert.equal(state.forgeJobs[0].finishesAt, 81000);

  const completed = [];
  const count = advanceForgeJobs(state, 1, 250000, (finished, at) => completed.push([finished.weaponName, at]));
  assert.equal(count, 3);
  assert.deepEqual(completed, [['A', 81000], ['B', 161000], ['C', 241000]]);
  assert.equal(state.forgeJobs.length, 0);
  assert.equal(state.forgeQueue.length, 0);

  const craftCounts = normalizeWeaponCraftCounts({ dagger: 9.8, sword: -4, unknown: 99 });
  assert.deepEqual(craftCounts, { dagger: 9 });
  assert.equal(getWeaponCraftCount(craftCounts, 'dagger'), 9);
  assert.deepEqual(getVisibleWeaponForms(craftCounts), ['dagger']);
  assert.equal(getWeaponUnlockState('sword', craftCounts).visible, false);
  assert.equal(isWeaponFormUnlocked('sword', craftCounts), false);
  assert.equal(isWeaponProgressionSource('bow'), false);
  assert.equal(isWeaponProgressionSource('sword2h'), true);

  recordCompletedWeaponCraft(craftCounts, 'dagger');
  assert.equal(getWeaponCraftCount(craftCounts, 'dagger'), 10);
  assert.deepEqual(getVisibleWeaponForms(craftCounts), ['dagger', 'sword', 'axe1h', 'sword2h', 'axe2h']);
  assert.equal(isWeaponFormUnlocked('sword'), false, 'Unlock-Prüfung ohne Zähler soll gesperrt bleiben.');
  assert.equal(isWeaponFormUnlocked('sword', craftCounts), true);
  assert.equal(isWeaponFormUnlocked('axe1h', craftCounts), true);
  assert.equal(isWeaponFormUnlocked('sword2h', craftCounts), false);
  assert.deepEqual(getWeaponUnlockState('sword2h', craftCounts).prerequisites, [{ weaponForm: 'sword', current: 0, target: 10 }]);
  assert.equal(getWeaponUnlockState('bow', craftCounts).visible, false);

  craftCounts.sword = 10;
  assert.equal(isWeaponFormUnlocked('sword2h', craftCounts), true);
  assert.equal(isWeaponFormUnlocked('axe2h', craftCounts), false);
  assert.equal(getWeaponUnlockState('bow', craftCounts).visible, false);

  craftCounts.axe1h = 10;
  assert.equal(isWeaponFormUnlocked('axe2h', craftCounts), true);
  assert.equal(getWeaponUnlockState('bow', craftCounts).visible, true);
  assert.equal(getWeaponUnlockState('staff', craftCounts).visible, true);
  assert.equal(isWeaponFormUnlocked('bow', craftCounts), false);
  assert.equal(isWeaponFormUnlocked('staff', craftCounts), false);

  craftCounts.sword2h = 10;
  craftCounts.axe2h = 9;
  assert.equal(isWeaponFormUnlocked('bow', craftCounts), false);
  recordCompletedWeaponCraft(craftCounts, 'axe2h');
  assert.equal(isWeaponFormUnlocked('bow', craftCounts), true);
  assert.equal(isWeaponFormUnlocked('staff', craftCounts), true);
  assert.deepEqual(getVisibleWeaponForms(craftCounts), ['dagger', 'sword', 'axe1h', 'sword2h', 'axe2h', 'bow', 'staff']);

  console.log('Forge-Core: Baupläne, ID-basierte Materialreservierung, Balance, Queue-Timer und Waffen-Freischaltung sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
  unlinkSync(temporaryEconomyUrl);
}
