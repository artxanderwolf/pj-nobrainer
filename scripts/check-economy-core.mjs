import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

import { MATERIAL_REFERENCES } from '../src/app/game/game-core.ts';
import { MATERIAL_QUALITIES } from '../src/app/game/material-quality-core.ts';

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
    materialSellDataById,
    rarityFactorFromRarity,
    weaponSellData
  } = await import(`${temporaryUrl.href}?check=${Date.now()}`);

  assert.equal(formatCurrencyNickel(0), '0 Nickel');
  assert.equal(formatCurrencyNickel(100), '100 Nickel');
  assert.equal(formatCurrencyNickel(1_000), '1 Bronze');
  assert.equal(formatCurrencyNickel(1_001_001), '1 Kupfer 1 Bronze 1 Nickel');
  assert.equal(formatCurrencyNickel(1_001_001_001), '1 Silber 1 Kupfer 1 Bronze 1 Nickel');
  assert.equal(formatCurrencyNickel(1_000_000_000_000), '1 Gold');
  assert.equal(formatCurrencyNickel(1_000_000_000_000_000), '1 Platin');
  assert.equal(formatCurrencyNickel(1_000_000_000_000_000_000), '1 Netherit');
  assert.equal(formatHighestCurrency(250), '250 Nickel');
  assert.equal(formatHighestCurrency(2_500), '2,5 Bronze');
  assert.equal(formatHighestCurrency(1_250_000), '1,25 Kupfer');
  assert.equal(formatHighestCurrency(1_250_000_000_000), '1,25 Gold');
  assert.equal(formatDuration(0), '0 Sek.');
  assert.equal(formatDuration(61), '1 Min. 1 Sek.');
  assert.equal(formatDuration(3661), '1 Std. 1 Min. 1 Sek.');
  assert.equal(formatDuration(1.2), '2 Sek.', 'Dauer muss wie bisher auf volle Sekunden aufrunden.');

  assert.equal(calculateRecruitCost(1), 2000, 'Erste zusätzliche Rekrutierung muss weiterhin 2 Bronze kosten.');
  assert.equal(calculateRecruitCost(2), 3500, 'Zweite zusätzliche Rekrutierung muss mit Faktor 1,75 skalieren.');
  assert.equal(calculateRecruitCost(3), 6125, 'Rekrutierungskosten müssen auf Nickel gerundet werden.');

  assert.equal(calculateUpgradeCost('inn', 2), 1000, 'Erster Inn-Ausbau muss 1 Bronze kosten.');
  assert.equal(calculateUpgradeCost('inn', 3), 1250, 'Inn-Ausbau steigt im ersten Intervall um 250 Nickel.');
  assert.equal(calculateUpgradeCost('inn', 6), 2000);
  assert.equal(calculateUpgradeCost('inn', 10), 3000);
  assert.equal(calculateUpgradeCost('inn', 12), 3500);
  assert.equal(calculateUpgradeCost('inn', 20), 6300);
  assert.equal(calculateUpgradeCost('inn', 40), 13300);
  assert.equal(calculateUpgradeCost('inn', 47), 15750);
  assert.equal(calculateUpgradeCost('inn', 48), 0);
  assert.equal(calculateUpgradeCost('forgeQueue', 1), 1000, 'Erster Schmiede-Warteschlangenplatz muss nach dem Mini-Patch 1 Bronze kosten.');

  assert.equal(rarityFactorFromRarity(1), 1, 'Legacy-Verkaufsfaktor bleibt für Kompatibilität erhalten.');
  assert.equal(rarityFactorFromRarity(2), 1.1, 'Legacy-Verkaufsfaktor bleibt für Kompatibilität erhalten.');
  const expectedPrices = [
    [10, 16, 25, 40, 70, 150],
    [15, 24, 38, 60, 105, 225],
    [22, 35, 55, 88, 154, 330],
    [32, 51, 80, 128, 224, 480],
    [46, 74, 115, 184, 322, 690]
  ];
  assert.equal(MATERIAL_REFERENCES.length, 77);
  const priceMatrix = ['materialId,materialTier,S1,S2,S3,S4,S5,S6'];
  for (const { materialId, definition } of MATERIAL_REFERENCES) {
    const tier = definition.rarity;
    const prices = MATERIAL_QUALITIES.map(quality => {
      const sale = materialSellDataById(materialId, quality);
      assert.equal(sale.quality, quality);
      assert.equal(sale.valueNickel, expectedPrices[tier - 1][quality - 1]);
      assert.equal(sale.seconds, 5 * Math.ceil((15 + 1.5 * sale.valueNickel) / 5));
      return sale.valueNickel;
    });
    priceMatrix.push([materialId, tier, ...prices].join(','));
  }
  assert.equal(readFileSync(new URL('../docs/grossupdate-v2-etappe-d-materialpreise-462.csv', import.meta.url), 'utf8').trim().replace(/\r\n/g, '\n'), priceMatrix.join('\n'));
  assert.equal(materialSellData('Aluminium').valueNickel, 24, 'Ohne explizite Qualität gilt die bisherige Materialstufe als Qualität.');
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

  console.log('Economy-Core: neue Material-SPE, 1000er-Währung, halbierte Ausbaupreise sowie daraus abgeleitete Einkommen und Zeiten sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
}
