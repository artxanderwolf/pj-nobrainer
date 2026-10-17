import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nobrainer-character-'));
const tempPath = path.join(tempDir, 'character-core.node-check.ts');
const progressionPath = path.join(tempDir, 'character-progression-core.ts');
const source = fs.readFileSync(path.resolve('src/app/game/character-core.ts'), 'utf8')
  .replace("from './game-core';", "from './game-core.ts';");
fs.copyFileSync(path.resolve('src/app/game/game-core.ts'), path.join(tempDir, 'game-core.ts'));
fs.copyFileSync(path.resolve('src/app/game/character-progression-core.ts'), progressionPath);
fs.writeFileSync(tempPath, source);

try {
  const { createCharacter, createRecruit } = await import(`${pathToFileURL(tempPath).href}?t=${Date.now()}`);
  const {
    CHARACTER_LEVEL_MAX,
    characterStatLevelMultiplier,
    experienceRequiredForNextLevel,
    getCharacterProgression,
    grantCharacterExperience
  } = await import(`${pathToFileURL(progressionPath).href}?t=${Date.now()}`);

  const recruit = createRecruit(1, 'Rekrut 01', true);
  assert.deepEqual(recruit, {
    id: 1, name: 'Rekrut 01', classId: 'recruit', level: 1, xp: 0, maxHp: 30, hp: 30,
    maxEnergy: 100, energy: 100, dodge: 0.10, armor: 2,
    strengthFactor: 1.00, precision: 1.00, alive: true,
    equipment: { leftHand: null, rightHand: 0 }
  });

  assert.equal(CHARACTER_LEVEL_MAX, 20);
  assert.equal(characterStatLevelMultiplier(1), 1);
  assert.ok(Math.abs(characterStatLevelMultiplier(2) - 1.1) < 1e-12);
  assert.ok(Math.abs(characterStatLevelMultiplier(3) - 1.21) < 1e-12);
  assert.equal(experienceRequiredForNextLevel(1), 100);
  assert.equal(experienceRequiredForNextLevel(2), 110);
  assert.equal(experienceRequiredForNextLevel(3), 121);
  assert.deepEqual(getCharacterProgression({}), {
    level: 1, xp: 0, xpToNext: 100, maxLevel: 20, atMaxLevel: false, progress: 0
  });
  const progressionCharacter = { level: 1, xp: 0 };
  const gained = grantCharacterExperience(progressionCharacter, 200, 1);
  assert.equal(gained.level, 2);
  assert.equal(gained.xp, 100);
  assert.equal(gained.levelsGained, 1);
  assert.deepEqual(progressionCharacter, { level: 2, xp: 100 });
  const boosted = grantCharacterExperience(progressionCharacter, 10, 1.5);
  assert.equal(boosted.gainedXp, 15, 'ERF-Faktor muss bei einer späteren XP-Vergabe als Multiplikator anwendbar sein.');
  assert.equal(boosted.level, 3);
  assert.equal(boosted.xp, 5);

  const fighter = createCharacter(2, 'Kämpfer 01', 'fighter', false);
  assert.equal(fighter.classId, 'fighter');
  assert.equal(fighter.level, 1);
  assert.equal(fighter.xp, 0);
  assert.equal(fighter.maxHp, 35);
  assert.equal(fighter.hp, 35);
  assert.equal(fighter.armor, 3);
  assert.equal(fighter.dodge, 0.08);
  assert.equal(fighter.strengthFactor, 1.10);
  assert.equal(fighter.precision, 0.95);
  assert.deepEqual(fighter.equipment, { leftHand: null, rightHand: null });

  const archer = createCharacter(3, 'Bogner 01', 'archer');
  assert.equal(archer.maxHp, 26);
  assert.equal(archer.dodge, 0.15);
  assert.equal(archer.precision, 1.15);

  const scholar = createCharacter(4, 'Gelehrter 01', 'scholar');
  assert.equal(scholar.maxHp, 22);
  assert.equal(scholar.armor, 0);
  assert.equal(scholar.strengthFactor, 1.15);
  assert.equal(scholar.precision, 1.10);

  const fallback = createCharacter(5, 'Fallback', 'unknown-class', false);
  assert.equal(fallback.classId, 'recruit');
  assert.equal(fallback.maxHp, 30);

  console.log('Character-Core: Klassenwerte, Level/XP, Statwachstum, volle Startressourcen, Starterwaffe und Legacy-Fallback sind konsistent.');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
