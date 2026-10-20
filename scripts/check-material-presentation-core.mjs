import assert from 'node:assert/strict';
import {
  formatMaterialValue,
  getMaterialIndexRowPresentation,
  getMaterialStorageRowPresentation,
  sortMaterialStorageEntries
} from '../src/app/game/material-presentation-core.ts';
import {
  addMaterialQuantityById,
  getMaterialQuantityById,
  getMaterialStorageEntryById,
  getMaterialStorageEntries,
  normalizeMaterialInventory,
  reserveMaterialQuantitiesById,
  takeMaterialQuantityById
} from '../src/app/game/material-storage-core.ts';

assert.equal(formatMaterialValue(null), '–');
assert.equal(formatMaterialValue(undefined), '–');
assert.equal(formatMaterialValue(1), '1');
assert.equal(formatMaterialValue(1.234), '1,23');
assert.equal(formatMaterialValue(0.2, 'percent'), '20 %');
assert.equal(formatMaterialValue(0.05, 'factor'), '0,05');

const zeroStats = {
  hp: 0,
  energy: 0,
  armor: 0,
  dodge: 0,
  strengthFactor: 0,
  precision: 0,
  threat: 0,
  critChance: 0,
  critDamage: 0,
  hpRegenPerMinute: 0,
  energyRegenPerMinute: 0,
  experienceFactor: 0,
  lifeSteal: 0,
  penetration: 0
};

const row = getMaterialIndexRowPresentation(
  'Kupfer',
  {
    category: 'Metall',
    rarity: 1,
    stats: { ...zeroStats, hp: 8, armor: 2, strengthFactor: 0.05 },
    specialEffect: { stat: 'DS', amount: 0.10 }
  },
  '+10 Prozentpunkte DS',
  11
);

assert.deepEqual(row, {
  category: 'Metall',
  name: 'Kupfer',
  rarityText: 'S1',
  hpText: '8',
  energyText: '0',
  armorText: '2 %',
  dodgeText: '0 %',
  strengthFactorText: '0,05',
  precisionText: '0',
  threatText: '0',
  critChanceText: '0 %',
  critDamageText: '0 %',
  hpRegenText: '0',
  energyRegenText: '0',
  experienceText: '0 %',
  lifeStealText: '0 %',
  penetrationText: '0 %',
  specialStatText: 'DS',
  specialPercentText: '10 %',
  dungeonChanceText: '11 %'
});

const unavailable = getMaterialIndexRowPresentation(
  'Testmaterial',
  {
    category: 'Holz',
    rarity: 3,
    stats: zeroStats,
    specialEffect: null
  },
  'Kein Spezialeffekt',
  null
);
assert.equal(unavailable.dungeonChanceText, '– %');
assert.equal(unavailable.rarityText, 'S3');
assert.equal(unavailable.specialStatText, '–');
assert.equal(unavailable.specialPercentText, '–');
assert.equal(unavailable.armorText, '0 %');

const sortedStorage = sortMaterialStorageEntries([
  ['Zinn', { category: 'Metall', qty: 2 }],
  ['Fichte', { category: 'Holz', qty: 4 }],
  ['Kupfer', { category: 'Metall', qty: 3 }]
]);
assert.deepEqual(sortedStorage.map(([name]) => name), ['Fichte', 'Kupfer', 'Zinn']);

const storageRow = getMaterialStorageRowPresentation(
  'Kupfer',
  { materialId: 5, category: 'Metall', qty: 3 },
  10,
  value => `${value} Nickel`
);
assert.deepEqual(storageRow, {
  name: 'Kupfer',
  category: 'Metall',
  quantityText: '3',
  valueText: '10 Nickel',
  tooltip: 'Verkaufswert: 10 Nickel'
});

const legacyInventory = {
  Kupfer: { category: 'Falsch', qty: 3 },
  LegacyFichte: { materialId: 2, category: 'Alt', qty: 4 },
  Unbekannt: { category: 'Sonstiges', qty: 7 }
};
assert.equal(normalizeMaterialInventory(legacyInventory), 2, 'Bekannte Legacy-Einträge müssen genau einmal auf stabile IDs normalisiert werden.');
assert.deepEqual(legacyInventory.Kupfer, { materialId: 5, category: 'Metall', qty: 3 });
assert.deepEqual(legacyInventory.LegacyFichte, { materialId: 2, category: 'Holz', qty: 4 });
assert.deepEqual(legacyInventory.Unbekannt, { category: 'Sonstiges', qty: 7 }, 'Unbekannte Legacy-Einträge dürfen nicht stillschweigend gelöscht werden.');
assert.equal(normalizeMaterialInventory(legacyInventory), 0, 'Bereits normalisierte Lagerdaten dürfen nicht bei jedem Start erneut verändert werden.');

const copperById = getMaterialStorageEntryById(legacyInventory, 5);
assert.equal(copperById?.displayName, 'Kupfer');
assert.equal(copperById?.storageKey, 'Kupfer');
assert.equal(copperById?.qty, 3);
const fichteById = getMaterialStorageEntryById(legacyInventory, 2);
assert.equal(fichteById?.displayName, 'Fichte', 'Die Anzeige muss aus der Material-ID stammen und nicht aus einem alten Lager-Schlüssel.');
assert.equal(fichteById?.storageKey, 'LegacyFichte');

const zinn = addMaterialQuantityById(legacyInventory, 4, 2);
assert.equal(zinn?.displayName, 'Zinn');
assert.deepEqual(legacyInventory.Zinn, { materialId: 4, category: 'Metall', qty: 2 });
addMaterialQuantityById(legacyInventory, 5, 2);
assert.equal(legacyInventory.Kupfer.qty, 5, 'ID-basierte Zugänge müssen vorhandene Bestände erhöhen statt Duplikate anzulegen.');
assert.equal(getMaterialQuantityById(legacyInventory, 5), 5);
assert.equal(takeMaterialQuantityById(legacyInventory, 5, 2), true);
assert.equal(getMaterialQuantityById(legacyInventory, 5), 3);

const beforeFailedReservation = JSON.stringify(legacyInventory);
assert.equal(reserveMaterialQuantitiesById(legacyInventory, { 2: 99, 4: 1 }), false, 'Fehlende Menge muss die gesamte Reservierung blockieren.');
assert.equal(JSON.stringify(legacyInventory), beforeFailedReservation, 'Fehlgeschlagene ID-Reservierung darf keinen Teilbestand verbrauchen.');
assert.equal(reserveMaterialQuantitiesById(legacyInventory, { 2: 2, 4: 1 }), true);
assert.equal(getMaterialQuantityById(legacyInventory, 2), 2);
assert.equal(getMaterialQuantityById(legacyInventory, 4), 1);

const resolvedKnown = getMaterialStorageEntries(legacyInventory);
assert.deepEqual(
  resolvedKnown.map(entry => entry.materialId).sort((a, b) => a - b),
  [2, 4, 5],
  'Die kanonische Lageransicht darf unbekannte Legacy-Einträge nicht als bekannte Materialien ausgeben.'
);

assert.throws(
  () => normalizeMaterialInventory({ Kupfer: { materialId: 4, category: 'Metall', qty: 1 } }),
  /Widersprüchliche Materialreferenz/,
  'Ein Konflikt zwischen bekanntem Namen und Material-ID muss sichtbar fehlschlagen statt stillschweigend Daten umzudeuten.'
);

console.log('Material-Presentation/Core: Statmatrix, Darstellung, ID-Reservierung und rückwärtskompatible Normalisierung des Materiallagers sind konsistent.');
