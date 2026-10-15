import assert from 'node:assert/strict';
import { getResourceHeaderPresentation } from '../src/app/game/resource-presentation-core.ts';

let formattedGold = null;
const presentation = getResourceHeaderPresentation(
  1150,
  {
    Kupfer: { qty: 12 },
    Zinn: { qty: 7 },
    Lederfetzen: { qty: 3 }
  },
  value => {
    formattedGold = value;
    return '11,5 Bronze';
  }
);

assert.equal(formattedGold, 1150);
assert.deepEqual(presentation, {
  goldText: '11,5 Bronze',
  materialCountText: '22'
});

assert.deepEqual(
  getResourceHeaderPresentation(Number.NaN, { Kupfer: { qty: -2 }, Zinn: null }, value => `${value} Nickel`),
  {
    goldText: '0 Nickel',
    materialCountText: '0'
  }
);

console.log('Ressourcen-Presentation-Core: Geldformatierung und Materialsumme sind konsistent.');
