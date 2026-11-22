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
    ];
  const daggerIdSlots = [
    { slot: 'workingPart', materialId: 4 },
    { slot: 'back', materialId: 4 },
    { slot: 'gripCore', materialId: 2 },
    { slot: 'gripWrap', materialId: 9 },
    ];
  const swordSlots = [...daggerSlots, { slot: 'parry', material: 'Fichte' }];
  const bowSlots = [
    { slot: 'back', material: 'Fichte' },
    { slot: 'gripCore', material: 'Fichte' },
    { slot: 'gripWrap', material: 'Lederfetzen' },
      { slot: 'bowstring', material: 'Lederfetzen' }
  ];

  assert.deepEqual(getForgeSelectionQuantities('dagger'), { workingPart: 1, back: 1, gripCore: 1, gripWrap: 1 });
  assert.deepEqual(getForgeSelectionQuantities('sword'), { workingPart: 2, back: 2, gripCore: 1, gripWrap: 1, parry: 1 });
  assert.deepEqual(getForgeSelectionQuantities('axe1h'), { workingPart: 1, back: 1, gripCore: 3, gripWrap: 2 });
  assert.deepEqual(getForgeSelectionQuantities('sword2h'), { workingPart: 4, back: 4, gripCore: 2, gripWrap: 1, parry: 2 });
  assert.deepEqual(getForgeSelectionQuantities('axe2h'), { workingPart: 2, back: 2, gripCore: 6, gripWrap: 3 });
  assert.deepEqual(getForgeSelectionQuantities('bow'), { back: 1, gripCore: 5, gripWrap: 6, bowstring: 3 });
  assert.deepEqual(getForgeSelectionQuantities('staff'), { back: 1, gripCore: 5, gripWrap: 2 });
  assert.deepEqual(forgeRequirements(daggerSlots, 'dagger'), { '2:1': 1, '4:1': 2, '9:1': 1 }, 'Dolch muss genau vier Materialeinheiten per ID benötigen.');
  assert.deepEqual(forgeRequirements(daggerIdSlots, 'dagger'), { '2:1': 1, '4:1': 2, '9:1': 1 }, 'ID-Auswahl muss denselben Dolchbedarf liefern.');
  assert.deepEqual(forgeRequirements(swordSlots, 'sword'), { '2:1': 2, '4:1': 4, '9:1': 1 }, '1H Schwert muss genau sieben Materialeinheiten per ID benötigen.');
  assert.deepEqual(forgeRequirements(bowSlots, 'bow'), { '2:1': 6, '9:1': 9 }, 'Bogen muss 15 Einheiten inklusive drei Sehnen-Einheiten benötigen.');

  const inventory = { Zinn: { category: 'Metall', qty: 4 }, Fichte: { category: 'Holz', qty: 3 }, Lederfetzen: { category: 'Leder', qty: 1 } };
  const swordRequirements = forgeRequirements(swordSlots, 'sword');
  assert.equal(hasForgeMaterials(inventory, swordRequirements), true);
  assert.equal(reserveForgeMaterials(inventory, swordRequirements), true);
  assert.equal(inventory.Zinn, undefined);
  assert.equal(inventory['2:1']?.qty, 1, 'Restbestand muss nach ID-Migration erhalten bleiben.');
  assert.equal(inventory.Lederfetzen, undefined);

  const snapshot = calculateWeaponBalanceSnapshot('sword', swordSlots);
  assert.equal(snapshot.valueNickel, 150);
  assert.equal(snapshot.forgeSeconds, 75);
  assertClose(snapshot.performance, 3.63825);
  assertClose(snapshot.stats.penetration, 0);
  assert.ok(snapshot.slots.every(slot => Number.isInteger(slot.materialId)), 'Gespeicherte Schmiedeslots müssen stabile Material-IDs besitzen.');
  assert.ok(snapshot.slots.every(slot => !Object.prototype.hasOwnProperty.call(slot, 'material')), 'Gespeicherte Schmiedeslots dürfen keine Materialnamen enthalten.');

  const job = createForgeJob('sword', '', swordSlots);
  assert.equal(job.weaponName, '1H Schwert');
  assert.equal(job.totalSeconds, 75, 'Schmiedezeit folgt der S1-Leistungsreferenz.');
  assert.equal(job.valueNickel, 150, '70 Nickel Material, 55 Verarbeitung und 25 S1-Leistungsanteil.');
  assertClose(job.performance, 3.63825);
  assert.deepEqual(job.slots.map(slot => slot.slot), ['workingPart', 'back', 'gripCore', 'gripWrap', 'parry']);
  assert.equal(job.slots.some(slot => slot.slot === 'baseMaterial'), false);
  assert.ok(job.slots.every(slot => Number.isInteger(slot.materialId)), 'Schmiedeauftrag persistiert Material-IDs.');
  assert.ok(job.slots.every(slot => !Object.prototype.hasOwnProperty.call(slot, 'material')), 'Schmiedeauftrag persistiert keine Materialnamen.');

  const { calculateCraftedWeaponEconomy, weaponSellData } = await import('../src/app/game/economy-core.ts');
  const axe = createForgeJob('axe1h', '', daggerIdSlots);
  const axeQuote = calculateCraftedWeaponEconomy('axe1h', axe.slots);
  assert.equal(axeQuote.materialValueNickel, 70, 'Seven S1 units cost 70 Nickel.');
  const mixed = createForgeJob('axe1h', '', axe.slots.map(slot => slot.slot === 'gripCore' ? { ...slot, quality: 4 } : slot));
  const mixedQuote = calculateCraftedWeaponEconomy('axe1h', mixed.slots);
  assert.equal(mixedQuote.materialValueNickel, 160, 'All three grip units use the S4 price.');
  assert.equal(mixed.valueNickel - axe.valueNickel, 135, 'Only the material component changes with quality.');
  assert.equal(mixed.totalSeconds, axe.totalSeconds, 'S4 does not increase forge time a second time.');
  assert.equal(weaponSellData({ ...mixed, id: 1, name: 'Axt', stats: { expectedRaw: 99, penetration: 1 } }).valueNickel, mixed.valueNickel, 'Market and forge agree independently of rune-modified stats.');
  assert.equal(weaponSellData({ ...mixed, id: 2, name: 'Altwaffe', valueNickel: 123, preservedMaterialBaseStats: mixed.stats }).valueNickel, 123);
  assert.equal(calculateCraftedWeaponEconomy('axe1h', mixed.slots.slice(0, -1)), null);

  const idJob = createForgeJob('dagger', '', daggerIdSlots);
  assert.deepEqual(idJob.slots.map(slot => slot.materialId), [4, 4, 2, 9]);
  assert.ok(idJob.slots.every(slot => !Object.prototype.hasOwnProperty.call(slot, 'material')));

  const staleJob = weaponName => ({
    ...job,
    weaponName,
    stats: {
      ...job.stats,
      characterModifiers: { ...job.stats.characterModifiers, penetration: 0 },
      penetration: 0.5,
      reinforcementPenetrationAdd: 0.5
    },
    valueNickel: 99,
    performance: 9,
    totalSeconds: 75
  });
  const activeStale = { ...staleJob('Aktiv'), startedAt: 1000, finishesAt: 76000 };
  assert.equal(refreshForgeJobBalance(activeStale), true);
  assert.equal(activeStale.valueNickel, 99);
  assertClose(activeStale.performance, 3.63825);
  assertClose(activeStale.stats.penetration, 0);
  assert.equal(activeStale.totalSeconds, 75, 'Laufende Aufträge behalten ihre bereits gestartete Dauer.');
  assert.equal(activeStale.finishesAt, 76000, 'Laufende Aufträge dürfen durch den Balance-Patch nicht zeitlich verschoben werden.');

  const queuedStale = staleJob('Wartend');
  assert.equal(refreshForgeJobBalance(queuedStale), true);
  assert.equal(queuedStale.valueNickel, 99);
  assertClose(queuedStale.performance, 3.63825);
  assertClose(queuedStale.stats.penetration, 0);
  assert.equal(queuedStale.totalSeconds, 75, 'Bereits reservierte Aufträge behalten ihre zugesagte Dauer.');

  const bowJob = createForgeJob('bow', '', bowSlots);
  assert.equal(bowJob.weaponName, 'Bogen');
  assert.equal(bowJob.totalSeconds, 90, 'S16: Bogen-Mindestdauer beträgt 90 s.');
  assert.ok(bowJob.valueNickel>0);
  assert.ok(bowJob.performance>0);
  assert.deepEqual(bowJob.slots.map(slot => slot.slot), ['back', 'gripCore', 'gripWrap', 'bowstring']);

  const state = { forgeJobs: [], forgeQueue: [] };
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'A' }, 1, 2, 1000), 'started');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'B' }, 1, 2, 1000), 'queued');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'C' }, 1, 2, 1000), 'queued');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'D' }, 1, 2, 1000), 'full');
  assert.equal(state.forgeJobs[0].finishesAt, 76000);

  const completed = [];
  const count = advanceForgeJobs(state, 1, 250000, (finished, at) => completed.push([finished.weaponName, at]));
  assert.equal(count, 3);
  assert.deepEqual(completed, [['A', 76000], ['B', 151000], ['C', 226000]]);
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

  console.log('Forge-Core: Baupläne, ID-basierte Materialreservierung, ID-only Persistenz, Balance, Queue-Timer und Waffen-Freischaltung sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
  unlinkSync(temporaryEconomyUrl);
}
