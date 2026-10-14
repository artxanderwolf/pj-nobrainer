import { CHARACTER_CLASSES, type CharacterClassId } from './game-core';

export interface CharacterEquipment {
  leftHand: number | null;
  rightHand: number | null;
}

export interface CharacterState {
  id: number;
  name: string;
  classId: CharacterClassId;
  maxHp: number;
  hp: number;
  maxEnergy: number;
  energy: number;
  dodge: number;
  armor: number;
  strengthFactor: number;
  precision: number;
  alive: boolean;
  equipment: CharacterEquipment;
}

function resolveCharacterClassId(classId: string): CharacterClassId {
  return Object.prototype.hasOwnProperty.call(CHARACTER_CLASSES, classId) ? classId as CharacterClassId : 'recruit';
}

export function createCharacter(id: number, name: string, classId = 'recruit', withStarter = false): CharacterState {
  const resolvedClassId = resolveCharacterClassId(classId);
  const characterClass = CHARACTER_CLASSES[resolvedClassId];
  return {
    id,
    name,
    classId: characterClass.id,
    maxHp: characterClass.maxHp,
    hp: characterClass.maxHp,
    maxEnergy: characterClass.maxEnergy,
    energy: characterClass.maxEnergy,
    dodge: characterClass.dodge,
    armor: characterClass.armor,
    strengthFactor: characterClass.strengthFactor,
    precision: characterClass.precision,
    alive: true,
    equipment: { leftHand: null, rightHand: withStarter ? 0 : null }
  };
}

export function createRecruit(id: number, name: string, withStarter = false): CharacterState {
  return createCharacter(id, name, 'recruit', withStarter);
}

export const CHARACTER_CORE_BRIDGE = { createCharacter, createRecruit };
export type CharacterCoreBridge = typeof CHARACTER_CORE_BRIDGE;
