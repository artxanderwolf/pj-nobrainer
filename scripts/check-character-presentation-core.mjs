import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getCharacterCardPresentation,
  getWeaponPickerKey
} from '../src/app/game/character-presentation-core.ts';

const character = {
  id: 7,
  name: 'Kämpfer 07',
  hp: 31.25,
  maxHp: 35,
  energy: 87.75,
  maxEnergy: 100,
  armor: 3,
  dodge: 0.08,
  strengthFactor: 1.1,
  precision: 0.95,
  equipment: { leftHand: 9, rightHand: null }
};
const characterClass = { name: 'Kämpfer', energyRegenPerMinute: 5 };

assert.equal(getWeaponPickerKey(7, 'leftHand'), '7:leftHand');
assert.equal(getWeaponPickerKey(7, 'rightHand'), '7:rightHand');

const presentation = getCharacterCardPresentation(character, characterClass, 12.3456, '7:leftHand');
assert.equal(presentation.name, 'Kämpfer 07');
assert.equal(presentation.classTag, 'Klasse: Kämpfer');
assert.deepEqual(presentation.stats, [
  { label: 'HP', value: '31.3 / 35' },
  { label: 'EN', value: '87.8 / 100' },
  { label: 'RÜS', value: '3' },
  { label: 'AUS', value: '8 %' },
  { label: 'STÄ', value: '1.10' },
  { label: 'PRÄ', value: '0.95' },
  { label: 'EN-Reg.', value: '5/Min.' },
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

const closedPresentation = getCharacterCardPresentation(character, characterClass, 0, null);
assert.equal(closedPresentation.hands.every(hand => !hand.pickerOpen), true);
assert.equal(closedPresentation.hands.every(hand => hand.toggleLabel === 'Waffe wechseln'), true);

const legacy = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
assert.equal(legacy.split('function weaponPickerKey(characterId,hand)').length - 1, 1);
assert.equal(legacy.split('function renderCharacterCard(c)').length - 1, 1);
assert.equal(legacy.split('function toggleDungeonTeamPicker(slot)').length - 1, 1);

console.log('Character-Presentation-Core: Kaderwerte, Handsektionen, Pickerzustand und Legacy-Anker sind konsistent.');
