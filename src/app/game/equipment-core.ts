export type EquipmentHand = 'leftHand' | 'rightHand';
export type WeaponHandCount = 1 | 2;
export type WeaponHandCountResolver = (weaponId: number) => WeaponHandCount;

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
  label: 'Linke Hand' | 'Rechte Hand' | 'Beide Hände';
}

export interface WeaponInventoryPresentation {
  location: WeaponEquipLocation | null;
  status: string;
  targets: WeaponEquipTarget[];
}

export interface WeaponPickerPresentation {
  status: '' | 'AUSGERÜSTET' | 'AUSGERÜSTET (2H)' | 'ANDERE HAND' | 'BEIDE HÄNDE BENÖTIGT' | string;
  disabled: boolean;
}

export type EquipWeaponResult =
  | { ok: true; location: WeaponEquipLocation }
  | { ok: false; reason: 'character-not-found' | 'invalid-hand' | 'weapon-in-use' | 'both-hands-required' };

const ONE_HANDED: WeaponHandCountResolver = () => 1;

export function isEquipmentHand(hand: string): hand is EquipmentHand {
  return hand === 'leftHand' || hand === 'rightHand';
}

function otherHand(hand: EquipmentHand): EquipmentHand {
  return hand === 'leftHand' ? 'rightHand' : 'leftHand';
}

function isTwoHandedPair(character: EquipmentCharacterLike, weaponId: number): boolean {
  return character.equipment.leftHand === weaponId && character.equipment.rightHand === weaponId;
}

function getEquippedTwoHandedWeapon(
  character: EquipmentCharacterLike,
  resolveHandCount: WeaponHandCountResolver
): number | null {
  const weaponId = character.equipment.leftHand;
  if (weaponId === null || character.equipment.rightHand !== weaponId) return null;
  return resolveHandCount(weaponId) === 2 ? weaponId : null;
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

export function getFreeWeaponEquipTargets(
  characters: EquipmentCharacterLike[],
  weaponId?: number,
  resolveHandCount: WeaponHandCountResolver = ONE_HANDED
): WeaponEquipTarget[] {
  const targets: WeaponEquipTarget[] = [];
  const handCount = weaponId === undefined ? 1 : resolveHandCount(weaponId);
  for (const character of characters) {
    if (handCount === 2) {
      const bothHandsEmpty = character.equipment.leftHand === null && character.equipment.rightHand === null;
      const replaceableTwoHandedWeapon = getEquippedTwoHandedWeapon(character, resolveHandCount) !== null;
      if (bothHandsEmpty || replaceableTwoHandedWeapon) {
        targets.push({ characterId: character.id, hand: 'leftHand', label: 'Beide Hände' });
      }
      continue;
    }
    if (character.equipment.leftHand === null) targets.push({ characterId: character.id, hand: 'leftHand', label: 'Linke Hand' });
    if (character.equipment.rightHand === null) targets.push({ characterId: character.id, hand: 'rightHand', label: 'Rechte Hand' });
  }
  return targets;
}

export function getWeaponInventoryPresentation(
  characters: EquipmentCharacterLike[],
  weaponId: number,
  resolveHandCount: WeaponHandCountResolver = ONE_HANDED
): WeaponInventoryPresentation {
  const location = getWeaponEquipLocation(characters, weaponId);
  if (!location) {
    return { location: null, status: '', targets: getFreeWeaponEquipTargets(characters, weaponId, resolveHandCount) };
  }

  const character = characters.find((entry) => entry.id === location.characterId);
  const characterName = character?.name || 'Charakter';
  if (character && (resolveHandCount(weaponId) === 2 || isTwoHandedPair(character, weaponId))) {
    return { location, status: `${characterName} · BEIDE HÄNDE`, targets: [] };
  }
  const handLabel = location.hand === 'leftHand' ? 'LINKE' : 'RECHTE';
  return { location, status: `${characterName} · ${handLabel} HAND`, targets: [] };
}

export function getWeaponPickerPresentation(
  characters: EquipmentCharacterLike[],
  weaponId: number,
  characterId: number,
  hand: EquipmentHand,
  resolveHandCount: WeaponHandCountResolver = ONE_HANDED
): WeaponPickerPresentation {
  const character = characters.find((entry) => entry.id === characterId);
  if (!character) return { status: '', disabled: false };

  const opposite = otherHand(hand);
  const handCount = resolveHandCount(weaponId);
  if (isTwoHandedPair(character, weaponId)) return { status: 'AUSGERÜSTET (2H)', disabled: true };
  if (character.equipment[hand] === weaponId) return { status: 'AUSGERÜSTET', disabled: true };
  if (character.equipment[opposite] === weaponId) return { status: 'ANDERE HAND', disabled: true };

  const location = getWeaponEquipLocation(characters, weaponId);
  if (location) {
    const owner = characters.find((entry) => entry.id === location.characterId);
    return { status: `BELEGT: ${owner?.name || 'Charakter'}`, disabled: true };
  }

  if (handCount === 2) {
    if (getEquippedTwoHandedWeapon(character, resolveHandCount) !== null) {
      return { status: '', disabled: false };
    }
    const oppositeWeapon = character.equipment[opposite];
    if (oppositeWeapon !== null) return { status: 'BEIDE HÄNDE BENÖTIGT', disabled: true };
  }
  return { status: '', disabled: false };
}

export function equipWeapon(
  characters: EquipmentCharacterLike[],
  weaponId: number,
  hand: string,
  characterId: number,
  resolveHandCount: WeaponHandCountResolver = ONE_HANDED
): EquipWeaponResult {
  const character = characters.find((entry) => entry.id === characterId);
  if (!character) return { ok: false, reason: 'character-not-found' };
  if (!isEquipmentHand(hand)) return { ok: false, reason: 'invalid-hand' };

  const existing = getWeaponEquipLocation(characters, weaponId);
  if (existing && existing.characterId !== character.id) return { ok: false, reason: 'weapon-in-use' };

  const opposite = otherHand(hand);
  const handCount = resolveHandCount(weaponId);
  if (handCount === 2) {
    const currentTwoHandedWeapon = getEquippedTwoHandedWeapon(character, resolveHandCount);
    if (currentTwoHandedWeapon !== null) {
      character.equipment.leftHand = weaponId;
      character.equipment.rightHand = weaponId;
      return { ok: true, location: { characterId: character.id, hand: 'leftHand' } };
    }

    const oppositeWeapon = character.equipment[opposite];
    if (oppositeWeapon !== null && oppositeWeapon !== weaponId) return { ok: false, reason: 'both-hands-required' };
    character.equipment.leftHand = weaponId;
    character.equipment.rightHand = weaponId;
    return { ok: true, location: { characterId: character.id, hand: 'leftHand' } };
  }

  const targetWeapon = character.equipment[hand];
  if (targetWeapon !== null && isTwoHandedPair(character, targetWeapon)) {
    character.equipment.leftHand = null;
    character.equipment.rightHand = null;
  }
  if (character.equipment[opposite] === weaponId) character.equipment[opposite] = null;
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
  const weaponId = character.equipment[hand];
  if (weaponId !== null && isTwoHandedPair(character, weaponId)) {
    character.equipment.leftHand = null;
    character.equipment.rightHand = null;
    return true;
  }
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
