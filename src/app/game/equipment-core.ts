export type EquipmentHand = 'leftHand' | 'rightHand';

export interface EquipmentSlots {
  leftHand: number | null;
  rightHand: number | null;
}

export interface EquipmentCharacterLike {
  id: number;
  name?: string;
  equipment: EquipmentSlots;
}

export interface WeaponEquipLocation {
  characterId: number;
  hand: EquipmentHand;
}

export interface WeaponEquipTarget extends WeaponEquipLocation {
  label: 'Linke Hand' | 'Rechte Hand';
}

export interface WeaponInventoryPresentation {
  location: WeaponEquipLocation | null;
  status: string;
  targets: WeaponEquipTarget[];
}

export interface WeaponPickerPresentation {
  status: '' | 'AUSGERÜSTET' | 'ANDERE HAND' | string;
  disabled: boolean;
}

export type EquipWeaponResult =
  | { ok: true; location: WeaponEquipLocation }
  | { ok: false; reason: 'character-not-found' | 'invalid-hand' | 'weapon-in-use' };

export function isEquipmentHand(hand: string): hand is EquipmentHand {
  return hand === 'leftHand' || hand === 'rightHand';
}

export function getWeaponEquipLocation(
  characters: EquipmentCharacterLike[],
  weaponId: number
): WeaponEquipLocation | null {
  for (const character of characters) {
    if (character.equipment.leftHand === weaponId) return { characterId: character.id, hand: 'leftHand' };
    if (character.equipment.rightHand === weaponId) return { characterId: character.id, hand: 'rightHand' };
  }
  return null;
}

export function getFreeWeaponEquipTargets(characters: EquipmentCharacterLike[]): WeaponEquipTarget[] {
  const targets: WeaponEquipTarget[] = [];
  for (const character of characters) {
    if (character.equipment.leftHand === null) targets.push({ characterId: character.id, hand: 'leftHand', label: 'Linke Hand' });
    if (character.equipment.rightHand === null) targets.push({ characterId: character.id, hand: 'rightHand', label: 'Rechte Hand' });
  }
  return targets;
}

export function getWeaponInventoryPresentation(
  characters: EquipmentCharacterLike[],
  weaponId: number
): WeaponInventoryPresentation {
  const location = getWeaponEquipLocation(characters, weaponId);
  if (!location) return { location: null, status: '', targets: getFreeWeaponEquipTargets(characters) };

  const character = characters.find((entry) => entry.id === location.characterId);
  const characterName = character?.name || 'Charakter';
  const handLabel = location.hand === 'leftHand' ? 'LINKE' : 'RECHTE';
  return { location, status: `${characterName} · ${handLabel} HAND`, targets: [] };
}

export function getWeaponPickerPresentation(
  characters: EquipmentCharacterLike[],
  weaponId: number,
  characterId: number,
  hand: EquipmentHand
): WeaponPickerPresentation {
  const character = characters.find((entry) => entry.id === characterId);
  if (!character) return { status: '', disabled: false };

  const otherHand: EquipmentHand = hand === 'leftHand' ? 'rightHand' : 'leftHand';
  if (character.equipment[hand] === weaponId) return { status: 'AUSGERÜSTET', disabled: true };
  if (character.equipment[otherHand] === weaponId) return { status: 'ANDERE HAND', disabled: true };

  const location = getWeaponEquipLocation(characters, weaponId);
  if (location) {
    const owner = characters.find((entry) => entry.id === location.characterId);
    return { status: `BELEGT: ${owner?.name || 'Charakter'}`, disabled: true };
  }
  return { status: '', disabled: false };
}

export function equipWeapon(
  characters: EquipmentCharacterLike[],
  weaponId: number,
  hand: string,
  characterId: number
): EquipWeaponResult {
  const character = characters.find((entry) => entry.id === characterId);
  if (!character) return { ok: false, reason: 'character-not-found' };
  if (!isEquipmentHand(hand)) return { ok: false, reason: 'invalid-hand' };

  const existing = getWeaponEquipLocation(characters, weaponId);
  if (existing && existing.characterId !== character.id) return { ok: false, reason: 'weapon-in-use' };

  const otherHand: EquipmentHand = hand === 'leftHand' ? 'rightHand' : 'leftHand';
  if (character.equipment[otherHand] === weaponId) character.equipment[otherHand] = null;
  character.equipment[hand] = weaponId;
  return { ok: true, location: { characterId: character.id, hand } };
}

export function unequipHand(
  characters: EquipmentCharacterLike[],
  characterId: number,
  hand: string
): boolean {
  const character = characters.find((entry) => entry.id === characterId);
  if (!character || !isEquipmentHand(hand)) return false;
  character.equipment[hand] = null;
  return true;
}

export const EQUIPMENT_CORE_BRIDGE = {
  getWeaponEquipLocation,
  getFreeWeaponEquipTargets,
  getWeaponInventoryPresentation,
  getWeaponPickerPresentation,
  equipWeapon,
  unequipHand
};

export type EquipmentCoreBridge = typeof EQUIPMENT_CORE_BRIDGE;
