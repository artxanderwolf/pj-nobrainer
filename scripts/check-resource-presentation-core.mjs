import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
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

// S03: Ein bestehendes Nickel-PNG war trotz korrektem Dateipfad beschädigt.
// Alle fünf Währungsicons auf vollständige PNG-Chunks, CRC und Bilddaten prüfen.
function pngCrc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

for (const iconSrc of new Set(currencyCases.map(([, , path]) => path))) {
  const data = readFileSync(new URL('../public/' + iconSrc, import.meta.url));
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a',
    iconSrc + ': PNG-Signatur fehlt.');
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let ended = false;
  const compressed = [];
  while (pos + 12 <= data.length) {
    const size = data.readUInt32BE(pos);
    const end = pos + 12 + size;
    assert.ok(end <= data.length, iconSrc + ': PNG-Chunk unvollständig.');
    const type = data.toString('ascii', pos + 4, pos + 8);
    const chunkDataEnd = pos + 8 + size;
    assert.equal(data.readUInt32BE(chunkDataEnd), pngCrc32(data.subarray(pos + 4, chunkDataEnd)),
      iconSrc + ': PNG-Chunk-CRC ist beschädigt (' + type + ').');
    if (type === 'IHDR') {
      width = data.readUInt32BE(pos + 8);
      height = data.readUInt32BE(pos + 12);
      colorType = data[pos + 17];
    }
    if (type === 'IDAT') compressed.push(data.subarray(pos + 8, chunkDataEnd));
    pos = end;
    if (type === 'IEND') { ended = true; break; }
  }
  assert.equal(ended, true, iconSrc + ': PNG-Abschluss fehlt.');
  assert.equal(width, 32, iconSrc + ': Breite ist nicht 32.');
  assert.equal(height, 32, iconSrc + ': Höhe ist nicht 32.');
  assert.equal(colorType, 6, iconSrc + ': PNG muss RGBA verwenden.');
  assert.equal(inflateSync(Buffer.concat(compressed)).length, 32 * (1 + 32 * 4),
    iconSrc + ': Deflate-/Adler- oder RGBA-Pixeldaten ungültig.');
}

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
