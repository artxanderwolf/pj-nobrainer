import assert from 'node:assert/strict';
import { isWeaponSelectionComplete } from '../src/app/game/game-core.ts';

const completeDagger = [
  { slot: 'workingPart', materialId: 5 },
  { slot: 'back', materialId: 4 },
  { slot: 'gripCore', materialId: 2 },
  { slot: 'gripWrap', materialId: 9 },
  { slot: 'special', materialId: 2 }
];

assert.equal(isWeaponSelectionComplete(completeDagger, 'dagger'), true, 'Eine vollständige ID-Auswahl muss gültig bleiben.');
assert.equal(
  isWeaponSelectionComplete(completeDagger.map(slot => slot.slot === 'special' ? { ...slot, materialId: null } : slot), 'dagger'),
  false,
  'Ein leerer Materialslot darf nicht durch Number(null) als vollständige Auswahl gelten.'
);
assert.equal(
  isWeaponSelectionComplete(completeDagger.map(slot => slot.slot === 'special' ? { ...slot, materialId: 0 } : slot), 'dagger'),
  false,
  'Material-ID 0 ist keine gültige Auswahl.'
);
assert.equal(
  isWeaponSelectionComplete(completeDagger.map(slot => slot.slot === 'special' ? { ...slot, materialId: 999 } : slot), 'dagger'),
  false,
  'Eine unbekannte Material-ID darf keine vollständige Auswahl erzeugen.'
);

console.log('Forge-Materialvalidierung: leere, null-, 0- und unbekannte Material-IDs werden als unvollständig abgewiesen.');
