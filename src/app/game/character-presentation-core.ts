import type { EquipmentHand } from './equipment-core';

export interface CharacterPresentationCharacterLike {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  armor: number;
  dodge: number;
  strengthFactor: number;
  precision: number;
  equipment: Record<EquipmentHand, number | null>;
}

export interface CharacterPresentationClassLike {
  name: string;
  energyRegenPerMinute: number;
}

export interface CharacterStatPresentation {
  label: 'HP' | 'EN' | 'RÜS' | 'AUS' | 'STÄ' | 'PRÄ' | 'EN-Reg.' | 'Offensive gg. Dungeon 1';
  value: string;
}

export interface CharacterHandPresentation {
  hand: EquipmentHand;
  label: 'Linke Hand' | 'Rechte Hand';
  weaponId: number | null;
  pickerKey: string;
  pickerOpen: boolean;
  toggleLabel: 'Auswahl schließen' | 'Waffe wechseln';
  equippedStatus: 'AUSGERÜSTET';
  emptyText: 'Hand ist leer.';
}

export interface CharacterCardPresentation {
  name: string;
  classTag: string;
  stats: CharacterStatPresentation[];
  hands: CharacterHandPresentation[];
}

const HANDS: ReadonlyArray<{ hand: EquipmentHand; label: CharacterHandPresentation['label'] }> = [
  { hand: 'leftHand', label: 'Linke Hand' },
  { hand: 'rightHand', label: 'Rechte Hand' }
];

export function getWeaponPickerKey(characterId: number, hand: EquipmentHand): string {
  return `${characterId}:${hand}`;
}

export function getCharacterCardPresentation(
  character: CharacterPresentationCharacterLike,
  characterClass: CharacterPresentationClassLike,
  effectiveOffense: number,
  openWeaponPickerHand: string | null
): CharacterCardPresentation {
  const stats: CharacterStatPresentation[] = [
    { label: 'HP', value: `${character.hp.toFixed(1)} / ${character.maxHp}` },
    { label: 'EN', value: `${character.energy.toFixed(1)} / ${character.maxEnergy}` },
    { label: 'RÜS', value: String(character.armor) },
    { label: 'AUS', value: `${Math.round(character.dodge * 100)} %` },
    { label: 'STÄ', value: character.strengthFactor.toFixed(2) },
    { label: 'PRÄ', value: character.precision.toFixed(2) },
    { label: 'EN-Reg.', value: `${characterClass.energyRegenPerMinute}/Min.` },
    { label: 'Offensive gg. Dungeon 1', value: effectiveOffense.toFixed(2) }
  ];

  const hands = HANDS.map(({ hand, label }): CharacterHandPresentation => {
    const pickerKey = getWeaponPickerKey(character.id, hand);
    const pickerOpen = openWeaponPickerHand === pickerKey;
    return {
      hand,
      label,
      weaponId: character.equipment[hand],
      pickerKey,
      pickerOpen,
      toggleLabel: pickerOpen ? 'Auswahl schließen' : 'Waffe wechseln',
      equippedStatus: 'AUSGERÜSTET',
      emptyText: 'Hand ist leer.'
    };
  });

  return {
    name: character.name,
    classTag: `Klasse: ${characterClass.name}`,
    stats,
    hands
  };
}

export const CHARACTER_PRESENTATION_CORE_BRIDGE = {
  getWeaponPickerKey,
  getCharacterCardPresentation
};

export type CharacterPresentationCoreBridge = typeof CHARACTER_PRESENTATION_CORE_BRIDGE;
