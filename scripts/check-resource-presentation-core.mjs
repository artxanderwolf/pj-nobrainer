import assert from 'node:assert/strict';
import { getCityCurrencyPresentation, getResourceHeaderPresentation } from '../src/app/game/resource-presentation-core.ts';

const currencyCases = [
  [0, '0 Nickel', 'ui/coin_1nic_32.png', 'Nickel'],
  [999, '999 Nickel', 'ui/coin_1nic_32.png', 'Nickel'],
  [1_000, '1 Bronze', 'ui/coin_2bro_32.png', 'Bronze'],
  [7_930, '7,93 Bronze', 'ui/coin_2bro_32.png', 'Bronze'],
  [999_999, '999,99 Bronze', 'ui/coin_2bro_32.png', 'Bronze'],
  [1_000_000, '1 Silber', 'ui/coin_3sil_32.png', 'Silber'],
  [1_000_000_000, '1 Gold', 'ui/coin_4gol_32.png', 'Gold'],
  [1_000_000_000_000, '1 Netherit', 'ui/coin_5net_32.png', 'Netherit']
];

for (const [value, text, iconSrc, denomination] of currencyCases) {
  assert.deepEqual(getCityCurrencyPresentation(value), { text, iconSrc, denomination });
}

const presentation = getResourceHeaderPresentation(
  7_930,
  {
    Kupfer: { qty: 12 },
    Zinn: { qty: 7 },
    Lederfetzen: { qty: 3 }
  }
);

assert.deepEqual(presentation, {
  goldText: '7,93 Bronze',
  goldIconSrc: 'ui/coin_2bro_32.png',
  goldDenomination: 'Bronze',
  materialCountText: '22'
});

assert.deepEqual(
  getResourceHeaderPresentation(Number.NaN, { Kupfer: { qty: -2 }, Zinn: null }),
  {
    goldText: '0 Nickel',
    goldIconSrc: 'ui/coin_1nic_32.png',
    goldDenomination: 'Nickel',
    materialCountText: '0'
  }
);

console.log('Ressourcen-Presentation-Core: Stadtgeld bleibt Nickel-basiert und wechselt sichtbar bei Faktor 1.000 durch Nickel, Bronze, Silber, Gold und Netherit.');
