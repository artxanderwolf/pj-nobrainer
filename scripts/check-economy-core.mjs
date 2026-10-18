import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const sourceUrl = new URL('../src/app/game/economy-core.ts', import.meta.url);
const temporaryUrl = new URL('../src/app/game/economy-core.node-check.ts', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8')
  .replace("from './armor-core';", "from './armor-core.ts';")
  .replace("from './game-core';", "from './game-core.ts';");
writeFileSync(temporaryUrl, source, 'utf8');

try {
  const {
    calculateRecruitCost,
    calculateUpgradeCost,
    calculateWeaponEconomy,
    calculateWeaponForgeSeconds,
    calculateWeaponPerformance,
    calculateWeaponSaleSeconds,
    calculateWeaponValueNickel,
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

  assert.equal(rarityFactorFromRarity(1), 1, 'Legacy-Verkaufsfaktor bleibt für Kompatibilität erhalten.');
  assert.equal(rarityFactorFromRarity(2), 1.1, 'Legacy-Verkaufsfaktor bleibt für Kompatibilität erhalten.');
  assert.deepEqual(materialSellData('Zinn'), {
    type: 'material',
    name: 'Zinn',
    rarity: 1,
    factor: 1,
    valueNickel: 10,
    seconds: 30
  });
  assert.deepEqual(materialSellData('Kupfer'), {
    type: 'material',
    name: 'Kupfer',
    rarity: 1,
    factor: 1.1,
    valueNickel: 11,
    seconds: 35
  }, 'Positiver SPE muss den Rohmaterialwert um 10 % erhöhen und die Verkaufszeit mitziehen.');
  assert.deepEqual(materialSellData('Aluminium'), {
    type: 'material',
    name: 'Aluminium',
    rarity: 2,
    factor: 2.2,
    valueNickel: 22,
    seconds: 50
  });
  assert.equal(materialSellData('Unbekannt'), null);

  const qualityStats = { expectedRaw: 10, penetration: 0.25 };
  assert.equal(calculateWeaponPerformance(qualityStats), 7, '0/40/80-%-Prüfrüstung muss mit aktuellem Prozent-Rüstungssystem ausgewertet werden.');
  assert.equal(calculateWeaponValueNickel(qualityStats), 80, 'Waffenwert muss aus Leistungswert auf 5 Nickel gerundet werden.');
  assert.equal(calculateWeaponForgeSeconds(80), 90, 'Herstellungszeit muss wertbasiert auf 5 Sekunden aufrunden.');
  assert.equal(calculateWeaponSaleSeconds(80), 55, 'Waffen-Verkaufszeit muss wertbasiert auf 5 Sekunden aufrunden.');
  assert.deepEqual(calculateWeaponEconomy(qualityStats), {
    performance: 7,
    benchmarkDamage: [10, 7, 4],
    valueNickel: 80,
    forgeSeconds: 90,
    saleSeconds: 55
  });

  assert.deepEqual(
    weaponSellData({
      id: 42,
      name: 'Testwaffe',
      valueNickel: 200,
      stats: qualityStats,
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
      valueNickel: 80,
      seconds: 55
    }
  );

  console.log('Economy-Core: Materialwerte, positive SPE, Qualitätswert sowie wertbasierte Herstellungs- und Verkaufszeiten sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
}
