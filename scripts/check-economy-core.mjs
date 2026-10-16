import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const sourceUrl = new URL('../src/app/game/economy-core.ts', import.meta.url);
const temporaryUrl = new URL('../src/app/game/economy-core.node-check.ts', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8').replace("from './game-core';", "from './game-core.ts';");
writeFileSync(temporaryUrl, source, 'utf8');

try {
  const {
    calculateRecruitCost,
    calculateUpgradeCost,
    formatCurrencyNickel,
    formatDuration,
    formatHighestCurrency,
    materialSellData,
    rarityFactorFromRarity,
    weaponSellData
  } = await import(`${temporaryUrl.href}?check=${Date.now()}`);

  assert.equal(formatCurrencyNickel(0), '0 Nickel');
  assert.equal(formatCurrencyNickel(100), '1 Bronze');
  assert.equal(formatCurrencyNickel(1_010_101), '1 Gold 1 Silber 1 Bronze 1 Nickel');
  assert.equal(formatHighestCurrency(250), '2,5 Bronze');
  assert.equal(formatHighestCurrency(1_250_000), '1,25 Gold');
  assert.equal(formatDuration(0), '0 Sek.');
  assert.equal(formatDuration(61), '1 Min. 1 Sek.');
  assert.equal(formatDuration(3661), '1 Std. 1 Min. 1 Sek.');
  assert.equal(formatDuration(1.2), '2 Sek.', 'Dauer muss wie bisher auf volle Sekunden aufrunden.');

  assert.equal(calculateRecruitCost(1), 200, 'Erste zusätzliche Rekrutierung muss 2 Bronze kosten.');
  assert.equal(calculateRecruitCost(2), 350, 'Zweite zusätzliche Rekrutierung muss mit Faktor 1,75 skalieren.');
  assert.equal(calculateRecruitCost(3), 613, 'Rekrutierungskosten müssen auf Nickel gerundet werden.');

  assert.equal(calculateUpgradeCost('inn', 2), 500, 'Erster Inn-Ausbau muss 5 Bronze kosten.');
  assert.equal(calculateUpgradeCost('inn', 3), 1000, 'Inn-Ausbau muss sich pro Kauf verdoppeln.');
  assert.equal(calculateUpgradeCost('forgeQueue', 1), 200, 'Erster Schmiede-Warteschlangenplatz muss 2 Bronze kosten.');

  assert.equal(rarityFactorFromRarity(1), 1);
  assert.equal(rarityFactorFromRarity(2), 1.1);
  assert.deepEqual(materialSellData('Zinn'), {
    type: 'material',
    name: 'Zinn',
    rarity: 1,
    factor: 1,
    valueNickel: 10,
    seconds: 30
  });
  assert.deepEqual(materialSellData('Aluminium'), {
    type: 'material',
    name: 'Aluminium',
    rarity: 2,
    factor: 1.1,
    valueNickel: 11,
    seconds: 33
  });
  assert.equal(materialSellData('Unbekannt'), null);

  assert.deepEqual(
    weaponSellData({
      id: 42,
      name: 'Testwaffe',
      valueNickel: 200,
      slots: [
        { slot: 'workingPart', material: 'Aluminium' },
        { slot: 'back', material: 'Aluminium' },
        { slot: 'gripCore', material: 'Tanne' },
        { slot: 'gripWrap', material: 'Fuchs-Leder' },
        { slot: 'special', material: 'Aluminium' }
      ]
    }),
    {
      type: 'weapon',
      weaponId: 42,
      name: 'Testwaffe',
      factor: 2,
      valueNickel: 200,
      seconds: 60
    }
  );

  console.log('Economy-Core: Währung, Zeitformatierung, Rekrutierung, Ausbauten und Verkaufsdaten sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
}
