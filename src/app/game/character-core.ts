import { CHARACTER_CLASSES, type CharacterClassId } from './game-core';
import { DEFAULT_CHARACTER_RACE_ID, resolveCharacterRaceId, type CharacterRaceId } from './character-race-core.ts';

export interface CharacterEquipment {
  leftHand: number | null;
  rightHand: number | null;
}

export interface CharacterState {
  id: number;
  name: string;
  classId: CharacterClassId;
  raceId: CharacterRaceId;
  level: number;
  xp: number;
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

export function createCharacter(id: number, name: string, classId = 'recruit', withStarter = false, raceId: CharacterRaceId = DEFAULT_CHARACTER_RACE_ID): CharacterState {
  const resolvedClassId = resolveCharacterClassId(classId);
  const characterClass = CHARACTER_CLASSES[resolvedClassId];
  return {
    id,
    name,
    classId: characterClass.id,
    raceId: resolveCharacterRaceId(raceId),
    level: 1,
    xp: 0,
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
