import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePath = path.resolve('src/app/game/progression-core.ts');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nobrainer-progression-'));
const tempPath = path.join(tempDir, 'progression-core.node-check.ts');
const source = fs.readFileSync(sourcePath, 'utf8')
  .replace("from './game-core';", "from './game-core.ts';")
  .replace("from './economy-core';", "from './economy-core.ts';");
fs.copyFileSync(path.resolve('src/app/game/game-core.ts'), path.join(tempDir, 'game-core.ts'));
fs.copyFileSync(path.resolve('src/app/game/economy-core.ts'), path.join(tempDir, 'economy-core.ts'));
fs.writeFileSync(tempPath, source);

try {
  const { getRecruitOffer, spendRecruitCost, getUpgradeOffer, buyUpgrade } = await import(`${pathToFileURL(tempPath).href}?t=${Date.now()}`);

  const state = () => ({
    gold: 100000,
    characters: [{ classId: 'recruit' }],
    upgrades: { innCapacity: 2, forgeSlots: 1, forgeQueue: 1, marketSlots: 1, marketQueue: 1 }
  });

  {
    const s = state();
    const offer = getRecruitOffer(s, 'fighter');
    assert.equal(offer.ok, true);
    assert.equal(offer.costNickel, 200);
    assert.equal(offer.number, 1);
    const result = spendRecruitCost(s, 'fighter');
    assert.equal(result.ok, true);
    assert.equal(s.gold, 99800);
  }

  {
    const s = state();
    s.characters.push({ classId: 'fighter' });
    const offer = getRecruitOffer(s, 'fighter');
    assert.equal(offer.ok, false);
    assert.equal(offer.reason, 'inn-full');
    assert.equal(s.gold, 100000);
  }

  {
    const s = state();
    s.gold = 199;
    const offer = getRecruitOffer(s, 'recruit');
    assert.equal(offer.ok, false);
    assert.equal(offer.reason, 'insufficient-funds');
    assert.equal(spendRecruitCost(s, 'recruit').ok, false);
    assert.equal(s.gold, 199);
  }

  {
    const s = state();
    const offer = getUpgradeOffer(s, 'inn');
    assert.equal(offer.ok, true);
    assert.equal(offer.costNickel, 500);
    const result = buyUpgrade(s, 'inn');
    assert.equal(result.ok, true);
    assert.equal(s.upgrades.innCapacity, 3);
    assert.equal(s.gold, 99500);
  }

  {
    const s = state();
    s.upgrades.forgeSlots = 5;
    const result = buyUpgrade(s, 'forgeSlots');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'max');
    assert.equal(s.upgrades.forgeSlots, 5);
    assert.equal(s.gold, 100000);
  }

  {
    const s = state();
    s.gold = 999;
    const result = buyUpgrade(s, 'marketSlots');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'insufficient-funds');
    assert.equal(s.upgrades.marketSlots, 1);
    assert.equal(s.gold, 999);
  }

  console.log('Progression-Core: Rekrutierung, Kapazität, Geldprüfung und Ausbauten sind konsistent.');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
