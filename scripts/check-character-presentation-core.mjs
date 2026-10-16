import assert from 'node:assert/strict';
import fs from 'node:fs';

const sourceUrl = new URL('../src/app/game/character-presentation-core.ts', import.meta.url);
const temporaryUrl = new URL('../src/app/game/character-presentation-core.node-check.ts', import.meta.url);
const source = fs.readFileSync(sourceUrl, 'utf8')
  .replace("from './character-progression-core';", "from './character-progression-core.ts';");
fs.writeFileSync(temporaryUrl, source, 'utf8');

try {
  const {
    getCharacterCardPresentation,
    getDungeonTeamPickerPresentation,
    getDungeonTeamPresentation,
    getWeaponPickerKey
  } = await import(`${temporaryUrl.href}?check=${Date.now()}`);

  const character = {
    id: 7,
    name: 'Kämpfer 07',
    level: 3,
    xp: 21,
    hp: 31.25,
    energy: 87.75,
    equipment: { leftHand: 9, rightHand: null }
  };
  const characterClass = { name: 'Kämpfer' };
  const effectiveStats = {
    maxHp: 35,
    maxEnergy: 100,
    armor: 3,
    dodge: 0.08,
    strengthFactor: 1.1,
    precision: 0.95,
    threat: 100,
    critChance: 0.04,
    critDamage: 1.6,
    hpRegenPerMinute: 0,
    energyRegenPerMinute: 5,
    experienceFactor: 1,
    lifeSteal: 0,
    penetration: 0
  };

  assert.equal(getWeaponPickerKey(7, 'leftHand'), '7:leftHand');
  assert.equal(getWeaponPickerKey(7, 'rightHand'), '7:rightHand');

  const presentation = getCharacterCardPresentation(character, characterClass, effectiveStats, 12.3456, '7:leftHand');
  assert.equal(presentation.name, 'Kämpfer 07');
  assert.equal(presentation.classTag, 'Klasse: Kämpfer');
  assert.deepEqual(presentation.stats, [
    { label: 'LVL', value: '3 / 20' },
    { label: 'XP', value: '21 / 121' },
    { label: 'HP', value: '31.3 / 35' },
    { label: 'EN', value: '87.8 / 100' },
    { label: 'RÜS', value: '3' },
    { label: 'AUS', value: '8 %' },
    { label: 'SF', value: '1.10' },
    { label: 'K-C', value: '4 %' },
    { label: 'PRÄ', value: '0.95' },
    { label: 'K-S', value: '160 %' },
    { label: 'BED', value: '100' },
    { label: 'DS', value: '0 %' },
    { label: 'HP-Reg.', value: '0/Min.' },
    { label: 'EN-Reg.', value: '5/Min.' },
    { label: 'LR', value: '0 %' },
    { label: 'ERF', value: '100 %' },
    { label: 'Offensive gg. Dungeon 1', value: '12.35' }
  ]);
  assert.deepEqual(presentation.hands, [
    {
      hand: 'leftHand',
      label: 'Linke Hand',
      weaponId: 9,
      pickerKey: '7:leftHand',
      pickerOpen: true,
      toggleLabel: 'Auswahl schließen',
      equippedStatus: 'AUSGERÜSTET',
      emptyText: 'Hand ist leer.'
    },
    {
      hand: 'rightHand',
      label: 'Rechte Hand',
      weaponId: null,
      pickerKey: '7:rightHand',
      pickerOpen: false,
      toggleLabel: 'Waffe wechseln',
      equippedStatus: 'AUSGERÜSTET',
      emptyText: 'Hand ist leer.'
    }
  ]);

  const legacyCharacter = { ...character };
  delete legacyCharacter.level;
  delete legacyCharacter.xp;
  const legacyPresentation = getCharacterCardPresentation(legacyCharacter, characterClass, effectiveStats, 0, null);
  assert.deepEqual(legacyPresentation.stats.slice(0, 2), [
    { label: 'LVL', value: '1 / 20' },
    { label: 'XP', value: '0 / 100' }
  ], 'Alte Spielstände ohne XP-Felder müssen als Level 1 / 0 XP dargestellt werden.');

  const closedPresentation = getCharacterCardPresentation(character, characterClass, effectiveStats, 0, null);
  assert.equal(closedPresentation.hands.every(hand => !hand.pickerOpen), true);
  assert.equal(closedPresentation.hands.every(hand => hand.toggleLabel === 'Waffe wechseln'), true);

  const dungeonCharacters = [
    { id: 1, name: 'Kämpfer 01', hp: 32.04, maxHp: 35, energy: 91.06, maxEnergy: 100, className: 'Kämpfer' },
    { id: 2, name: 'Wächter 02', hp: 28.95, maxHp: 40, energy: 72.44, maxEnergy: 90, className: 'Wächter' },
    { id: 3, name: 'Späher 03', hp: 24.5, maxHp: 30, energy: 84.55, maxEnergy: 110, className: 'Späher' }
  ];

  const pickerPresentation = getDungeonTeamPickerPresentation([1, null, 2, null], dungeonCharacters, 1, 1);
  assert.equal(pickerPresentation.open, true);
  assert.deepEqual(pickerPresentation.candidates, [
    { id: 3, name: 'Späher 03', meta: 'Späher · HP 24.5 · EN 84.5', assignLabel: 'Zuweisen' }
  ]);

  const closedPicker = getDungeonTeamPickerPresentation([1, null, 2, null], dungeonCharacters, 1, null);
  assert.deepEqual(closedPicker.candidates, []);
  assert.equal(closedPicker.open, false);

  const emptyPicker = getDungeonTeamPickerPresentation([1, 2, null, 3], dungeonCharacters, 2, 2);
  assert.equal(emptyPicker.open, true);
  assert.deepEqual(emptyPicker.candidates, []);
  assert.equal(emptyPicker.emptyText, 'Keine weiteren Charaktere verfügbar.');

  const dungeonPresentation = getDungeonTeamPresentation([1, null, 2, null], dungeonCharacters, true, [1], true);
  assert.equal(dungeonPresentation.locked, true);
  assert.equal(dungeonPresentation.lockedText, 'Teamzuweisung ist während einer laufenden Automatik gesperrt.');
  assert.deepEqual(dungeonPresentation.slots[0], {
    slotIndex: 0,
    occupied: true,
    characterId: 1,
    title: 'Platz 1: Kämpfer 01',
    fallen: false,
    fallenLabel: 'GEFALLEN',
    hpValue: '32.0 / 35',
    energyValue: '91.1 / 100',
    emptyText: 'Nicht belegt',
    addLabel: '+ Charakter hinzufügen',
    removeLabel: 'Entfernen',
    switchLabel: 'Wechseln'
  });
  assert.equal(dungeonPresentation.slots[1].occupied, false);
  assert.equal(dungeonPresentation.slots[1].title, 'Platz 2');
  assert.equal(dungeonPresentation.slots[1].emptyText, 'Nicht belegt');
  assert.equal(dungeonPresentation.slots[2].fallen, true);
  assert.equal(dungeonPresentation.slots[2].hpValue, '28.9 / 40');
  assert.equal(dungeonPresentation.slots[2].energyValue, '72.4 / 90');
  assert.equal(dungeonPresentation.slots.length, 4);

  const legacy = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
  assert.equal(legacy.split('function weaponPickerKey(characterId,hand)').length - 1, 1);
  assert.equal(legacy.split('function renderCharacterCard(c)').length - 1, 1);
  assert.equal(legacy.split('function toggleDungeonTeamPicker(slot)').length - 1, 1);
  assert.equal(legacy.split('function dungeonTeamPickerHtml(slot)').length - 1, 1);
  assert.equal(legacy.split('function renderDungeonTeam(root)').length - 1, 1);
  assert.equal(legacy.split('function renderCharacter(target)').length - 1, 1);

  console.log('Character-Presentation-Core: XP/Level, gemeinsamer Statblock, Handsektionen, Dungeon-Team-Slots und Legacy-Anker sind konsistent.');
} finally {
  fs.rmSync(temporaryUrl, { force: true });
}
